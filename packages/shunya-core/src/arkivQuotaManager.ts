import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface ArkivSellerListingEntity {
  id: string; // Arkiv Entity UID (e.g. 0xarkiv_...)
  ownerAddress: string;
  ensName: string;
  model: string;
  provider: "openai" | "anthropic" | "gemini" | "groq";
  availableTokens: number;
  lockedTokens: number;
  pricePer1kMicroUsdc: number;
  humanVerified: boolean;
  worldIdNullifier?: string;
  sealedApiKey: string; // Encrypted to Enclave Public Key
  hedaraPayoutAccount: string;
  createdAtBlock: number;
  expiresAtBlock: number; // 1-hour expiration (~1200 blocks)
  status: "active" | "exhausted" | "expired";
}

export interface ArkivFileEntity {
  id: string;
  ownerFingerprint: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  storageTarget: "arkiv" | "zeroG";
  createdAtBlock: number;
  expiresAtBlock: number; // 10-minute expiration (~200 blocks)
  ciphertextRef: string;
}

// Asynchronous Mutex for Strict Linearizable Concurrency Control
export class AsyncMutex {
  private queue: (() => void)[] = [];
  private locked: boolean = false;

  public async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift()!;
          next();
        } else {
          this.locked = false;
        }
      };

      if (!this.locked) {
        this.locked = true;
        resolve(release);
      } else {
        this.queue.push(() => resolve(release));
      }
    });
  }
}

// In-Memory State Cache for Arkiv Decentralized Entities
export class ArkivDatabaseEngine {
  private listings: Map<string, ArkivSellerListingEntity> = new Map();
  private files: Map<string, ArkivFileEntity> = new Map();
  private entityMutexes: Map<string, AsyncMutex> = new Map();
  private currentBlock: number = 19_482_100;
  private persistencePath: string = path.join(process.cwd(), ".data", "arkiv_listings.json");
  private shouldPersist: boolean = true;

  constructor(options?: { persist?: boolean }) {
    if (options?.persist !== undefined) {
      this.shouldPersist = options.persist;
    }
    this.seedDefaultListings();
    if (this.shouldPersist) {
      this.loadFromDisk();
    }
  }

  public reloadFromDisk(): void {
    this.listings.clear();
    this.entityMutexes.clear();
    this.loadFromDisk();
  }

  private loadFromDisk() {
    if (!this.shouldPersist) return;
    try {
      if (fs.existsSync(this.persistencePath)) {
        const raw = fs.readFileSync(this.persistencePath, "utf8");
        const list: ArkivSellerListingEntity[] = JSON.parse(raw);
        for (const item of list) {
          this.listings.set(item.id, item);
        }
      }
    } catch {}
  }

  private saveToDisk() {
    if (!this.shouldPersist) return;
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const list = Array.from(this.listings.values());
      fs.writeFileSync(this.persistencePath, JSON.stringify(list, null, 2), "utf8");
    } catch {}
  }

  public deleteListing(id: string): boolean {
    const deleted = this.listings.delete(id);
    this.entityMutexes.delete(id);
    this.saveToDisk();
    return deleted;
  }

  // Orderbook starts clean for authentic seller registrations
  public seedDefaultListings() {
    // Zero mock/pre-seeded sellers: real sellers register via Seller Hub with connected wallet & World ID
  }

  // Clear all listings from the orderbook
  public clearOrderbook(): void {
    this.listings.clear();
    this.entityMutexes.clear();
    this.saveToDisk();
  }

  public getCurrentBlock(): number {
    return this.currentBlock;
  }

  public advanceBlocks(n: number = 10): void {
    this.currentBlock += n;
    // Check expirations
    this.listings.forEach((listing) => {
      if (this.currentBlock >= listing.expiresAtBlock) {
        listing.status = "expired";
      }
    });
    this.files.forEach((file, id) => {
      if (this.currentBlock >= file.expiresAtBlock) {
        this.files.delete(id);
      }
    });
  }

  // Create or update a seller listing entity
  public createListing(params: Omit<ArkivSellerListingEntity, "id" | "createdAtBlock" | "expiresAtBlock" | "lockedTokens" | "status">): ArkivSellerListingEntity {
    const id = `arkiv_entity_${crypto.randomBytes(6).toString("hex")}`;
    const entity: ArkivSellerListingEntity = {
      ...params,
      id,
      lockedTokens: 0,
      createdAtBlock: this.currentBlock,
      expiresAtBlock: this.currentBlock + 1200, // 1 hour block window
      status: "active",
    };
    this.listings.set(id, entity);
    this.saveToDisk();
    return entity;
  }

  // Query listings matching model and T_max eligibility
  public queryEligibleListings(model: string, requiredTMax: number): ArkivSellerListingEntity[] {
    const results: ArkivSellerListingEntity[] = [];
    for (const listing of this.listings.values()) {
      if (listing.status !== "active") continue;
      if (this.currentBlock >= listing.expiresAtBlock) continue;
      if (listing.model.toLowerCase() !== model.toLowerCase()) continue;
      if (listing.availableTokens >= requiredTMax) {
        results.push(listing);
      }
    }
    // Sort by best price first
    return results.sort((a, b) => a.pricePer1kMicroUsdc - b.pricePer1kMicroUsdc);
  }

  // Query all listings for UI
  public getAllListings(): ArkivSellerListingEntity[] {
    return Array.from(this.listings.values());
  }

  public getListingById(id: string): ArkivSellerListingEntity | undefined {
    return this.listings.get(id);
  }

  // Atomic pre-flight lock: guarantees zero concurrent cutoff race condition
  public atomicLockTokens(listingId: string, tMax: number): boolean {
    const listing = this.listings.get(listingId);
    if (!listing || listing.status !== "active") return false;
    if (listing.availableTokens < tMax) return false;

    listing.availableTokens -= tMax;
    listing.lockedTokens += tMax;
    this.saveToDisk();
    return true;
  }

  // Helper: Retrieve or create per-entity mutex
  private getMutex(listingId: string): AsyncMutex {
    let mutex = this.entityMutexes.get(listingId);
    if (!mutex) {
      mutex = new AsyncMutex();
      this.entityMutexes.set(listingId, mutex);
    }
    return mutex;
  }

  // Linearizable concurrent atomic lock
  public async atomicLockTokensAsync(listingId: string, tMax: number): Promise<boolean> {
    const release = await this.getMutex(listingId).acquire();
    try {
      return this.atomicLockTokens(listingId, tMax);
    } finally {
      release();
    }
  }

  // Linearizable concurrent quota reconciliation
  public async reconcilePostExecutionAsync(
    listingId: string,
    tMax: number,
    tUsed: number
  ): Promise<ArkivSellerListingEntity> {
    const release = await this.getMutex(listingId).acquire();
    try {
      return this.reconcilePostExecution(listingId, tMax, tUsed);
    } finally {
      release();
    }
  }
  public reconcilePostExecution(listingId: string, tMax: number, tUsed: number): ArkivSellerListingEntity {
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error(`Listing ${listingId} not found`);

    const unusedTokens = Math.max(0, tMax - tUsed);
    // Release the locked amount
    listing.lockedTokens = Math.max(0, listing.lockedTokens - tMax);
    // Return unused reservation to available quota
    listing.availableTokens += unusedTokens;

    if (listing.availableTokens <= 0) {
      listing.status = "exhausted";
    }

    this.saveToDisk();
    return listing;
  }

  // Store temporary encrypted file metadata (10-min expiry)
  public storeFileEntity(file: Omit<ArkivFileEntity, "id" | "createdAtBlock" | "expiresAtBlock">): ArkivFileEntity {
    const id = `arkiv_file_${crypto.randomBytes(6).toString("hex")}`;
    const entity: ArkivFileEntity = {
      ...file,
      id,
      createdAtBlock: this.currentBlock,
      expiresAtBlock: this.currentBlock + 200, // 10 minutes
    };
    this.files.set(id, entity);
    return entity;
  }

  public getFileEntity(id: string): ArkivFileEntity | undefined {
    return this.files.get(id);
  }
}

// Global Singleton
const globalForArkiv = globalThis as unknown as { arkivDatabaseEngine?: ArkivDatabaseEngine };
export const arkivDb = globalForArkiv.arkivDatabaseEngine ?? new ArkivDatabaseEngine();
if (process.env.NODE_ENV !== "production") {
  globalForArkiv.arkivDatabaseEngine = arkivDb;
  if (arkivDb) {
    Object.setPrototypeOf(arkivDb, ArkivDatabaseEngine.prototype);
  }
}

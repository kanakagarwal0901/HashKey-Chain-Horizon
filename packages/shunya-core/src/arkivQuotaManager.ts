import crypto from "crypto";
import fs from "fs";
import path from "path";
import { remoteOrderbookSync } from "./remoteOrderbookSync";

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
  hedaraPayoutAccount?: string;
  payoutAddress?: string; // EVM Payout Address (defaults to ownerAddress on HashKey Chain)
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
  private currentBlock: number = 35_100_370;
  private persistencePath: string = "";
  private shouldPersist: boolean = true;
  private hasSyncedRemote: boolean = false;

  constructor(options?: { persist?: boolean }) {
    if (options?.persist !== undefined) {
      this.shouldPersist = options.persist;
    }
    this.persistencePath = this.getPersistencePath();
    this.seedDefaultListings();
    if (this.shouldPersist) {
      this.loadFromDisk();
    }
  }

  private getPersistencePath(): string {
    if (typeof process === "undefined") return "";
    // On Vercel Serverless / AWS Lambda, /var/task is read-only; /tmp is the writable cache
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return path.join("/tmp", "arkiv_listings.json");
    }
    if (typeof process.cwd === "function") {
      return path.join(process.cwd(), ".data", "arkiv_listings.json");
    }
    return "";
  }

  public reloadFromDisk(): void {
    this.listings.clear();
    this.entityMutexes.clear();
    this.seedDefaultListings();
    this.loadFromDisk();
  }

  /**
   * Synchronize listings with the global cloud orderbook so that all PCs and lambdas share state.
   */
  public async syncWithRemote(): Promise<void> {
    try {
      const remote = await remoteOrderbookSync.fetchRemoteListings();
      if (remote && Array.isArray(remote)) {
        let updated = false;
        const seedIds = new Set([
          "arkiv_entity_gemini_2_flash_thinking",
          "arkiv_entity_gemini_15_pro",
          "arkiv_entity_claude_37_sonnet",
          "arkiv_entity_o3_mini",
          "arkiv_entity_groq_deepseek_r1",
        ]);

        const remoteIdSet = new Set<string>();
        for (const r of remote) {
          if (!r.id) continue;
          remoteIdSet.add(r.id);
          const existing = this.listings.get(r.id);
          if (!existing) {
            this.listings.set(r.id, r);
            updated = true;
          } else {
            Object.assign(existing, r);
          }
        }

        // If remote has entries, prune obsolete non-seed entities not on remote
        if (remote.length > 0) {
          for (const [id] of this.listings.entries()) {
            if (!seedIds.has(id) && !remoteIdSet.has(id)) {
              this.listings.delete(id);
              updated = true;
            }
          }
        }

        this.hasSyncedRemote = true;
        if (updated) {
          this.saveToDisk();
        }
      }
    } catch (err: any) {
      console.warn("[ArkivDatabaseEngine] syncWithRemote notice:", err?.message);
    }
  }

  private loadFromDisk() {
    if (!this.shouldPersist || typeof window !== "undefined") return;
    try {
      const pathsToTry = [
        this.persistencePath,
        typeof process.cwd === "function" ? path.join(process.cwd(), ".data", "arkiv_listings.json") : "",
      ].filter(Boolean);

      for (const p of pathsToTry) {
        if (p && fs && typeof fs.existsSync === "function" && fs.existsSync(p)) {
          const raw = fs.readFileSync(p, "utf8");
          const list: ArkivSellerListingEntity[] = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const seenEns = new Set<string>();
            for (const item of list) {
              if (item.ensName) {
                const key = item.ensName.toLowerCase();
                if (seenEns.has(key)) continue;
                seenEns.add(key);
              }
              this.listings.set(item.id, item);
            }
            break;
          }
        }
      }
    } catch {}

    if (this.listings.size === 0) {
      this.seedDefaultListings();
    }
  }

  private saveToDisk() {
    if (!this.shouldPersist || typeof window !== "undefined") return;
    try {
      const targetPath = this.persistencePath || this.getPersistencePath();
      if (!targetPath || !fs || typeof fs.existsSync !== "function") return;
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const list = Array.from(this.listings.values());
      fs.writeFileSync(targetPath, JSON.stringify(list, null, 2), "utf8");
    } catch {}
  }

  public deleteListing(id: string): boolean {
    const deleted = this.listings.delete(id);
    this.entityMutexes.delete(id);
    this.saveToDisk();
    remoteOrderbookSync.deactivateListing(id).catch(() => {});
    return deleted;
  }

  // Orderbook verified active seed nodes
  public seedDefaultListings() {
    if (this.listings.size > 0) return;

    const defaultNodes: ArkivSellerListingEntity[] = [
      {
        id: "arkiv_entity_gemini_2_flash_thinking",
        ownerAddress: "0x873873c173E4aD264c93Ab7F41366fcD3b9303b7",
        ensName: "gemini-flash-thinking.shunyagrid.eth",
        model: "gemini-2.0-flash-thinking",
        provider: "gemini",
        availableTokens: 500_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 4_000,
        humanVerified: true,
        worldIdNullifier: "0xnullifier_worldid_gemini_01",
        sealedApiKey: "ENCLAVE_SEALED:mumbai-live-demo-gemini-token",
        payoutAddress: "0x873873c173E4aD264c93Ab7F41366fcD3b9303b7",
        hedaraPayoutAccount: "0x873873c173E4aD264c93Ab7F41366fcD3b9303b7",
        createdAtBlock: 35100370,
        expiresAtBlock: 35105000,
        status: "active",
      },
      {
        id: "arkiv_entity_gemini_15_pro",
        ownerAddress: "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21",
        ensName: "gemini-pro.shunyagrid.eth",
        model: "gemini-1.5-pro",
        provider: "gemini",
        availableTokens: 350_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 8_000,
        humanVerified: true,
        worldIdNullifier: "0xnullifier_worldid_gemini_pro_02",
        sealedApiKey: "ENCLAVE_SEALED:mumbai-live-demo-gemini-token",
        payoutAddress: "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21",
        hedaraPayoutAccount: "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21",
        createdAtBlock: 35100370,
        expiresAtBlock: 35105000,
        status: "active",
      },
      {
        id: "arkiv_entity_claude_37_sonnet",
        ownerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        ensName: "claude-sonnet-hybrid.shunyagrid.eth",
        model: "claude-3-7-sonnet",
        provider: "anthropic",
        availableTokens: 250_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 15_000,
        humanVerified: true,
        worldIdNullifier: "0xnullifier_worldid_claude_03",
        sealedApiKey: "ENCLAVE_SEALED:mumbai-live-demo-claude-token",
        payoutAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        hedaraPayoutAccount: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        createdAtBlock: 35100370,
        expiresAtBlock: 35105000,
        status: "active",
      },
      {
        id: "arkiv_entity_o3_mini",
        ownerAddress: "0x873873c173E4aD264c93Ab7F41366fcD3b9303b7",
        ensName: "o3-mini-reasoning.shunyagrid.eth",
        model: "o3-mini",
        provider: "openai",
        availableTokens: 300_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 12_000,
        humanVerified: true,
        worldIdNullifier: "0xnullifier_worldid_o3_04",
        sealedApiKey: "ENCLAVE_SEALED:mumbai-live-demo-openai-token",
        payoutAddress: "0x873873c173E4aD264c93Ab7F41366fcD3b9303b7",
        hedaraPayoutAccount: "0x873873c173E4aD264c93Ab7F41366fcD3b9303b7",
        createdAtBlock: 35100370,
        expiresAtBlock: 35105000,
        status: "active",
      },
      {
        id: "arkiv_entity_groq_deepseek_r1",
        ownerAddress: "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21",
        ensName: "deepseek-r1-groq.shunyagrid.eth",
        model: "deepseek-r1-distill-llama-70b",
        provider: "groq",
        availableTokens: 200_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 5_000,
        humanVerified: true,
        worldIdNullifier: "0xnullifier_worldid_groq_05",
        sealedApiKey: "ENCLAVE_SEALED:mumbai-live-demo-groq-token",
        payoutAddress: "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21",
        hedaraPayoutAccount: "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21",
        createdAtBlock: 35100370,
        expiresAtBlock: 35105000,
        status: "active",
      },
    ];

    for (const node of defaultNodes) {
      this.listings.set(node.id, node);
    }
  }

  // Clear all listings from the orderbook
  public clearOrderbook(): void {
    this.listings.clear();
    this.entityMutexes.clear();
    this.saveToDisk();
    remoteOrderbookSync.pushRemoteListings([]).catch(() => {});
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
    this.loadFromDisk();

    // Prevent duplicate entries for the same seller ENS or (owner + model)
    const existing = Array.from(this.listings.values()).find(
      (l) =>
        (params.ensName && l.ensName?.toLowerCase() === params.ensName.toLowerCase()) ||
        (l.ownerAddress.toLowerCase() === params.ownerAddress.toLowerCase() &&
          l.model.toLowerCase() === params.model.toLowerCase())
    );

    if (existing) {
      Object.assign(existing, {
        ...params,
        lockedTokens: 0,
        createdAtBlock: this.currentBlock,
        expiresAtBlock: this.currentBlock + 1200,
        status: "active",
      });
      this.saveToDisk();
      remoteOrderbookSync.publishListing(existing).catch((err) => {
        console.warn("[ArkivDatabaseEngine] Background remote sync notice:", err?.message);
      });
      return existing;
    }

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
    remoteOrderbookSync.publishListing(entity).catch((err) => {
      console.warn("[ArkivDatabaseEngine] Background remote sync notice:", err?.message);
    });
    return entity;
  }

  // Query listings matching model and T_max eligibility
  public queryEligibleListings(model: string, requiredTMax: number): ArkivSellerListingEntity[] {
    this.loadFromDisk();
    const results: ArkivSellerListingEntity[] = [];
    const seenEns = new Set<string>();

    for (const listing of this.listings.values()) {
      if (listing.status !== "active") continue;
      if (listing.expiresAtBlock && listing.expiresAtBlock > 0 && this.currentBlock >= listing.expiresAtBlock) continue;
      if (listing.model.toLowerCase() !== model.toLowerCase()) continue;
      if (listing.availableTokens >= requiredTMax) {
        if (listing.ensName) {
          const key = listing.ensName.toLowerCase();
          if (seenEns.has(key)) continue;
          seenEns.add(key);
        }
        results.push(listing);
      }
    }
    // Sort by best price first
    return results.sort((a, b) => a.pricePer1kMicroUsdc - b.pricePer1kMicroUsdc);
  }

  // Query all listings for UI
  public getAllListings(): ArkivSellerListingEntity[] {
    this.loadFromDisk();
    const seenEns = new Set<string>();
    const unique: ArkivSellerListingEntity[] = [];
    for (const listing of this.listings.values()) {
      if (listing.ensName) {
        const key = listing.ensName.toLowerCase();
        if (seenEns.has(key)) continue;
        seenEns.add(key);
      }
      unique.push(listing);
    }
    return unique;
  }

  public getListingById(id: string): ArkivSellerListingEntity | undefined {
    this.loadFromDisk();
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
globalForArkiv.arkivDatabaseEngine = arkivDb;
if (arkivDb) {
  Object.setPrototypeOf(arkivDb, ArkivDatabaseEngine.prototype);
}

import crypto from "crypto";

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

// In-Memory Database simulating Arkiv Decentralized State
export class ArkivDatabaseEngine {
  private listings: Map<string, ArkivSellerListingEntity> = new Map();
  private files: Map<string, ArkivFileEntity> = new Map();
  private entityMutexes: Map<string, AsyncMutex> = new Map();
  private currentBlock: number = 19_482_100;

  constructor() {
    this.seedDefaultListings();
  }

  // Seed default human-verified sellers for instant live demo
  public seedDefaultListings() {
    const defaultListings: ArkivSellerListingEntity[] = [
      {
        id: "arkiv_entity_claude_arjun_01",
        ownerAddress: "0x71C...4e8B",
        ensName: "arjun-claude.shunyagrid.eth",
        model: "claude-3-7-sonnet",
        provider: "anthropic",
        availableTokens: 150_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 12_000, // $0.012 per 1k tokens
        humanVerified: true,
        worldIdNullifier: "0xworld_id_nullifier_arjun_verified",
        sealedApiKey: "ENCLAVE_SEALED:sk-ant-sample-key-arjun",
        hedaraPayoutAccount: "0.0.482910",
        createdAtBlock: this.currentBlock,
        expiresAtBlock: this.currentBlock + 1200,
        status: "active",
      },
      {
        id: "arkiv_entity_claude_rohan_02",
        ownerAddress: "0x44B...99Cc",
        ensName: "rohan-claude.shunyagrid.eth",
        model: "claude-3-5-sonnet",
        provider: "anthropic",
        availableTokens: 180_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 8_000, // $0.008 per 1k tokens
        humanVerified: true,
        worldIdNullifier: "0xworld_id_nullifier_rohan_verified",
        sealedApiKey: "ENCLAVE_SEALED:sk-ant-sample-key-rohan",
        hedaraPayoutAccount: "0.0.483100",
        createdAtBlock: this.currentBlock,
        expiresAtBlock: this.currentBlock + 1200,
        status: "active",
      },
      {
        id: "arkiv_entity_o3_priya_03",
        ownerAddress: "0x98A...21Df",
        ensName: "priya-o3.shunyagrid.eth",
        model: "o3-mini",
        provider: "openai",
        availableTokens: 95_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 8_000, // $0.008 per 1k tokens
        humanVerified: true,
        worldIdNullifier: "0xworld_id_nullifier_priya_verified",
        sealedApiKey: "ENCLAVE_SEALED:sk-proj-sample-key-priya",
        hedaraPayoutAccount: "0.0.491204",
        createdAtBlock: this.currentBlock,
        expiresAtBlock: this.currentBlock + 1200,
        status: "active",
      },
      {
        id: "arkiv_entity_gpt4o_vikram_04",
        ownerAddress: "0x32E...77Aa",
        ensName: "vikram-gpt4o.shunyagrid.eth",
        model: "gpt-4o",
        provider: "openai",
        availableTokens: 250_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 9_000, // $0.009 per 1k tokens
        humanVerified: true,
        worldIdNullifier: "0xworld_id_nullifier_vikram_verified",
        sealedApiKey: "ENCLAVE_SEALED:sk-proj-sample-key-vikram",
        hedaraPayoutAccount: "0.0.510392",
        createdAtBlock: this.currentBlock,
        expiresAtBlock: this.currentBlock + 1200,
        status: "active",
      },
      {
        id: "arkiv_entity_gemini_ananya_05",
        ownerAddress: "0x63F...11Ee",
        ensName: "ananya-gemini.shunyagrid.eth",
        model: "gemini-2.0-flash-thinking",
        provider: "gemini",
        availableTokens: 300_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 7_000, // $0.007 per 1k tokens
        humanVerified: true,
        worldIdNullifier: "0xworld_id_nullifier_ananya_verified",
        sealedApiKey: "ENCLAVE_SEALED:AIzaSySampleKeyAnanya",
        hedaraPayoutAccount: "0.0.528401",
        createdAtBlock: this.currentBlock,
        expiresAtBlock: this.currentBlock + 1200,
        status: "active",
      },
      {
        id: "arkiv_entity_groq_rahul_06",
        ownerAddress: "0x12D...88Ff",
        ensName: "rahul-groq.shunyagrid.eth",
        model: "deepseek-r1-distill-llama-70b",
        provider: "groq",
        availableTokens: 220_000,
        lockedTokens: 0,
        pricePer1kMicroUsdc: 6_000, // $0.006 per 1k tokens
        humanVerified: true,
        worldIdNullifier: "0xworld_id_nullifier_rahul_verified",
        sealedApiKey: "ENCLAVE_SEALED:gsk_sample_key_rahul",
        hedaraPayoutAccount: "0.0.539120",
        createdAtBlock: this.currentBlock,
        expiresAtBlock: this.currentBlock + 1200,
        status: "active",
      },
    ];

    for (const listing of defaultListings) {
      this.listings.set(listing.id, listing);
    }
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
if (process.env.NODE_ENV !== "production") globalForArkiv.arkivDatabaseEngine = arkivDb;

import { ethers } from "ethers";
import { ArkivSellerListingEntity } from "./arkivQuotaManager";

export const HASHKEY_ORDERBOOK_CONTRACT_ADDRESS =
  process.env.HASHKEY_ORDERBOOK_CONTRACT_ADDRESS ||
  process.env.NEXT_PUBLIC_HASHKEY_ORDERBOOK_CONTRACT_ADDRESS ||
  "0x26291175Fa0Ea3C8583fEdEB56805eA68289b105";

export const HASHKEY_RPC_URL =
  process.env.HASHKEY_TESTNET_RPC ||
  process.env.NEXT_PUBLIC_HASHKEY_RPC_URL ||
  "https://testnet.hsk.xyz";

export const SHUNYA_ORDERBOOK_ABI = [
  "function publishListing(string id, address ownerAddress, string ensName, string model, string provider, uint256 availableTokens, uint256 pricePer1kMicroUsdc, bool humanVerified, string sealedApiKey, address payoutAddress) external",
  "function deactivateListing(string id) external",
  "function getListingCount() external view returns (uint256)",
  "function listings(uint256) external view returns (string id, address ownerAddress, string ensName, string model, string provider, uint256 availableTokens, uint256 pricePer1kMicroUsdc, bool humanVerified, string sealedApiKey, address payoutAddress, uint256 createdAt, bool active)",
];

export class RemoteOrderbookSync {
  private contractAddress: string;
  private rpcUrl: string;
  private provider: ethers.JsonRpcProvider;
  private lastFetchedAt: number = 0;
  private cachedListings: ArkivSellerListingEntity[] = [];
  private inFlightSync: Promise<ArkivSellerListingEntity[] | null> | null = null;
  private inFlightPublishMap: Map<string, Promise<boolean>> = new Map();

  constructor(
    contractAddress: string = HASHKEY_ORDERBOOK_CONTRACT_ADDRESS,
    rpcUrl: string = HASHKEY_RPC_URL
  ) {
    this.contractAddress = contractAddress;
    this.rpcUrl = rpcUrl;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Fetches remote orderbook listings directly from HashKey Chain Horizon Testnet contract.
   * Throttled to 3 seconds in memory to prevent high RPC traffic while ensuring real-time multi-PC sync.
   */
  public async fetchRemoteListings(force: boolean = false): Promise<ArkivSellerListingEntity[] | null> {
    const now = Date.now();
    if (!force && this.cachedListings.length > 0 && now - this.lastFetchedAt < 3000) {
      return this.cachedListings;
    }

    if (this.inFlightSync) {
      return this.inFlightSync;
    }

    const fetchPromise = (async () => {
      try {
        const contract = new ethers.Contract(this.contractAddress, SHUNYA_ORDERBOOK_ABI, this.provider);
        const countBn = await contract.getListingCount();
        const count = Number(countBn);

        if (count === 0) {
          this.cachedListings = [];
          this.lastFetchedAt = now;
          return [];
        }

        // Batch fetch all on-chain listings in parallel
        const rawList = await Promise.all(
          Array.from({ length: count }, (_, i) => contract.listings(i))
        );

        const listings: ArkivSellerListingEntity[] = [];
        for (const item of rawList) {
          const isActive = Boolean(item[11]);
          if (!isActive) continue;

          listings.push({
            id: String(item[0]),
            ownerAddress: String(item[1]),
            ensName: String(item[2]),
            model: String(item[3]),
            provider: (String(item[4]).toLowerCase() as any) || "gemini",
            availableTokens: Number(item[5]),
            lockedTokens: 0,
            pricePer1kMicroUsdc: Number(item[6]),
            humanVerified: Boolean(item[7]),
            sealedApiKey: String(item[8]),
            payoutAddress: String(item[9]),
            hedaraPayoutAccount: String(item[9]),
            createdAtBlock: 35100370,
            expiresAtBlock: 35105000,
            status: "active",
          });
        }

        this.cachedListings = listings;
        this.lastFetchedAt = now;
        return listings;
      } catch (err: any) {
        console.warn("[RemoteOrderbookSync] Notice during on-chain fetch:", err?.message);
        return this.cachedListings.length > 0 ? this.cachedListings : null;
      } finally {
        this.inFlightSync = null;
      }
    })();

    this.inFlightSync = fetchPromise;
    return fetchPromise;
  }

  /**
   * Publishes an AI Seller listing entity to the HashKey Chain global orderbook contract.
   */
  public async publishListing(listing: ArkivSellerListingEntity): Promise<boolean> {
    if (this.inFlightPublishMap.has(listing.id)) {
      return this.inFlightPublishMap.get(listing.id)!;
    }

    const task = (async () => {
      try {
        const privateKey =
          process.env.HASHKEY_DEPLOYER_PRIVATE_KEY ||
          process.env.SHUNYA_TREASURY_PRIVATE_KEY ||
          process.env.OPERATOR_PRIVATE_KEY ||
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

        const wallet = new ethers.Wallet(privateKey, this.provider);
        const contract = new ethers.Contract(this.contractAddress, SHUNYA_ORDERBOOK_ABI, wallet);

        const safeOwner = ethers.isAddress(listing.ownerAddress)
          ? listing.ownerAddress
          : "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        const safePayout = ethers.isAddress(listing.payoutAddress || "")
          ? listing.payoutAddress!
          : safeOwner;

        const tx = await contract.publishListing(
          listing.id,
          safeOwner,
          listing.ensName || `${safeOwner.slice(0, 6).toLowerCase()}.shunyagrid.eth`,
          listing.model,
          listing.provider || "openai",
          BigInt(listing.availableTokens),
          BigInt(listing.pricePer1kMicroUsdc || 10000),
          Boolean(listing.humanVerified),
          listing.sealedApiKey || "ENCLAVE_SEALED:live-token",
          safePayout
        );

        await tx.wait(1);

        // Update local cache immediately
        const idx = this.cachedListings.findIndex((l) => l.id === listing.id);
        if (idx >= 0) {
          this.cachedListings[idx] = listing;
        } else {
          this.cachedListings.push(listing);
        }
        this.lastFetchedAt = Date.now();
        return true;
      } catch (err: any) {
        console.warn("[RemoteOrderbookSync] Error publishing on-chain listing:", err?.message);
        return false;
      } finally {
        this.inFlightPublishMap.delete(listing.id);
      }
    })();

    this.inFlightPublishMap.set(listing.id, task);
    return task;
  }

  /**
   * Deactivates a listing on the HashKey Chain orderbook contract.
   */
  public async deactivateListing(id: string): Promise<boolean> {
    try {
      const privateKey =
        process.env.HASHKEY_DEPLOYER_PRIVATE_KEY ||
        process.env.SHUNYA_TREASURY_PRIVATE_KEY ||
        process.env.OPERATOR_PRIVATE_KEY;

      if (!privateKey) return false;
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contract = new ethers.Contract(this.contractAddress, SHUNYA_ORDERBOOK_ABI, wallet);

      const tx = await contract.deactivateListing(id);
      await tx.wait(1);

      this.cachedListings = this.cachedListings.filter((l) => l.id !== id);
      this.lastFetchedAt = Date.now();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pushes/synchronizes multiple listings to on-chain contract.
   */
  public async pushRemoteListings(listings: ArkivSellerListingEntity[]): Promise<boolean> {
    try {
      for (const l of listings) {
        await this.publishListing(l);
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const remoteOrderbookSync = new RemoteOrderbookSync();

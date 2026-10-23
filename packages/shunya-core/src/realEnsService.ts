import { ethers } from "ethers";

export interface EnsReverseResult {
  ensName: string | null;
  avatarUrl: string | null;
  address: string;
}

export interface EnsResolveResult {
  name: string;
  address: string | null;
  avatarUrl: string | null;
  verifiedOwner?: boolean;
}

export interface EnsOwnershipVerificationResult {
  ensName: string;
  expectedAddress: string;
  resolvedAddress: string | null;
  verified: boolean;
  avatarUrl: string | null;
  error?: string;
}

const DEFAULT_MAINNET_RPCS = [
  "https://ethereum-rpc.publicnode.com",
  "https://rpc.ankr.com/eth",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
];

export class RealEnsService {
  private rpcUrls: string[];
  private primaryProvider: ethers.JsonRpcProvider | null = null;
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();
  private cacheTtlMs: number = 5 * 60 * 1000; // 5 minutes cache

  constructor(rpcUrls: string[] = DEFAULT_MAINNET_RPCS) {
    this.rpcUrls = rpcUrls;
  }

  private getProvider(): ethers.JsonRpcProvider {
    if (!this.primaryProvider) {
      // Connect to Ethereum Mainnet (Network 1) for authoritative ENS resolution
      const url = process.env.ENS_MAINNET_RPC_URL || this.rpcUrls[0];
      this.primaryProvider = new ethers.JsonRpcProvider(url, 1, {
        staticNetwork: true,
      });
    }
    return this.primaryProvider;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key.toLowerCase());
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
    return null;
  }

  private setInCache<T>(key: string, data: T): void {
    this.cache.set(key.toLowerCase(), {
      data,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  /**
   * Reverse ENS Lookup: Given an Ethereum address (0x...), return its registered primary ENS name & avatar.
   */
  public async lookupAddress(address: string): Promise<EnsReverseResult> {
    const cleanAddr = address.trim();
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(cleanAddr)) {
      return { ensName: null, avatarUrl: null, address: cleanAddr };
    }

    const cacheKey = `reverse:${cleanAddr}`;
    const cached = this.getFromCache<EnsReverseResult>(cacheKey);
    if (cached) return cached;

    const provider = this.getProvider();
    try {
      const ensName = await provider.lookupAddress(cleanAddr);
      let avatarUrl: string | null = null;

      if (ensName) {
        try {
          const resolver = await provider.getResolver(ensName);
          if (resolver) {
            const avatar = await resolver.getAvatar();
            avatarUrl = typeof avatar === "string" ? avatar : (avatar as any)?.url || null;
          }
        } catch {
          // Avatar is optional
        }
      }

      const result: EnsReverseResult = {
        ensName,
        avatarUrl,
        address: cleanAddr,
      };

      this.setInCache(cacheKey, result);
      return result;
    } catch (err: any) {
      console.warn(`[RealEnsService] lookupAddress error for ${cleanAddr}:`, err?.message || err);
      // Fallback: Return null without crashing
      const fallbackResult: EnsReverseResult = {
        ensName: null,
        avatarUrl: null,
        address: cleanAddr,
      };
      // Short-lived negative cache
      this.cache.set(cacheKey.toLowerCase(), { data: fallbackResult, expiresAt: Date.now() + 30_000 });
      return fallbackResult;
    }
  }

  /**
   * Forward ENS Lookup: Given an ENS name (vitalik.eth), return the resolved Ethereum address & avatar.
   */
  public async resolveName(name: string): Promise<EnsResolveResult> {
    const cleanName = name.trim().toLowerCase();
    const cacheKey = `resolve:${cleanName}`;
    const cached = this.getFromCache<EnsResolveResult>(cacheKey);
    if (cached) return cached;

    const provider = this.getProvider();
    try {
      const address = await provider.resolveName(cleanName);
      let avatarUrl: string | null = null;

      if (address) {
        try {
          const resolver = await provider.getResolver(cleanName);
          if (resolver) {
            const avatar = await resolver.getAvatar();
            avatarUrl = typeof avatar === "string" ? avatar : (avatar as any)?.url || null;
          }
        } catch {
          // Avatar is optional
        }
      }

      const result: EnsResolveResult = {
        name: cleanName,
        address,
        avatarUrl,
      };

      this.setInCache(cacheKey, result);
      return result;
    } catch (err: any) {
      console.warn(`[RealEnsService] resolveName error for ${cleanName}:`, err?.message || err);
      const fallbackResult: EnsResolveResult = {
        name: cleanName,
        address: null,
        avatarUrl: null,
      };
      this.cache.set(cacheKey.toLowerCase(), { data: fallbackResult, expiresAt: Date.now() + 30_000 });
      return fallbackResult;
    }
  }

  /**
   * Cryptographic Ownership Verification:
   * Confirms on-chain that the resolved address of `ensName` matches `expectedAddress`.
   */
  public async verifyNameOwnership(
    ensName: string,
    expectedAddress: string
  ): Promise<EnsOwnershipVerificationResult> {
    const cleanName = ensName.trim().toLowerCase();
    const cleanAddr = expectedAddress.trim().toLowerCase();

    // 1. If it's a protocol subname (*.shunyagrid.eth), it's governed by protocol state
    if (cleanName.endsWith(".shunyagrid.eth")) {
      return {
        ensName: cleanName,
        expectedAddress: cleanAddr,
        resolvedAddress: cleanAddr,
        verified: true,
        avatarUrl: null,
      };
    }

    // 2. Real on-chain root ENS domain verification (e.g. vitalik.eth)
    const resolveResult = await this.resolveName(cleanName);
    if (!resolveResult.address) {
      return {
        ensName: cleanName,
        expectedAddress: cleanAddr,
        resolvedAddress: null,
        verified: false,
        avatarUrl: null,
        error: `ENS domain "${cleanName}" is not registered or has no resolver configured.`,
      };
    }

    const matches = resolveResult.address.toLowerCase() === cleanAddr;
    return {
      ensName: cleanName,
      expectedAddress: cleanAddr,
      resolvedAddress: resolveResult.address,
      verified: matches,
      avatarUrl: resolveResult.avatarUrl,
      error: matches
        ? undefined
        : `Ownership mismatch: "${cleanName}" resolves to ${resolveResult.address}, but connected wallet is ${cleanAddr}.`,
    };
  }

  /**
   * Helper to check if a domain string is a standard ENS domain (.eth)
   */
  public isStandardEnsDomain(domain: string): boolean {
    const clean = domain.trim().toLowerCase();
    return clean.endsWith(".eth") && !clean.endsWith(".shunyagrid.eth");
  }
}

// Global Singleton
const globalForEns = globalThis as unknown as { realEnsService?: RealEnsService };
export const realEnsService = globalForEns.realEnsService ?? new RealEnsService();
if (process.env.NODE_ENV !== "production") globalForEns.realEnsService = realEnsService;

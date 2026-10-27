import crypto from "crypto";
import { realEnsService } from "@shunya/core";
import { anonFetchJsonRpc } from "./anonRpcClient";

export interface EnsSellerProfile {
  subname: string; // e.g. "arjun-claude.shunyagrid.eth" or "vitalik.eth"
  label: string;
  parentDomain: string; // "shunyagrid.eth" or "eth"
  ownerAddress: string;
  isRealEns?: boolean;
  avatarUrl?: string | null;
  textRecords: {
    "com.shunyagrid.payoutAccount": string;
    "com.shunyagrid.models": string;
    "com.shunyagrid.enclaveKeyFingerprint": string;
    [key: string]: string;
  };
  createdAtIso: string;
}

class EnsNamespaceManager {
  private static instance: EnsNamespaceManager;
  private subnames: Map<string, EnsSellerProfile> = new Map();
  private parentDomain: string;
  private rpcUrl: string;

  private constructor() {
    this.parentDomain = process.env.NEXT_PUBLIC_ENS_PARENT_DOMAIN || "shunyagrid.eth";
    this.rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
    this.seedDefaultRecords();
  }

  public static getInstance(): EnsNamespaceManager {
    if (!EnsNamespaceManager.instance) {
      EnsNamespaceManager.instance = new EnsNamespaceManager();
    }
    return EnsNamespaceManager.instance;
  }

  private seedDefaultRecords(): void {
    // Dynamic registry: starts clean for authentic registrations
  }

  public async registerSubname(params: {
    label: string;
    ownerAddress: string;
    payoutAccount: string;
    supportedModels: string[];
    enclavePublicKeyPem?: string;
    avatarUrl?: string | null;
    isRealEns?: boolean;
  }): Promise<EnsSellerProfile> {
    const rawLabel = params.label.trim().toLowerCase();
    let subname = rawLabel;
    let parent = this.parentDomain;
    const isRealEns = Boolean(params.isRealEns || (rawLabel.endsWith(".eth") && !rawLabel.endsWith(".shunyagrid.eth")));

    if (!isRealEns) {
      const cleanLabel = rawLabel.replace(/[^a-z0-9-]/g, "");
      subname = `${cleanLabel}.${this.parentDomain}`;
    } else {
      parent = "eth";
    }

    const fingerprint = params.enclavePublicKeyPem
      ? crypto.createHash("sha256").update(params.enclavePublicKeyPem).digest("hex")
      : crypto.createHash("sha256").update("SHUNYAGRID_ENCLAVE_KEY").digest("hex");

    const profile: EnsSellerProfile = {
      subname,
      label: rawLabel,
      parentDomain: parent,
      ownerAddress: params.ownerAddress,
      isRealEns,
      avatarUrl: params.avatarUrl || null,
      textRecords: {
        "com.shunyagrid.payoutAccount": params.payoutAccount,
        "com.shunyagrid.models": params.supportedModels.join(","),
        "com.shunyagrid.enclaveKeyFingerprint": fingerprint,
      },
      createdAtIso: new Date().toISOString(),
    };

    this.subnames.set(subname, profile);
    return profile;
  }

  public async resolveSubname(subname: string): Promise<EnsSellerProfile | null> {
    const normalized = subname.toLowerCase().trim();

    // 1. Check local registry
    const local = this.subnames.get(normalized);
    if (local) return local;

    // 2. If it's a real ENS name (.eth), resolve on-chain via realEnsService
    if (normalized.endsWith(".eth") && !normalized.endsWith(".shunyagrid.eth")) {
      const onChain = await realEnsService.resolveName(normalized);
      if (onChain.address) {
        const profile: EnsSellerProfile = {
          subname: normalized,
          label: normalized.replace(/\.eth$/, ""),
          parentDomain: "eth",
          ownerAddress: onChain.address,
          isRealEns: true,
          avatarUrl: onChain.avatarUrl,
          textRecords: {
            "com.shunyagrid.payoutAccount": "",
            "com.shunyagrid.models": "",
            "com.shunyagrid.enclaveKeyFingerprint": "",
          },
          createdAtIso: new Date().toISOString(),
        };
        this.subnames.set(normalized, profile);
        return profile;
      }
    }

    // 3. Fallback Anon-RPC metadata query
    try {
      await anonFetchJsonRpc(
        this.rpcUrl,
        "ens_resolve",
        [normalized],
        true
      );
    } catch {}

    return null;
  }

  public async getTextRecord(subname: string, key: string): Promise<string | null> {
    const profile = await this.resolveSubname(subname);
    return profile?.textRecords[key] || null;
  }

  public getAllSubnames(): EnsSellerProfile[] {
    return Array.from(this.subnames.values());
  }
}

export const ensNamespace = EnsNamespaceManager.getInstance();

export async function registerEnsSubname(params: {
  label: string;
  ownerAddress: string;
  payoutAccount: string;
  supportedModels: string[];
  enclavePublicKeyPem?: string;
  avatarUrl?: string | null;
  isRealEns?: boolean;
}) {
  return ensNamespace.registerSubname(params);
}

export async function resolveEnsSubname(subname: string) {
  return ensNamespace.resolveSubname(subname);
}

export async function getEnsTextRecord(subname: string, key: string) {
  return ensNamespace.getTextRecord(subname, key);
}

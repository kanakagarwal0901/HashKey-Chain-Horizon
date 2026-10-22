import crypto from "crypto";
import { anonFetchJsonRpc } from "./anonRpcClient";

export interface EnsSellerProfile {
  subname: string; // e.g. "arjun-claude.shunyagrid.eth"
  label: string;
  parentDomain: string; // "shunyagrid.eth"
  ownerAddress: string;
  textRecords: {
    "com.shunyagrid.hederaAccount": string;
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
    // ENS Subname registry initialized clean; records are dynamically registered by authentic sellers
  }

  public async registerSubname(params: {
    label: string;
    ownerAddress: string;
    hederaAccountId: string;
    supportedModels: string[];
    enclavePublicKeyPem?: string;
  }): Promise<EnsSellerProfile> {
    const cleanLabel = params.label.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const subname = `${cleanLabel}.${this.parentDomain}`;

    const fingerprint = params.enclavePublicKeyPem
      ? crypto.createHash("sha256").update(params.enclavePublicKeyPem).digest("hex")
      : crypto.createHash("sha256").update("SHUNYAGRID_ENCLAVE_KEY").digest("hex");

    const profile: EnsSellerProfile = {
      subname,
      label: cleanLabel,
      parentDomain: this.parentDomain,
      ownerAddress: params.ownerAddress,
      textRecords: {
        "com.shunyagrid.hederaAccount": params.hederaAccountId,
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

    // Route query through AnonRpcRouter to anonymize caller IP
    await anonFetchJsonRpc(
      this.rpcUrl,
      "ens_resolve",
      [normalized],
      true // isUserSpecificRead = true (Anon-RPC Worker)
    );

    return this.subnames.get(normalized) || null;
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
  hederaAccountId: string;
  supportedModels: string[];
  enclavePublicKeyPem?: string;
}) {
  return ensNamespace.registerSubname(params);
}

export async function resolveEnsSubname(subname: string) {
  return ensNamespace.resolveSubname(subname);
}

export async function getEnsTextRecord(subname: string, key: string) {
  return ensNamespace.getTextRecord(subname, key);
}

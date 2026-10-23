import { realEnsService } from "./realEnsService";

export interface EnsSubnameRecord {
  subname: string; // e.g. "arjun-claude.shunyagrid.eth" or "alice.eth"
  ownerAddress: string;
  hedaraPayoutAccount: string;
  supportedModel: string;
  reputationScore: number;
  isRealEns?: boolean;
  avatarUrl?: string | null;
  createdAt: string;
}

export class EnsNamespaceService {
  private records: Map<string, EnsSubnameRecord> = new Map();

  constructor() {
    this.seedDefaultNames();
  }

  private seedDefaultNames() {
    // Dynamic registry: starts clean for authentic registrations
  }

  /**
   * Register a subname (e.g. node-e17f.shunyagrid.eth) or link a verified real ENS domain (e.g. alice.eth)
   */
  public mintSubname(params: {
    label: string; // e.g. "dev-bot" or "alice.eth"
    ownerAddress: string;
    hedaraPayoutAccount: string;
    supportedModel: string;
    isRealEns?: boolean;
    avatarUrl?: string | null;
  }): EnsSubnameRecord {
    let subname = params.label.trim().toLowerCase();

    // If it's already an authentic .eth domain
    if (subname.endsWith(".eth") && !subname.endsWith(".shunyagrid.eth")) {
      const record: EnsSubnameRecord = {
        subname,
        ownerAddress: params.ownerAddress,
        hedaraPayoutAccount: params.hedaraPayoutAccount,
        supportedModel: params.supportedModel,
        reputationScore: 100,
        isRealEns: true,
        avatarUrl: params.avatarUrl || null,
        createdAt: new Date().toISOString(),
      };
      this.records.set(subname, record);
      return record;
    }

    // Otherwise format as standard ShunyaGrid subname
    const cleanLabel = subname.replace(/[^a-z0-9-]/g, "");
    subname = `${cleanLabel}.shunyagrid.eth`;

    const record: EnsSubnameRecord = {
      subname,
      ownerAddress: params.ownerAddress,
      hedaraPayoutAccount: params.hedaraPayoutAccount,
      supportedModel: params.supportedModel,
      reputationScore: 100,
      isRealEns: false,
      avatarUrl: params.avatarUrl || null,
      createdAt: new Date().toISOString(),
    };
    this.records.set(subname, record);
    return record;
  }

  public async resolveSubname(subname: string): Promise<EnsSubnameRecord | undefined> {
    const clean = subname.toLowerCase().trim();
    const local = this.records.get(clean);
    if (local) return local;

    // If it's a real ENS domain, resolve on-chain via realEnsService
    if (clean.endsWith(".eth") && !clean.endsWith(".shunyagrid.eth")) {
      const live = await realEnsService.resolveName(clean);
      if (live.address) {
        return {
          subname: clean,
          ownerAddress: live.address,
          hedaraPayoutAccount: "",
          supportedModel: "",
          reputationScore: 100,
          isRealEns: true,
          avatarUrl: live.avatarUrl,
          createdAt: new Date().toISOString(),
        };
      }
    }

    return undefined;
  }

  public getAllSubnames(): EnsSubnameRecord[] {
    return Array.from(this.records.values());
  }
}

// Global Singleton
const globalForEns = globalThis as unknown as { ensService?: EnsNamespaceService };
export const ensService = globalForEns.ensService ?? new EnsNamespaceService();
if (process.env.NODE_ENV !== "production") globalForEns.ensService = ensService;

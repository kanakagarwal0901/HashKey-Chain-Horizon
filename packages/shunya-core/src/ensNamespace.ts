export interface EnsSubnameRecord {
  subname: string; // e.g. "arjun-claude.shunyagrid.eth"
  ownerAddress: string;
  hedaraPayoutAccount: string;
  supportedModel: string;
  reputationScore: number;
  createdAt: string;
}

export class EnsNamespaceService {
  private records: Map<string, EnsSubnameRecord> = new Map();

  constructor() {
    this.seedDefaultNames();
  }

  private seedDefaultNames() {
    this.records.set("arjun-claude.shunyagrid.eth", {
      subname: "arjun-claude.shunyagrid.eth",
      ownerAddress: "0x71C2a8b940e4e8B",
      hedaraPayoutAccount: "0.0.482910",
      supportedModel: "claude-3-7-sonnet",
      reputationScore: 99,
      createdAt: new Date().toISOString(),
    });
    this.records.set("priya-o3.shunyagrid.eth", {
      subname: "priya-o3.shunyagrid.eth",
      ownerAddress: "0x98A1231f21Df",
      hedaraPayoutAccount: "0.0.491204",
      supportedModel: "o3-mini",
      reputationScore: 98,
      createdAt: new Date().toISOString(),
    });
    this.records.set("vikram-gpt4o.shunyagrid.eth", {
      subname: "vikram-gpt4o.shunyagrid.eth",
      ownerAddress: "0x32E9042a77Aa",
      hedaraPayoutAccount: "0.0.510392",
      supportedModel: "gpt-4o",
      reputationScore: 100,
      createdAt: new Date().toISOString(),
    });
  }

  // Mint subname via Namespace SDK simulation
  public mintSubname(params: {
    label: string; // e.g. "dev-bot"
    ownerAddress: string;
    hedaraPayoutAccount: string;
    supportedModel: string;
  }): EnsSubnameRecord {
    const cleanLabel = params.label.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const subname = `${cleanLabel}.shunyagrid.eth`;
    const record: EnsSubnameRecord = {
      subname,
      ownerAddress: params.ownerAddress,
      hedaraPayoutAccount: params.hedaraPayoutAccount,
      supportedModel: params.supportedModel,
      reputationScore: 100,
      createdAt: new Date().toISOString(),
    };
    this.records.set(subname, record);
    return record;
  }

  public resolveSubname(subname: string): EnsSubnameRecord | undefined {
    return this.records.get(subname.toLowerCase());
  }

  public getAllSubnames(): EnsSubnameRecord[] {
    return Array.from(this.records.values());
  }
}

// Global Singleton
const globalForEns = globalThis as unknown as { ensService?: EnsNamespaceService };
export const ensService = globalForEns.ensService ?? new EnsNamespaceService();
if (process.env.NODE_ENV !== "production") globalForEns.ensService = ensService;

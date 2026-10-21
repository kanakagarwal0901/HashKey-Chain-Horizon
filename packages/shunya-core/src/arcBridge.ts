import crypto from "crypto";

export interface ArcBridgeTransaction {
  id: string;
  sourceChain: "hedera";
  destinationChain: "arc" | "arbitrum" | "base" | "optimism" | "ethereum";
  amountUsdc: number;
  recipientAddress: string;
  cctpMessageBytes: string;
  cctpAttestation: string;
  status: "minted_on_destination" | "pending_attestation" | "burned_on_source";
  txHash: string;
  timestamp: string;
}

export class ArcBridgeService {
  private transactions: ArcBridgeTransaction[] = [];

  constructor() {
    this.seedDefaultTransactions();
  }

  private seedDefaultTransactions() {
    this.transactions.push({
      id: "arc_cctp_01",
      sourceChain: "hedera",
      destinationChain: "arc",
      amountUsdc: 45.5,
      recipientAddress: "0x71C2a8b940e4e8B",
      cctpMessageBytes: "0x000000030000000000000000000000000000000000000000",
      cctpAttestation: "0xattest_circle_cctp_valid_burn_signature_sample",
      status: "minted_on_destination",
      txHash: "0x892a01d98124801b924081029481902481029481",
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    });
  }

  // Initiate Circle CCTP sweep from Hedera to Arc / other EVM chains
  public initiateCctpBridge(params: {
    destinationChain: "arc" | "arbitrum" | "base" | "optimism" | "ethereum";
    amountUsdc: number;
    recipientAddress: string;
  }): ArcBridgeTransaction {
    const id = `arc_cctp_${crypto.randomBytes(6).toString("hex")}`;
    const txHash = "0x" + crypto.randomBytes(32).toString("hex");
    const cctpMessageBytes = "0x00000003" + crypto.randomBytes(28).toString("hex");
    const cctpAttestation = "0x" + crypto.randomBytes(65).toString("hex");

    const bridgeTx: ArcBridgeTransaction = {
      id,
      sourceChain: "hedera",
      destinationChain: params.destinationChain,
      amountUsdc: params.amountUsdc,
      recipientAddress: params.recipientAddress,
      cctpMessageBytes,
      cctpAttestation,
      status: "minted_on_destination",
      txHash,
      timestamp: new Date().toISOString(),
    };

    this.transactions.unshift(bridgeTx);
    return bridgeTx;
  }

  public getBridgeHistory(): ArcBridgeTransaction[] {
    return this.transactions;
  }
}

// Global Singleton
const globalForArc = globalThis as unknown as { arcBridgeService?: ArcBridgeService };
export const arcBridgeService = globalForArc.arcBridgeService ?? new ArcBridgeService();
if (process.env.NODE_ENV !== "production") globalForArc.arcBridgeService = arcBridgeService;

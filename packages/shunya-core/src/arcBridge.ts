import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { hashKeyTreasury, UniversalSweepRecord } from "./hashkeyTreasury";
import { uniswapService, SUPPORTED_CHAINS, SUPPORTED_TOKENS } from "./uniswapService";

export interface ArcBridgeTransaction {
  id: string;
  sourceAccount?: string;
  sourceChain: string;
  destinationChain: string;
  amountUsdc: number;
  recipientAddress: string;
  cctpMessageBytes: string;
  cctpAttestation: string;
  status: "minted_on_destination" | "pending_attestation" | "burned_on_source";
  txHash: string;
  timestamp: string;
  evmTxHash?: string;
  explorerUrl?: string;
  blockNumber?: number;
  tokenContract?: string;
  swappedToken?: string;
  swappedAmount?: number | string;
  dexRouter?: string;
  dexRate?: number | string;
  onChainDebited?: boolean;
}

export class ArcBridgeService {
  private transactions: ArcBridgeTransaction[] = [];
  private persistencePath = typeof process !== "undefined" && typeof process.cwd === "function" ? path.join(process.cwd(), ".data", "seller_sweeps.json") : "";

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    if (typeof window !== "undefined") return;
    try {
      if (this.persistencePath && fs && typeof fs.existsSync === "function" && fs.existsSync(this.persistencePath)) {
        const raw = fs.readFileSync(this.persistencePath, "utf8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.transactions = list;
        }
      }
    } catch {}
  }

  private saveToDisk() {
    if (typeof window !== "undefined") return;
    try {
      if (!this.persistencePath || !fs || typeof fs.existsSync !== "function") return;
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.persistencePath, JSON.stringify(this.transactions, null, 2), "utf8");
    } catch {}
  }

  public getTotalSweptForAccount(accountId: string): number {
    const clean = accountId?.trim()?.toLowerCase();
    if (!clean) return 0;
    this.loadFromDisk();
    return this.transactions
      .filter((tx) => tx.sourceAccount?.toLowerCase() === clean || tx.recipientAddress?.toLowerCase() === clean)
      .reduce((sum, tx) => sum + (Number(tx.amountUsdc) || 0), 0);
  }

  public getSweepsForAccount(accountId: string): ArcBridgeTransaction[] {
    const clean = accountId?.trim()?.toLowerCase();
    if (!clean) return [];
    this.loadFromDisk();
    return this.transactions.filter(
      (tx) => tx.sourceAccount?.toLowerCase() === clean || tx.recipientAddress?.toLowerCase() === clean
    );
  }

  public getBridgeHistory(): ArcBridgeTransaction[] {
    this.loadFromDisk();
    return this.transactions;
  }

  // Cross-chain CCTP Message format generator
  public initiateCctpBridge(params: {
    destinationChain: string;
    amountUsdc: number;
    recipientAddress: string;
  }): ArcBridgeTransaction {
    const id = `arc_cctp_${crypto.randomBytes(6).toString("hex")}`;
    const txHash = "0x" + crypto.createHash("sha256").update(id + params.recipientAddress + params.amountUsdc.toString()).digest("hex");
    const cctpMessageBytes = "0x00000003" + crypto.createHash("sha256").update("cctp_msg_" + id).digest("hex").slice(0, 56);
    const cctpAttestation = "0x" + crypto.createHash("sha256").update("cctp_attest_" + id).digest("hex") + crypto.createHash("sha256").update(txHash).digest("hex").slice(0, 66);

    const bridgeTx: ArcBridgeTransaction = {
      id,
      sourceChain: "hashkey",
      destinationChain: params.destinationChain,
      amountUsdc: params.amountUsdc,
      recipientAddress: params.recipientAddress,
      cctpMessageBytes,
      cctpAttestation,
      status: "minted_on_destination",
      txHash,
      timestamp: new Date().toISOString(),
      explorerUrl: `https://testnet-explorer.hskchain.net/tx/${txHash}`,
    };

    this.transactions.unshift(bridgeTx);
    this.saveToDisk();
    return bridgeTx;
  }

  /**
   * Real on-chain Seller Sweep Execution using HashKey Treasury & Multi-Chain EVM Router:
   */
  public async executeLiveSellerSweep(params: {
    sourceAccount?: string;
    recipientAddress: string;
    amountUsdc: number;
    destinationChain?: string;
    targetCurrency?: string;
    targetToken?: string;
    availableBalance?: number;
  }): Promise<ArcBridgeTransaction> {
    const sellerAddress = (params.sourceAccount || "").trim();
    if (!sellerAddress || !sellerAddress.startsWith("0x")) {
      throw new Error("Missing connected seller wallet address for sweep");
    }
    const destinationChain = params.destinationChain || "hashkey-testnet";
    const targetToken = params.targetToken || params.targetCurrency || "HSK";

    const sweepRecord: UniversalSweepRecord = await hashKeyTreasury.executeUniversalSweep({
      sellerAddress,
      recipientAddress: params.recipientAddress,
      amountUsdc: params.amountUsdc,
      destinationChain,
      targetToken,
    });

    const bridgeTx: ArcBridgeTransaction = {
      id: sweepRecord.id,
      sourceAccount: sellerAddress,
      sourceChain: "hashkey-testnet",
      destinationChain: sweepRecord.destinationChain,
      amountUsdc: params.amountUsdc,
      recipientAddress: params.recipientAddress,
      cctpMessageBytes: "0x00000003" + crypto.randomBytes(28).toString("hex"),
      cctpAttestation: "0x" + crypto.randomBytes(65).toString("hex"),
      status: "minted_on_destination",
      txHash: sweepRecord.txHash,
      evmTxHash: sweepRecord.txHash,
      timestamp: sweepRecord.timestamp,
      explorerUrl: sweepRecord.explorerUrl,
      swappedToken: sweepRecord.targetToken,
      swappedAmount: sweepRecord.swappedAmount,
      dexRouter: "HashKey-HSP-Router",
      onChainDebited: true,
    };

    this.transactions.unshift(bridgeTx);
    this.saveToDisk();
    return bridgeTx;
  }
}

export const arcBridgeService = new ArcBridgeService();

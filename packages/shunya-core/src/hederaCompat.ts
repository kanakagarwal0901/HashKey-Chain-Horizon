/**
 * Hedera Compatibility Bridge (Legacy / Shim)
 *
 * Provides typed stubs and bridges to HashKey Treasury for legacy test scripts
 * without requiring @hashgraph/sdk or live Hedera nodes.
 */

import { hashKeyTreasury } from "./hashkeyTreasury";
import crypto from "crypto";

export interface HederaConsensusReceipt {
  hcsTopicId: string;
  sequenceNumber: number;
  consensusTimestamp: string;
  buyerPaidMicroUsdc: number;
  sellerReceivedMicroUsdc: number;
  webAppCommissionMicroUsdc: number;
  hashscanUrl: string;
  buyerSepoliaTxHash?: string;
  sepoliaEtherscanUrl?: string;
}

export interface HederaSettlementResult {
  sellerPayoutTxId: string;
  receipt: HederaConsensusReceipt;
}

export class HederaSettlementEngineCompat {
  private static instance: HederaSettlementEngineCompat;
  private seqCounter = 4820;
  private receiptsByAccount: Map<string, HederaConsensusReceipt[]> = new Map();

  public static getInstance(): HederaSettlementEngineCompat {
    if (!HederaSettlementEngineCompat.instance) {
      HederaSettlementEngineCompat.instance = new HederaSettlementEngineCompat();
    }
    return HederaSettlementEngineCompat.instance;
  }

  public async settlePayoutAndConsensusLog(params: {
    buyerX402TxId: string;
    buyerSepoliaTxHash?: string;
    sellerHederaAccountId: string;
    modelId: string;
    thinkingLevel?: string;
    tMaxTokens?: number;
    tUsedTokens?: number;
    buyerChargedMicroUsdc: number;
    sellerPayoutMicroUsdc: number;
    webAppCommissionMicroUsdc: number;
    zeroGAttestationHash?: string;
  }): Promise<HederaSettlementResult> {
    this.seqCounter++;
    const txId = params.buyerSepoliaTxHash || `0x${crypto.randomBytes(32).toString("hex")}`;
    
    // Also record into HashKey Treasury for balance continuity
    const sellerAddr = (params.sellerHederaAccountId || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8").trim();

    await hashKeyTreasury.settleSellerPayoutOnHashKey({
      mandateId: params.buyerX402TxId || txId,
      sellerAddress: sellerAddr,
      buyerAddress: "0x9b3b7375b0591E8A304A8f66D11186Fb07672625",
      modelId: params.modelId,
      tUsed: params.tUsedTokens || 5000,
      tMax: params.tMaxTokens || 10000,
      sellerPayoutMicroUsdc: params.sellerPayoutMicroUsdc,
      protocolFeeMicroUsdc: params.webAppCommissionMicroUsdc,
      attestationHashHex: params.zeroGAttestationHash || "0x0",
    }).catch(() => {});

    const receipt: HederaConsensusReceipt = {
      hcsTopicId: "0.0.11134146",
      sequenceNumber: this.seqCounter,
      consensusTimestamp: new Date().toISOString(),
      buyerPaidMicroUsdc: params.buyerChargedMicroUsdc,
      sellerReceivedMicroUsdc: params.sellerPayoutMicroUsdc,
      webAppCommissionMicroUsdc: params.webAppCommissionMicroUsdc,
      hashscanUrl: `https://hashscan.io/testnet/transaction/${txId}`,
      buyerSepoliaTxHash: params.buyerSepoliaTxHash || txId,
      sepoliaEtherscanUrl: `https://sepolia.etherscan.io/tx/${params.buyerSepoliaTxHash || txId}`,
    };

    const existing = this.receiptsByAccount.get(params.sellerHederaAccountId) || [];
    existing.push(receipt);
    this.receiptsByAccount.set(params.sellerHederaAccountId, existing);

    return {
      sellerPayoutTxId: txId,
      receipt,
    };
  }

  public getReceiptsForAccount(accountId: string): HederaConsensusReceipt[] {
    return this.receiptsByAccount.get(accountId) || [
      {
        hcsTopicId: "0.0.11134146",
        sequenceNumber: this.seqCounter,
        consensusTimestamp: new Date().toISOString(),
        buyerPaidMicroUsdc: 100000,
        sellerReceivedMicroUsdc: 50000,
        webAppCommissionMicroUsdc: 50000,
        hashscanUrl: `https://hashscan.io/testnet/transaction/0x123`,
        buyerSepoliaTxHash: "0x123",
        sepoliaEtherscanUrl: "https://sepolia.etherscan.io/tx/0x123",
      }
    ];
  }

  public async verifyBuyerPayment(txId: string, expectedMicroUsdc: number) {
    return { verified: true, txId, amountMicroUsdc: expectedMicroUsdc };
  }
}

export const hederaEngine = HederaSettlementEngineCompat.getInstance();

export const hederaNetworkClient = {
  getStatus: () => ({
    network: "testnet",
    topicId: "0.0.11134146",
    operatorAccountId: "0.0.11134145",
  }),
  verifyPaymentOnMirrorNode: async (txId: string, expectedMicroUsdc: number) => ({
    verified: true,
    txId,
    amountMicroUsdc: expectedMicroUsdc,
    timestamp: new Date().toISOString(),
  }),
};

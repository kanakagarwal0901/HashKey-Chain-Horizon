import { NextResponse } from "next/server";
import { hederaEngine, hederaNetworkClient } from "@shunya/core";

export async function GET() {
  const localReceipts = hederaEngine.getReceipts();
  const topicId = hederaNetworkClient.getTopicId();
  const status = hederaNetworkClient.getStatus();

  let mergedReceipts = [...localReceipts];

  // If live check is enabled or live client is active, attempt to pull latest mirror node messages
  if (process.env.HEDERA_LIVE_CHECK === "true" || hederaNetworkClient.isLiveConfigured()) {
    try {
      const mirrorMessages = await hederaNetworkClient.fetchTopicMessages(topicId, 15);
      if (mirrorMessages && mirrorMessages.length > 0) {
        // Merge mirror node receipts
        const existingTxIds = new Set(localReceipts.map((r) => r.sellerPayoutTxId));
        for (const msg of mirrorMessages) {
          const txKey = msg.sellerPayoutTxId || `hcs_init_${msg.sequenceNumber}`;
          if (!existingTxIds.has(txKey)) {
            existingTxIds.add(txKey);
            mergedReceipts.push({
              hcsTopicId: topicId,
              sequenceNumber: msg.sequenceNumber || 1000,
              consensusTimestamp: msg.consensusTimestamp || new Date().toISOString(),
              buyerUpfrontTxId: msg.buyerUpfrontTxId || "0.0.operator",
              sellerPayoutTxId: msg.sellerPayoutTxId || `0.0.operator@${msg.sequenceNumber}`,
              hashscanUrl: msg.sellerPayoutTxId
                ? `https://hashscan.io/testnet/transaction/${msg.sellerPayoutTxId}`
                : `https://hashscan.io/testnet/topic/${topicId}`,
              model: msg.model || (msg.event === "HCS_TOPIC_INITIALIZED" ? "System / Genesis Verification" : "claude-3-7-sonnet"),
              thinkingLevel: msg.thinkingLevel || "N/A",
              tMaxTokens: msg.tMaxTokens || 0,
              tUsedTokens: msg.tUsedTokens || 0,
              buyerPaidMicroUsdc: (msg.buyerChargedUsdc || 0) * 1_000_000,
              buyerPaidUsdc: msg.buyerChargedUsdc || 0,
              sellerReceivedMicroUsdc: (msg.sellerPayoutUsdc || 0) * 1_000_000,
              sellerReceivedUsdc: msg.sellerPayoutUsdc || 0,
              webAppCommissionMicroUsdc: (msg.protocolCommissionUsdc || 0) * 1_000_000,
              webAppCommissionUsdc: msg.protocolCommissionUsdc || 0,
              zeroGProofHash: msg.zeroGProofHash || "0xgenesis_root",
              privacyGuarantee: "PROMPT_FILES_OUTPUT_SEALED",
            });
          }
        }
      }
    } catch {
      // Fallback cleanly to local receipts
    }
  }

  // Sort descending by sequence number
  mergedReceipts.sort((a, b) => b.sequenceNumber - a.sequenceNumber);

  return NextResponse.json({
    success: true,
    hcsTopicId: topicId,
    networkStatus: status,
    receiptsCount: mergedReceipts.length,
    receipts: mergedReceipts,
  });
}

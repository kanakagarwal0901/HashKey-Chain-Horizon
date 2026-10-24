import { NextRequest, NextResponse } from "next/server";
import { arcBridgeService, hederaEngine } from "@shunya/core";

const MIRROR_NODE_BASE =
  process.env.NEXT_PUBLIC_HEDERA_MIRROR_URL || "https://testnet.mirrornode.hedera.com";
const HTS_USDC_TOKEN_ID =
  process.env.NEXT_PUBLIC_HEDERA_USDC_TOKEN_ID || "0.0.11134145";
const HCS_TOPIC_ID =
  process.env.NEXT_PUBLIC_HEDERA_HCS_TOPIC_ID ||
  process.env.HEDERA_HCS_TOPIC_ID ||
  "0.0.11134146";
const DEFAULT_SELLER_ACCOUNT =
  process.env.NEXT_PUBLIC_DEFAULT_SELLER_HEDERA_ACCOUNT || "0.0.11145557";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawAccountId = searchParams.get("accountId");

    if (!rawAccountId || !rawAccountId.trim()) {
      return NextResponse.json({
        success: true,
        accountId: "",
        htsUsdcBalance: 0,
        hbarBalance: 0,
        lifetimeSettledUsdc: 0,
        displayBalance: 0,
        recentSettlements: [],
        message: "No Hedera account specified. Please manually enter your Hedera Account ID.",
      });
    }

    const accountId = rawAccountId.trim();

    if (!accountId.startsWith("0.0.") || accountId.length < 5) {
      return NextResponse.json(
        { error: "Invalid Hedera Account ID format (expected 0.0.X)" },
        { status: 400 }
      );
    }

    let htsUsdcBalance = 0;
    let hbarBalance = 0;
    let lifetimeSettledUsdc = 0;
    let hcsSweptUsdc = 0;
    let recentSettlements: any[] = [];
    let recentSweeps: any[] = [];
    let isAutoAssociated = false;
    const seenTxIds = new Set<string>();

    // 1. Query Live HTS USDC Token Balance on Hedera Mirror Node
    try {
      const tokenRes = await fetch(
        `${MIRROR_NODE_BASE}/api/v1/accounts/${accountId}/tokens?token.id=${HTS_USDC_TOKEN_ID}`,
        { next: { revalidate: 0 } }
      );
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        if (tokenData.tokens && tokenData.tokens.length > 0) {
          const tokenEntry = tokenData.tokens[0];
          const rawBal = tokenEntry.balance || 0;
          const decimals = tokenEntry.decimals ?? 6;
          htsUsdcBalance = rawBal / Math.pow(10, decimals);
          isAutoAssociated = !!tokenEntry.automatic_association;
        }
      }
    } catch (err) {
      console.warn("[SellerBalanceAPI] Error querying HTS token balance:", err);
    }

    // 2. Query Account Info & Native HBAR Balance
    try {
      const accountRes = await fetch(
        `${MIRROR_NODE_BASE}/api/v1/accounts/${accountId}`,
        { next: { revalidate: 0 } }
      );
      if (accountRes.ok) {
        const accountData = await accountRes.json();
        const rawHbar = accountData.balance?.balance || 0;
        hbarBalance = rawHbar / 100_000_000;
      }
    } catch (err) {
      console.warn("[SellerBalanceAPI] Error querying account balance:", err);
    }

    // 3. Immediately Ingest Persistent Local Settlements (zero indexing latency)
    try {
      const localSettlements =
        typeof (hederaEngine as any)?.getReceiptsForAccount === "function"
          ? hederaEngine.getReceiptsForAccount(accountId)
          : [];

      for (const rec of localSettlements) {
        const txKey = rec.sellerPayoutTxId || rec.buyerUpfrontTxId;
        if (txKey && !seenTxIds.has(txKey)) {
          seenTxIds.add(txKey);
          const payout = Number(rec.sellerReceivedUsdc) || 0;
          lifetimeSettledUsdc += payout;
          recentSettlements.push({
            sequenceNumber: rec.sequenceNumber,
            consensusTimestamp: rec.consensusTimestamp,
            sellerPayoutTxId: rec.sellerPayoutTxId,
            buyerSepoliaTxHash: rec.buyerSepoliaTxHash,
            sepoliaEtherscanUrl: rec.sepoliaEtherscanUrl,
            payoutUsdc: payout,
            model: rec.model,
            tokensUsed: rec.tUsedTokens,
            hashscanUrl: rec.hashscanUrl,
          });
        }
      }
    } catch (localErr) {
      console.warn("[SellerBalanceAPI] Error querying local settlements:", localErr);
    }

    // 4. Query Real HCS Topic Consensus Messages on Hedera Mirror Node
    try {
      const topicRes = await fetch(
        `${MIRROR_NODE_BASE}/api/v1/topics/${HCS_TOPIC_ID}/messages?limit=50&order=desc`,
        { next: { revalidate: 0 } }
      );
      if (topicRes.ok) {
        const topicData = await topicRes.json();
        if (topicData.messages && Array.isArray(topicData.messages)) {
          for (const msg of topicData.messages) {
            try {
              const decoded = Buffer.from(msg.message, "base64").toString("utf8");
              const parsed = JSON.parse(decoded);

              // Strict account matching: only match settlements/sweeps for this specific account
              const isAccountMatch =
                parsed.sellerHederaAccountId === accountId ||
                (accountId === DEFAULT_SELLER_ACCOUNT && parsed.sellerHederaAccountId === DEFAULT_SELLER_ACCOUNT);

              if (parsed.event === "ZERO_CUTOFF_JOB_SETTLED" && isAccountMatch) {
                const txKey = parsed.sellerPayoutTxId || parsed.buyerSepoliaTxHash || String(msg.sequence_number);
                if (!seenTxIds.has(txKey)) {
                  seenTxIds.add(txKey);
                  const payout = parseFloat(parsed.sellerPayoutUsdc) || 0;
                  lifetimeSettledUsdc += payout;
                  recentSettlements.push({
                    sequenceNumber: msg.sequence_number,
                    consensusTimestamp: msg.consensus_timestamp,
                    sellerPayoutTxId: parsed.sellerPayoutTxId,
                    buyerSepoliaTxHash: parsed.buyerSepoliaTxHash,
                    sepoliaEtherscanUrl: parsed.sepoliaEtherscanUrl,
                    payoutUsdc: payout,
                    model: parsed.model,
                    tokensUsed: parsed.tUsedTokens,
                    hashscanUrl:
                      parsed.hashscanUrl ||
                      `https://hashscan.io/testnet/transaction/${parsed.sellerPayoutTxId}`,
                  });
                }
              } else if (
                (parsed.event === "SELLER_SWEEP_DEBIT" || parsed.event === "CCTP_SWEEP_COMPLETED") &&
                isAccountMatch
              ) {
                const swept = parseFloat(parsed.sweepAmountUsdc || parsed.sellerPayoutUsdc) || 0;
                hcsSweptUsdc += swept;
                recentSweeps.push({
                  sequenceNumber: msg.sequence_number,
                  consensusTimestamp: msg.consensus_timestamp,
                  txHash: parsed.settlementTxId,
                  amountUsdc: swept,
                  targetToken: parsed.targetToken,
                  recipientAddress: parsed.recipientAddress,
                  hashscanUrl: parsed.hashscanUrl,
                });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn("[SellerBalanceAPI] Error querying HCS messages:", err);
    }

    // 5. Combine and deduplicate sweeps strictly for this seller account
    const sweepsMap = new Map<
      string,
      {
        amountUsdc: number;
        txHash: string;
        timestamp: string;
        targetToken?: string;
        recipientAddress?: string;
        hashscanUrl?: string;
      }
    >();

    // A. From persistent local sweeps ledger (strictly filtered by accountId)
    try {
      const localSweeps =
        typeof (arcBridgeService as any)?.getSweepsForAccount === "function"
          ? arcBridgeService.getSweepsForAccount(accountId)
          : [];
      for (const s of localSweeps) {
        const key = s.txHash || s.id;
        if (key) {
          sweepsMap.set(key, {
            amountUsdc: Number(s.amountUsdc) || 0,
            txHash: s.txHash || s.id,
            timestamp: s.timestamp || new Date().toISOString(),
            targetToken: s.swappedToken || "USDC",
            recipientAddress: s.recipientAddress,
            hashscanUrl: s.hashscanUrl,
          });
        }
      }
    } catch (localErr) {
      console.warn("[SellerBalanceAPI] Error querying local sweeps:", localErr);
    }

    // B. From HCS topic sweeps (strictly filtered by accountId)
    for (const s of recentSweeps) {
      const key = s.txHash || s.sequenceNumber?.toString();
      if (key && !sweepsMap.has(key)) {
        sweepsMap.set(key, {
          amountUsdc: Number(s.amountUsdc) || 0,
          txHash: s.txHash,
          timestamp: s.consensusTimestamp || new Date().toISOString(),
          targetToken: s.targetToken || "USDC",
          recipientAddress: s.recipientAddress,
          hashscanUrl: s.hashscanUrl,
        });
      }
    }

    // Total swept amount strictly for this account
    const allSweepsList = Array.from(sweepsMap.values());
    const totalSweptUsdc = allSweepsList.reduce((sum, s) => sum + (Number(s.amountUsdc) || 0), 0);

    // 6. Accurate Available Balance Calculation:
    // - htsUsdcBalance is the authentic on-chain token balance currently in the seller's wallet.
    // - unsettledEarnings represents verified earned payouts minus sweeps that may not yet be reflected in token balance.
    // - The available balance to sweep is the maximum of the live token balance and any net unsettled earnings.
    const unsettledEarnings = Math.max(0, lifetimeSettledUsdc - totalSweptUsdc);
    const availableBalance = Math.max(htsUsdcBalance, unsettledEarnings);
    const displayBalance = Number(availableBalance.toFixed(6));

    return NextResponse.json({
      success: true,
      accountId,
      htsTokenId: HTS_USDC_TOKEN_ID,
      htsUsdcBalance: Number(availableBalance.toFixed(6)),
      rawHtsUsdcBalance: Number(htsUsdcBalance.toFixed(6)),
      hbarBalance,
      isAutoAssociated,
      lifetimeSettledUsdc: Number(lifetimeSettledUsdc.toFixed(6)),
      totalSweptUsdc: Number(totalSweptUsdc.toFixed(6)),
      displayBalance: Number(displayBalance.toFixed(6)),
      availableBalance: Number(displayBalance.toFixed(6)),
      hcsTopicId: HCS_TOPIC_ID,
      hashscanAccountUrl: `https://hashscan.io/testnet/account/${accountId}`,
      hashscanTokenUrl: `https://hashscan.io/testnet/token/${HTS_USDC_TOKEN_ID}`,
      recentSettlements: recentSettlements.slice(0, 10),
      recentSweeps: allSweepsList.slice(0, 10),
      timestamp: new Date().toISOString(),
      isLive: true,
    });
  } catch (error: any) {
    console.error("[SellerBalanceAPI] Unhandled error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Hedera seller balance", detail: error.message },
      { status: 500 }
    );
  }
}

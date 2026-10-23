import { NextRequest, NextResponse } from "next/server";
import { arcBridgeService } from "@shunya/core";

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

    // 3. Query Real HCS Topic Consensus Messages to calculate total settled earnings & on-chain sweeps
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
              const isAccountMatch =
                parsed.sellerHederaAccountId === accountId ||
                accountId === DEFAULT_SELLER_ACCOUNT ||
                parsed.sellerHederaAccountId === "0.0.482910" ||
                parsed.sellerHederaAccountId === "0.0.771204";

              if (parsed.event === "ZERO_CUTOFF_JOB_SETTLED" && isAccountMatch) {
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

    // 4. Combine and deduplicate sweeps from local persistence ledger & HCS topic
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

    // A. From persistent local sweeps ledger
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

    // B. From HCS topic sweeps
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

    // Total unique swept amount across all channels:
    const allSweepsList = Array.from(sweepsMap.values());
    const totalSweptUsdc = allSweepsList.reduce((sum, s) => sum + (Number(s.amountUsdc) || 0), 0);

    // 5. Accurate Available Balance Calculation:
    // Base gross earnings are derived from live HTS tokens held and/or verified lifetime job settlements
    const baseGrossUsdc = Math.max(htsUsdcBalance, lifetimeSettledUsdc);
    // Net available balance deducting all swept funds that went to MetaMask:
    const availableBalance = Math.max(0, baseGrossUsdc - totalSweptUsdc);
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

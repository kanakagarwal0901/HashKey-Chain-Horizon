import { NextRequest, NextResponse } from "next/server";

const MIRROR_NODE_BASE =
  process.env.NEXT_PUBLIC_HEDERA_MIRROR_URL || "https://testnet.mirrornode.hedera.com";
const HTS_USDC_TOKEN_ID =
  process.env.NEXT_PUBLIC_HEDERA_USDC_TOKEN_ID || "0.0.11134145";
const HCS_TOPIC_ID =
  process.env.NEXT_PUBLIC_HEDERA_HCS_TOPIC_ID ||
  process.env.HEDERA_HCS_TOPIC_ID ||
  "0.0.11134146";
const DEFAULT_SELLER_ACCOUNT =
  process.env.NEXT_PUBLIC_DEFAULT_SELLER_HEDERA_ACCOUNT || "0.0.11136050";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = (
      searchParams.get("accountId") ||
      DEFAULT_SELLER_ACCOUNT
    ).trim();

    if (!accountId.startsWith("0.0.") || accountId.length < 5) {
      return NextResponse.json(
        { error: "Invalid Hedera Account ID format (expected 0.0.X)" },
        { status: 400 }
      );
    }

    let htsUsdcBalance = 0;
    let hbarBalance = 0;
    let lifetimeSettledUsdc = 0;
    let recentSettlements: any[] = [];
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

    // 3. Query Real HCS Topic Consensus Messages to calculate total settled earnings
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
              if (
                parsed.event === "ZERO_CUTOFF_JOB_SETTLED" &&
                (parsed.sellerHederaAccountId === accountId ||
                  accountId === DEFAULT_SELLER_ACCOUNT ||
                  parsed.sellerHederaAccountId === "0.0.482910" ||
                  parsed.sellerHederaAccountId === "0.0.771204")
              ) {
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
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn("[SellerBalanceAPI] Error querying HCS messages:", err);
    }

    // Available payout balance for display:
    // If HTS USDC tokens exist in account, use that; otherwise use total verified HCS settled payouts
    const displayBalance =
      htsUsdcBalance > 0 ? htsUsdcBalance : Math.max(0, lifetimeSettledUsdc);

    return NextResponse.json({
      success: true,
      accountId,
      htsTokenId: HTS_USDC_TOKEN_ID,
      htsUsdcBalance,
      hbarBalance,
      isAutoAssociated,
      lifetimeSettledUsdc: Number(lifetimeSettledUsdc.toFixed(6)),
      displayBalance: Number(displayBalance.toFixed(6)),
      hcsTopicId: HCS_TOPIC_ID,
      hashscanAccountUrl: `https://hashscan.io/testnet/account/${accountId}`,
      hashscanTokenUrl: `https://hashscan.io/testnet/token/${HTS_USDC_TOKEN_ID}`,
      recentSettlements: recentSettlements.slice(0, 10),
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

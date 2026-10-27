import { NextRequest, NextResponse } from "next/server";
import { hashKeyTreasury } from "@shunya/core";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawAddress = searchParams.get("address") || searchParams.get("accountId");
    const sellerAddress = (rawAddress && rawAddress.startsWith("0x"))
      ? rawAddress
      : "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    const balance = hashKeyTreasury.getSellerBalance(sellerAddress);

    return NextResponse.json({
      success: true,
      sellerAddress: balance.sellerAddress,
      // Native HSK balances
      hskBalance: balance.currentBalanceHsk,
      currentBalanceHsk: balance.currentBalanceHsk,
      lifetimeSettledHsk: balance.lifetimeSettledHsk,
      totalSweptHsk: balance.totalSweptHsk,
      // USD equivalent balances
      displayBalance: balance.currentBalanceUsdc,
      availableBalance: balance.currentBalanceUsdc,
      htsUsdcBalance: balance.currentBalanceUsdc,
      rawHtsUsdcBalance: Math.round(balance.currentBalanceUsdc * 1_000_000),
      hbarBalance: balance.currentBalanceHsk,
      lifetimeSettledUsdc: balance.lifetimeSettledUsdc,
      totalSweptUsdc: balance.totalSweptUsdc,
      // HashKey Chain & HSP metadata
      hspAdapterAddress: balance.hspAdapterAddress,
      blockscoutAccountUrl: balance.blockscoutAccountUrl,
      recentSettlements: balance.recentSettlements,
      recentSweeps: balance.recentSweeps,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[SellerBalanceAPI] Unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch HashKey seller balance" },
      { status: 500 }
    );
  }
}

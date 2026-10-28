import { NextRequest, NextResponse } from "next/server";
import { hashKeyTreasury } from "@shunya/core";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawAddress = (searchParams.get("address") || searchParams.get("accountId") || searchParams.get("seller") || "").trim();
    if (!rawAddress || !rawAddress.startsWith("0x")) {
      return NextResponse.json(
        { error: "Missing or invalid seller address. Please provide a connected EVM wallet address." },
        { status: 400 }
      );
    }
    const sellerAddress = rawAddress;

    const balance = await hashKeyTreasury.getSellerLiveBalance(sellerAddress);

    return NextResponse.json({
      success: true,
      sellerAddress: balance.sellerAddress,
      // Native HSK balances
      hskBalance: balance.currentBalanceHsk,
      currentBalanceHsk: balance.currentBalanceHsk,
      onChainHsk: (balance as any).onChainHsk ?? balance.currentBalanceHsk,
      lifetimeSettledHsk: balance.lifetimeSettledHsk,
      totalSweptHsk: balance.totalSweptHsk,
      // USD equivalent balances
      displayBalance: balance.currentBalanceUsdc,
      availableBalance: balance.currentBalanceUsdc,
      htsUsdcBalance: balance.currentBalanceUsdc,
      rawHtsUsdcBalance: Math.round(balance.currentBalanceUsdc * 1_000_000),
      lifetimeSettledUsdc: balance.lifetimeSettledUsdc,
      totalSweptUsdc: balance.totalSweptUsdc,
      // HashKey Chain & HSP metadata
      hskUsdRate: hashKeyTreasury.hskUsdRate,
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

import { NextRequest, NextResponse } from "next/server";
import { uniswapService, hashKeyTreasury, SUPPORTED_TOKENS, SUPPORTED_CHAINS } from "@shunya/core";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromToken = (searchParams.get("from") || "USDC").toUpperCase();
  const toToken = (searchParams.get("to") || "ETH").toUpperCase();
  const amountIn = parseFloat(searchParams.get("amount") || "1");
  const chainId = searchParams.get("chainId") || "ethereum-sepolia";

  try {
    // 1. Fetch fresh real-time DEX and oracle market rates
    const livePrices = await uniswapService.fetchLiveMarketRates();

    // 2. Synchronize HashKey Treasury benchmark rate
    if (livePrices.HSK) {
      hashKeyTreasury.syncWithLiveOracle(livePrices.HSK);
    }

    // 3. Compute exact swap quote
    const quote = uniswapService.getQuote({
      fromToken,
      toToken,
      amountIn: isNaN(amountIn) || amountIn <= 0 ? 1 : amountIn,
      chainId,
    });

    return NextResponse.json({
      success: true,
      quote,
      liveMarket: {
        source: "Uniswap-V3 / Live DEX Oracle",
        hskUsdRate: livePrices.HSK,
        ethUsdRate: livePrices.ETH,
        prices: livePrices,
        rateFormatted: `1 HSK ≈ $${livePrices.HSK?.toFixed(4)} USD`,
        timestamp: new Date().toISOString(),
      },
      supportedTokens: Object.keys(SUPPORTED_TOKENS),
      supportedChains: Object.keys(SUPPORTED_CHAINS),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

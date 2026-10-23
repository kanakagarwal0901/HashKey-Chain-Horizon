import { NextRequest, NextResponse } from "next/server";
import { uniswapService, SUPPORTED_TOKENS, SUPPORTED_CHAINS } from "@shunya/core";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromToken = (searchParams.get("from") || "USDC").toUpperCase();
  const toToken = (searchParams.get("to") || "ETH").toUpperCase();
  const amountIn = parseFloat(searchParams.get("amount") || "1");
  const chainId = searchParams.get("chainId") || "ethereum-sepolia";

  try {
    const quote = uniswapService.getQuote({
      fromToken,
      toToken,
      amountIn: isNaN(amountIn) || amountIn <= 0 ? 1 : amountIn,
      chainId,
    });

    return NextResponse.json({
      success: true,
      quote,
      supportedTokens: Object.keys(SUPPORTED_TOKENS),
      supportedChains: Object.keys(SUPPORTED_CHAINS),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

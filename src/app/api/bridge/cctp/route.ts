import { NextRequest, NextResponse } from "next/server";
import { arcBridgeService } from "@shunya/core";

export async function GET() {
  const history = arcBridgeService.getBridgeHistory();
  return NextResponse.json({
    success: true,
    history,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destinationChain, amountUsdc, recipientAddress } = body;

    if (!destinationChain || !amountUsdc || !recipientAddress) {
      return NextResponse.json({ error: "Missing required bridge parameters" }, { status: 400 });
    }

    const bridgeTx = arcBridgeService.initiateCctpBridge({
      destinationChain,
      amountUsdc: Number(amountUsdc),
      recipientAddress,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully initiated Circle CCTP burn & mint to ${destinationChain}`,
      bridgeTx,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bridge Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

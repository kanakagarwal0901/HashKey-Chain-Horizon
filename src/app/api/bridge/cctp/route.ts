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
    const destinationChain = ((body.destinationChain || "arc").replace("-testnet", "")) as any;
    const amountUsdc = Number(body.amountUsdc || body.amount);
    const recipientAddress = body.recipientAddress || body.destinationAddress;

    if (!amountUsdc || !recipientAddress) {
      return NextResponse.json(
        { error: "Missing required bridge parameters: amountUsdc and recipientAddress" },
        { status: 400 }
      );
    }

    const bridgeTx = arcBridgeService.initiateCctpBridge({
      destinationChain,
      amountUsdc,
      recipientAddress,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully initiated Circle CCTP burn & mint to ${destinationChain}`,
      bridgeTx,
      sourceBurnTxId: bridgeTx.txHash,
      cctpMessageNonce: bridgeTx.id,
      destinationMintTxId: bridgeTx.txHash,
      hashscanUrl: `https://hashscan.io/testnet/transaction/${bridgeTx.txHash}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bridge Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

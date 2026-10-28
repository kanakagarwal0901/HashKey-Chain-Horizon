import { NextRequest, NextResponse } from "next/server";
import { hashKeyTreasury } from "@shunya/core";

export async function GET(request: NextRequest) {
  const sellerAddress = request.nextUrl.searchParams.get("seller") || "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21";
  const sellerBalance = hashKeyTreasury.getSellerBalance(sellerAddress);
  return NextResponse.json({
    success: true,
    history: sellerBalance.recentSweeps,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const destinationChain = (body.destinationChain || "hashkey-testnet").trim();
    const amountUsdc = Number(body.amountUsdc || body.amount);
    const recipientAddress = body.recipientAddress || body.destinationAddress;
    const targetToken = body.targetToken || body.targetCurrency || "HSK";

    if (!amountUsdc || amountUsdc <= 0 || !recipientAddress) {
      return NextResponse.json(
        { error: "Missing required parameters: amountUsdc (must be > 0) and recipientAddress" },
        { status: 400 }
      );
    }

    const sellerAddress = (
      body.sourceAccount ||
      body.sellerAddress ||
      "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21"
    ).trim();

    const sweepRecord = await hashKeyTreasury.executeUniversalSweep({
      sellerAddress,
      recipientAddress,
      amountUsdc,
      destinationChain,
      targetToken,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully executed universal sweep to ${recipientAddress} (${sweepRecord.swappedAmount} on ${sweepRecord.destinationChain})`,
      bridgeTx: sweepRecord,
      txHash: sweepRecord.txHash,
      sourceBurnTxId: sweepRecord.txHash,
      explorerUrl: sweepRecord.explorerUrl,
      swappedAmount: sweepRecord.swappedAmount,
      targetToken: sweepRecord.targetToken,
      destinationChain: sweepRecord.destinationChain,
      dexRate: sweepRecord.dexRate,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sweep Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { hashKeyTreasury } from "@shunya/core";

export async function GET() {
  const sellerBalance = hashKeyTreasury.getSellerBalance("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
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
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
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

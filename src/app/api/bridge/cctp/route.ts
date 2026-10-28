import { NextRequest, NextResponse } from "next/server";
import { hashKeyTreasury } from "@shunya/core";

export async function GET(request: NextRequest) {
  const sellerAddress = (request.nextUrl.searchParams.get("seller") || request.nextUrl.searchParams.get("address") || "").trim();
  if (!sellerAddress || !sellerAddress.startsWith("0x")) {
    return NextResponse.json({
      success: true,
      history: [],
    });
  }
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
    const amountUsdc = body.amountUsdc !== undefined ? Number(body.amountUsdc) : (body.amount !== undefined ? Number(body.amount) : undefined);
    const amountHsk = body.amountHsk !== undefined ? Number(body.amountHsk) : undefined;
    const recipientAddress = (body.recipientAddress || body.destinationAddress || "").trim();
    const targetToken = (body.targetToken || body.targetCurrency || "HSK").trim();
    const sourceBurnTxId = (body.sourceBurnTxId || body.sourceBurnTxHash || "").trim();

    if ((!amountUsdc || amountUsdc <= 0) && (!amountHsk || amountHsk <= 0)) {
      return NextResponse.json(
        { error: "Missing required parameters: sweep amount (amountHsk or amountUsdc) must be > 0" },
        { status: 400 }
      );
    }

    if (!recipientAddress || !recipientAddress.startsWith("0x")) {
      return NextResponse.json(
        { error: "Missing or invalid recipient EVM address. Please provide a valid 42-character 0x EVM address." },
        { status: 400 }
      );
    }

    const sellerAddress = (
      body.sourceAccount ||
      body.sellerAddress ||
      ""
    ).trim();

    if (!sellerAddress || !sellerAddress.startsWith("0x")) {
      return NextResponse.json(
        { error: "Missing or invalid connected seller wallet address. Please connect your MetaMask." },
        { status: 400 }
      );
    }

    const sweepRecord = await hashKeyTreasury.executeUniversalSweep({
      sellerAddress,
      recipientAddress,
      amountUsdc,
      amountHsk,
      destinationChain,
      targetToken,
      sourceBurnTxId,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully executed live on-chain sweep to ${recipientAddress} (${sweepRecord.swappedAmount} on ${sweepRecord.destinationChain})`,
      bridgeTx: sweepRecord,
      txHash: sweepRecord.txHash,
      sourceBurnTxId: sweepRecord.sourceBurnTxId || sourceBurnTxId || sweepRecord.txHash,
      sourceExplorerUrl: sweepRecord.sourceExplorerUrl || (sourceBurnTxId ? `https://testnet-explorer.hskchain.net/tx/${sourceBurnTxId}` : ""),
      explorerUrl: sweepRecord.explorerUrl,
      swappedAmount: sweepRecord.swappedAmount,
      targetToken: sweepRecord.targetToken,
      destinationChain: sweepRecord.destinationChain,
      dexRate: sweepRecord.dexRate,
      blockNumber: sweepRecord.blockNumber,
      isLiveOnChain: sweepRecord.isLiveOnChain,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sweep Error";
    console.error("[CCTP Bridge API Error]:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

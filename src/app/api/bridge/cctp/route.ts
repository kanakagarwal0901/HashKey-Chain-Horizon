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

    const sourceAccount = body.sourceAccount;
    const targetToken = body.targetToken || body.targetCurrency || "USDC";

    const bridgeTx = await arcBridgeService.executeLiveSellerSweep({
      sourceAccount,
      recipientAddress,
      amountUsdc,
      destinationChain,
      targetToken,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully executed on-chain seller sweep to ${recipientAddress} via Uniswap (${targetToken} on ${destinationChain})`,
      bridgeTx,
      sourceBurnTxId: bridgeTx.txHash,
      cctpMessageNonce: bridgeTx.id,
      destinationMintTxId: bridgeTx.evmTxHash || bridgeTx.txHash,
      hashscanUrl: bridgeTx.hashscanUrl || `https://hashscan.io/testnet/transaction/${bridgeTx.txHash}`,
      blockNumber: bridgeTx.blockNumber,
      tokenContract: bridgeTx.tokenContract,
      gasSentHbar: bridgeTx.gasSentHbar,
      hcsSequenceNumber: bridgeTx.hcsSequenceNumber,
      swappedToken: bridgeTx.swappedToken || targetToken,
      swappedAmount: bridgeTx.swappedAmount,
      dexRouter: bridgeTx.dexRouter,
      dexRate: bridgeTx.dexRate,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bridge Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

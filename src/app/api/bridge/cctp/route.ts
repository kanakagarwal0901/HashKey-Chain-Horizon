import { NextRequest, NextResponse } from "next/server";
import { arcBridgeService, calculateSellerBalance } from "@shunya/core";

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

    if (!amountUsdc || amountUsdc <= 0 || !recipientAddress) {
      return NextResponse.json(
        { error: "Missing required bridge parameters: amountUsdc (must be > 0) and recipientAddress" },
        { status: 400 }
      );
    }

    const sourceAccount = (
      body.sourceAccount ||
      process.env.NEXT_PUBLIC_DEFAULT_SELLER_HEDERA_ACCOUNT ||
      "0.0.11145557"
    ).trim();

    // Strict Invariant: Cannot sweep if balance is 0 and cannot sweep amount > current balance
    const balResult = await calculateSellerBalance(sourceAccount);
    const availableBalance = Number(balResult.displayBalance.toFixed(6));

    if (availableBalance <= 0) {
      return NextResponse.json(
        {
          error: `Cannot sweep: Current Hedera USDC balance is $0.000000 USDC. You cannot sweep if your balance is 0.`,
          availableBalance: 0,
        },
        { status: 400 }
      );
    }

    if (amountUsdc > availableBalance + 0.000001) {
      return NextResponse.json(
        {
          error: `Cannot sweep $${amountUsdc.toFixed(6)} USDC: Amount cannot be greater than the current balance of $${availableBalance.toFixed(6)} USDC.`,
          availableBalance,
        },
        { status: 400 }
      );
    }

    const targetToken = body.targetToken || body.targetCurrency || "USDC";

    const bridgeTx = await arcBridgeService.executeLiveSellerSweep({
      sourceAccount,
      recipientAddress,
      amountUsdc,
      destinationChain,
      targetToken,
      availableBalance,
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

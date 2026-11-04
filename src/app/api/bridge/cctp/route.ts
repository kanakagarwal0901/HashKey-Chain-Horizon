import { NextRequest, NextResponse } from "next/server";
import { hashKeyTreasury } from "@shunya/core";
import { verifyAndConsumeAuth } from "@/lib/authSignatures";

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

    // Pre-flight liquidity check: verifies Treasury destination reserves BEFORE MetaMask debit
    if (body.isPreflight === true || body.checkLiquidity === true) {
      if ((!amountUsdc || amountUsdc <= 0) && (!amountHsk || amountHsk <= 0)) {
        return NextResponse.json(
          { error: "Missing required parameters: sweep amount (amountHsk or amountUsdc) must be > 0" },
          { status: 400 }
        );
      }
      const liquidity = await hashKeyTreasury.checkTreasuryLiquidity({
        destinationChain,
        targetToken,
        amountUsdc,
        amountHsk,
      });
      return NextResponse.json(
        {
          success: liquidity.sufficient,
          ...liquidity,
        },
        { status: liquidity.sufficient ? 200 : 400 }
      );
    }

    if (!recipientAddress || !recipientAddress.startsWith("0x") || recipientAddress.length !== 42) {
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

    if (!sellerAddress || !sellerAddress.startsWith("0x") || sellerAddress.length !== 42) {
      return NextResponse.json(
        { error: "Missing or invalid connected seller wallet address. Please connect your MetaMask." },
        { status: 400 }
      );
    }

    // Finding 1: Require body.auth = {message, signature} of type SellerSweep
    if (!body.auth || typeof body.auth !== "object" || !body.auth.message || !body.auth.signature) {
      return NextResponse.json(
        { error: "Missing wallet signature authorization (body.auth with message and signature required)" },
        { status: 401 }
      );
    }

    const authMsg = body.auth.message;

    // Check message.seller/recipient/amountHsk/destinationChain/targetToken must equal the values actually used (401 on failure)
    const sellerMatches = Boolean(authMsg.seller && authMsg.seller.toLowerCase() === sellerAddress.toLowerCase());
    const recipientMatches = Boolean(authMsg.recipient && authMsg.recipient.toLowerCase() === recipientAddress.toLowerCase());
    const chainMatches = Boolean(authMsg.destinationChain && authMsg.destinationChain.toLowerCase() === destinationChain.toLowerCase());
    const tokenMatches = Boolean(authMsg.targetToken && authMsg.targetToken.toUpperCase() === targetToken.toUpperCase());

    const actualAmountHsk = amountHsk !== undefined ? amountHsk : Number(authMsg.amountHsk);
    const amountMatches = Boolean(
      authMsg.amountHsk !== undefined &&
      (String(authMsg.amountHsk) === String(amountHsk) || Number(authMsg.amountHsk) === actualAmountHsk)
    );

    if (!sellerMatches || !recipientMatches || !chainMatches || !tokenMatches || !amountMatches) {
      return NextResponse.json(
        { error: "Authorization message parameters do not match requested sweep parameters" },
        { status: 401 }
      );
    }

    try {
      verifyAndConsumeAuth("SellerSweep", body.auth, sellerAddress);
    } catch (authErr: any) {
      return NextResponse.json(
        { error: authErr.message || "Unauthorized" },
        { status: 401 }
      );
    }

    // Finding 7: Reject amounts <= 0, non-numeric, or above the ledger balance
    if (!Number.isFinite(actualAmountHsk) || actualAmountHsk <= 0) {
      return NextResponse.json(
        { error: "Missing required parameters: sweep amount (amountHsk) must be > 0" },
        { status: 400 }
      );
    }

    const ledgerBal = hashKeyTreasury.getSellerBalance(sellerAddress);
    if (actualAmountHsk > ledgerBal.currentBalanceHsk) {
      return NextResponse.json(
        {
          error: `Cannot sweep ${actualAmountHsk.toFixed(4)} HSK: Exceeds available ledger balance of ${ledgerBal.currentBalanceHsk.toFixed(4)} HSK.`,
        },
        { status: 400 }
      );
    }

    const sweepRecord = await hashKeyTreasury.executeUniversalSweep({
      sellerAddress,
      recipientAddress,
      amountUsdc,
      amountHsk: actualAmountHsk,
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

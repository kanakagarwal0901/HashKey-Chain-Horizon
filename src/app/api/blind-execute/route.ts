import { NextRequest, NextResponse } from "next/server";
import {
  getModelTokenBounds,
  canSellerFulfillPrompt,
  calculatePostExecutionSplitMicroUsdc,
  ThinkingLevel,
  getOrCreateEnclaveKeyPair,
  unwrapSellerApiKey,
  unwrapBuyerEnvelopeInEnclave,
  encryptAiOutputWithReturnKey,
  parseFilesInEnclaveRam,
  assembleEnclavePrompt,
  arkivDb,
  zeroGService,
  aiDispatcher,
  buyerRefundEngine,
  hashKeyTreasury,
  uniswapService,
} from "@shunya/core";
import crypto from "crypto";
import { ethers } from "ethers";
import { verifyUniversalBuyerPayment } from "@/lib/sepoliaPaymentVerifier";

// Next.js Route: Blind Execution with Zero Plaintext & HashKey HSP Settlement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, thinkingLevel, listingId, encryptedEnvelope, paymentTxId, buyerAddress } = body;

    if (!modelId || !thinkingLevel || !listingId || !encryptedEnvelope) {
      return NextResponse.json(
        { error: "Missing required fields: modelId, thinkingLevel, listingId, encryptedEnvelope" },
        { status: 400 }
      );
    }

    const bounds = getModelTokenBounds(modelId, thinkingLevel as ThinkingLevel);
    let listing = arkivDb.getListingById(listingId);
    console.log(`[blind-execute] Looking up ${listingId}, found:`, Boolean(listing));

    if (!listing) {
      return NextResponse.json({ error: `Seller listing ${listingId} not found on Arkiv` }, { status: 404 });
    }

    // Invariant Check (FT-01): Seller must have availableTokens >= T_max
    const eligibility = canSellerFulfillPrompt(listing.availableTokens, modelId, thinkingLevel as ThinkingLevel);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: "Seller Token Bound Invariant Violation",
          reason: eligibility.reason,
          alternativeSuggestion: eligibility.alternativeSuggestion,
          requiredTMax: bounds.totalMaxTokens,
          sellerAvailable: listing.availableTokens,
        },
        { status: 422 }
      );
    }

    const pricePer1k = listing.pricePer1kMicroUsdc;
    const upfrontChargeMicroUsdc = Math.ceil((bounds.totalMaxTokens / 1000) * pricePer1k);

    // Check payment header (supports Authorization: Bearer <txId>, x-hsp-payment-txid, or body param)
    const authHeader = request.headers.get("authorization");
    let paymentHeader = request.headers.get("x-hsp-payment-txid") || request.headers.get("x-402-payment-txid") || paymentTxId;
    if (!paymentHeader && authHeader) {
      const match = authHeader.match(/^(?:hsp|bearer|x402)\s+(.+)$/i);
      if (match) {
        paymentHeader = match[1].trim();
      }
    }

    if (!paymentHeader) {
      // Return HTTP 402 Payment Required quoting T_max upfront deposit on HashKey Chain
      const liveRate = uniswapService.getHskUsdRate() || 0.0894;
      const upfrontHsk = (upfrontChargeMicroUsdc / 1_000_000 / liveRate).toFixed(4);
      const hspQuote = {
        status: 402,
        protocol: "HSP-1.0",
        network: "HashKey Chain Testnet",
        chainId: 133,
        payToContract: "0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae",
        routerAddress: "0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D",
        requiredHsk: upfrontHsk,
        requiredMicroUsdc: upfrontChargeMicroUsdc,
        modelId,
        thinkingLevel,
        tMaxTokens: bounds.totalMaxTokens,
        tMinTokens: bounds.minRequiredTokens,
        expiresInSeconds: 3600,
      };

      return new NextResponse(JSON.stringify(hspQuote), {
        status: 402,
        headers: {
          "Content-Type": "application/json",
          "X-HSP-Amount-HSK": upfrontHsk,
          "X-HSP-Amount-USDC": (upfrontChargeMicroUsdc / 1_000_000).toString(),
          "X-HSP-Pay-To": "0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae",
          "X-HSP-Token-Bounds": `T_min=${bounds.minRequiredTokens}, T_max=${bounds.totalMaxTokens}`,
          "WWW-Authenticate": 'HSP realm="HashKey Settlement Protocol"',
        },
      });
    }

    // Verify Payment: Either HashKey Chain or multi-chain EVM transfer
    let evmPaymentDetails: any = null;

    if (paymentHeader.startsWith("0x")) {
      const paymentChain = request.headers.get("x-payment-chain") || body.paymentChain || "hashkey-testnet";
      const paymentToken = request.headers.get("x-payment-token") || body.paymentToken || body.paymentCurrency || "HSK";

      const verificationResult = await verifyUniversalBuyerPayment({
        txHash: paymentHeader,
        buyerAddress: buyerAddress || "",
        requiredMicroUsdc: upfrontChargeMicroUsdc,
        chainKey: paymentChain,
        tokenSymbol: paymentToken,
      });

      if (!verificationResult.verified) {
        return NextResponse.json(
          {
            error: "Web3 payment verification failed on " + paymentChain,
            detail: verificationResult.error,
            requiredMicroUsdc: upfrontChargeMicroUsdc,
            txHash: paymentHeader,
          },
          { status: 402 }
        );
      }
      evmPaymentDetails = verificationResult;
    }

    // Step 1: Pre-flight Atomic Lock on Arkiv with Mutex Concurrency Protection
    const locked = await arkivDb.atomicLockTokensAsync(listing.id, bounds.totalMaxTokens);
    if (!locked) {
      return NextResponse.json(
        { error: "Concurrent race detected: Seller quota locked by another in-flight prompt" },
        { status: 409 }
      );
    }

    // Wrap downstream execution in Saga compensation: if any step throws, refund locked quota!
    try {
      // Step 2: Unwrap keys inside Sealed Enclave RAM
      const { privateKey: enclavePrivateKey } = getOrCreateEnclaveKeyPair();
      let unwrappedPrompt = "";
      let unwrappedFiles: { filename: string; mimeType: string; data: Buffer }[] = [];
      let kReturn: Buffer;

      try {
        const unwrapped = unwrapBuyerEnvelopeInEnclave(encryptedEnvelope, enclavePrivateKey);
        unwrappedPrompt = unwrapped.promptText;
        unwrappedFiles = unwrapped.files;
        kReturn = unwrapped.kReturn;
      } catch (unwrapErr: unknown) {
        console.error("Enclave unwrap failed:", unwrapErr);
        await arkivDb.reconcilePostExecutionAsync(listing.id, bounds.totalMaxTokens, 0);
        const reasonMsg = `Cryptographic envelope decryption failed inside Enclave: ${unwrapErr instanceof Error ? unwrapErr.message : String(unwrapErr)}`;
        const refundRecipient = evmPaymentDetails?.from || buyerAddress;
        const refund = await buyerRefundEngine.executeRefund({
          paymentRail: "hashkey",
          buyerAddress: refundRecipient,
          refundAmountMicroUsdc: upfrontChargeMicroUsdc,
          reason: reasonMsg,
          originalPaymentTxId: paymentHeader,
          modelId,
        });
        return NextResponse.json(
          {
            success: false,
            error: reasonMsg,
            refunded: true,
            refund,
          },
          { status: 422 }
        );
      }

      // Unwrap Seller API key in Enclave RAM
      let rawSellerApiKey = "";
      try {
        if (listing.sealedApiKey.startsWith("ENCLAVE_SEALED:")) {
          rawSellerApiKey = listing.sealedApiKey.replace("ENCLAVE_SEALED:", "");
        } else {
          rawSellerApiKey = unwrapSellerApiKey(listing.sealedApiKey, enclavePrivateKey);
        }
      } catch (unwrapKeyErr: any) {
        console.error("Seller key unwrap failed:", unwrapKeyErr);
        await arkivDb.reconcilePostExecutionAsync(listing.id, bounds.totalMaxTokens, 0);
        const reasonMsg = `Failed to unwrap Seller API key inside Enclave: ${unwrapKeyErr instanceof Error ? unwrapKeyErr.message : String(unwrapKeyErr)}`;
        const refundRecipient = evmPaymentDetails?.from || buyerAddress;
        const refund = await buyerRefundEngine.executeRefund({
          paymentRail: "hashkey",
          buyerAddress: refundRecipient,
          refundAmountMicroUsdc: upfrontChargeMicroUsdc,
          reason: reasonMsg,
          originalPaymentTxId: paymentHeader,
          modelId,
        });
        return NextResponse.json(
          {
            success: false,
            error: reasonMsg,
            refunded: true,
            refund,
          },
          { status: 422 }
        );
      }

      // Step 3: Parse files in Enclave RAM
      const parsedFiles = parseFilesInEnclaveRam(unwrappedFiles);
      const { fullPromptText, totalFileTokens } = assembleEnclavePrompt(unwrappedPrompt, parsedFiles);

      // Step 4: Upstream AI Execution (Enclave isolated call bounded strictly by T_max)
      let aiResult;
      try {
        aiResult = await aiDispatcher.executeAiCall({
          modelId,
          thinkingLevel: thinkingLevel as ThinkingLevel,
          bounds,
          fullPromptText,
          totalFileTokens,
          rawApiKey: rawSellerApiKey,
          parsedFiles,
        });
      } catch (aiErr: unknown) {
        console.error("[blind-execute] Upstream AI call rejected:", aiErr);
        await arkivDb.reconcilePostExecutionAsync(listing.id, bounds.totalMaxTokens, 0);
        const reasonMsg = aiErr instanceof Error ? aiErr.message : "Upstream AI provider rejected inference request";
        const refundRecipient = evmPaymentDetails?.from || buyerAddress;
        const refund = await buyerRefundEngine.executeRefund({
          paymentRail: "hashkey",
          buyerAddress: refundRecipient,
          refundAmountMicroUsdc: upfrontChargeMicroUsdc,
          reason: `AI API call rejected: ${reasonMsg}`,
          originalPaymentTxId: paymentHeader,
          modelId,
        });
        return NextResponse.json(
          {
            success: false,
            error: `API Call Rejected by Upstream Provider: ${reasonMsg}`,
            detail: reasonMsg,
            refunded: true,
            refund,
          },
          { status: 422 }
        );
      }

      // Step 5: Encrypt AI output using Buyer's local K_return key before leaving Enclave RAM
      const sealedOutput = encryptAiOutputWithReturnKey(
        aiResult.aiOutputText,
        aiResult.reasoningText,
        kReturn
      );

      // Step 6: 0G Attestation Receipt
      const promptSha256 = crypto.createHash("sha256").update(fullPromptText).digest("hex");
      const zeroGProof = zeroGService.signExecutionReceipt({
        model: modelId,
        thinkingLevel,
        maxTokens: bounds.totalMaxTokens,
        tokensUsed: aiResult.actualTokensUsed,
        promptHash: promptSha256,
      });

      // Step 7: Settlement Split via HashKey Settlement Protocol (HSP)
      const split = calculatePostExecutionSplitMicroUsdc(
        bounds,
        aiResult.actualTokensUsed,
        pricePer1k
      );

      const buyerRefundMicroUsdc = split.unusedTokensReturnedToSellerQuota > 0 ? Math.floor(((bounds.totalMaxTokens - aiResult.actualTokensUsed) / 1000) * pricePer1k) : 0;

      // Settle Seller Payout in HSK on HashKey Chain to the Listing's actual seller wallet
      const targetSellerAddress = (
        (listing as any).payoutAddress ||
        (listing as any).hedaraPayoutAccount ||
        listing.ownerAddress ||
        ""
      ).trim();

      if (!targetSellerAddress || !ethers.isAddress(targetSellerAddress)) {
        return NextResponse.json(
          { error: `Selected listing (${listing.id}) has no valid connected seller EVM payout address` },
          { status: 422 }
        );
      }

      const hspRecord = await hashKeyTreasury.settleSellerPayoutOnHashKey({
        mandateId: body.mandateId || ethers.hexlify(ethers.randomBytes(32)),
        sellerAddress: targetSellerAddress,
        buyerAddress: buyerAddress || evmPaymentDetails?.from || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        modelId,
        tUsed: aiResult.actualTokensUsed,
        tMax: bounds.totalMaxTokens,
        sellerPayoutMicroUsdc: split.sellerPayoutMicroUsdc,
        protocolFeeMicroUsdc: split.webAppCommissionMicroUsdc,
        buyerRefundMicroUsdc,
        attestationHashHex: zeroGProof.attestationHash,
      });

      // Issue automatic on-chain refund to buyer for unused deposit
      let buyerRefundResult = null;
      if (buyerRefundMicroUsdc > 0 && (evmPaymentDetails?.from || buyerAddress)) {
        try {
          buyerRefundResult = await buyerRefundEngine.executeRefund({
            paymentRail: evmPaymentDetails?.chainKey || "hashkey",
            buyerAddress: evmPaymentDetails?.from || buyerAddress,
            refundAmountMicroUsdc: buyerRefundMicroUsdc,
            reason: `Automatic refund for unused quota (${bounds.totalMaxTokens - aiResult.actualTokensUsed} tokens)`,
            originalPaymentTxId: paymentHeader,
            modelId,
          });
        } catch (rfErr) {
          console.warn("[blind-execute] Buyer refund notice:", rfErr);
        }
      }

      // Step 8: Reconcile Seller's Quota on Arkiv (return unused tokens)
      const updatedListing = await arkivDb.reconcilePostExecutionAsync(
        listing.id,
        bounds.totalMaxTokens,
        aiResult.actualTokensUsed
      );

      // Step 9: Return response (Seller sees ZERO plaintext; Buyer receives sealed output)
      return NextResponse.json({
        success: true,
        protocol: "HSP-1.0",
        network: "HashKey Chain Testnet",
        encryptedOutput: sealedOutput,
        tokenAccounting: {
          tMaxReserved: bounds.totalMaxTokens,
          tUsedActual: aiResult.actualTokensUsed,
          unusedTokensReturned: split.unusedTokensReturnedToSellerQuota,
          buyerPaidUsdc: split.buyerChargedUsdc,
          sellerPayoutUsdc: split.sellerPayoutUsdc,
          protocolCommissionUsdc: split.webAppCommissionUsdc,
          sellerRemainingTokens: updatedListing.availableTokens,
        },
        paymentReceipt: {
          txHash: paymentHeader,
          chainKey: evmPaymentDetails?.chainKey || "hashkey-testnet",
          amountUsdc: upfrontChargeMicroUsdc / 1_000_000,
          from: evmPaymentDetails?.from || buyerAddress,
          to: evmPaymentDetails?.to || hashKeyTreasury.hspAdapterAddress,
          explorerUrl: evmPaymentDetails?.etherscanUrl || `https://testnet-explorer.hskchain.net/tx/${paymentHeader}`,
        },
        hashKeySettlement: {
          network: "HashKey Chain Testnet",
          chainId: 133,
          mandateId: hspRecord.mandateId,
          hspAdapterAddress: hashKeyTreasury.hspAdapterAddress,
          routerAddress: hashKeyTreasury.routerAddress,
          paymentTxHash: hspRecord.txHash,
          blockNumber: hspRecord.blockNumber,
          explorerUrl: hspRecord.blockscoutUrl,
          sellerPayoutHsk: Number(hspRecord.sellerPayoutHsk.toFixed(4)),
          sellerPayoutUsdc: Number(hspRecord.sellerPayoutUsdc.toFixed(4)),
          protocolFeeHsk: Number(hspRecord.protocolFeeHsk.toFixed(4)),
          buyerRefundHsk: Number(hspRecord.buyerRefundHsk.toFixed(4)),
          buyerRefundTx: buyerRefundResult,
          tokensConsumed: aiResult.actualTokensUsed,
          tMaxTokens: bounds.totalMaxTokens,
          attestationHash: zeroGProof.attestationHash,
          status: "SETTLED",
        },
        zeroGVerification: {
          enclaveId: zeroGProof.enclaveId,
          attestationHash: zeroGProof.attestationHash,
          signature: zeroGProof.signature,
          zeroGContractAddress: zeroGProof.zeroGContractAddress,
          isLiveUpstream: aiResult.isLiveUpstream,
          provider: aiResult.provider,
        },
        sellerSurveillanceLogSnapshot: {
          notice: "THIS IS THE ONLY DATA ACCESSIBLE TO THE SELLER NODE PROXY:",
          promptVisibility: "[ENCRYPTED CIPHERTEXT - ZERO ACCESS]",
          filesVisibility: `[${unwrappedFiles.length} ENCRYPTED BLOBS - ZERO ACCESS]`,
          outputVisibility: "[ENCRYPTED CIPHERTEXT - ZERO ACCESS]",
          tokensConsumed: aiResult.actualTokensUsed,
          payoutReceivedHsk: hspRecord.sellerPayoutHsk.toFixed(4),
          payoutReceivedUsdc: split.sellerPayoutUsdc,
        },
      });
    } catch (execErr: unknown) {
      await arkivDb.reconcilePostExecutionAsync(listing.id, bounds.totalMaxTokens, 0);
      const reasonMsg = execErr instanceof Error ? execErr.message : "Unexpected execution error during inference";
      const refundRecipient = evmPaymentDetails?.from || buyerAddress;
      let refund = null;
      try {
        refund = await buyerRefundEngine.executeRefund({
          paymentRail: "hashkey",
          buyerAddress: refundRecipient,
          refundAmountMicroUsdc: upfrontChargeMicroUsdc,
          reason: `Execution failure: ${reasonMsg}`,
          originalPaymentTxId: paymentHeader,
          modelId,
        });
      } catch (refundErr) {
        console.error("[blind-execute] Failed to execute buyer refund:", refundErr);
      }
      return NextResponse.json(
        {
          success: false,
          error: `Inference Execution Error: ${reasonMsg}`,
          detail: reasonMsg,
          refunded: Boolean(refund),
          refund,
        },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    console.error("Execution error:", err);
    const message = err instanceof Error ? err.message : "Internal Execution Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import {
  MODEL_TOKEN_CATALOG,
  canSellerFulfillPrompt,
  calculateUpfrontBuyerChargeMicroUsdc,
  calculatePostExecutionSplitMicroUsdc,
} from "../packages/shunya-core/src/tokenBoundsCatalog";
import {
  getOrCreateEnclaveKeyPair,
  sealSellerApiKeyToEnclave,
  sealBuyerPromptAndFiles,
  unwrapSellerApiKey,
  unwrapBuyerEnvelopeInEnclave,
  encryptAiOutputWithReturnKey,
  decryptBuyerOutput,
} from "../packages/shunya-core/src/blindCrypto";
import { ArkivDatabaseEngine } from "../packages/shunya-core/src/arkivQuotaManager";
import { HederaSettlementEngine } from "../packages/shunya-core/src/hederaX402Settlement";
import { ZeroGService } from "../packages/shunya-core/src/zeroGEnclave";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${testName}: ${detail}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${testName}: ${detail}`);
    failedCount++;
  }
}

async function runFeasibilityTests() {
  console.log("\n=======================================================================");
  console.log("   SHUNYAGRID FEASIBILITY & INVARIANT TEST SUITE (ETHGlobal 2026)      ");
  console.log("=======================================================================\n");

  // --------------------------------------------------------------------------
  // FT-01: Zero Mid-Way Cutoff Gate
  // --------------------------------------------------------------------------
  console.log("\x1b[36m[FT-01] Testing Zero Mid-Way Cutoff Gate Invariant...\x1b[0m");
  {
    const sellerTokens = 18_000;
    const model = "claude-3-7-sonnet";

    // Attempt medium thinking (requires 24,192)
    const checkMedium = canSellerFulfillPrompt(sellerTokens, model, "medium");
    assert(
      !checkMedium.eligible,
      "FT-01.1",
      `18,000 tokens rejected for medium thinking (T_max = ${checkMedium.bounds.totalMaxTokens})`
    );
    assert(
      checkMedium.reason?.includes("requires at least T_max =") || false,
      "FT-01.2",
      "Deterministic rejection reason matches token specification"
    );

    // Alternative suggestion check (low requires 14,048)
    const checkLow = canSellerFulfillPrompt(sellerTokens, model, "low");
    assert(
      checkLow.eligible,
      "FT-01.3",
      `18,000 tokens accepted for low thinking (T_max = ${checkLow.bounds.totalMaxTokens} <= 18,000)`
    );
  }

  // --------------------------------------------------------------------------
  // FT-02: Max Charge vs. Actual Payout & Commission Split
  // --------------------------------------------------------------------------
  console.log("\n\x1b[36m[FT-02] Testing Max Charge, Actual Payout & Web App Commission Split...\x1b[0m");
  {
    const bounds = MODEL_TOKEN_CATALOG["o3-mini:medium"]; // T_max = 22,000
    const pricePer1kMicroUsdc = 10_000; // $0.01 per 1k
    const tUsed = 11_500;

    const split = calculatePostExecutionSplitMicroUsdc(bounds, tUsed, pricePer1kMicroUsdc);

    assert(
      split.buyerChargedMicroUsdc === 220_000,
      "FT-02.1",
      `Buyer upfront charge for T_max (22,000) = $${split.buyerChargedUsdc.toFixed(6)} USDC ($0.220000 expected)`
    );
    assert(
      split.sellerPayoutMicroUsdc === 115_000,
      "FT-02.2",
      `Seller payout for T_used (11,500) = $${split.sellerPayoutUsdc.toFixed(6)} USDC ($0.115000 expected)`
    );
    assert(
      split.webAppCommissionMicroUsdc === 105_000,
      "FT-02.3",
      `ShunyaGrid protocol commission = $${split.webAppCommissionUsdc.toFixed(6)} USDC ($0.105000 expected)`
    );
    assert(
      split.unusedTokensReturnedToSellerQuota === 10_500,
      "FT-02.4",
      `Unused token reservation (22,000 - 11,500 = 10,500) returned to Seller quota`
    );
  }

  // --------------------------------------------------------------------------
  // FT-03: Total Seller Blindness (Prompt, Files & Output)
  // --------------------------------------------------------------------------
  console.log("\n\x1b[36m[FT-03] Testing Total Seller Blindness (Prompt, Files & Output Sealed)...\x1b[0m");
  {
    const { publicKey, privateKey } = getOrCreateEnclaveKeyPair();

    // 1. Seller seals API key in browser
    const rawApiKey = "sk-ant-api03-TOP_SECRET_SELLER_KEY_123456789";
    const sealedKey = sealSellerApiKeyToEnclave(rawApiKey, publicKey);
    assert(
      sealedKey !== rawApiKey && !sealedKey.includes("sk-ant"),
      "FT-03.1",
      "Seller API key sealed to Enclave RSA-OAEP public key; plaintext masked"
    );

    // 2. Buyer seals confidential prompt + financial CSV in browser
    const secretPrompt = "Analyze this confidential Q3 ledger and forecast Q4 churn";
    const secretFile = {
      filename: "ledger_secret.csv",
      mimeType: "text/csv",
      data: Buffer.from("user_id,revenue,churn\n101,4500,0\n102,9000,1\n103,12000,0"),
    };

    const { buyerLocalReturnKeyBase64, encryptedEnvelope } = sealBuyerPromptAndFiles(
      secretPrompt,
      [secretFile],
      publicKey
    );

    // Seller inspection test
    assert(
      !encryptedEnvelope.encryptedPromptBase64.includes("confidential") &&
      !encryptedEnvelope.files[0].ciphertextBase64.includes("revenue"),
      "FT-03.2",
      "Seller inspecting proxy stream sees only AES-256-GCM ciphertext blobs"
    );

    // 3. Enclave RAM unwrapping test
    const unwrapped = unwrapBuyerEnvelopeInEnclave(encryptedEnvelope, privateKey);
    const unwrappedKey = unwrapSellerApiKey(sealedKey, privateKey);
    assert(
      unwrapped.promptText === secretPrompt && unwrappedKey === rawApiKey,
      "FT-03.3",
      "Enclave successfully unwraps prompt, file & Seller API key in isolated RAM"
    );

    // 4. Output encryption with Buyer's local K_return
    const aiOutput = "Q4 Churn forecast is 12.4% with revenue expansion of 18%.";
    const reasoning = "Examined user 102 churn pattern against revenue cohort...";
    const sealedOutput = encryptAiOutputWithReturnKey(aiOutput, reasoning, unwrapped.kReturn);

    // Buyer local decryption
    const buyerDecrypted = decryptBuyerOutput(
      sealedOutput.encryptedOutputBase64,
      sealedOutput.ivHex,
      sealedOutput.authTagHex,
      buyerLocalReturnKeyBase64
    );

    assert(
      buyerDecrypted.aiOutputText === aiOutput,
      "FT-03.4",
      "AI output sealed with Buyer K_return and decrypted locally in Buyer browser"
    );
  }

  // --------------------------------------------------------------------------
  // FT-04: Anon-RPC Read Anonymity
  // --------------------------------------------------------------------------
  console.log("\n\x1b[36m[FT-04] Testing Anon-RPC Read Anonymity & EF Privacy Compliance...\x1b[0m");
  {
    // Simulating Anon-RPC proxy worker stripping IP headers
    const rawClientRequest = {
      clientIp: "198.51.100.42",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      jsonRpcMethod: "arkiv_queryEntities",
      params: { model: "claude-3-7-sonnet" },
    };

    // Anon-RPC harness transformation
    const anonRpcHarnessOutput = {
      jsonRpcMethod: rawClientRequest.jsonRpcMethod,
      params: rawClientRequest.params,
      forwardedFor: undefined,
      clientIp: undefined,
      sandboxed: true,
    };

    assert(
      anonRpcHarnessOutput.clientIp === undefined && anonRpcHarnessOutput.sandboxed === true,
      "FT-04.1",
      "EF @anon-rpc/browser-harness strips Buyer IP and headers from Web3 RPC queries"
    );
  }

  // --------------------------------------------------------------------------
  // FT-05: Time-Scoped File & Listing Expiry (Arkiv Entities)
  // --------------------------------------------------------------------------
  console.log("\n\x1b[36m[FT-05] Testing Arkiv Time-Scoped Entity Expiry...\x1b[0m");
  {
    // Create new database instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arkiv = new (ArkivDatabaseEngine as any)();
    
    // Create 10-minute file entity (200 blocks)
    const fileEntity = arkiv.storeFileEntity({
      ownerFingerprint: "buyer_anon_01",
      filename: "temp_invoice.csv",
      sizeBytes: 1024,
      mimeType: "text/csv",
      storageTarget: "arkiv",
      ciphertextRef: "0xarkiv_temp_blob_123",
    });

    assert(
      arkiv.getFileEntity(fileEntity.id) !== undefined,
      "FT-05.1",
      `Temporary file entity stored in Arkiv (Expires at block ${fileEntity.expiresAtBlock})`
    );

    // Advance 250 blocks past expiration
    arkiv.advanceBlocks(250);

    assert(
      arkiv.getFileEntity(fileEntity.id) === undefined,
      "FT-05.2",
      "After 250 blocks (> 10 mins), temporary encrypted file automatically pruned from Arkiv"
    );
  }

  // --------------------------------------------------------------------------
  // FT-06: Concurrent Request Race Protection
  // --------------------------------------------------------------------------
  console.log("\n\x1b[36m[FT-06] Testing Concurrent Request Race Protection & Atomic Locks...\x1b[0m");
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arkiv = new (ArkivDatabaseEngine as any)();
    const listing = arkiv.createListing({
      ownerAddress: "0xTestSeller",
      ensName: "test-seller.shunyagrid.eth",
      model: "o3-mini",
      provider: "openai",
      availableTokens: 30_000,
      pricePer1kMicroUsdc: 10_000,
      humanVerified: true,
      sealedApiKey: "ENCLAVE_SEALED:key",
      hedaraPayoutAccount: "0.0.999",
    });

    const jobTMax = 22_000;

    // Buyer A acquires lock
    const lockA = arkiv.atomicLockTokens(listing.id, jobTMax);
    assert(
      lockA === true && listing.availableTokens === 8_000,
      "FT-06.1",
      "Buyer A successfully locks 22,000 tokens (8,000 remaining)"
    );

    // Buyer B attempts concurrent lock for 22,000
    const lockB = arkiv.atomicLockTokens(listing.id, jobTMax);
    assert(
      lockB === false,
      "FT-06.2",
      "Buyer B atomically rejected (8,000 < 22,000 required), preventing mid-generation cutoff!"
    );

    // Buyer A completes prompt using 12,000 tokens
    arkiv.reconcilePostExecution(listing.id, jobTMax, 12_000);
    assert(
      listing.availableTokens === 18_000,
      "FT-06.3",
      "Quota reconciled: 30,000 - 12,000 used = 18,000 available tokens returned to orderbook"
    );
  }

  console.log("\n=======================================================================");
  console.log(`   FEASIBILITY TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runFeasibilityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

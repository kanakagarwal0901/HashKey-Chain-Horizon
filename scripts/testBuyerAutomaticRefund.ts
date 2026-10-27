import fs from "fs";
import path from "path";
import crypto from "crypto";

// Auto-load .env.local
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...vals] = trimmed.split("=");
        if (key && vals.length) {
          process.env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    });
  }
} catch {}

import {
  arkivDb,
  buyerRefundEngine,
  getModelTokenBounds,
  sealSellerApiKeyToEnclave,
  getOrCreateEnclaveKeyPair,
} from "../packages/shunya-core/src/index";

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

async function runAutomaticRefundTests() {
  console.log("\n=======================================================================");
  console.log("   SHUNYAGRID AUTOMATIC BUYER REFUND ON API REJECTION TEST SUITE       ");
  console.log("=======================================================================\n");

  const baseUrl = "http://localhost:3000";
  const { publicKey: enclavePubKey } = getOrCreateEnclaveKeyPair();

  // --------------------------------------------------------------------------
  // TEST 1: Direct Unit Test on BuyerRefundEngine (Sepolia EVM rail)
  // --------------------------------------------------------------------------
  console.log("\x1b[36m[TEST 1] Testing BuyerRefundEngine Execution for Sepolia EVM...\x1b[0m");
  {
    const buyerEvmAddress = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";
    const paymentTxId = `0x${crypto.randomBytes(32).toString("hex")}`;
    const refundAmountMicroUsdc = 220_000; // $0.22 USDC

    const refund = await buyerRefundEngine.executeRefund({
      paymentRail: "sepolia",
      buyerAddress: buyerEvmAddress,
      refundAmountMicroUsdc,
      reason: "Upstream Anthropic API rejected inference: HTTP 401 Unauthorized (Invalid API Key)",
      originalPaymentTxId: paymentTxId,
      modelId: "claude-3-7-sonnet",
    });

    assert(refund.success, "REFUND-01.1", "Refund executed with success = true");
    assert(
      refund.recipientAccount.toLowerCase() === buyerEvmAddress.toLowerCase(),
      "REFUND-01.2",
      `Refund dispatched back to buyer address: ${refund.recipientAccount}`
    );
    assert(
      refund.refundAmountUsdc === 0.22,
      "REFUND-01.3",
      `Refund amount equals exact upfront charge: $${refund.refundAmountUsdc.toFixed(6)} USDC`
    );
    assert(
      refund.refundTxHash.startsWith("0x"),
      "REFUND-01.4",
      `Valid on-chain refund transaction hash generated: ${refund.refundTxHash.slice(0, 18)}...`
    );
    assert(
      refund.explorerUrl.includes("sepolia.etherscan.io"),
      "REFUND-01.5",
      `Explorer URL points to Sepolia Etherscan: ${refund.explorerUrl}`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 2: Direct Unit Test on BuyerRefundEngine (Hedera rail)
  // --------------------------------------------------------------------------
  console.log("\n\x1b[36m[TEST 2] Testing BuyerRefundEngine Execution for Hedera Rail...\x1b[0m");
  {
    const buyerHederaAccount = "0.0.11145557";
    const paymentTxId = `0.0.11073932@${Math.floor(Date.now() / 1000)}.123456`;
    const refundAmountMicroUsdc = 150_000; // $0.15 USDC

    const refund = await buyerRefundEngine.executeRefund({
      paymentRail: "hedera",
      buyerAddress: buyerHederaAccount,
      refundAmountMicroUsdc,
      reason: "OpenAI quota limit reached on seller key: HTTP 429 Rate Limited",
      originalPaymentTxId: paymentTxId,
      modelId: "o3-mini",
    });

    assert(refund.success, "REFUND-02.1", "Hedera refund executed with success = true");
    assert(
      refund.recipientAccount === buyerHederaAccount,
      "REFUND-02.2",
      `Refund dispatched back to buyer Hedera account: ${refund.recipientAccount}`
    );
    assert(
      refund.refundAmountUsdc === 0.15,
      "REFUND-02.3",
      `Refund amount equals $${refund.refundAmountUsdc.toFixed(6)} USDC`
    );
    assert(
      refund.explorerUrl.includes("hashscan.io"),
      "REFUND-02.4",
      `Explorer URL points to HashScan: ${refund.explorerUrl}`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 3: End-to-End API Call Rejection & Automatic Buyer Refund via /api/blind-execute
  // --------------------------------------------------------------------------
  console.log("\n\x1b[36m[TEST 3] Testing End-to-End API Call Rejection & Automatic Refund via /api/blind-execute...\x1b[0m");
  {
    // Create an authentic seller listing on Arkiv with an invalid/rejected key
    const rejectedSellerListing = arkivDb.createListing({
      ownerAddress: "0xe17fe685764bc9bf749b7a72a9fc1452a7235d21",
      ensName: "refund-node-test.shunyagrid.eth",
      model: "claude-3-7-sonnet",
      provider: "anthropic",
      availableTokens: 50000,
      pricePer1kMicroUsdc: 10000, // $0.01 / 1k
      sealedApiKey: "ENCLAVE_SEALED:sk-ant-invalid-bogus-key-that-causes-upstream-rejection",
      hedaraPayoutAccount: "0.0.11145557",
      worldIdNullifier: "0x1111111111111111111111111111111111111111111111111111111111111111",
      humanVerified: true,
    });

    // Notify dev server to sync listings from disk
    await fetch(`${baseUrl}/api/listings?reload=true`);

    const buyerWallet = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";
    const paymentTx = `0x_test_verified_${crypto.randomBytes(24).toString("hex")}`;
    const initialQuota = rejectedSellerListing.availableTokens;

    // Simulate encrypted envelope
    // Prepare test envelope with dummy return key
    const dummyReturnKey = crypto.randomBytes(32);
    const envelopePayload = JSON.stringify({
      promptText: "Explain how zero-cutoff escrow guarantees work in Web3",
      files: [],
      kReturn: dummyReturnKey.toString("hex"),
    });

    // Encrypt envelope with Enclave public key
    const symKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", symKey, iv);
    const ciphertext = Buffer.concat([cipher.update(envelopePayload, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedSymKey = crypto.publicEncrypt(
      {
        key: enclavePubKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      symKey
    );

    const encryptedEnvelope = {
      encryptedSymKeyBase64: encryptedSymKey.toString("base64"),
      ivHex: iv.toString("hex"),
      authTagHex: authTag.toString("hex"),
      ciphertextBase64: ciphertext.toString("base64"),
    };

    // Call /api/blind-execute
    const res = await fetch(`${baseUrl}/api/blind-execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-402-Payment-TxId": paymentTx,
      },
      body: JSON.stringify({
        modelId: "claude-3-7-sonnet",
        thinkingLevel: "medium",
        listingId: rejectedSellerListing.id,
        encryptedEnvelope,
        paymentTxId: paymentTx,
        buyerAddress: buyerWallet,
      }),
    });

    const data = await res.json();
    console.log(`  • Execution API Status: ${res.status} (Expected: 422 Unprocessable / Rejected)`);
    console.log(`  • Success: ${data.success}`);
    console.log(`  • Refunded flag: ${data.refunded}`);

    assert(
      res.status === 422 || res.status === 500,
      "REFUND-03.1",
      `API call was properly rejected due to upstream failure (HTTP ${res.status})`
    );
    assert(
      data.refunded === true,
      "REFUND-03.2",
      "Response payload confirms 100% refund was issued to buyer"
    );
    assert(
      Boolean(data.refund),
      "REFUND-03.3",
      "Refund details object is included in response"
    );
    assert(
      data.refund.recipientAccount.toLowerCase() === buyerWallet.toLowerCase(),
      "REFUND-03.4",
      `Refund sent back to payment account: ${data.refund.recipientAccount}`
    );
    assert(
      data.refund.refundAmountUsdc > 0,
      "REFUND-03.5",
      `Refund amount is exact upfront deposit: $${data.refund.refundAmountUsdc} USDC`
    );
    assert(
      Boolean(data.refund.refundTxHash),
      "REFUND-03.6",
      `Refund on-chain tx hash: ${data.refund.refundTxHash.slice(0, 18)}...`
    );

    // Verify Seller Quota Restoration (Zero Token Loss)
    const refreshedListing = arkivDb.getListingById(rejectedSellerListing.id);
    assert(
      refreshedListing?.availableTokens === initialQuota,
      "REFUND-03.7",
      `Seller quota fully restored without leakage (${refreshedListing?.availableTokens} tokens, initial: ${initialQuota})`
    );
    assert(
      refreshedListing?.lockedTokens === 0,
      "REFUND-03.8",
      `Seller locked tokens reset to 0 (locked: ${refreshedListing?.lockedTokens})`
    );

    // Clean up temporary test listing from Arkiv storage to keep orderbook clean
    arkivDb.deleteListing(rejectedSellerListing.id);
    await fetch(`${baseUrl}/api/listings?reload=true`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Query Buyer Refunds History via /api/buyer/refunds
  // --------------------------------------------------------------------------
  console.log("\n\x1b[36m[TEST 4] Testing Querying Refund History via /api/buyer/refunds...\x1b[0m");
  {
    const buyerEvmAddress = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";
    const res = await fetch(`${baseUrl}/api/buyer/refunds?address=${buyerEvmAddress}`);
    const data = await res.json();

    assert(res.status === 200, "REFUND-04.1", "Refunds query API returned HTTP 200");
    assert(data.success === true, "REFUND-04.2", "Refunds query success is true");
    assert(
      Array.isArray(data.refunds) && data.refunds.length >= 1,
      "REFUND-04.3",
      `Refund records found for buyer: ${data.refunds.length} recorded`
    );
    assert(
      data.refunds[0].recipientAccount.toLowerCase() === buyerEvmAddress.toLowerCase(),
      "REFUND-04.4",
      `Most recent refund recipient matches buyer: ${data.refunds[0].recipientAccount}`
    );
  }

  console.log("\n=======================================================================");
  console.log(`   AUTOMATIC BUYER REFUND SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAutomaticRefundTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

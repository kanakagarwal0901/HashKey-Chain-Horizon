import fs from "fs";
import path from "path";

// Load .env.local if present
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

import { arkivDb } from "../packages/shunya-core/src/index";

async function main() {
  console.log("==================================================================");
  console.log("  Testing Seller Hedera Login Gateway & Balance Gating Workflow   ");
  console.log("==================================================================");

  const baseUrl = "http://127.0.0.1:3000";

  // Test 1: Query hedera-balance with NO account connected (gated/unauthenticated)
  console.log("\n[1/4] Testing Balance API Gating without Hedera Account...");
  const emptyRes = await fetch(`${baseUrl}/api/seller/hedera-balance`);
  const emptyData = await emptyRes.json();
  console.log(`  • Status: ${emptyRes.status}`);
  console.log(`  • Account ID: "${emptyData.accountId}"`);
  console.log(`  • Balance: $${emptyData.htsUsdcBalance} USDC`);
  console.log(`  • Response Message: "${emptyData.message}"`);

  if (emptyData.accountId !== "" || emptyData.htsUsdcBalance !== 0) {
    throw new Error("Expected zero balance and empty account when not logged into Hedera.");
  }
  console.log("  ✔ [PASS] Balance is securely gated when Hedera account is not connected!");

  // Test 2: Test connecting invalid Hedera format
  console.log("\n[2/4] Testing Invalid Hedera Account Format Validation...");
  const invalidAcc = "not-a-hedera-account";
  const hederaRegex = /^0\.0\.\d+$/;
  const isValidFormat = hederaRegex.test(invalidAcc);
  console.log(`  • Account "${invalidAcc}" passes regex: ${isValidFormat} (Expected: false)`);
  if (isValidFormat) throw new Error("Invalid account unexpectedly passed regex");

  const invalidRes = await fetch(`${baseUrl}/api/seller/hedera-balance?accountId=${invalidAcc}`);
  console.log(`  • API Status for invalid format: ${invalidRes.status} (Expected: 400)`);
  if (invalidRes.status !== 400) throw new Error("Expected HTTP 400 for invalid account format");
  console.log("  ✔ [PASS] Invalid format properly rejected!");

  // Test 3: Test authentic Hedera Account Login & Live Balance
  console.log("\n[3/4] Testing Authentic Hedera Seller Account Login (0.0.11145557)...");
  const testAccount = "0.0.11145557";
  const validRes = await fetch(`${baseUrl}/api/seller/hedera-balance?accountId=${testAccount}`);
  const validData = await validRes.json();
  console.log(`  • Status: ${validRes.status}`);
  console.log(`  • Connected Account: ${validData.accountId}`);
  console.log(`  • Live HTS USDC Balance: $${validData.htsUsdcBalance} USDC`);
  console.log(`  • Live HBAR Gas Balance: ${validData.hbarBalance} HBAR`);
  console.log(`  • HashScan URL: ${validData.hashscanAccountUrl}`);

  if (!validData.success || validData.accountId !== testAccount) {
    throw new Error("Failed to verify live Hedera account balance on testnet.");
  }
  console.log("  ✔ [PASS] Live on-chain balance successfully unlocked after Hedera login!");

  // Test 4: Listing requirement check (must have hedaraPayoutAccount)
  console.log("\n[4/4] Verifying Listing Studio Orderbook Requirements...");
  const testListingPayload = {
    ownerAddress: "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444",
    ensLabel: "test-node",
    model: "claude-3-7-sonnet",
    availableTokens: 50000,
    pricePer1kMicroUsdc: 12000,
    sealedApiKey: "ENCLAVE_SEALED:sample_test_key",
    // Missing hedaraPayoutAccount
  };

  const missingPayoutRes = await fetch(`${baseUrl}/api/listings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testListingPayload),
  });
  console.log(`  • Listing creation without Hedera Account returned: HTTP ${missingPayoutRes.status} (Expected: 400)`);
  if (missingPayoutRes.status !== 400) {
    throw new Error("Expected listing to fail when hedaraPayoutAccount is missing.");
  }
  console.log("  ✔ [PASS] Orderbook listing requires connected Hedera Payout Account!");

  console.log("\n==================================================================");
  console.log("  ALL SELLER HEDERA GATEWAY & GATING TESTS PASSED PERFECTLY!     ");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

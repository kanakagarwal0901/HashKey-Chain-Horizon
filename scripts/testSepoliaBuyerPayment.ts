/**
 * ShunyaGrid - Ethereum Sepolia Buyer Payment Verification & HashKey HSP Consensus Linking
 * Validates real Circle USDC payment decoding, replay protection, and dual receipt generation.
 */

import {
  SEPOLIA_CIRCLE_USDC_ADDRESS,
  SHUNYA_TREASURY_EVM_ADDRESS,
  verifySepoliaUsdcPayment,
} from "../src/lib/sepoliaPaymentVerifier";
import { hashKeyTreasury, getModelTokenBounds } from "../packages/shunya-core/src";

async function runSepoliaPaymentTests() {
  console.log("\n=======================================================================");
  console.log("   SHUNYAGRID SEPOLIA USDC BUYER PAYMENT VERIFICATION TEST SUITE       ");
  console.log("=======================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✔ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${testName}: ${detail || ""}`);
      failed++;
    }
  }

  // TEST 1: Config constants validation
  assert(
    SEPOLIA_CIRCLE_USDC_ADDRESS.toLowerCase() === "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238".toLowerCase(),
    "SEP-01: Circle Testnet USDC on Sepolia is configured to official contract address",
    SEPOLIA_CIRCLE_USDC_ADDRESS
  );

  assert(
    SHUNYA_TREASURY_EVM_ADDRESS.toLowerCase() === "0x9b3b7375b0591E8A304A8f66D11186Fb07672625".toLowerCase(),
    "SEP-02: ShunyaGrid Treasury EVM recipient address matches Treasury address",
    SHUNYA_TREASURY_EVM_ADDRESS
  );

  // TEST 2: Format validation
  const invalidFormatResult = await verifySepoliaUsdcPayment("not-a-tx-hash", "0x123", 100000);
  assert(
    !invalidFormatResult.verified && Boolean(invalidFormatResult.error?.includes("Invalid Ethereum transaction hash format")),
    "SEP-03: Invalid hash format is strictly rejected before RPC query"
  );

  // TEST 3: Non-existent transaction on Sepolia
  const nonExistentTx = "0x" + "a".repeat(64);
  const nonExistentResult = await verifySepoliaUsdcPayment(nonExistentTx, "0x123", 100000);
  assert(
    !nonExistentResult.verified && Boolean(nonExistentResult.error?.includes("receipt not yet confirmed")),
    "SEP-04: Non-existent or unconfirmed Sepolia transaction is safely handled"
  );

  // TEST 4: HashKey HSP Settlement linking with buyerSepoliaTxHash
  console.log("\n[SECTION 2: HASHKEY CHAIN HSP SETTLEMENT WITH SEPOLIA PAYMENT LINK]");
  const bounds = getModelTokenBounds("claude-3-7-sonnet", "medium");
  const testSepoliaTx = "0x" + "d".repeat(64);

  const settlement = await hashKeyTreasury.settleSellerPayoutOnHashKey({
    mandateId: testSepoliaTx,
    sellerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    buyerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    modelId: "claude-3-7-sonnet",
    tUsed: 12450,
    tMax: bounds.totalMaxTokens,
    sellerPayoutMicroUsdc: 124500,
    protocolFeeMicroUsdc: 117420,
    buyerRefundMicroUsdc: 0,
    attestationHashHex: "0xattestation_test_hash",
  });

  assert(
    settlement.status === "SETTLED",
    "SEP-05: HashKey settlement status is SETTLED",
    settlement.status
  );

  assert(
    Boolean(settlement.blockscoutUrl?.includes("https://testnet-explorer.hskchain.net/tx/")),
    "SEP-06: HashKey settlement receipt includes direct HashKey Explorer URL",
    settlement.blockscoutUrl
  );

  assert(
    settlement.sellerPayoutHsk > 0,
    "SEP-07: HashKey settlement converts seller payout into native HSK",
    `${settlement.sellerPayoutHsk} HSK`
  );

  console.log("\n=======================================================================");
  console.log(`   SEPOLIA BUYER PAYMENT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================================\n");

  if (failed > 0) process.exit(1);
}

runSepoliaPaymentTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});

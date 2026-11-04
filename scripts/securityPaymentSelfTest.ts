import assert from "assert";
import { ethers } from "ethers";
import {
  verifyUniversalBuyerPayment,
  parseReceiptTransferLogs,
  paymentStore,
  UniversalPaymentStore,
  TRANSFER_EVENT_TOPIC,
  SHUNYA_TREASURY_EVM_ADDRESS,
  SEPOLIA_CIRCLE_USDC_ADDRESS,
} from "../src/lib/sepoliaPaymentVerifier";
import { buyerRefundEngine } from "../packages/shunya-core/src/buyerRefundEngine";

let testsRun = 0;
let testsPassed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  testsRun++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          testsPassed++;
          console.log(`  PASS: ${name}`);
        })
        .catch((err) => {
          console.error(`  FAIL: ${name}`, err);
          process.exitCode = 1;
        });
    } else {
      testsPassed++;
      console.log(`  PASS: ${name}`);
    }
  } catch (err) {
    console.error(`  FAIL: ${name}`, err);
    process.exitCode = 1;
  }
}

async function main() {
  console.log("=== Security Payment Self-Test Suite ===");

  // 1. Non-0x payment ID and invalid hash formats must be rejected
  await runTest("Non-0x payment ID is rejected", async () => {
    const result = await verifyUniversalBuyerPayment({
      txHash: "Bearer_token_not_a_hash",
      requiredMicroUsdc: 1_000_000,
    });
    assert.strictEqual(result.verified, false, "Expected non-0x id to be rejected");
    assert(result.error?.includes("Invalid Ethereum transaction hash"), "Expected format error message");
  });

  await runTest("Short 0x payment ID (< 66 chars) is rejected", async () => {
    const result = await verifyUniversalBuyerPayment({
      txHash: "0x1234567890abcdef",
      requiredMicroUsdc: 1_000_000,
    });
    assert.strictEqual(result.verified, false, "Expected short 0x id to be rejected");
  });

  // 2. Reserving the same hash twice -> second rejected (synchronous TOCTOU / replay protection)
  runTest("Reserving the same hash twice -> second rejected", () => {
    const testHash = "0x" + "a".repeat(64);
    const store = new UniversalPaymentStore();

    // Release if left from earlier run
    store.release(testHash);

    const first = store.reserve(testHash, { listingId: "test-listing" });
    assert.strictEqual(first.success, true, "First reservation must succeed");

    const second = store.reserve(testHash, { listingId: "test-listing-2" });
    assert.strictEqual(second.success, false, "Second reservation must be rejected");
    assert(second.error?.includes("already reserved"), "Expected already reserved error");

    // Clean up
    store.release(testHash);
  });

  runTest("Consuming a hash and attempting to re-reserve -> rejected as consumed replay", () => {
    const testHash = "0x" + "b".repeat(64);
    const store = new UniversalPaymentStore();
    store.release(testHash);

    store.reserve(testHash);
    store.consume(testHash, { listingId: "listing-1", payer: "0x1111111111111111111111111111111111111111" });

    const attempt = store.reserve(testHash);
    assert.strictEqual(attempt.success, false, "Re-reserving consumed hash must fail");
    assert(attempt.error?.includes("already been used"), "Expected already consumed error");
  });

  // 3. ERC-20 log from a non-whitelisted token -> not counted
  runTest("ERC-20 log from a non-whitelisted token is not counted", () => {
    const payer = "0x3333333333333333333333333333333333333333";
    const fakeToken = "0x9999999999999999999999999999999999999999";
    const fakeLogs = [
      {
        address: fakeToken,
        topics: [
          TRANSFER_EVENT_TOPIC,
          ethers.zeroPadValue(payer, 32),
          ethers.zeroPadValue(SHUNYA_TREASURY_EVM_ADDRESS, 32),
        ],
        data: ethers.toBeHex(10_000_000n), // 10 USDC fake
      },
    ];

    const parsed = parseReceiptTransferLogs(fakeLogs, "ethereum-sepolia");
    assert.strictEqual(parsed.found, false, "Non-whitelisted token log must NOT be counted");
  });

  // 4. ERC-20 log to an address other than treasury -> not counted
  runTest("ERC-20 log to non-treasury address is not counted", () => {
    const payer = "0x3333333333333333333333333333333333333333";
    const attackerTarget = "0x4444444444444444444444444444444444444444";
    const fakeLogs = [
      {
        address: SEPOLIA_CIRCLE_USDC_ADDRESS,
        topics: [
          TRANSFER_EVENT_TOPIC,
          ethers.zeroPadValue(payer, 32),
          ethers.zeroPadValue(attackerTarget, 32),
        ],
        data: ethers.toBeHex(10_000_000n),
      },
    ];

    const parsed = parseReceiptTransferLogs(fakeLogs, "ethereum-sepolia");
    assert.strictEqual(parsed.found, false, "Transfer to non-treasury address must NOT be counted");
  });

  // 5. ERC-20 Transfer log from whitelisted USDC to treasury -> counted and normalized
  runTest("ERC-20 Transfer from whitelisted USDC to treasury is counted and normalized", () => {
    const payer = "0x3333333333333333333333333333333333333333";
    const amountUnits = 5_000_000n; // 5 USDC
    const validLogs = [
      {
        address: SEPOLIA_CIRCLE_USDC_ADDRESS,
        topics: [
          TRANSFER_EVENT_TOPIC,
          ethers.zeroPadValue(payer, 32),
          ethers.zeroPadValue(SHUNYA_TREASURY_EVM_ADDRESS, 32),
        ],
        data: ethers.toBeHex(amountUnits),
      },
    ];

    const parsed = parseReceiptTransferLogs(validLogs, "ethereum-sepolia");
    assert.strictEqual(parsed.found, true, "Whitelisted USDC Transfer to treasury must be counted");
    assert.strictEqual(parsed.payer.toLowerCase(), payer.toLowerCase(), "Payer address must match Transfer from");
    assert.strictEqual(parsed.recipient.toLowerCase(), SHUNYA_TREASURY_EVM_ADDRESS.toLowerCase(), "Recipient must be treasury");
    assert.strictEqual(parsed.amountMicroUsdc, 5_000_000n, "Amount in micro-USDC must be 5,000,000");
    assert.strictEqual(parsed.tokenSymbol, "USDC");
  });

  // 6. BuyerRefundEngine: Zero refund must not pay
  await runTest("BuyerRefundEngine: Zero refund amount returns without payout", async () => {
    const refund = await buyerRefundEngine.executeRefund({
      paymentRail: "hashkey",
      buyerAddress: "0x5555555555555555555555555555555555555555",
      refundAmountMicroUsdc: 0,
      reason: "No refund due",
      originalPaymentTxId: "0x" + "c".repeat(64),
    });
    assert.strictEqual(refund.success, false, "Zero refund must return success: false");
    assert.strictEqual(refund.refundAmountMicroUsdc, 0);
  });

  // 7. BuyerRefundEngine: Refund exceeding verified paid amount is rejected
  await runTest("BuyerRefundEngine: Refund exceeding verified paid amount is rejected", async () => {
    let threw = false;
    try {
      await buyerRefundEngine.executeRefund({
        paymentRail: "hashkey",
        buyerAddress: "0x5555555555555555555555555555555555555555",
        refundAmountMicroUsdc: 2_000_000,
        verifiedPaidMicroUsdc: 1_000_000,
        reason: "Excessive refund",
        originalPaymentTxId: "0x" + "d".repeat(64),
      });
    } catch (err: any) {
      threw = true;
      assert(err.message.includes("exceeds verified paid amount"), "Expected exceeds error");
    }
    assert(threw, "Expected executeRefund to throw when refund > verified paid");
  });

  // 8. BuyerRefundEngine: Duplicate refund for same originalPaymentTxId is rejected
  await runTest("BuyerRefundEngine: Refuses duplicate refund for same paymentTxId", async () => {
    const txId = "0x" + "e".repeat(64);

    // Mock treasury private key for mock refund test
    process.env.SHUNYA_TREASURY_PRIVATE_KEY = "0x" + "1".repeat(64);

    await buyerRefundEngine.executeRefund({
      paymentRail: "hashkey",
      buyerAddress: "0x5555555555555555555555555555555555555555",
      refundAmountMicroUsdc: 500_000,
      verifiedPaidMicroUsdc: 1_000_000,
      reason: "Legitimate refund",
      originalPaymentTxId: txId,
    });

    let duplicateThrew = false;
    try {
      await buyerRefundEngine.executeRefund({
        paymentRail: "hashkey",
        buyerAddress: "0x5555555555555555555555555555555555555555",
        refundAmountMicroUsdc: 500_000,
        verifiedPaidMicroUsdc: 1_000_000,
        reason: "Second refund attempt",
        originalPaymentTxId: txId,
      });
    } catch (err: any) {
      duplicateThrew = true;
      assert(err.message.includes("Duplicate refund rejected"), "Expected duplicate refund error");
    }
    assert(duplicateThrew, "Expected second refund for same tx to throw");
  });

  console.log(`\nResults: ${testsPassed}/${testsRun} passed.`);
  if (testsPassed !== testsRun) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Self-test fatal error:", err);
  process.exit(1);
});

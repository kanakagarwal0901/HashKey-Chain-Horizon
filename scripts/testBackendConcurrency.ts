/**
 * ShunyaGrid Core Backend Concurrency & Race Condition Stress Test
 * Validates Invariant FT-06 under High-Concurrency Autonomous Agent Swarms
 */

import { ArkivDatabaseEngine } from "../packages/shunya-core/src/arkivQuotaManager";
import { getModelTokenBounds } from "../packages/shunya-core/src/tokenBoundsCatalog";

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

async function runConcurrencyStressTest() {
  console.log("\n" + "=".repeat(75));
  console.log("   SHUNYAGRID BACKEND CONCURRENCY & RACE CONDITION STRESS SUITE");
  console.log("=".repeat(75) + "\n");

  const arkivDb = new ArkivDatabaseEngine({ persist: false });
  const bounds = getModelTokenBounds("claude-3-7-sonnet", "medium"); // T_max = 24,192
  const tMax = bounds.totalMaxTokens;

  // 1. Setup Seller with exactly 50,000 tokens
  // Math: floor(50,000 / 24,192) = 2 concurrent jobs MAX allowed!
  const initialQuota = 50_000;
  const seller = arkivDb.createListing({
    ownerAddress: "0x71C2a8b940e4e8B",
    ensName: "concurrency-test.shunyagrid.eth",
    model: "claude-3-7-sonnet",
    provider: "anthropic",
    availableTokens: initialQuota,
    pricePer1kMicroUsdc: 10_000,
    humanVerified: true,
    worldIdNullifier: "0xnullifier_concurrency_test",
    sealedApiKey: "ENCLAVE_SEALED:sk-ant-test-key",
    hedaraPayoutAccount: "0.0.482910",
  });

  console.log(`\x1b[36m[SCENARIO 1: 10 CONCURRENT BUYER AGENTS COMPETING FOR FINITE QUOTA]\x1b[0m`);
  console.log(`  Seller Initial Available Quota: ${initialQuota.toLocaleString()} tokens`);
  console.log(`  Job Requirement (T_max):       ${tMax.toLocaleString()} tokens per prompt`);
  console.log(`  Expected Maximum Admitted Jobs: 2 (2 * 24,192 = 48,384 <= 50,000)`);
  console.log(`  Expected Rejections:            8 (Zero mid-generation cutoffs allowed!)\n`);

  // Launch 10 simultaneous asynchronous lock attempts
  const concurrentBuyers = Array.from({ length: 10 }, (_, i) => ({
    buyerId: `Agent_${i + 1}`,
  }));

  const results = await Promise.all(
    concurrentBuyers.map(async (agent) => {
      // Simulate micro-jitter in network arrival
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 15)));
      const locked = await arkivDb.atomicLockTokensAsync(seller.id, tMax);
      return { buyerId: agent.buyerId, locked };
    })
  );

  const admitted = results.filter((r) => r.locked);
  const rejected = results.filter((r) => !r.locked);

  console.log(`  Concurrency Execution Results:`);
  console.log(`    * Successfully Locked Jobs: ${admitted.length} (${admitted.map((a) => a.buyerId).join(", ")})`);
  console.log(`    * Atomically Rejected Jobs: ${rejected.length} (${rejected.map((r) => r.buyerId).join(", ")})`);

  assert(
    admitted.length === 2,
    "CONCURRENCY-01",
    `Strict Mutex Serialization: Exactly 2 out of 10 requests admitted (Expected 2, got ${admitted.length})`
  );

  assert(
    rejected.length === 8,
    "CONCURRENCY-02",
    `Cutoff Protection: Exactly 8 requests atomically rejected due to insufficient seller quota`
  );

  const updatedSeller = arkivDb.getListingById(seller.id)!;
  const expectedAvailableAfterLocks = initialQuota - 2 * tMax; // 50,000 - 48,384 = 1,616
  assert(
    updatedSeller.availableTokens === expectedAvailableAfterLocks,
    "CONCURRENCY-03",
    `Balance Integrity: Remaining available balance is exactly ${updatedSeller.availableTokens} tokens (${expectedAvailableAfterLocks} expected)`
  );

  assert(
    updatedSeller.lockedTokens === 2 * tMax,
    "CONCURRENCY-04",
    `Locked Tokens: Exactly ${updatedSeller.lockedTokens} tokens reserved in escrow`
  );

  // 2. Simulate Job Completion & Saga Quota Reconciliation
  console.log(`\n\x1b[36m[SCENARIO 2: SAGA POST-EXECUTION RECONCILIATION]\x1b[0m`);
  const tUsed = 14_192; // Each prompt uses 14,192 tokens
  const unusedPerJob = tMax - tUsed; // 24,192 - 14,192 = 10,000 tokens unused per job

  console.log(`  Job 1 Finished: ${tUsed.toLocaleString()} tokens used (${unusedPerJob.toLocaleString()} unused)`);
  await arkivDb.reconcilePostExecutionAsync(seller.id, tMax, tUsed);

  console.log(`  Job 2 Finished: ${tUsed.toLocaleString()} tokens used (${unusedPerJob.toLocaleString()} unused)`);
  await arkivDb.reconcilePostExecutionAsync(seller.id, tMax, tUsed);

  const reconciledSeller = arkivDb.getListingById(seller.id)!;
  const expectedFinalTokens = expectedAvailableAfterLocks + 2 * unusedPerJob; // 1,616 + 20,000 = 21,616
  assert(
    reconciledSeller.availableTokens === expectedFinalTokens,
    "CONCURRENCY-05",
    `Saga Reconciliation: Unused reservations returned to orderbook (${reconciledSeller.availableTokens} tokens available)`
  );

  assert(
    reconciledSeller.lockedTokens === 0,
    "CONCURRENCY-06",
    `Escrow Clearance: In-flight locked tokens successfully reset to 0`
  );

  // 3. Verify Newly Available Quota Can Now Fulfill a Low Thinking Request
  const lowBounds = getModelTokenBounds("claude-3-7-sonnet", "low"); // T_max = 14,048
  const lockLow = await arkivDb.atomicLockTokensAsync(seller.id, lowBounds.totalMaxTokens);
  assert(
    lockLow === true,
    "CONCURRENCY-07",
    `Orderbook Re-admittance: Restored quota successfully accepted low-thinking job (T_max = ${lowBounds.totalMaxTokens} <= ${expectedFinalTokens})`
  );

  console.log("\n" + "=".repeat(75));
  console.log(`   CONCURRENCY STRESS SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=".repeat(75) + "\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runConcurrencyStressTest().catch((err) => {
  console.error("Concurrency test failed:", err);
  process.exit(1);
});

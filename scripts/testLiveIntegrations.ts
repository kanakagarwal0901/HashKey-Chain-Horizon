import fs from "fs";
import path from "path";

// Ensure .env.local is loaded in standalone execution
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import {
  hashKeyTreasury,
  aiDispatcher,
  worldIdService,
  arcBridgeService,
  getModelTokenBounds,
} from "../packages/shunya-core/src";

async function runLiveIntegrationTests() {
  console.log("\n===========================================================================");
  console.log("   SHUNYAGRID LIVE BACKEND INTEGRATIONS & HASHKEY VERIFICATION SUITE       ");
  console.log("===========================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, description: string) {
    if (condition) {
      console.log(`  ✔ [PASS] ${testId}: ${description}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${testId}: ${description}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: HASHKEY CHAIN HORIZON & HSP ADAPTER
  // --------------------------------------------------------------------------
  console.log("[SECTION 1: HASHKEY CHAIN & HSP CONTRACT CONFIGURATION]");
  assert(
    hashKeyTreasury.chainId === 133,
    "HSK-01",
    `HashKey target chain is Testnet (Chain ID: ${hashKeyTreasury.chainId})`
  );
  assert(
    hashKeyTreasury.hspAdapterAddress.toLowerCase() === "0x40a633eef249f21d95c8803b7144f19aafeef7ae".toLowerCase(),
    "HSK-02",
    `HSPAdapter address matches official deployment: ${hashKeyTreasury.hspAdapterAddress}`
  );
  assert(
    hashKeyTreasury.routerAddress.toLowerCase() === "0x532802f2f9e0e3ee9d5ba70c35e1f43c0498772d".toLowerCase(),
    "HSK-03",
    `HashKeySettlementRouter address matches official deployment: ${hashKeyTreasury.routerAddress}`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 2: HSP SETTLEMENT ENGINE & INVARIANTS
  // --------------------------------------------------------------------------
  console.log("\n[SECTION 2: HASHKEY HSP SETTLEMENT ENGINE & RECEIPTS]");
  const bounds = getModelTokenBounds("claude-3-7-sonnet", "medium");
  const testMandateId = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const settlementResult = await hashKeyTreasury.settleSellerPayoutOnHashKey({
    mandateId: testMandateId,
    sellerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    buyerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    modelId: "claude-3-7-sonnet",
    tUsed: 14192,
    tMax: bounds.totalMaxTokens,
    sellerPayoutMicroUsdc: 141920,
    protocolFeeMicroUsdc: 100000,
    buyerRefundMicroUsdc: 0,
    attestationHashHex: "0x7a89b41efc8301d8923a104f98127389ab41029410",
  });

  assert(
    settlementResult.status === "SETTLED",
    "HSP-01",
    `Settlement status confirmed as SETTLED`
  );
  assert(
    settlementResult.sellerPayoutHsk > 0,
    "HSP-02",
    `Seller payout in native HSK calculated: ${settlementResult.sellerPayoutHsk} HSK`
  );
  assert(
    Boolean(settlementResult.blockscoutUrl.includes("https://testnet-explorer.hskchain.net/tx/")),
    "HSP-03",
    `Settlement generated Blockscout Explorer URL: ${settlementResult.blockscoutUrl}`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: WORLD ID PROOF-OF-HUMANITY VERIFICATION
  // --------------------------------------------------------------------------
  console.log("\n[SECTION 3: WORLD ID VERIFICATION GATEWAY]");
  const nullifier = `0xnullifier_test_${Date.now()}`;
  const verifyResult = await worldIdService.verifyProof({
    nullifier_hash: nullifier,
    merkle_root: "0x1b92048201948201948201948201948201948201",
    proof: "0xmock_zk_proof_payload",
    signal: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    action: "shunyagrid-gate",
  });
  assert(verifyResult.success === true, "WORLDID-01", "World ID proof verification succeeded");
  assert(verifyResult.nullifier_hash === nullifier, "WORLDID-02", "World ID nullifier returned correctly");

  // --------------------------------------------------------------------------
  // TEST GROUP 4: UNIVERSAL SELLER SWEEPER (MULTI-CHAIN & MULTI-TOKEN)
  // --------------------------------------------------------------------------
  console.log("\n[SECTION 4: UNIVERSAL SWEEP & MULTI-CHAIN UNISWAP BRIDGE]");
  const sweepTx = await arcBridgeService.executeLiveSellerSweep({
    sourceAccount: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    recipientAddress: "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444",
    amountUsdc: 0.01,
    destinationChain: "hashkey-testnet",
    targetCurrency: "HSK",
  });
  assert(sweepTx.status === "minted_on_destination", "SWEEP-01", "Universal sweep executed successfully");
  assert(Boolean(sweepTx.txHash.startsWith("0x")), "SWEEP-02", `Valid transaction hash produced: ${sweepTx.txHash}`);

  console.log("\n===========================================================================");
  console.log(`   INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("===========================================================================\n");

  if (failed > 0) process.exit(1);
}

runLiveIntegrationTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});

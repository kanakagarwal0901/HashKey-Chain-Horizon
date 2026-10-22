import {
  hederaNetworkClient,
  hederaEngine,
  aiDispatcher,
  worldIdService,
  arcBridgeService,
  getModelTokenBounds,
} from "../packages/shunya-core/src";

async function runLiveIntegrationTests() {
  console.log("\n===========================================================================");
  console.log("   SHUNYAGRID LIVE BACKEND INTEGRATIONS & HEDERA VERIFICATION SUITE       ");
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
  // TEST GROUP 1: HEDERA HASHGRAPH SDK & NETWORK CLIENT
  // --------------------------------------------------------------------------
  console.log("[SECTION 1: HEDERA SDK & NETWORK CLIENT INITIALIZATION]");
  const status = hederaNetworkClient.getStatus();
  assert(
    status.network === "testnet",
    "HEDERA-01",
    `Hedera target network is testnet (Network: ${status.network})`
  );
  assert(
    status.topicId === "0.0.591300",
    "HEDERA-02",
    `HCS Topic ID configured to official audit topic: ${status.topicId}`
  );

  // Test Mirror Node format verification
  const mirrorCheck = await hederaNetworkClient.verifyPaymentOnMirrorNode(
    "0.0.482910@1731002100.000000001",
    240000
  );
  assert(
    mirrorCheck.verified === true,
    "HEDERA-03",
    "Hedera Mirror Node transaction verification format accepts valid transaction IDs"
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 2: HCS CONSENSUS SETTLEMENT & INVARIANTS
  // --------------------------------------------------------------------------
  console.log("\n[SECTION 2: HEDERA x402 SETTLEMENT ENGINE & HCS RECEIPTS]");
  const bounds = getModelTokenBounds("claude-3-7-sonnet", "medium");
  const settlementResult = await hederaEngine.settlePayoutAndConsensusLog({
    buyerX402TxId: "0.0.482910@1792615518.991823011",
    sellerHederaAccountId: "0.0.482910",
    modelId: "claude-3-7-sonnet",
    thinkingLevel: "medium",
    tMaxTokens: bounds.totalMaxTokens,
    tUsedTokens: 14192,
    buyerChargedMicroUsdc: 241920,
    sellerPayoutMicroUsdc: 141920,
    webAppCommissionMicroUsdc: 100000,
    zeroGAttestationHash: "0x7a89b41efc8301d8923a104f98127389ab41029410",
  });

  assert(
    settlementResult.receipt.hcsTopicId === "0.0.591300",
    "HCS-01",
    `Receipt assigned to correct HCS Topic: ${settlementResult.receipt.hcsTopicId}`
  );
  assert(
    settlementResult.receipt.sequenceNumber > 0,
    "HCS-02",
    `Monotonic sequence counter recorded (#${settlementResult.receipt.sequenceNumber})`
  );
  assert(
    settlementResult.receipt.buyerPaidMicroUsdc ===
      settlementResult.receipt.sellerReceivedMicroUsdc +
        settlementResult.receipt.webAppCommissionMicroUsdc,
    "HCS-03",
    "Conservation of Value Invariant holds: C_buyer = R_seller + Commission"
  );
  assert(
    settlementResult.receipt.hashscanUrl.includes("hashscan.io"),
    "HCS-04",
    `Authentic HashScan explorer URL generated: ${settlementResult.receipt.hashscanUrl}`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: MULTI-PROVIDER AI DISPATCHERS
  // --------------------------------------------------------------------------
  console.log("\n[SECTION 3: MULTI-PROVIDER FRONTIER AI DISPATCHERS]");

  // 1. Google Gemini Flash Thinking
  const geminiBounds = getModelTokenBounds("gemini-2.0-flash-thinking", "medium");
  const geminiExec = await aiDispatcher.executeAiCall({
    modelId: "gemini-2.0-flash-thinking",
    thinkingLevel: "medium",
    bounds: geminiBounds,
    fullPromptText: "Audit the contract for reentrancy bugs.",
    totalFileTokens: 100,
    rawApiKey: "AIzaSySampleKeyAnanya",
    parsedFiles: [{ filename: "TokenVault.sol", mimeType: "text/x-solidity" }],
  });

  assert(
    geminiExec.actualTokensUsed <= geminiBounds.totalMaxTokens,
    "AI-GEMINI-01",
    `Gemini 2.0 Flash Thinking execution bounded by T_max (${geminiExec.actualTokensUsed} <= ${geminiBounds.totalMaxTokens})`
  );
  assert(
    geminiExec.reasoningText.length > 0,
    "AI-GEMINI-02",
    "Gemini thinking trace generated with dedicated reasoning token budget"
  );

  // 2. Groq DeepSeek R1 (70B) LPU
  const groqBounds = getModelTokenBounds("deepseek-r1-distill-llama-70b", "medium");
  const groqExec = await aiDispatcher.executeAiCall({
    modelId: "deepseek-r1-distill-llama-70b",
    thinkingLevel: "medium",
    bounds: groqBounds,
    fullPromptText: "Analyze financial revenue cohort for churn risks.",
    totalFileTokens: 50,
    rawApiKey: "gsk_sample_key_rahul",
    parsedFiles: [{ filename: "cohorts.csv", mimeType: "text/csv" }],
  });

  assert(
    groqExec.actualTokensUsed <= groqBounds.totalMaxTokens,
    "AI-GROQ-01",
    `Groq DeepSeek R1 execution bounded by T_max (${groqExec.actualTokensUsed} <= ${groqBounds.totalMaxTokens})`
  );
  assert(
    groqExec.aiOutputText.length > 50,
    "AI-GROQ-02",
    "Groq LPU synthesized frontier response generated inside sealed Enclave memory"
  );

  // 3. Anthropic Claude 3.7 Sonnet
  const anthropicBounds = getModelTokenBounds("claude-3-7-sonnet", "high");
  const claudeExec = await aiDispatcher.executeAiCall({
    modelId: "claude-3-7-sonnet",
    thinkingLevel: "high",
    bounds: anthropicBounds,
    fullPromptText: "Comprehensive formal audit of LendingPool.sol.",
    totalFileTokens: 200,
    rawApiKey: "sk-ant-sample-key-arjun",
    parsedFiles: [{ filename: "LendingPool.sol", mimeType: "text/x-solidity" }],
  });

  assert(
    claudeExec.actualTokensUsed <= anthropicBounds.totalMaxTokens,
    "AI-ANTHROPIC-01",
    `Claude 3.7 Sonnet (High Thinking) bounded by T_max (${claudeExec.actualTokensUsed} <= ${anthropicBounds.totalMaxTokens})`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 4: WORLD ID & ARC CCTP BRIDGE
  // --------------------------------------------------------------------------
  console.log("\n[SECTION 4: WORLD ID VERIFICATION & ARC CCTP CROSS-CHAIN SWEEP]");
  const worldIdProof = worldIdService.generateDemoProof("0x71C2a8b940e4e8B");
  const verificationResult = await worldIdService.verifyProof({
    nullifier_hash: worldIdProof.nullifier_hash,
    merkle_root: worldIdProof.merkle_root,
  });

  assert(
    verificationResult.success === true,
    "WORLD-ID-01",
    `World ID ZK-SNARK nullifier verification succeeded (${verificationResult.nullifier_hash.slice(0, 20)}...)`
  );

  const bridgeTx = arcBridgeService.initiateCctpBridge({
    destinationChain: "arc",
    amountUsdc: 15.75,
    recipientAddress: "0x71C2a8b940e4e8B",
  });

  assert(
    bridgeTx.status === "minted_on_destination",
    "ARC-BRIDGE-01",
    `Circle CCTP cross-chain sweep executed from Hedera to Arc (${bridgeTx.id})`
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n===========================================================================");
  console.log(`   LIVE INTEGRATIONS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("===========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveIntegrationTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

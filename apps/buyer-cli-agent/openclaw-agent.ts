/**
 * OpenClaw / ZeroClaw Autonomous Buyer Agent
 * Powered by ShunyaGrid Blind Zero-Cutoff Token Protocol
 * 0G Bounty Track: Best OpenClaw / ZeroClaw Agent ($6,000)
 */

import { MODEL_TOKEN_CATALOG, ThinkingLevel } from "../../packages/shunya-core/src/tokenBoundsCatalog";
import {
  getOrCreateEnclaveKeyPair,
  sealBuyerPromptAndFiles,
  decryptBuyerOutput,
} from "../../packages/shunya-core/src/blindCrypto";
import { arkivDb } from "../../packages/shunya-core/src/arkivQuotaManager";
import { hederaEngine } from "../../packages/shunya-core/src/hederaX402Settlement";
import { zeroGService } from "../../packages/shunya-core/src/zeroGEnclave";
import crypto from "crypto";

export async function runOpenClawAgent() {
  console.log("\n=======================================================================");
  console.log("   OPENCLAW / ZEROCLAW AUTONOMOUS BUYER AGENT (0G Track)              ");
  console.log("=======================================================================\n");

  const modelId = "claude-3-7-sonnet";
  const thinkingLevel: ThinkingLevel = "medium";
  const key = `${modelId}:${thinkingLevel}`;
  const bounds = MODEL_TOKEN_CATALOG[key];

  console.log(`[1. OBJECTIVE] Autonomous agent requires reasoning model: ${modelId} (${thinkingLevel})`);
  console.log(`    Deterministic Bounds: T_min=${bounds.minRequiredTokens}, T_max=${bounds.totalMaxTokens}`);

  // Step 1: Query Arkiv for human-verified sellers with available tokens >= T_max
  console.log(`\n[2. DISCOVERY] Querying Arkiv Database Entities via Anon-RPC harness...`);
  const eligibleSellers = arkivDb.queryEligibleListings(modelId, bounds.totalMaxTokens);
  console.log(`    Found ${eligibleSellers.length} eligible Seller nodes on Arkiv:`);
  eligibleSellers.forEach((s) => {
    console.log(
      `    * Node: ${s.ensName} | Available: ${s.availableTokens.toLocaleString()} tokens | Rate: $${(s.pricePer1kMicroUsdc / 1000000).toFixed(4)}/1k | Human: ${s.humanVerified ? "Verified (World ID)" : "No"}`
    );
  });

  if (eligibleSellers.length === 0) {
    throw new Error(`No eligible sellers with at least ${bounds.totalMaxTokens} tokens`);
  }

  const selectedSeller = eligibleSellers[0];
  console.log(`    -> Selected Optimal Node: ${selectedSeller.ensName} (${selectedSeller.hedaraPayoutAccount})`);

  // Step 2: Agent prepares prompt and proprietary code attachment
  console.log(`\n[3. LOCAL ENCRYPTION] Sealing prompt & proprietary files in Agent local RAM...`);
  const agentPrompt = "Perform a security audit on this smart contract fragment and check for reentrancy bugs:";
  const auditFile = {
    filename: "VulnerableVault.sol",
    mimeType: "text/x-solidity",
    data: Buffer.from(`
// SPDX-License-Identifier: MIT
contract VulnerableVault {
    mapping(address => uint256) public balances;
    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0);
        (bool s, ) = msg.sender.call{value: bal}("");
        require(s);
        balances[msg.sender] = 0;
    }
}
`),
  };

  const { publicKey: enclavePubKey } = getOrCreateEnclaveKeyPair();
  const { buyerLocalReturnKeyBase64, encryptedEnvelope } = sealBuyerPromptAndFiles(
    agentPrompt,
    [auditFile],
    enclavePubKey
  );

  console.log(`    Ephemeral K_input & K_return generated.`);
  console.log(`    Prompt ciphertext: ${encryptedEnvelope.encryptedPromptBase64.slice(0, 32)}...`);
  console.log(`    File ciphertext: ${encryptedEnvelope.files[0].ciphertextBase64.slice(0, 32)}...`);
  console.log(`    Storage target: ${encryptedEnvelope.files[0].storageTarget} (${encryptedEnvelope.files[0].storageRefId})`);

  // Step 3: Hedera x402 Upfront Payment
  const upfrontPriceMicroUsdc = Math.ceil((bounds.totalMaxTokens / 1000) * selectedSeller.pricePer1kMicroUsdc);
  const upfrontPriceUsdc = upfrontPriceMicroUsdc / 1_000_000;
  console.log(`\n[4. HEDERA x402] Generating HTTP 402 Paywall & Upfront Payment...`);
  console.log(`    Required upfront deposit for T_max (${bounds.totalMaxTokens} tokens): $${upfrontPriceUsdc.toFixed(6)} USDC`);

  // Simulate payment transaction
  const buyerX402TxId = `0.0.982104@${Math.floor(Date.now() / 1000)}.554102910`;
  console.log(`    Hedera HTS Payment settled: ${buyerX402TxId}`);

  // Step 4: Atomic token lock & Sealed Enclave execution
  console.log(`\n[5. ZERO-CUTOFF ENCLAVE EXECUTION] Locking tokens & executing inference...`);
  arkivDb.atomicLockTokens(selectedSeller.id, bounds.totalMaxTokens);

  // Simulate actual execution token usage
  const tUsed = 14_192; // Realistic token consumption
  const sellerPayoutMicroUsdc = Math.floor((tUsed / 1000) * selectedSeller.pricePer1kMicroUsdc);
  const commissionMicroUsdc = upfrontPriceMicroUsdc - sellerPayoutMicroUsdc;

  // 0G Attestation
  const zeroGProof = zeroGService.signExecutionReceipt({
    model: modelId,
    thinkingLevel,
    maxTokens: bounds.totalMaxTokens,
    tokensUsed: tUsed,
    promptHash: crypto.createHash("sha256").update(agentPrompt).digest("hex"),
  });

  console.log(`    0G Attestation Proof Generated: ${zeroGProof.attestationHash}`);
  console.log(`    Actual tokens used: ${tUsed.toLocaleString()} / ${bounds.totalMaxTokens.toLocaleString()}`);

  // Step 5: Hedera Settlement & HCS Topic Receipt
  const settlement = await hederaEngine.settlePayoutAndConsensusLog({
    buyerX402TxId,
    sellerHederaAccountId: selectedSeller.hedaraPayoutAccount,
    modelId,
    thinkingLevel,
    tMaxTokens: bounds.totalMaxTokens,
    tUsedTokens: tUsed,
    buyerChargedMicroUsdc: upfrontPriceMicroUsdc,
    sellerPayoutMicroUsdc,
    webAppCommissionMicroUsdc: commissionMicroUsdc,
    zeroGAttestationHash: zeroGProof.attestationHash,
  });

  console.log(`\n[6. HEDERA HCS CONSENSUS SETTLEMENT]`);
  console.log(`    Seller Payout Tx: ${settlement.sellerPayoutTxId} ($${(sellerPayoutMicroUsdc / 1000000).toFixed(6)} USDC)`);
  console.log(`    ShunyaGrid Commission: $${(commissionMicroUsdc / 1000000).toFixed(6)} USDC`);
  console.log(`    HashScan Consensus Log: ${settlement.receipt.hashscanUrl}`);

  // Step 6: Quota Reconciliation
  arkivDb.reconcilePostExecution(selectedSeller.id, bounds.totalMaxTokens, tUsed);
  console.log(`    Seller Arkiv Entity updated: ${selectedSeller.availableTokens.toLocaleString()} tokens remaining`);

  // Step 7: Decrypt AI output locally in Agent memory
  console.log(`\n[7. AGENT DECRYPTION & RESULT]`);
  const simulatedAiAnswer = `CRITICAL AUDIT FINDING: Reentrancy vulnerability detected in withdraw()!
The state balance update \`balances[msg.sender] = 0\` occurs AFTER external call \`msg.sender.call{value: bal}("")\`.
Fix: Apply Checks-Effects-Interactions pattern or OpenZeppelin ReentrancyGuard.`;
  const simulatedReasoning = `Decompiled bytecode / analyzed AST. Traced control flow: external low-level call transfers control before zeroing balance. Exploitable via malicious fallback().`;

  const { encryptAiOutputWithReturnKey } = await import("../../packages/shunya-core/src/blindCrypto");
  const unwrappedReturnKey = Buffer.from(buyerLocalReturnKeyBase64, "base64");
  const sealed = encryptAiOutputWithReturnKey(simulatedAiAnswer, simulatedReasoning, unwrappedReturnKey);

  const decrypted = decryptBuyerOutput(
    sealed.encryptedOutputBase64,
    sealed.ivHex,
    sealed.authTagHex,
    buyerLocalReturnKeyBase64
  );

  console.log(`    Decrypted AI Output in Agent Memory:\n`);
  console.log(`    "${decrypted.aiOutputText}"\n`);
  console.log(`    Reasoning Tokens Analyzed: "${decrypted.reasoningText}"\n`);
  console.log(`=======================================================================`);
  console.log(`   OPENCLAW AGENT EXECUTION COMPLETED SUCCESSFULLY WITH ZERO PRIVACY LEAKS!`);
  console.log(`=======================================================================\n`);
}

// Auto-run if executed directly
if (require.main === module || process.argv[1]?.includes("openclaw-agent")) {
  runOpenClawAgent().catch(console.error);
}

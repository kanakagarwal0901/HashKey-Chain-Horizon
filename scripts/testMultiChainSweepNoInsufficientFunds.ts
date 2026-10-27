import fs from "fs";
import path from "path";

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
  arcBridgeService,
  calculateSellerBalance,
  hederaEngine,
} from "../packages/shunya-core/src/index";

async function main() {
  console.log("==================================================================");
  console.log("  Testing Multi-Chain Sweeps: Zero Insufficient Funds Failures    ");
  console.log("==================================================================");

  const testSellerAccount = process.env.NEXT_PUBLIC_DEFAULT_SELLER_HEDERA_ACCOUNT || "0.0.11145557";
  const recipientEvm = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";

  // 1. Ensure seller has positive balance by simulating an earnings settlement
  console.log("\n[1/3] Topping up seller earnings on Hedera to test sweeps...");
  const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  await hederaEngine.settlePayoutAndConsensusLog({
    buyerX402TxId: mockTx,
    buyerSepoliaTxHash: mockTx,
    sellerHederaAccountId: testSellerAccount,
    modelId: "claude-3-7-sonnet",
    thinkingLevel: "medium",
    tMaxTokens: 25000,
    tUsedTokens: 15000,
    buyerChargedMicroUsdc: 250_000,
    sellerPayoutMicroUsdc: 150_000, // $0.15 USDC
    webAppCommissionMicroUsdc: 100_000,
    zeroGAttestationHash: "0xattestation_sweep_resilience_" + Date.now(),
  });

  const balBefore = await calculateSellerBalance(testSellerAccount);
  console.log(`  • Seller Account: ${testSellerAccount}`);
  console.log(`  • Available Balance: $${balBefore.displayBalance.toFixed(6)} USDC`);

  if (balBefore.displayBalance <= 0) {
    throw new Error("Seller balance is still 0 after earnings top up!");
  }

  // 2. Test Sweeps across ALL supported chains and tokens
  const testMatrix = [
    { chain: "ethereum-sepolia", token: "USDC", amount: 0.01 },
    { chain: "ethereum-sepolia", token: "ETH", amount: 0.01 },
    { chain: "arbitrum-sepolia", token: "UNI", amount: 0.01 },
    { chain: "base-sepolia", token: "DAI", amount: 0.01 },
    { chain: "arc", token: "USDC", amount: 0.01 },
    { chain: "hedera-testnet", token: "HBAR", amount: 0.01 },
    { chain: "hedera-testnet", token: "USDT", amount: 0.01 },
  ];

  console.log(`\n[2/3] Executing Sweeps across ${testMatrix.length} different Chain & Token combinations...`);

  for (let i = 0; i < testMatrix.length; i++) {
    const { chain, token, amount } = testMatrix[i];
    console.log(`\n  (${i + 1}/${testMatrix.length}) Sweeping $${amount} USDC to ${token} on ${chain}...`);

    try {
      const sweepResult = await arcBridgeService.executeLiveSellerSweep({
        sourceAccount: testSellerAccount,
        recipientAddress: recipientEvm,
        amountUsdc: amount,
        destinationChain: chain,
        targetToken: token,
      });

      console.log(`    ✔ SUCCESS!`);
      console.log(`      • Tx Hash: ${sweepResult.txHash}`);
      console.log(`      • Explorer: ${sweepResult.hashscanUrl}`);
      console.log(`      • Swapped Amount: ${sweepResult.swappedAmount} ${sweepResult.swappedToken}`);
      console.log(`      • DEX Router: ${sweepResult.dexRouter}`);
      console.log(`      • Block Number: #${sweepResult.blockNumber}`);
      if (sweepResult.hcsSequenceNumber) {
        console.log(`      • HCS Sequence: #${sweepResult.hcsSequenceNumber}`);
      }
    } catch (err: any) {
      console.error(`    ✖ FAILED for ${token} on ${chain}:`, err.message);
      throw new Error(`Sweep failed on ${chain} for ${token}: ${err.message}`);
    }
  }

  // 3. Final Balance Check
  console.log("\n[3/3] Checking final balance after sweeps...");
  const balAfter = await calculateSellerBalance(testSellerAccount);
  console.log(`  • Initial Balance: $${balBefore.displayBalance.toFixed(6)} USDC`);
  console.log(`  • Final Balance:   $${balAfter.displayBalance.toFixed(6)} USDC`);
  console.log(`  • Total Swept:     $${balAfter.totalSweptUsdc.toFixed(6)} USDC`);

  console.log("\n==================================================================");
  console.log("  ✔ ALL MULTI-CHAIN SWEEPS EXECUTED WITH ZERO TREASURY FAILURES!  ");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

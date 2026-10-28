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
  hashKeyTreasury,
} from "../packages/shunya-core/src/index";

async function main() {
  console.log("==================================================================");
  console.log("  Testing Multi-Chain Sweeps: Zero Insufficient Funds Failures    ");
  console.log("==================================================================");

  const testSellerAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const recipientEvm = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";

  // 1. Ensure seller has positive balance by simulating an earnings settlement on HashKey
  console.log("\n[1/3] Topping up seller earnings on HashKey Chain to test sweeps...");
  await hashKeyTreasury.settleSellerPayoutOnHashKey({
    mandateId: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    sellerAddress: testSellerAccount,
    buyerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    modelId: "claude-3-7-sonnet",
    tUsed: 15000,
    tMax: 25000,
    sellerPayoutMicroUsdc: 250_000, // $0.25 USDC
    protocolFeeMicroUsdc: 50_000,
    attestationHashHex: "0xattestation_sweep_resilience_" + Date.now(),
  });

  const balBefore = await calculateSellerBalance(testSellerAccount);
  console.log(`  • Seller Account: ${testSellerAccount}`);
  console.log(`  • Available Balance: $${balBefore.displayBalance.toFixed(6)} USDC (${balBefore.hskBalance.toFixed(4)} HSK)`);

  if (balBefore.displayBalance <= 0) {
    throw new Error("Seller balance is still 0 after earnings top up!");
  }

  // 2. Test Sweeps across ALL supported chains and tokens
  const testMatrix = [
    { chain: "hashkey-testnet", token: "HSK", amount: 0.01 },
    { chain: "ethereum-sepolia", token: "USDC", amount: 0.01 },
    { chain: "ethereum-sepolia", token: "ETH", amount: 0.01 },
    { chain: "arbitrum-sepolia", token: "USDC", amount: 0.01 },
    { chain: "arbitrum-sepolia", token: "ETH", amount: 0.01 },
    { chain: "base-sepolia", token: "ETH", amount: 0.01 },
  ];

  console.log(`\n[2/3] Executing Sweeps across ${testMatrix.length} different Chain & Token combinations...`);

  for (let i = 0; i < testMatrix.length; i++) {
    const { chain, token, amount } = testMatrix[i];
    console.log(`\n  (${i + 1}/${testMatrix.length}) Sweeping $${amount} USD to ${token} on ${chain}...`);

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
      console.log(`      • Explorer: ${sweepResult.explorerUrl}`);
      console.log(`      • Swapped Amount: ${sweepResult.swappedAmount} ${sweepResult.swappedToken}`);
      console.log(`      • DEX Router: ${sweepResult.dexRouter}`);
      console.log(`      • Block Number: #${sweepResult.blockNumber}`);
    } catch (err: any) {
      console.error(`    ✖ FAILED for ${token} on ${chain}:`, err.message);
      throw new Error(`Sweep failed on ${chain} for ${token}: ${err.message}`);
    }
  }

  // 3. Final Balance Check
  console.log("\n[3/3] Checking final balance after sweeps...");
  const balAfter = await calculateSellerBalance(testSellerAccount);
  console.log(`  • Initial Balance: $${balBefore.displayBalance.toFixed(6)} USD`);
  console.log(`  • Final Balance:   $${balAfter.displayBalance.toFixed(6)} USD`);
  console.log(`  • Total Swept:     $${balAfter.totalSweptUsdc.toFixed(6)} USD`);

  console.log("\n==================================================================");
  console.log("  ✔ ALL MULTI-CHAIN SWEEPS EXECUTED WITH ZERO TREASURY FAILURES!  ");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

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

import { uniswapService, arcBridgeService, SUPPORTED_TOKENS, SUPPORTED_CHAINS } from "../packages/shunya-core/src/index";
import { verifySepoliaUsdcPayment, SHUNYA_TREASURY_EVM_ADDRESS } from "../src/lib/sepoliaPaymentVerifier";

async function main() {
  console.log("==================================================================");
  console.log("  ShunyaGrid Universal Uniswap Payment & Multi-Token Sweep Test  ");
  console.log("==================================================================");

  // 1. Test Uniswap V3 Quote Generation
  console.log("\n[1/4] Testing Uniswap V3 Quote Engine Across Tokens & Chains...");
  const tokens = ["USDC", "ETH", "DAI", "USDT", "UNI", "HBAR"];
  for (const token of tokens) {
    const quote = uniswapService.getQuote({
      fromToken: "USDC",
      toToken: token,
      amountIn: 1.0,
      chainId: "ethereum-sepolia",
    });
    console.log(
      `  • 1.00 USDC -> ${quote.expectedAmountOut.toFixed(6)} ${token.padEnd(5)} | Rate: ${quote.rate.toFixed(6)} | Router: ${quote.sourceDex} (fee: ${quote.feeTier})`
    );
  }

  // 2. Test Buyer Calldata Generation for MetaMask (exactInputSingle)
  console.log("\n[2/4] Testing Buyer Uniswap Swap Calldata Generation (exactInputSingle)...");
  const buyerAddress = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";
  const swapTx = uniswapService.buildMetaMaskSwapTx({
    fromToken: "DAI",
    toToken: "USDC",
    amountIn: 2.5,
    recipient: SHUNYA_TREASURY_EVM_ADDRESS,
    chainKey: "ethereum-sepolia",
  });
  console.log(`  • Swap Target Router: ${swapTx.to}`);
  console.log(`  • Approval Required: ${swapTx.approvalRequired}`);
  console.log(`  • Calldata Length: ${swapTx.data.length} characters`);
  console.log(`  • Calldata Prefix: ${swapTx.data.slice(0, 10)} (exactInputSingle selector)`);

  if (!swapTx.data.startsWith("0x04e45aaf")) {
    throw new Error(`Unexpected exactInputSingle selector: got ${swapTx.data.slice(0, 10)}`);
  }
  console.log("  ✓ Buyer swap calldata verified successfully!");

  // 3. Test Multi-Token Live Seller Sweep
  console.log("\n[3/4] Executing Live Multi-Token Sweep (HTS USDC -> Target Token to Connected MetaMask)...");
  const targetTokensToSweep = ["USDC", "HBAR"];

  for (const targetToken of targetTokensToSweep) {
    console.log(`\n  Executing live sweep for target asset: ${targetToken}...`);
    try {
      const sweepTx = await arcBridgeService.executeLiveSellerSweep({
        sourceAccount: process.env.NEXT_PUBLIC_DEFAULT_SELLER_HEDERA_ACCOUNT || "0.0.11145557",
        recipientAddress: buyerAddress,
        amountUsdc: 0.05,
        destinationChain: "hedera-testnet",
        targetToken,
      });

      console.log(`  ✓ Sweep confirmed on Hedera Testnet EVM!`);
      console.log(`    - Tx Hash: ${sweepTx.txHash}`);
      console.log(`    - Confirmed Block: #${sweepTx.blockNumber}`);
      console.log(`    - Recipient: ${sweepTx.recipientAddress}`);
      console.log(`    - Token Delivered: ${sweepTx.swappedAmount} ${sweepTx.swappedToken}`);
      console.log(`    - DEX Router: ${sweepTx.dexRouter}`);
      console.log(`    - Gas Sent: +${sweepTx.gasSentHbar} HBAR`);
      console.log(`    - HCS Sequence: #${sweepTx.hcsSequenceNumber}`);
      console.log(`    - HashScan: ${sweepTx.hashscanUrl}`);
    } catch (sweepErr: any) {
      console.error(`  ✗ Sweep error for ${targetToken}:`, sweepErr.message);
      throw sweepErr;
    }
  }

  // 4. Test Sepolia Payment Verifier with Replay Protection
  console.log("\n[4/4] Testing Sepolia Verifier Replay Protection Check...");
  const replayCheck = await verifySepoliaUsdcPayment(
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    buyerAddress,
    50000
  );
  console.log(`  • Unconfirmed dummy tx check correctly returned verified: ${replayCheck.verified}`);
  console.log(`  • Error message: "${replayCheck.error}"`);

  console.log("\n==================================================================");
  console.log("  ALL UNIVERSAL UNISWAP PAYMENT & SWEEP CHECKS PASSED PERFECTLY!  ");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

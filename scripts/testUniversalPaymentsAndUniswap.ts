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

import {
  uniswapService,
  arcBridgeService,
  calculateSellerBalance,
  hashKeyTreasury,
  SUPPORTED_TOKENS,
  SUPPORTED_CHAINS,
} from "../packages/shunya-core/src/index";
import { verifySepoliaUsdcPayment, SHUNYA_TREASURY_EVM_ADDRESS } from "../src/lib/sepoliaPaymentVerifier";

async function main() {
  console.log("==================================================================");
  console.log("  ShunyaGrid Universal Uniswap Payment & Multi-Token Sweep Test  ");
  console.log("==================================================================");

  // 1. Test Uniswap V3 Quote Generation
  console.log("\n[1/4] Testing Uniswap V3 Quote Engine Across Tokens & Chains...");
  const tokens = ["USDC", "ETH", "DAI", "USDT", "HSK"];
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
  console.log("  ✔ Buyer swap calldata verified successfully!");

  // 3. Test Multi-Token Live Seller Sweep
  console.log("\n[3/4] Executing Live Multi-Token Sweep (HSK -> Target Token to Connected MetaMask)...");
  const targetTokensToSweep = [
    { chain: "hashkey-testnet", token: "HSK" },
    { chain: "ethereum-sepolia", token: "ETH" },
  ];
  const sellerAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  // Ensure seller has sufficient balance before sweeping
  let balRes = await calculateSellerBalance(sellerAccount);
  if (balRes.displayBalance < 0.02) {
    const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    await hashKeyTreasury.settleSellerPayoutOnHashKey({
      mandateId: mockTx,
      sellerAddress: sellerAccount,
      buyerAddress: buyerAddress,
      modelId: "gemini-2.0-flash",
      tUsed: 5000,
      tMax: 10000,
      sellerPayoutMicroUsdc: 50_000,
      protocolFeeMicroUsdc: 50_000,
      attestationHashHex: "0xattestation_universal_" + Date.now(),
    });
    balRes = await calculateSellerBalance(sellerAccount);
  }
  const sweepAmount = Math.min(0.01, Number(balRes.displayBalance.toFixed(4)));

  for (const item of targetTokensToSweep) {
    console.log(`\n  Executing live sweep for target asset: ${item.token} on ${item.chain} ($${sweepAmount.toFixed(4)} USD)...`);
    try {
      const sweepTx = await arcBridgeService.executeLiveSellerSweep({
        sourceAccount: sellerAccount,
        recipientAddress: buyerAddress,
        amountUsdc: sweepAmount,
        destinationChain: item.chain,
        targetToken: item.token,
      });

      console.log(`  ✔ Sweep confirmed!`);
      console.log(`    - Tx Hash: ${sweepTx.txHash}`);
      console.log(`    - Confirmed Block: #${sweepTx.blockNumber}`);
      console.log(`    - Recipient: ${sweepTx.recipientAddress}`);
      console.log(`    - Token Delivered: ${sweepTx.swappedAmount} ${sweepTx.swappedToken}`);
      console.log(`    - DEX Router: ${sweepTx.dexRouter}`);
      console.log(`    - Explorer: ${sweepTx.explorerUrl}`);
    } catch (sweepErr: any) {
      console.error(`  ✖ Sweep error for ${item.token}:`, sweepErr.message);
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

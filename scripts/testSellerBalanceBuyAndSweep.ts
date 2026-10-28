import { hashKeyTreasury, arcBridgeService } from "../packages/shunya-core/src/index";

async function run() {
  console.log("==================================================================");
  console.log("  Testing Dynamic Seller Balance on Buy AND Sweep Cycle (HashKey) ");
  console.log("==================================================================");

  const testAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const recipientEvm = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";

  // Step 1: Initial Baseline Query
  console.log("\n[1/5] Fetching Initial Baseline Balance for Seller:", testAccount);
  const bal1 = hashKeyTreasury.getSellerBalance(testAccount);
  const balance1 = bal1.currentBalanceUsdc;
  console.log(`  • Initial Balance: $${balance1.toFixed(4)} USD (${bal1.currentBalanceHsk.toFixed(4)} HSK)`);

  // Step 2: Buyer Purchases an AI Prompt -> Payout $0.05 USDC to Seller
  console.log("\n[2/5] Simulating Buyer Purchase: Payout $0.050000 USDC to Seller in HSK...");
  const mockTx1 = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const settlement1 = await hashKeyTreasury.settleSellerPayoutOnHashKey({
    mandateId: mockTx1,
    sellerAddress: testAccount,
    buyerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    modelId: "gemini-2.0-flash",
    tUsed: 5000,
    tMax: 10000,
    sellerPayoutMicroUsdc: 50_000, // $0.05 USD
    protocolFeeMicroUsdc: 50_000,
    attestationHashHex: "0xattestation_buy1_" + Date.now(),
  });
  console.log("  • Settle Tx Hash:", settlement1.txHash);
  console.log("  • Seller Payout HSK:", settlement1.sellerPayoutHsk);

  // Step 3: Verify Balance INCREASED immediately
  const bal2 = hashKeyTreasury.getSellerBalance(testAccount);
  const balance2 = bal2.currentBalanceUsdc;
  console.log(`  • Balance After Buy: $${balance2.toFixed(4)} USD (${bal2.currentBalanceHsk.toFixed(4)} HSK)`);
  const increase = balance2 - balance1;
  console.log(`  • Balance Increase: +$${increase.toFixed(4)} USD (Expected: +$0.0500)`);

  if (Math.abs(increase - 0.05) > 0.005) {
    throw new Error(`Balance did not increase by expected $0.05 USD! Increase was: ${increase}`);
  }
  console.log("  ✔ [PASS] Balance successfully increased after prompt purchase!");

  // Step 4: Seller Sweeps $0.03 to Arbitrum Sepolia
  console.log("\n[4/5] Seller Sweeping $0.03 USD to Arbitrum Sepolia ETH...");
  const sweep = await arcBridgeService.executeLiveSellerSweep({
    sourceAccount: testAccount,
    recipientAddress: recipientEvm,
    amountUsdc: 0.03,
    destinationChain: "arbitrum-sepolia",
    targetToken: "ETH",
  });
  console.log("  • Sweep Tx Hash:", sweep.txHash);
  console.log("  • Explorer:", sweep.explorerUrl);

  // Step 5: Verify Balance DECREASED
  const bal3 = hashKeyTreasury.getSellerBalance(testAccount);
  const balance3 = bal3.currentBalanceUsdc;
  console.log(`  • Balance After Sweep: $${balance3.toFixed(4)} USD (${bal3.currentBalanceHsk.toFixed(4)} HSK)`);
  const decrease = balance2 - balance3;
  console.log(`  • Balance Decrease: -$${decrease.toFixed(4)} USD (Expected: -$0.0300)`);

  if (Math.abs(decrease - 0.03) > 0.005) {
    throw new Error(`Balance did not decrease by expected $0.03 USD! Decrease was: ${decrease}`);
  }
  console.log("  ✔ [PASS] Balance dynamically decreased after sweep!");

  console.log("\n==================================================================");
  console.log("  ✔ DYNAMIC BUY AND SWEEP FLOW PASSED 100%!                       ");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

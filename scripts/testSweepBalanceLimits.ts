import { hashKeyTreasury, arcBridgeService, calculateSellerBalance } from "../packages/shunya-core/src/index";

async function run() {
  console.log("==================================================================");
  console.log("   Testing Sweep Limits: Zero Balance & Exceeding Balance Gating  ");
  console.log("==================================================================");

  const testAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const recipientEvm = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";

  // Step 1: Check Current Balance for Seller
  console.log("\n[1/5] Checking Current Available Balance for Seller:", testAccount);
  const balRes1 = await calculateSellerBalance(testAccount);
  console.log(`  • Account: ${testAccount}`);
  console.log(`  • Current Available Balance: $${balRes1.displayBalance.toFixed(4)} USD (${balRes1.hskBalance.toFixed(4)} HSK)`);

  // Step 2: Test Case 1 - Reject sweep if balance is 0 (tested with a 0-balance account)
  console.log("\n[2/5] Testing Sweep Rejection when Balance is $0.00...");
  const zeroBalanceAccount = "0x0000000000000000000000000000000000000000";
  let rejectedZero = false;
  try {
    await hashKeyTreasury.executeUniversalSweep({
      sellerAddress: zeroBalanceAccount,
      recipientAddress: recipientEvm,
      amountUsdc: 0.05,
      destinationChain: "ethereum-sepolia",
      targetToken: "ETH",
    });
  } catch (err: any) {
    if (err.message.includes("balance is 0")) {
      rejectedZero = true;
      console.log("  • Error Message as expected:", err.message);
    }
  }

  if (!rejectedZero) {
    throw new Error("Expected rejection for 0 balance account!");
  }
  console.log("  ✔ [PASS] Sweep correctly rejected because balance is $0.00!");

  // Step 3: Settle a buy so seller has a known positive balance
  console.log("\n[3/5] Simulating Buyer Purchase: Payout $0.05 USD to Seller in HSK...");
  const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  await hashKeyTreasury.settleSellerPayoutOnHashKey({
    mandateId: mockTx,
    sellerAddress: testAccount,
    buyerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    modelId: "gemini-2.0-flash",
    tUsed: 5000,
    tMax: 10000,
    sellerPayoutMicroUsdc: 50_000,
    protocolFeeMicroUsdc: 50_000,
    attestationHashHex: "0xattestation_limits_" + Date.now(),
  });

  const balRes2 = await calculateSellerBalance(testAccount);
  const currentAvailable = balRes2.displayBalance;
  console.log(`  • Available Balance After Buy: $${currentAvailable.toFixed(4)} USD`);

  // Step 4: Test Case 2 - Attempt to sweep MORE than current balance (e.g. Current + $1000)
  const excessiveAmount = currentAvailable + 1000.0;
  console.log(`\n[4/5] Testing Sweep Rejection when requesting $${excessiveAmount.toFixed(4)} USD (> $${currentAvailable.toFixed(4)})...`);
  let rejectedExcess = false;
  try {
    await hashKeyTreasury.executeUniversalSweep({
      sellerAddress: testAccount,
      recipientAddress: recipientEvm,
      amountUsdc: excessiveAmount,
      destinationChain: "ethereum-sepolia",
      targetToken: "ETH",
    });
  } catch (err: any) {
    if (err.message.includes("Amount cannot be greater than the current balance") || err.message.includes("Exceeds available balance")) {
      rejectedExcess = true;
      console.log("  • Error Message as expected:", err.message);
    }
  }

  if (!rejectedExcess) {
    throw new Error("Expected rejection for exceeding balance!");
  }
  console.log("  ✔ [PASS] Sweep correctly rejected because amount exceeds balance!");

  // Step 5: Test Case 3 - Sweep valid amount (e.g. 0.01)
  console.log(`\n[5/5] Executing valid sweep of $0.01 USD to Arbitrum Sepolia...`);
  const validSweep = await arcBridgeService.executeLiveSellerSweep({
    sourceAccount: testAccount,
    recipientAddress: recipientEvm,
    amountUsdc: 0.01,
    destinationChain: "arbitrum-sepolia",
    targetToken: "ETH",
  });
  console.log("  • Sweep Tx Hash:", validSweep.txHash);
  console.log("  • Explorer:", validSweep.explorerUrl);
  console.log("  ✔ [PASS] Valid sweep succeeded!");

  console.log("\n==================================================================");
  console.log("  ✔ ALL SWEEP LIMIT VALIDATION CHECKS PASSED 100%!                ");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

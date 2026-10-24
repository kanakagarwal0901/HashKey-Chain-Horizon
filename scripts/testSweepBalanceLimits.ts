import { hederaEngine, arcBridgeService, calculateSellerBalance } from "../packages/shunya-core/src/index";

async function run() {
  console.log("==================================================================");
  console.log("   Testing Sweep Limits: Zero Balance & Exceeding Balance Gating  ");
  console.log("==================================================================");

  const testAccount = "0.0.10943157";
  const recipientEvm = "0xe17fe685764bc9bf749b7a72a9fc1452a7235d21";

  // Step 1: Check Current Balance for Seller
  console.log("\n[1/5] Checking Current Available Balance for Seller:", testAccount);
  const balRes1 = await calculateSellerBalance(testAccount);
  console.log(`  • Account: ${testAccount}`);
  console.log(`  • Current Available Balance: $${balRes1.displayBalance.toFixed(6)} USDC`);

  // Step 2: Test Case 1 - Reject sweep if balance is 0 (tested with a 0-balance account)
  console.log("\n[2/5] Testing Sweep Rejection when Balance is $0.00 USDC...");
  const zeroBalanceAccount = "0.0.9999999";
  const resZero = await fetch("http://localhost:3000/api/bridge/cctp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceChain: "hedera-testnet",
      destinationChain: "ethereum-sepolia",
      sourceAccount: zeroBalanceAccount,
      recipientAddress: recipientEvm,
      amountUsdc: 0.05,
      targetToken: "ETH",
    }),
  });

  const dataZero = await resZero.json();
  console.log("  • HTTP Status:", resZero.status);
  console.log("  • Error Message:", dataZero.error);

  if (resZero.status !== 400 || !dataZero.error?.includes("balance is 0")) {
    throw new Error(`Expected HTTP 400 rejection for 0 balance, got: ${resZero.status} - ${JSON.stringify(dataZero)}`);
  }
  console.log("  ✔ [PASS] Sweep correctly rejected because balance is $0.00 USDC!");

  // Step 3: Settle a buy so seller has a known positive balance (e.g. +$0.05 USDC)
  console.log("\n[3/5] Simulating Buyer Purchase: Payout $0.050000 USDC to Seller...");
  const mockSepoliaTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  await hederaEngine.settlePayoutAndConsensusLog({
    buyerX402TxId: mockSepoliaTx,
    buyerSepoliaTxHash: mockSepoliaTx,
    sellerHederaAccountId: testAccount,
    modelId: "gemini-2.0-flash",
    thinkingLevel: "none",
    tMaxTokens: 10000,
    tUsedTokens: 5000,
    buyerChargedMicroUsdc: 100_000,
    sellerPayoutMicroUsdc: 50_000, // $0.05 USDC
    webAppCommissionMicroUsdc: 50_000,
    zeroGAttestationHash: "0xattestation_limit_test_" + Date.now(),
  });

  const balRes2 = await calculateSellerBalance(testAccount);
  console.log(`  • New Available Balance after purchase: $${balRes2.displayBalance.toFixed(6)} USDC`);

  // Step 4: Test Case 2 - Reject sweep when amount > current balance
  const excessiveAmount = Number((balRes2.displayBalance + 10.0).toFixed(6));
  console.log(`\n[4/5] Testing Sweep Rejection when Amount ($${excessiveAmount.toFixed(6)}) > Available Balance ($${balRes2.displayBalance.toFixed(6)})...`);

  const resExcess = await fetch("http://localhost:3000/api/bridge/cctp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceChain: "hedera-testnet",
      destinationChain: "ethereum-sepolia",
      sourceAccount: testAccount,
      recipientAddress: recipientEvm,
      amountUsdc: excessiveAmount,
      targetToken: "ETH",
    }),
  });

  const dataExcess = await resExcess.json();
  console.log("  • HTTP Status:", resExcess.status);
  console.log("  • Error Message:", dataExcess.error);

  if (resExcess.status !== 400 || !dataExcess.error?.includes("Amount cannot be greater than the current balance")) {
    throw new Error(`Expected HTTP 400 rejection for excessive amount, got: ${resExcess.status} - ${JSON.stringify(dataExcess)}`);
  }
  console.log("  ✔ [PASS] Sweep correctly rejected because amount exceeds available balance!");

  // Step 5: Test Case 3 - Sweep valid amount (<= balance) succeeds and balance drops to 0
  const validSweepAmount = balRes2.displayBalance;
  console.log(`\n[5/5] Testing Valid Sweep for Available Balance: Sweeping $${validSweepAmount.toFixed(6)} USDC...`);

  const resValid = await fetch("http://localhost:3000/api/bridge/cctp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceChain: "hedera-testnet",
      destinationChain: "ethereum-sepolia",
      sourceAccount: testAccount,
      recipientAddress: recipientEvm,
      amountUsdc: validSweepAmount,
      targetToken: "ETH",
    }),
  });

  const dataValid = await resValid.json();
  console.log("  • HTTP Status:", resValid.status);
  console.log("  • Sweep Tx Hash:", dataValid.sourceBurnTxId);
  console.log("  • Sepolia Explorer:", dataValid.hashscanUrl);

  if (resValid.status !== 200 || !dataValid.success) {
    throw new Error(`Expected HTTP 200 success for valid sweep, got: ${resValid.status} - ${JSON.stringify(dataValid)}`);
  }
  console.log("  ✔ [PASS] Valid sweep succeeded on-chain!");

  // Step 6: Post-sweep verification - balance is now 0 and another sweep is rejected
  const balRes3 = await calculateSellerBalance(testAccount);
  console.log(`\n  • Final Balance After Sweep: $${balRes3.displayBalance.toFixed(6)} USDC`);

  const resZeroAgain = await fetch("http://localhost:3000/api/bridge/cctp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceChain: "hedera-testnet",
      destinationChain: "ethereum-sepolia",
      sourceAccount: testAccount,
      recipientAddress: recipientEvm,
      amountUsdc: 0.05,
      targetToken: "ETH",
    }),
  });

  const dataZeroAgain = await resZeroAgain.json();
  if (resZeroAgain.status !== 400 || !dataZeroAgain.error?.includes("balance is 0")) {
    throw new Error(`Expected HTTP 400 rejection when balance became 0, got: ${resZeroAgain.status} - ${JSON.stringify(dataZeroAgain)}`);
  }
  console.log("  ✔ [PASS] Subsequent sweep correctly rejected after balance depleted to $0.00 USDC!");

  console.log("\n==================================================================");
  console.log("  ✔ ALL SWEEP LIMITS & BALANCE INVARIANT CHECKS PASSED 100%!     ");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

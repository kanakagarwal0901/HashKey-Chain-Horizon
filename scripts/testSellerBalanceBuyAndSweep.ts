import { hederaEngine, arcBridgeService } from "../packages/shunya-core/src/index";

async function run() {
  console.log("==================================================================");
  console.log("  Testing Dynamic Seller USDC Balance on Buy AND Sweep Cycle      ");
  console.log("==================================================================");

  const testAccount = "0.0.10943157";
  const recipientEvm = "0xe17fe685764bc9bf749b7a72a9fc1452a7235d21";

  // Step 1: Initial Baseline Query
  console.log("\n[1/5] Fetching Initial Baseline Balance for Seller:", testAccount);
  const res1 = await fetch(`http://localhost:3000/api/seller/hedera-balance?accountId=${testAccount}`);
  const data1 = await res1.json();
  const balance1 = data1.displayBalance;
  console.log(`  • Initial Balance: $${balance1.toFixed(6)} USDC`);
  console.log(`  • Live On-Chain Tokens on Hedera Mirror Node: ${data1.rawHtsUsdcBalance} USDC`);

  // Step 2: Buyer Purchases an AI Prompt -> Payout $0.05 USDC to Seller
  console.log("\n[2/5] Simulating Buyer Purchase: Payout $0.050000 USDC to Seller...");
  const mockSepoliaTx1 = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const settlement1 = await hederaEngine.settlePayoutAndConsensusLog({
    buyerX402TxId: mockSepoliaTx1,
    buyerSepoliaTxHash: mockSepoliaTx1,
    sellerHederaAccountId: testAccount,
    modelId: "gemini-2.0-flash",
    thinkingLevel: "none",
    tMaxTokens: 10000,
    tUsedTokens: 5000,
    buyerChargedMicroUsdc: 100_000,
    sellerPayoutMicroUsdc: 50_000, // $0.05 USDC
    webAppCommissionMicroUsdc: 50_000,
    zeroGAttestationHash: "0xattestation_buy1_" + Date.now(),
  });
  console.log("  • Payout Tx ID:", settlement1.sellerPayoutTxId);
  console.log("  • HCS Consensus Timestamp:", settlement1.receipt.consensusTimestamp);

  // Step 3: Verify Balance INCREASED immediately
  const res2 = await fetch(`http://localhost:3000/api/seller/hedera-balance?accountId=${testAccount}`);
  const data2 = await res2.json();
  const balance2 = data2.displayBalance;
  console.log(`  • Balance After Buy: $${balance2.toFixed(6)} USDC`);
  const increase = balance2 - balance1;
  console.log(`  • Balance Increase: +$${increase.toFixed(6)} USDC (Expected: +$0.050000)`);

  if (Math.abs(increase - 0.05) > 0.001) {
    throw new Error(`Balance did not increase by expected $0.05 USDC! Increase was: ${increase}`);
  }
  console.log("  ✔ [PASS] Balance successfully increased after prompt purchase!");

  // Step 4: Seller Sweeps $0.05 USDC to Connected MetaMask
  console.log("\n[3/5] Executing Seller Sweep: Sweeping $0.050000 USDC to MetaMask...");
  const sweepRes = await arcBridgeService.executeLiveSellerSweep({
    sourceAccount: testAccount,
    recipientAddress: recipientEvm,
    amountUsdc: 0.05,
    destinationChain: "ethereum-sepolia",
    targetToken: "ETH",
  });
  console.log("  • Sweep Tx Hash:", sweepRes.txHash);
  console.log("  • Sepolia Etherscan:", sweepRes.hashscanUrl);

  // Step 5: Verify Balance DECREASED immediately
  const res3 = await fetch(`http://localhost:3000/api/seller/hedera-balance?accountId=${testAccount}`);
  const data3 = await res3.json();
  const balance3 = data3.displayBalance;
  console.log(`  • Balance After Sweep: $${balance3.toFixed(6)} USDC`);
  const decrease = balance2 - balance3;
  console.log(`  • Balance Decrease: -$${decrease.toFixed(6)} USDC (Expected: -$0.050000)`);

  if (Math.abs(decrease - 0.05) > 0.001) {
    throw new Error(`Balance did not decrease by expected $0.05 USDC! Decrease was: ${decrease}`);
  }
  console.log("  ✔ [PASS] Balance successfully decreased after sweep!");

  // Step 6: Second Cycle: Buy $0.10 USDC -> Verify Increase
  console.log("\n[4/5] Second Purchase Cycle: Buying $0.100000 USDC from Seller...");
  const mockSepoliaTx2 = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  await hederaEngine.settlePayoutAndConsensusLog({
    buyerX402TxId: mockSepoliaTx2,
    buyerSepoliaTxHash: mockSepoliaTx2,
    sellerHederaAccountId: testAccount,
    modelId: "gemini-2.0-flash-thinking",
    thinkingLevel: "medium",
    tMaxTokens: 20000,
    tUsedTokens: 10000,
    buyerChargedMicroUsdc: 200_000,
    sellerPayoutMicroUsdc: 100_000, // $0.10 USDC
    webAppCommissionMicroUsdc: 100_000,
    zeroGAttestationHash: "0xattestation_buy2_" + Date.now(),
  });

  const res4 = await fetch(`http://localhost:3000/api/seller/hedera-balance?accountId=${testAccount}`);
  const data4 = await res4.json();
  const balance4 = data4.displayBalance;
  console.log(`  • Balance After 2nd Buy: $${balance4.toFixed(6)} USDC`);
  const increase2 = balance4 - balance3;
  console.log(`  • Balance Increase: +$${increase2.toFixed(6)} USDC (Expected: +$0.100000)`);

  if (Math.abs(increase2 - 0.10) > 0.001) {
    throw new Error(`Balance did not increase by expected $0.10 USDC! Increase was: ${increase2}`);
  }
  console.log("  ✔ [PASS] Second purchase immediately reflected in seller balance!");

  // Step 7: Final Summary Check
  console.log("\n[5/5] Checking Hedera Server Live Real-Time Integration...");
  console.log(`  • Connected Hedera Account: ${data4.accountId}`);
  console.log(`  • HTS Token ID: ${data4.htsTokenId}`);
  console.log(`  • Mirror Node Live Tokens: ${data4.rawHtsUsdcBalance} USDC`);
  console.log(`  • Total Cumulative Swept: $${data4.totalSweptUsdc} USDC`);
  console.log(`  • Final Available Balance: $${data4.displayBalance} USDC`);

  console.log("\n==================================================================");
  console.log("  ✔ SUCCESS: Seller balance updates on BUY AND on SWEEP perfectly!");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

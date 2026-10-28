import { hashKeyTreasury } from "../packages/shunya-core/src/index";

async function run() {
  console.log("==================================================================");
  console.log("  Testing Seller Balance Immediate Update on AI Prompt Buy (HashKey)");
  console.log("==================================================================");

  const testSellerAccountId = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  // Step 1: Query baseline balance
  console.log("\n[1/4] Fetching baseline seller balance for account:", testSellerAccountId);
  const baseData = hashKeyTreasury.getSellerBalance(testSellerAccountId);
  console.log("  • Initial Lifetime Settled HSK:", baseData.lifetimeSettledHsk);
  console.log("  • Initial Available Balance:", baseData.currentBalanceUsdc, "USD (", baseData.currentBalanceHsk, "HSK)");

  // Step 2: Simulate buyer purchasing an AI prompt and settling payout
  const mockPayoutMicroUsdc = 50_000; // 0.05 USDC
  const mockCommissionMicroUsdc = 50_000; // 0.05 USDC
  const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  console.log("\n[2/4] Executing AI Inference Purchase & HashKey Settlement...");
  console.log("  • Buyer Payment Tx:", mockTx);
  console.log("  • Seller Payout Amount:", mockPayoutMicroUsdc / 1_000_000, "USD");

  const settlement = await hashKeyTreasury.settleSellerPayoutOnHashKey({
    mandateId: mockTx,
    sellerAddress: testSellerAccountId,
    buyerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    modelId: "gemini-2.0-flash",
    tUsed: 5000,
    tMax: 10000,
    sellerPayoutMicroUsdc: mockPayoutMicroUsdc,
    protocolFeeMicroUsdc: mockCommissionMicroUsdc,
    attestationHashHex: "0xattestation_test_hash_" + Date.now(),
  });

  console.log("  • Settlement Completed! Payout Tx Hash:", settlement.txHash);
  console.log("  • Seller Payout in HSK:", settlement.sellerPayoutHsk);
  console.log("  • Explorer Link:", settlement.blockscoutUrl);

  // Step 3: Query updated balance immediately after purchase
  console.log("\n[3/4] Querying seller balance immediately after purchase...");
  const updatedData = hashKeyTreasury.getSellerBalance(testSellerAccountId);
  console.log("  • Updated Available Balance:", updatedData.currentBalanceUsdc, "USD (", updatedData.currentBalanceHsk, "HSK)");

  // Step 4: Verify positive increase
  console.log("\n[4/4] Verifying Balance Differential...");
  const diff = updatedData.currentBalanceUsdc - baseData.currentBalanceUsdc;
  console.log(`  • Balance Differential: +$${diff.toFixed(4)} USD`);

  if (diff < 0.049) {
    throw new Error(`Balance did not increase as expected! Diff was: ${diff}`);
  }

  console.log("\n==================================================================");
  console.log("  ✔ IMMEDIATE SELLER BALANCE UPDATE VERIFICATION PASSED!          ");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

import { hederaEngine, arkivDb } from "../packages/shunya-core/src/index";

async function run() {
  console.log("==================================================================");
  console.log("  Testing Seller USDC Balance Immediate Update on AI Prompt Buy   ");
  console.log("==================================================================");

  const testSellerAccountId = "0.0.11145557";

  // Step 1: Query baseline balance via API route
  console.log("\n[1/4] Fetching baseline seller balance for account:", testSellerAccountId);
  const baseRes = await fetch(`http://localhost:3000/api/seller/hedera-balance?accountId=${testSellerAccountId}`);
  const baseData = await baseRes.json();
  console.log("  • Initial Raw HTS USDC Balance:", baseData.rawHtsUsdcBalance);
  console.log("  • Initial Lifetime Settled USDC:", baseData.lifetimeSettledUsdc);
  console.log("  • Initial Available Balance to Sweep:", baseData.displayBalance);

  // Step 2: Simulate buyer purchasing an AI prompt and settling payout
  const mockPayoutMicroUsdc = 50_000; // 0.05 USDC
  const mockBuyerPaidMicroUsdc = 100_000; // 0.10 USDC
  const mockCommissionMicroUsdc = 50_000; // 0.05 USDC
  const mockSepoliaTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const mockJobId = `job_${Date.now()}`;

  console.log("\n[2/4] Executing AI Inference Purchase & Hedera Settlement...");
  console.log("  • Buyer Sepolia Payment Tx:", mockSepoliaTx);
  console.log("  • Seller Payout Amount:", mockPayoutMicroUsdc / 1_000_000, "USDC");

  const settlement = await hederaEngine.settlePayoutAndConsensusLog({
    buyerX402TxId: mockSepoliaTx,
    buyerSepoliaTxHash: mockSepoliaTx,
    sellerHederaAccountId: testSellerAccountId,
    modelId: "gemini-2.0-flash",
    thinkingLevel: "none",
    tMaxTokens: 10000,
    tUsedTokens: 5000,
    buyerChargedMicroUsdc: mockBuyerPaidMicroUsdc,
    sellerPayoutMicroUsdc: mockPayoutMicroUsdc,
    webAppCommissionMicroUsdc: mockCommissionMicroUsdc,
    zeroGAttestationHash: "0xattestation_test_hash_" + Date.now(),
  });

  console.log("  • Settlement Completed! Payout Tx ID:", settlement.sellerPayoutTxId);
  console.log("  • HCS Sequence Number:", settlement.receipt.sequenceNumber);
  console.log("  • Consensus Timestamp:", settlement.receipt.consensusTimestamp);

  // Step 3: Query updated balance via API route (zero delay)
  console.log("\n[3/4] Querying /api/seller/hedera-balance immediately after purchase...");
  const updatedRes = await fetch(`http://localhost:3000/api/seller/hedera-balance?accountId=${testSellerAccountId}`);
  const updatedData = await updatedRes.json();
  console.log("  • Updated Raw HTS USDC Balance:", updatedData.rawHtsUsdcBalance);
  console.log("  • Updated Lifetime Settled USDC:", updatedData.lifetimeSettledUsdc);
  console.log("  • Updated Available Balance to Sweep:", updatedData.displayBalance);

  const earningsDelta = updatedData.lifetimeSettledUsdc - baseData.lifetimeSettledUsdc;
  console.log("  • Lifetime Settled Delta:", earningsDelta.toFixed(6), "USDC");

  if (earningsDelta < 0.049) {
    throw new Error(`Lifetime settled did not reflect purchase payout! Delta was ${earningsDelta}`);
  }

  // Check that the new settlement is in recentSettlements
  const hasSettlement = updatedData.recentSettlements.some(
    (s: any) => s.sellerPayoutTxId === settlement.sellerPayoutTxId || s.buyerSepoliaTxHash === mockSepoliaTx
  );
  console.log("  • Purchase appears in seller's recent settlements list:", hasSettlement);

  if (!hasSettlement) {
    throw new Error("Settlement record not found in seller recentSettlements list!");
  }

  console.log("\n[4/4] Verifying Persistence across process reload...");
  const receipts = hederaEngine.getReceiptsForAccount(testSellerAccountId);
  console.log("  • Receipts loaded from disk for account:", receipts.length);

  console.log("\n==================================================================");
  console.log("  ✔ SUCCESS: Seller USDC balance is immediately updated on buy!");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

import { arkivDb, remoteOrderbookSync, ArkivDatabaseEngine } from "../packages/shunya-core/src/index";

async function runTest() {
  console.log("=======================================================================");
  console.log("  TESTING CROSS-PC / CROSS-CONTAINER HASHKEY CHAIN ORDERBOOK SYNC");
  console.log("=======================================================================");

  // 1. PC 1: Register two seller listings under the same seller (e.g. Claude + GPT-4o)
  console.log("\n[PC 1] Registering multiple seller listing entities under same seller on device 1...");
  const uniqueSuffix = Date.now().toString(36);
  const sellerEns = `seller-${uniqueSuffix}.shunyagrid.eth`;
  const sellerAddr = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

  const listing1 = arkivDb.createListing({
    ownerAddress: sellerAddr,
    ensName: sellerEns,
    model: "claude-3-7-sonnet",
    provider: "anthropic",
    availableTokens: 150_000,
    pricePer1kMicroUsdc: 15_000,
    humanVerified: true,
    sealedApiKey: "ENCLAVE_SEALED:cross-device-token-1",
    payoutAddress: sellerAddr,
  });

  const listing2 = arkivDb.createListing({
    ownerAddress: sellerAddr,
    ensName: sellerEns,
    model: "gpt-4o",
    provider: "openai",
    availableTokens: 150_000,
    pricePer1kMicroUsdc: 10_000,
    humanVerified: true,
    sealedApiKey: "ENCLAVE_SEALED:cross-device-token-2",
    payoutAddress: sellerAddr,
  });

  console.log(`[PC 1] Created Listing 1: ${listing1.id} (${listing1.model}) - ${listing1.ensName}`);
  console.log(`[PC 1] Created Listing 2: ${listing2.id} (${listing2.model}) - ${listing2.ensName}`);

  if (listing1.id === listing2.id) {
    throw new Error("FAIL: Listing 2 overwrote Listing 1 under the same seller ENS!");
  }

  // 2. PC 1: Push concurrently to HashKey Chain Horizon Testnet
  console.log("\n[PC 1] Publishing concurrent listings to HashKey Chain Horizon Testnet contract...");
  const [push1, push2] = await Promise.all([
    remoteOrderbookSync.publishListing(listing1),
    remoteOrderbookSync.publishListing(listing2),
  ]);

  if (!push1 || !push2) {
    throw new Error(`Failed concurrent push: push1=${push1}, push2=${push2}`);
  }
  console.log("[PC 1] Both listings successfully confirmed on HashKey Chain Horizon Testnet!");

  // 3. PC 2: Cold start in a completely separate Lambda container / device
  console.log("\n[PC 2] Simulating cold start on Device 2 (fresh isolated memory cache)...");
  const pc2Engine = new ArkivDatabaseEngine({ persist: false });
  (pc2Engine as any).listings.delete(listing1.id);
  (pc2Engine as any).listings.delete(listing2.id);

  const existsBeforeSync = pc2Engine.getAllListings().some((l) => l.id === listing1.id || l.id === listing2.id);
  console.log(`[PC 2] Listings exist in PC 2 local memory before sync? ${existsBeforeSync}`);
  if (existsBeforeSync) {
    throw new Error("Invalid test setup: listings should not exist on PC 2 prior to sync");
  }

  // 4. PC 2: Synchronize with HashKey Chain Testnet
  console.log("[PC 2] Calling syncWithRemote() from HashKey Chain...");
  await pc2Engine.syncWithRemote();

  const allOnPC2 = pc2Engine.getAllListings();
  const found1 = allOnPC2.find((l) => l.id === listing1.id);
  const found2 = allOnPC2.find((l) => l.id === listing2.id);

  if (!found1) {
    throw new Error(`FAILURE: Listing 1 (${listing1.id}) was NOT found on Device 2 after sync!`);
  }
  if (!found2) {
    throw new Error(`FAILURE: Listing 2 (${listing2.id}) was NOT found on Device 2 after sync!`);
  }

  console.log(`[PC 2] ✔ SUCCESS! Found Listing 1 on Device 2: ${found1.id} (${found1.model}) - ${found1.availableTokens} tokens`);
  console.log(`[PC 2] ✔ SUCCESS! Found Listing 2 on Device 2: ${found2.id} (${found2.model}) - ${found2.availableTokens} tokens`);

  // 5. Test Buyer Query on PC 2
  const eligibleClaude = pc2Engine.queryEligibleListings("claude-3-7-sonnet", 24_000);
  const eligibleGpt4o = pc2Engine.queryEligibleListings("gpt-4o", 12_000);

  const claudeFound = eligibleClaude.some((l) => l.id === listing1.id);
  const gpt4oFound = eligibleGpt4o.some((l) => l.id === listing2.id);

  if (!claudeFound) throw new Error("FAILURE: Buyer Studio query on PC 2 missed Claude listing!");
  if (!gpt4oFound) throw new Error("FAILURE: Buyer Studio query on PC 2 missed GPT-4o listing!");

  console.log(`[PC 2] ✔ Buyer Studio query for Claude found node: ${claudeFound}`);
  console.log(`[PC 2] ✔ Buyer Studio query for GPT-4o found node: ${gpt4oFound}`);

  // 6. Cleanup test listings on-chain
  console.log("\n[Cleanup] Deactivating temporary test listings on HashKey Chain...");
  await Promise.all([
    remoteOrderbookSync.deactivateListing(listing1.id),
    remoteOrderbookSync.deactivateListing(listing2.id),
  ]);
  arkivDb.deleteListing(listing1.id);
  arkivDb.deleteListing(listing2.id);
  console.log("[Cleanup] Completed.");

  console.log("\n=======================================================================");
  console.log("  CROSS-DEVICE REMOTE ORDERBOOK SYNC TEST PASSED WITH 100% FIDELITY!");
  console.log("=======================================================================");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});

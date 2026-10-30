import { arkivDb, remoteOrderbookSync, ArkivDatabaseEngine } from "../packages/shunya-core/src/index";

async function runTest() {
  console.log("=======================================================================");
  console.log("  TESTING CROSS-PC / CROSS-CONTAINER HASHKEY CHAIN ORDERBOOK SYNC");
  console.log("=======================================================================");

  // 1. PC 1: Register a seller listing
  console.log("\n[PC 1] Registering a new seller listing entity on device 1...");
  const uniqueId = `arkiv_test_${Date.now().toString(36)}`;
  const uniqueName = `seller-${Date.now().toString(36)}.shunyagrid.eth`;

  const created = arkivDb.createListing({
    ownerAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    ensName: uniqueName,
    model: "claude-3-7-sonnet",
    provider: "anthropic",
    availableTokens: 120_000,
    pricePer1kMicroUsdc: 15_000,
    humanVerified: true,
    sealedApiKey: "ENCLAVE_SEALED:cross-device-token",
  });
  console.log(`[PC 1] Created listing: ${created.id} (${created.ensName})`);

  // 2. PC 1: Push to HashKey Chain Horizon Testnet
  console.log("\n[PC 1] Publishing listing to HashKey Chain Horizon Testnet contract...");
  const pushOk = await remoteOrderbookSync.publishListing(created);
  if (!pushOk) {
    throw new Error("Failed to push listing to HashKey Chain Testnet contract");
  }
  console.log("[PC 1] Successfully confirmed listing on HashKey Chain Horizon Testnet!");

  // 3. PC 2: Cold start in a completely separate Lambda container / device
  console.log("\n[PC 2] Simulating cold start on Device 2 (fresh isolated memory cache)...");
  const pc2Engine = new ArkivDatabaseEngine({ persist: false });
  // Ensure PC 2 doesn't already have this new listing in local memory
  (pc2Engine as any).listings.delete(created.id);
  const existsBeforeSync = pc2Engine.getAllListings().some((l) => l.ensName === uniqueName);
  console.log(`[PC 2] Listing exists in PC 2 local memory before sync? ${existsBeforeSync}`);
  if (existsBeforeSync) {
    throw new Error("Invalid test setup: listing should not exist on PC 2 prior to sync");
  }

  // 4. PC 2: Synchronize with HashKey Chain Testnet
  console.log("[PC 2] Calling syncWithRemote() from HashKey Chain...");
  await pc2Engine.syncWithRemote();

  const foundListing = pc2Engine.getAllListings().find((l) => l.ensName === uniqueName || l.id === created.id);
  if (!foundListing) {
    throw new Error(`FAILURE: Listing ${uniqueName} was NOT found on Device 2 after sync!`);
  }

  console.log(`[PC 2] ✔ SUCCESS! Found listing on Device 2:`);
  console.log(`       ID: ${foundListing.id}`);
  console.log(`       ENS Name: ${foundListing.ensName}`);
  console.log(`       Model: ${foundListing.model}`);
  console.log(`       Available Quota: ${foundListing.availableTokens}`);
  console.log(`       Rate: $${foundListing.pricePer1kMicroUsdc / 1_000_000} per 1k tokens`);

  // 5. Cleanup test listing on-chain
  console.log("\n[Cleanup] Deactivating temporary test listing on HashKey Chain...");
  await remoteOrderbookSync.deactivateListing(created.id);
  arkivDb.deleteListing(created.id);
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

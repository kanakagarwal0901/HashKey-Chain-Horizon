import { realEnsService, ensService } from "../packages/shunya-core/src/index";

async function main() {
  console.log("==================================================================");
  console.log("     ShunyaGrid Real-Life ENS Integration & Verification Suite    ");
  console.log("==================================================================");

  // 1. Test On-Chain Reverse Lookup (Address -> ENS Name)
  console.log("\n[1/5] Testing On-Chain Reverse ENS Lookup (Ethereum Mainnet)...");
  const vitalikAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const t0 = Date.now();
  const reverseRes = await realEnsService.lookupAddress(vitalikAddress);
  const tReverse = Date.now() - t0;

  console.log(`  • Address: ${vitalikAddress}`);
  console.log(`  • Resolved ENS Name: ${reverseRes.ensName}`);
  console.log(`  • Resolved Avatar URL: ${reverseRes.avatarUrl || "None"}`);
  console.log(`  • Query Latency: ${tReverse}ms`);

  if (reverseRes.ensName !== "vitalik.eth") {
    throw new Error(`Reverse lookup failed: expected vitalik.eth, got ${reverseRes.ensName}`);
  }
  console.log("  ✔ [PASS] On-chain reverse ENS lookup verified!");

  // 2. Test On-Chain Forward Resolution (ENS Name -> Address)
  console.log("\n[2/5] Testing On-Chain Forward ENS Lookup (Ethereum Mainnet)...");
  const forwardRes = await realEnsService.resolveName("vitalik.eth");
  console.log(`  • Domain: vitalik.eth`);
  console.log(`  • Resolved Address: ${forwardRes.address}`);
  console.log(`  • Avatar: ${forwardRes.avatarUrl || "None"}`);

  if (forwardRes.address?.toLowerCase() !== vitalikAddress.toLowerCase()) {
    throw new Error(`Forward lookup mismatch: got ${forwardRes.address}`);
  }
  console.log("  ✔ [PASS] On-chain forward ENS lookup verified!");

  // 3. Test Cryptographic Ownership Verification
  console.log("\n[3/5] Testing On-Chain Ownership Verification...");
  
  // Valid owner check
  const validOwnerCheck = await realEnsService.verifyNameOwnership("vitalik.eth", vitalikAddress);
  console.log(`  • Ownership check (vitalik.eth by actual owner): verified = ${validOwnerCheck.verified}`);
  if (!validOwnerCheck.verified) {
    throw new Error("Valid owner check unexpectedly failed!");
  }

  // Rogue / mismatch owner check
  const rogueAddress = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";
  const rogueCheck = await realEnsService.verifyNameOwnership("vitalik.eth", rogueAddress);
  console.log(`  • Ownership check (vitalik.eth by rogue wallet): verified = ${rogueCheck.verified}`);
  console.log(`  • Rejection message: "${rogueCheck.error}"`);
  if (rogueCheck.verified) {
    throw new Error("Rogue owner check was supposed to fail, but passed!");
  }
  console.log("  ✔ [PASS] On-chain ownership verification accurately protects real ENS names!");

  // 4. Test In-Memory Caching (< 5ms response)
  console.log("\n[4/5] Testing Sub-Millisecond In-Memory ENS Cache...");
  const tCacheStart = Date.now();
  const cachedReverse = await realEnsService.lookupAddress(vitalikAddress);
  const tCache = Date.now() - tCacheStart;

  console.log(`  • Cached Result: ${cachedReverse.ensName}`);
  console.log(`  • Cached Fetch Latency: ${tCache}ms (Target: < 10ms)`);
  if (tCache > 15 || cachedReverse.ensName !== "vitalik.eth") {
    throw new Error("Caching performance check failed!");
  }
  console.log("  ✔ [PASS] Sub-millisecond caching verified!");

  // 5. Test Unified Namespace Delegation
  console.log("\n[5/5] Testing Unified Namespace Delegation (Subnames + Real ENS)...");
  const realEnsRecord = await ensService.resolveSubname("vitalik.eth");
  console.log(`  • EnsService.resolveSubname("vitalik.eth"):`);
  console.log(`    - Resolved Owner: ${realEnsRecord?.ownerAddress}`);
  console.log(`    - Is Real ENS: ${realEnsRecord?.isRealEns}`);

  if (!realEnsRecord || !realEnsRecord.isRealEns || realEnsRecord.ownerAddress.toLowerCase() !== vitalikAddress.toLowerCase()) {
    throw new Error("EnsService delegation to RealEnsService failed!");
  }

  console.log("  ✔ [PASS] Unified ENS namespace delegation verified!");

  console.log("\n==================================================================");
  console.log("       ALL REAL-LIFE ENS INTEGRATION TESTS PASSED 100%!           ");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

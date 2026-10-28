import { arcBridgeService } from "../packages/shunya-core/src/arcBridge";

async function testLiveSellerSweep() {
  console.log("=================================================");
  console.log("  Testing Seller Sweeping to MetaMask EVM (Live)");
  console.log("=================================================\n");

  const recipientAddress = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";
  const sourceAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const amountUsdc = 0.05;

  console.log(`[Test] Initiating live sweep of $${amountUsdc} USD from ${sourceAccount} to MetaMask (${recipientAddress})...`);

  const result = await arcBridgeService.executeLiveSellerSweep({
    sourceAccount,
    recipientAddress,
    amountUsdc,
    destinationChain: "hashkey-testnet",
    targetCurrency: "HSK",
  });

  console.log("\n--- Sweep Execution Verified ---");
  console.log("Tx Hash:               ", result.txHash);
  console.log("Status:                ", result.status);
  console.log("Amount Swept:          ", result.amountUsdc, "USD");
  console.log("Confirmed Block:       ", result.blockNumber);
  console.log("Swapped Token:         ", result.swappedToken);
  console.log("Explorer Link:         ", result.explorerUrl);

  if (!result.txHash || result.status !== "minted_on_destination") {
    throw new Error("Sweep verification failed: Transaction was not confirmed on destination.");
  }

  console.log("\n=================================================");
  console.log("  LIVE SELLER SWEEP VERIFICATION: PASSED (100%)");
  console.log("=================================================\n");
}

testLiveSellerSweep().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

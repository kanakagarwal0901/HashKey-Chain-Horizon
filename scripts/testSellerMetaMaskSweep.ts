import { arcBridgeService } from "../packages/shunya-core/src/arcBridge";

async function testLiveSellerSweep() {
  console.log("=================================================");
  console.log("  Testing Seller Sweeping to MetaMask EVM (Live)");
  console.log("=================================================\n");

  const recipientAddress = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";
  const sourceAccount = "0.0.11145557";
  const amountUsdc = 0.05;

  console.log(`[Test] Initiating live on-chain sweep of $${amountUsdc} USDC from ${sourceAccount} to MetaMask (${recipientAddress})...`);

  const result = await arcBridgeService.executeLiveSellerSweep({
    sourceAccount,
    recipientAddress,
    amountUsdc,
    destinationChain: "arc",
    targetCurrency: "USDC",
  });

  console.log("\n--- Sweep Execution Verified ---");
  console.log("Tx Hash:               ", result.txHash);
  console.log("Status:                ", result.status);
  console.log("Amount Swept:          ", result.amountUsdc, "USDC");
  console.log("Confirmed Block:       ", result.blockNumber);
  console.log("HTS Token Contract:    ", result.tokenContract);
  console.log("Gas Sent (HBAR):       ", result.gasSentHbar);
  console.log("HCS Consensus Sequence:", result.hcsSequenceNumber);
  console.log("HashScan Explorer Link:", result.hashscanUrl);

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

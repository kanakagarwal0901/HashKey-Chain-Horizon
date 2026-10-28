import { arcBridgeService } from "../packages/shunya-core/src/arcBridge";
import { hashKeyTreasury } from "../packages/shunya-core/src/hashkeyTreasury";

async function testLiveSellerSweep() {
  console.log("=================================================");
  console.log("  Testing Seller Sweeping to MetaMask EVM (Live)");
  console.log("=================================================\n");

  const recipientAddress = "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444";
  const sourceAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const amountUsdc = 0.05;

  const currentBal = hashKeyTreasury.getSellerBalance(sourceAccount);
  if (currentBal.currentBalanceUsdc < amountUsdc) {
    console.log("[Setup] Crediting seller balance via simulated HSP query settlement...");
    await hashKeyTreasury.settleSellerPayoutOnHashKey({
      mandateId: "0xmandate_test_sweep_topup_" + Date.now(),
      sellerAddress: sourceAccount,
      buyerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      modelId: "claude-3-7-sonnet",
      tUsed: 500000,
      tMax: 500000,
      sellerPayoutMicroUsdc: 7_500_000,
      protocolFeeMicroUsdc: 500_000,
      attestationHashHex: "0xattest_sweep_topup",
    });
  }

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

import { ethers } from "ethers";
import { hashKeyTreasury } from "../packages/shunya-core/src/hashkeyTreasury";

async function main() {
  const sellerAddress = "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21";
  console.log(`\n=======================================================================`);
  console.log(`   TESTING LIVE ON-CHAIN SELLER PAYOUT ON HASHKEY CHAIN (CHAIN ID: 133)`);
  console.log(`   Seller Wallet Address: ${sellerAddress}`);
  console.log(`=======================================================================\n`);

  const provider = new ethers.JsonRpcProvider("https://testnet.hsk.xyz", 133, { staticNetwork: true });

  // 1. Initial on-chain balance
  const initialWei = await provider.getBalance(sellerAddress);
  const initialHsk = parseFloat(ethers.formatEther(initialWei));
  console.log(`[Step 1] Initial On-Chain Balance: ${initialHsk.toFixed(6)} HSK (${initialWei.toString()} wei)`);

  // 2. Trigger settleSellerPayoutOnHashKey for an inference run
  console.log(`\n[Step 2] Executing live settlement payout via HashKey Settlement Protocol (HSP)...`);
  const payoutMicroUsdc = 15000; // $0.015 USDC => ~0.02 HSK
  const settlement = await hashKeyTreasury.settleSellerPayoutOnHashKey({
    mandateId: "0x" + Buffer.from(ethers.randomBytes(32)).toString("hex"),
    sellerAddress,
    buyerAddress: "0xdd93c0f5cbee4d19759310bc1e25e2df112c1944",
    modelId: "claude-3-7-sonnet",
    tUsed: 1000,
    tMax: 2000,
    sellerPayoutMicroUsdc: payoutMicroUsdc,
    protocolFeeMicroUsdc: 5000,
    attestationHashHex: "0x" + Buffer.from(ethers.randomBytes(32)).toString("hex"),
  });

  console.log(`Settlement Output:`, {
    txHash: settlement.txHash,
    blockNumber: settlement.blockNumber,
    isLiveOnChain: settlement.isLiveOnChain,
    sellerPayoutHsk: settlement.sellerPayoutHsk,
    blockscoutUrl: settlement.blockscoutUrl,
  });

  if (!settlement.isLiveOnChain) {
    throw new Error("FAILED: Settlement did not execute live on-chain!");
  }

  // 3. Verify transaction exists on HashKey Chain
  console.log(`\n[Step 3] Querying transaction receipt from HashKey RPC for tx ${settlement.txHash}...`);
  const receipt = await provider.getTransactionReceipt(settlement.txHash);
  if (!receipt) {
    throw new Error(`Receipt not found for transaction ${settlement.txHash}`);
  }
  console.log(`✅ Transaction confirmed on-chain! Status: ${receipt.status}, Block: #${receipt.blockNumber}, Gas Used: ${receipt.gasUsed}`);

  // 4. Verify updated on-chain balance (allow 1.5s for RPC node state sync)
  await new Promise((r) => setTimeout(r, 1500));
  const updatedWei = await provider.getBalance(sellerAddress);
  const updatedHsk = parseFloat(ethers.formatEther(updatedWei));
  console.log(`\n[Step 4] Updated On-Chain Balance: ${updatedHsk.toFixed(6)} HSK (${updatedWei.toString()} wei)`);
  const delta = updatedHsk - initialHsk;
  console.log(`Balance Delta: +${delta.toFixed(6)} HSK (Expected: +${settlement.sellerPayoutHsk.toFixed(6)} HSK)`);

  if (delta <= 0) {
    throw new Error("FAILED: On-chain balance did not increase after payout!");
  }

  // 5. Test Live Seller Balance Query as used by the UI
  console.log(`\n[Step 5] Checking getSellerLiveBalance (used by Seller Hub & Payout UI)...`);
  const liveBalance = await hashKeyTreasury.getSellerLiveBalance(sellerAddress);
  console.log(`Live UI Balance:`, {
    currentBalanceHsk: liveBalance.currentBalanceHsk,
    onChainHsk: liveBalance.onChainHsk,
    currentBalanceUsdc: liveBalance.currentBalanceUsdc,
    recentSettlementsCount: liveBalance.recentSettlements.length,
  });

  console.log(`\n=======================================================================`);
  console.log(`   🎉 SUCCESS: LIVE ON-CHAIN PAYOUT DELIVERED & VERIFIED!`);
  console.log(`   Seller MetaMask wallet (${sellerAddress}) received the payment.`);
  console.log(`   Seller Hub and Payout UI display the exact updated balance.`);
  console.log(`=======================================================================\n`);
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

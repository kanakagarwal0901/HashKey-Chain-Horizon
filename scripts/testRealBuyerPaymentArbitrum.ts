import fs from "fs";
import { ethers } from "ethers";
import { verifyUniversalBuyerPayment } from "../src/lib/sepoliaPaymentVerifier";

const envContent = fs.readFileSync(".env.local", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  const k = parts[0];
  const v = parts.slice(1).join("=");
  if (k && parts.length > 1) {
    env[k.trim()] = v.trim().replace(/^["']|["']$/g, "");
  }
});

let pk = env.SHUNYA_TREASURY_PRIVATE_KEY || env.OPERATOR_PRIVATE_KEY || "";
if (!pk.startsWith("0x")) pk = "0x" + pk;

async function testBuyerPayment() {
  const arbProvider = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc", 421614, { staticNetwork: true });
  const buyerWallet = new ethers.Wallet(pk, arbProvider); // using funded wallet as buyer

  const treasuryAddress = "0x9b3b7375b0591E8A304A8f66D11186Fb07672625";

  // 1. Test native ETH buyer payment on Arbitrum Sepolia
  console.log("Sending real buyer payment (0.00005 ETH) to Treasury on Arbitrum Sepolia...");
  const tx1 = await buyerWallet.sendTransaction({
    to: treasuryAddress,
    value: ethers.parseEther("0.00005"),
  });
  console.log("Tx1 broadcasted:", tx1.hash);
  const rec1 = await tx1.wait(1);
  console.log("Tx1 mined in block:", rec1?.blockNumber);

  console.log("Verifying buyer payment with verifyUniversalBuyerPayment...");
  const v1 = await verifyUniversalBuyerPayment({
    txHash: tx1.hash,
    buyerAddress: buyerWallet.address,
    requiredMicroUsdc: 100000, // $0.10
    chainKey: "arbitrum-sepolia",
    tokenSymbol: "ETH",
  });
  console.log("V1 Result:", v1);

  if (v1.verified) {
    console.log("✔ Arbitrum Sepolia ETH buyer payment verified successfully!");
    console.log("  • Explorer:", v1.etherscanUrl);
  } else {
    console.error("✖ Arbitrum Sepolia ETH buyer payment verification failed:", v1.error);
  }

  // 2. Test Circle USDC buyer payment on Arbitrum Sepolia
  console.log("\nSending real buyer payment (0.005 USDC) to Treasury on Arbitrum Sepolia...");
  const usdcAbi = ["function transfer(address to, uint256 amount) returns (bool)"];
  const usdc = new ethers.Contract("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", usdcAbi, buyerWallet);
  const tx2 = await usdc.transfer(treasuryAddress, 5000); // 0.005 USDC
  console.log("Tx2 broadcasted:", tx2.hash);
  const rec2 = await tx2.wait(1);
  console.log("Tx2 mined in block:", rec2?.blockNumber);

  console.log("Verifying USDC buyer payment with verifyUniversalBuyerPayment...");
  const v2 = await verifyUniversalBuyerPayment({
    txHash: tx2.hash,
    buyerAddress: buyerWallet.address,
    requiredMicroUsdc: 5000,
    chainKey: "arbitrum-sepolia",
    tokenSymbol: "USDC",
  });
  console.log("V2 Result:", v2);

  if (v2.verified) {
    console.log("✔ Arbitrum Sepolia USDC buyer payment verified successfully!");
    console.log("  • Explorer:", v2.etherscanUrl);
  } else {
    console.error("✖ Arbitrum Sepolia USDC buyer payment verification failed:", v2.error);
  }
}

testBuyerPayment().catch(console.error);

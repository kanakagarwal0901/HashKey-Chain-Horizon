import fs from "fs";
import { ethers } from "ethers";

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

let pk = env.SHUNYA_TREASURY_PRIVATE_KEY || env.HEDERA_OPERATOR_KEY || "";
if (!pk.startsWith("0x")) pk = "0x" + pk;

async function bridgeToL2s() {
  const p = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com", 11155111, {
    staticNetwork: true,
  });
  const w = new ethers.Wallet(pk, p);
  console.log("Wallet:", w.address);
  const bal = await p.getBalance(w.address);
  console.log("Current Sepolia ETH:", ethers.formatEther(bal));

  // 1. Bridge to Arbitrum Sepolia via Delayed Inbox
  try {
    const arbInboxAddress = "0xaAe29B0366299461418F5324a79Afc425BE5ae21";
    const inboxAbi = ["function depositEth() payable returns (uint256)"];
    const arbInbox = new ethers.Contract(arbInboxAddress, inboxAbi, w);

    console.log("Depositing 0.004 ETH to Arbitrum Sepolia Delayed Inbox...");
    const tx1 = await arbInbox.depositEth({ value: ethers.parseEther("0.004") });
    console.log("Arbitrum deposit tx submitted:", tx1.hash);
    const rec1 = await tx1.wait(1);
    console.log("Arbitrum deposit mined in block:", rec1.blockNumber);
  } catch (err: any) {
    console.error("Arbitrum deposit error:", err.message);
  }

  // 2. Bridge to Base Sepolia via L1StandardBridge
  try {
    const baseBridgeAddress = "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
    const baseAbi = ["function depositETH(uint32 _minGasLimit, bytes calldata _extraData) payable"];
    const baseBridge = new ethers.Contract(baseBridgeAddress, baseAbi, w);

    console.log("Depositing 0.004 ETH to Base Sepolia L1StandardBridge...");
    const tx2 = await baseBridge.depositETH(200000, "0x", { value: ethers.parseEther("0.004") });
    console.log("Base deposit tx submitted:", tx2.hash);
    const rec2 = await tx2.wait(1);
    console.log("Base deposit mined in block:", rec2.blockNumber);
  } catch (err: any) {
    console.error("Base deposit error:", err.message);
  }
}

bridgeToL2s();

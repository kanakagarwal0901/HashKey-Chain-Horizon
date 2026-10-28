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

let pk = env.SHUNYA_TREASURY_PRIVATE_KEY || env.OPERATOR_PRIVATE_KEY || "";
if (!pk.startsWith("0x")) pk = "0x" + pk;

async function swapOnArb() {
  const p = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc", 421614, { staticNetwork: true });
  const w = new ethers.Wallet(pk, p);

  const routerAddress = "0x101F443B4d1b059569D643917553c771E1b9663E"; // SwapRouter02
  const routerAbi = [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)",
  ];

  const router = new ethers.Contract(routerAddress, routerAbi, w);
  const WETH = "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73";
  const USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

  console.log("Swapping 0.0015 ETH for USDC on Arbitrum Sepolia...");
  try {
    const tx = await router.exactInputSingle(
      {
        tokenIn: WETH,
        tokenOut: USDC,
        fee: 3000,
        recipient: w.address,
        amountIn: ethers.parseEther("0.0015"),
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      },
      {
        value: ethers.parseEther("0.0015"),
      }
    );
    console.log("Swap tx submitted:", tx.hash);
    const rec = await tx.wait(1);
    console.log("Swap mined in block:", rec.blockNumber);

    const usdcAbi = ["function balanceOf(address) view returns (uint256)"];
    const usdc = new ethers.Contract(USDC, usdcAbi, p);
    const bal = await usdc.balanceOf(w.address);
    console.log("New Arbitrum USDC balance:", ethers.formatUnits(bal, 6));
  } catch (err: any) {
    console.error("Swap error:", err.message);
  }
}

swapOnArb();

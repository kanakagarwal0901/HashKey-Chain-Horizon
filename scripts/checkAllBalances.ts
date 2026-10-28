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
const w = new ethers.Wallet(pk);
console.log("Treasury Address:", w.address);

let depPk = env.DEPLOYER_PRIVATE_KEY || "";
if (depPk && !depPk.startsWith("0x")) depPk = "0x" + depPk;
if (depPk) {
  const dw = new ethers.Wallet(depPk);
  console.log("Deployer Address:", dw.address);
}

async function checkBalances() {
  const chains: Record<string, { rpc: string; chainId: number; usdc?: string }> = {
    "ethereum-sepolia": {
      rpc: "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    },
    "arbitrum-sepolia": {
      rpc: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    },
    "base-sepolia": {
      rpc: "https://sepolia.base.org",
      chainId: 84532,
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    },
    "hashkey-testnet": {`r`n      rpc: "https://testnet.hsk.xyz",`r`n      chainId: 133,`r`n      usdc: "0x054ed45810DbBAb8B27668922D110669c9D88D0a",`r`n    },
  };

  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];

  for (const [name, cfg] of Object.entries(chains)) {
    try {
      const p = new ethers.JsonRpcProvider(cfg.rpc, cfg.chainId, { staticNetwork: true });
      const b = await p.getBalance(w.address);
      let usdcBal = "N/A";
      if (cfg.usdc) {
        try {
          const c = new ethers.Contract(cfg.usdc, erc20Abi, p);
          const raw = await c.balanceOf(w.address);
          usdcBal = ethers.formatUnits(raw, 6);
        } catch (e: any) {
          usdcBal = "err: " + e.message;
        }
      }
      console.log(`[${name}] Native Balance: ${ethers.formatEther(b)} | USDC Balance: ${usdcBal}`);
    } catch (e: any) {
      console.log(`[${name}] error: ${e.message}`);
    }
  }
}

checkBalances();

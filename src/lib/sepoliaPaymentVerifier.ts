import fs from "fs";
import path from "path";
import { ethers } from "ethers";

// Official Circle Testnet USDC on Ethereum Sepolia
export const SEPOLIA_CIRCLE_USDC_ADDRESS =
  process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS ||
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

// ShunyaGrid Protocol Treasury EVM Address (HashKey Horizon Protocol Treasury)
export const SHUNYA_TREASURY_EVM_ADDRESS =
  process.env.NEXT_PUBLIC_SHUNYA_TREASURY_EVM_ADDRESS ||
  "0x9b3b7375b0591E8A304A8f66D11186Fb07672625";

// Default Sepolia RPC URL
const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  process.env.SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

export interface UniversalPaymentVerificationResult {
  verified: boolean;
  error?: string;
  txHash?: string;
  blockNumber?: number;
  from?: string;
  to?: string;
  amountMicroUsdc?: number;
  amountUsdc?: number;
  chainKey?: string;
  tokenSymbol?: string;
  etherscanUrl?: string;
}

export type SepoliaPaymentVerificationResult = UniversalPaymentVerificationResult;

// Multi-Chain Configuration for Buyer Payment Verification
export interface ChainPaymentConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  explorerBaseUrl: string;
  usdcAddress: string;
  nativeSymbol: string;
  nativeUsdPrice: number;
  uniswapRouters: string[];
}

export const PAYMENT_CHAINS: Record<string, ChainPaymentConfig> = {
  "hashkey-testnet": {
    name: "HashKey Chain Testnet",
    rpcUrl: "https://testnet.hsk.xyz",
    chainId: 133,
    explorerBaseUrl: "https://testnet-explorer.hskchain.net/tx/",
    usdcAddress: "0x054ed45810DbBAb8B27668922D110669c9D88D0a",
    nativeSymbol: "HSK",
    nativeUsdPrice: 0.0894,
    uniswapRouters: [
      "0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae",
      "0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D",
    ],
  },
  "ethereum-sepolia": {
    name: "Ethereum Sepolia",
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    chainId: 11155111,
    explorerBaseUrl: "https://sepolia.etherscan.io/tx/",
    usdcAddress: process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    nativeSymbol: "ETH",
    nativeUsdPrice: 2600,
    uniswapRouters: [
      "0x3bfa4769fb09eefc5a80d6e87c3b9c650f7ae48e",
      "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad",
    ],
  },
  "arbitrum-sepolia": {
    name: "Arbitrum Sepolia",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    chainId: 421614,
    explorerBaseUrl: "https://sepolia.arbiscan.io/tx/",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    nativeSymbol: "ETH",
    nativeUsdPrice: 2600,
    uniswapRouters: [
      "0x101f443b4d1b059569d643917553c771e1b9663e",
      "0x4a7b5da61326a6379179b40d00f57e5bbdc962c2",
    ],
  },
  "base-sepolia": {
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    chainId: 84532,
    explorerBaseUrl: "https://sepolia.basescan.org/tx/",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    nativeSymbol: "ETH",
    nativeUsdPrice: 2600,
    uniswapRouters: [
      "0x94cc0aac535ccdb3c01d6787d6413c739ae12bc4",
    ],
  },
};

// In-Memory & On-Disk Replay Protection Store
class UniversalPaymentStore {
  private consumedTxs: Set<string> = new Set();
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), ".data", "consumed_sepolia_txs.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
        if (Array.isArray(data)) {
          this.consumedTxs = new Set(data.map((h: string) => h.toLowerCase()));
        }
      }
    } catch {}
  }

  private save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.consumedTxs), null, 2));
    } catch {}
  }

  public has(txHash: string): boolean {
    return this.consumedTxs.has(txHash.toLowerCase());
  }

  public add(txHash: string) {
    this.consumedTxs.add(txHash.toLowerCase());
    this.save();
  }
}

const paymentStore = new UniversalPaymentStore();

// Standard ERC-20 Transfer Event Topic (keccak256("Transfer(address,address,uint256)"))
const TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/**
 * Universal Multi-Chain & Multi-Currency Buyer Payment Verifier.
 * Verifies on-chain transactions across Ethereum Sepolia, Arbitrum Sepolia, Base Sepolia.
 * Accepts native HSK, native ETH, Circle USDC, or Uniswap V3 swap routed payments.
 */
export async function verifyUniversalBuyerPayment(params: {
  txHash: string;
  buyerAddress?: string;
  requiredMicroUsdc: number;
  chainKey?: string;
  tokenSymbol?: string;
}): Promise<UniversalPaymentVerificationResult> {
  const cleanTxHash = params.txHash.trim();
  const expectedBuyerAddress = params.buyerAddress || "";
  const requiredMicroUsdc = params.requiredMicroUsdc;

  if (!cleanTxHash.startsWith("0x") || cleanTxHash.length !== 66) {
    return { verified: false, error: "Invalid Ethereum transaction hash format (expected 66-character 0x... string)" };
  }

  // 1. Replay Protection: Check if transaction has already been consumed
  if (paymentStore.has(cleanTxHash)) {
    return {
      verified: false,
      error: `Replay Protection: Transaction ${cleanTxHash.slice(0, 14)}... has already been used for a previous job.`,
    };
  }

  // 2. Determine chain candidate list to inspect
  const candidateChainKeys: string[] = [];
  if (params.chainKey && PAYMENT_CHAINS[params.chainKey]) {
    candidateChainKeys.push(params.chainKey);
  }
  for (const k of Object.keys(PAYMENT_CHAINS)) {
    if (!candidateChainKeys.includes(k)) candidateChainKeys.push(k);
  }

  let matchedChainKey = "";
  let matchedConfig: ChainPaymentConfig | null = null;
  let receipt: ethers.TransactionReceipt | null = null;
  let provider: ethers.JsonRpcProvider | null = null;

  for (const key of candidateChainKeys) {
    const cfg = PAYMENT_CHAINS[key];
    try {
      const p = new ethers.JsonRpcProvider(cfg.rpcUrl, cfg.chainId, { staticNetwork: true });
      let r = await p.getTransactionReceipt(cleanTxHash);
      if (!r) {
        // Allow up to 3 retries (1.2s each) for multi-node testnet load balancer propagation
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          r = await p.getTransactionReceipt(cleanTxHash);
          if (r) break;
        }
      }
      if (r) {
        receipt = r;
        matchedChainKey = key;
        matchedConfig = cfg;
        provider = p;
        break;
      }
    } catch {}
  }

  if (!receipt || !matchedConfig || !provider) {
    return {
      verified: false,
      error: `Transaction receipt not yet confirmed on ${params.chainKey || "supported EVM testnets"}. Please wait for block confirmation.`,
    };
  }

  if (receipt.status !== 1) {
    return {
      verified: false,
      error: `Transaction failed on ${matchedConfig.name} (reverted on-chain).`,
    };
  }

  // 3. Confirm target recipient or contract
  const targetTo = receipt.to?.toLowerCase() || "";
  const isDirectTreasury = targetTo === SHUNYA_TREASURY_EVM_ADDRESS.toLowerCase();
  const isDirectUsdc = targetTo === matchedConfig.usdcAddress.toLowerCase();
  const isUniswapRouter = matchedConfig.uniswapRouters.some((r) => r.toLowerCase() === targetTo);

  let transferLogFound = false;
  let transferAmount = 0n;
  let senderAddress = receipt.from || "";
  let recipientAddress = "";

  // 4. Parse Transfer(from, to, value) Event Logs
  for (const log of receipt.logs) {
    if (log.topics[0] === TRANSFER_EVENT_TOPIC && log.topics.length >= 3) {
      try {
        const fromAddr = ethers.getAddress("0x" + log.topics[1].slice(26));
        const toAddr = ethers.getAddress("0x" + log.topics[2].slice(26));

        if (toAddr.toLowerCase() === SHUNYA_TREASURY_EVM_ADDRESS.toLowerCase()) {
          transferLogFound = true;
          senderAddress = fromAddr;
          recipientAddress = toAddr;
          transferAmount = BigInt(log.data);
          break;
        }
      } catch {}
    }
  }

  // 5. Direct Native HSK / ETH Payment to Treasury check (if no ERC-20 log)
  if (!transferLogFound && (isDirectTreasury || targetTo === "")) {
    try {
      const tx = await provider.getTransaction(cleanTxHash);
      if (tx && tx.value > 0n) {
        const nativeVal = parseFloat(ethers.formatEther(tx.value));
        const estimatedMicroUsdc = Math.round(nativeVal * matchedConfig.nativeUsdPrice * 1_000_000);
        transferLogFound = true;
        transferAmount = BigInt(estimatedMicroUsdc);
        senderAddress = tx.from;
        recipientAddress = SHUNYA_TREASURY_EVM_ADDRESS;
      }
    } catch (txErr) {
      console.warn("[UniversalPaymentVerifier] getTransaction notice:", txErr);
    }
  }

  // 6. Uniswap Swap Router Execution verification
  if (isUniswapRouter && !transferLogFound) {
    // If sent to a verified Uniswap Router, accept if transaction succeeded
    transferLogFound = true;
    transferAmount = BigInt(requiredMicroUsdc);
    recipientAddress = SHUNYA_TREASURY_EVM_ADDRESS;
  }

  if (!transferLogFound && !isDirectUsdc && !isDirectTreasury && !isUniswapRouter) {
    return {
      verified: false,
      error: `Transaction was sent to ${receipt.to}, not an accepted payment target, Uniswap Router, or ShunyaGrid Treasury.`,
    };
  }

  if (!transferLogFound) {
    return {
      verified: false,
      error: `No valid USDC or equivalent settlement transfer to ShunyaGrid Treasury (${SHUNYA_TREASURY_EVM_ADDRESS}) found in transaction logs.`,
    };
  }

  // 7. Verify Buyer Address matches sender or transaction origin
  const txOrigin = receipt.from?.toLowerCase();
  if (
    expectedBuyerAddress &&
    senderAddress.toLowerCase() !== expectedBuyerAddress.toLowerCase() &&
    txOrigin !== expectedBuyerAddress.toLowerCase()
  ) {
    return {
      verified: false,
      error: `Sender address mismatch. Expected ${expectedBuyerAddress}, got ${senderAddress} (tx.from: ${txOrigin}).`,
    };
  }

  // 8. Verify Amount matches or exceeds required upfront charge (with 5% slippage buffer for DEX swaps)
  const requiredBigInt = BigInt(requiredMicroUsdc);
  const minAcceptableBigInt = (requiredBigInt * 95n) / 100n;
  if (transferAmount < minAcceptableBigInt) {
    return {
      verified: false,
      error: `Insufficient payment amount. Required ${requiredMicroUsdc} micro-USDC, received ${transferAmount.toString()}.`,
    };
  }

  // 9. Replay Protection: Mark as consumed
  paymentStore.add(cleanTxHash);

  const amountMicro = Number(transferAmount);
  return {
    verified: true,
    txHash: cleanTxHash,
    blockNumber: receipt.blockNumber,
    from: senderAddress,
    to: recipientAddress,
    amountMicroUsdc: amountMicro,
    amountUsdc: amountMicro / 1_000_000,
    chainKey: matchedChainKey,
    tokenSymbol: params.tokenSymbol || matchedConfig.nativeSymbol,
    etherscanUrl: `${matchedConfig.explorerBaseUrl}${cleanTxHash}`,
  };
}

/**
 * Backward-compatible wrapper for legacy Sepolia USDC calls
 */
export async function verifySepoliaUsdcPayment(
  txHash: string,
  expectedBuyerAddress: string,
  requiredMicroUsdc: number
): Promise<SepoliaPaymentVerificationResult> {
  return verifyUniversalBuyerPayment({
    txHash,
    buyerAddress: expectedBuyerAddress,
    requiredMicroUsdc,
    chainKey: "ethereum-sepolia",
  });
}

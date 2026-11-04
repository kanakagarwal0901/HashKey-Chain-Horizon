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
  "0xe08798BaCfec631554b02D126b67788Dac3AbaD6";

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
  payer?: string;
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
    rpcUrl: process.env.HASHKEY_TESTNET_RPC || "https://testnet.hsk.xyz",
    chainId: 133,
    explorerBaseUrl: "https://testnet-explorer.hskchain.net/tx/",
    usdcAddress: "0x054ed45810DbBAb8B27668922D110669c9D88D0a",
    nativeSymbol: "HSK",
    nativeUsdPrice: 0.0894,
    uniswapRouters: [
      "0xBe5dDD447CfeA3Ff43ea636F5FCc75434f6f8108",
      "0x56B8BaF4a417A90202021cBAc6ba983c8f96D6F3",
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

// Standard ERC-20 Transfer Event Topic (keccak256("Transfer(address,address,uint256)"))
export const TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export interface ConsumedPaymentRecord {
  status: "reserved" | "consumed";
  txHash: string;
  listingId?: string;
  payer?: string;
  reservedAt: number;
  consumedAt?: number;
}

// In-Memory & On-Disk Replay Protection Store
export class UniversalPaymentStore {
  private records: Map<string, ConsumedPaymentRecord> = new Map();
  private filePath: string;

  constructor(customFilePath?: string) {
    this.filePath = customFilePath || path.join(process.cwd(), ".data", "consumed_sepolia_txs.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
        if (Array.isArray(raw)) {
          for (const item of raw) {
            if (typeof item === "string") {
              const h = item.toLowerCase();
              this.records.set(h, { status: "consumed", txHash: h, reservedAt: 0, consumedAt: 0 });
            } else if (item && typeof item === "object" && item.txHash) {
              this.records.set(item.txHash.toLowerCase(), item);
            }
          }
        } else if (raw && typeof raw === "object") {
          for (const [k, v] of Object.entries(raw)) {
            const h = k.toLowerCase();
            if (typeof v === "object" && v !== null) {
              this.records.set(h, { ...(v as any), txHash: h });
            } else {
              this.records.set(h, { status: "consumed", txHash: h, reservedAt: 0, consumedAt: 0 });
            }
          }
        }
      }
    } catch {}
  }

  private save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.records.values()), null, 2));
    } catch {}
  }

  public isReservedOrConsumed(txHash: string): boolean {
    return this.records.has(txHash.toLowerCase());
  }

  public getRecord(txHash: string): ConsumedPaymentRecord | undefined {
    return this.records.get(txHash.toLowerCase());
  }

  public reserve(txHash: string, metadata?: { listingId?: string }): { success: boolean; error?: string } {
    const key = txHash.toLowerCase();
    if (this.records.has(key)) {
      const rec = this.records.get(key)!;
      return {
        success: false,
        error:
          rec.status === "consumed"
            ? `Replay Protection: Transaction ${txHash.slice(0, 14)}... has already been used for a previous job.`
            : `Replay Protection: Transaction ${txHash.slice(0, 14)}... is already reserved by an in-flight execution.`,
      };
    }
    this.records.set(key, {
      status: "reserved",
      txHash: key,
      listingId: metadata?.listingId,
      reservedAt: Date.now(),
    });
    this.save();
    return { success: true };
  }

  public release(txHash: string): boolean {
    const key = txHash.toLowerCase();
    const rec = this.records.get(key);
    if (rec && rec.status === "reserved") {
      this.records.delete(key);
      this.save();
      return true;
    }
    return false;
  }

  public consume(txHash: string, binding: { listingId?: string; payer: string }): void {
    const key = txHash.toLowerCase();
    const existing = this.records.get(key);
    this.records.set(key, {
      status: "consumed",
      txHash: key,
      listingId: binding.listingId || existing?.listingId,
      payer: binding.payer ? binding.payer.toLowerCase() : existing?.payer,
      reservedAt: existing?.reservedAt || Date.now(),
      consumedAt: Date.now(),
    });
    this.save();
  }

  public has(txHash: string): boolean {
    return this.isReservedOrConsumed(txHash);
  }

  public add(txHash: string) {
    this.consume(txHash, { payer: "" });
  }

  public clearForTesting() {
    this.records.clear();
  }
}

export const paymentStore = new UniversalPaymentStore();

export interface ParsedPaymentTransfer {
  found: boolean;
  tokenSymbol: string;
  payer: string;
  recipient: string;
  amountMicroUsdc: bigint;
  tokenAddress?: string;
  decimals?: number;
}

export function isTokenWhitelisted(chainKey: string, tokenAddress: string): { whitelisted: boolean; symbol: string; decimals: number } {
  const cfg = PAYMENT_CHAINS[chainKey];
  if (!cfg || !tokenAddress) return { whitelisted: false, symbol: "", decimals: 0 };
  const clean = tokenAddress.toLowerCase();

  if (clean === cfg.usdcAddress.toLowerCase()) {
    return { whitelisted: true, symbol: "USDC", decimals: 6 };
  }
  if (chainKey === "ethereum-sepolia" && clean === SEPOLIA_CIRCLE_USDC_ADDRESS.toLowerCase()) {
    return { whitelisted: true, symbol: "USDC", decimals: 6 };
  }
  return { whitelisted: false, symbol: "", decimals: 0 };
}

/**
 * Pure helper to parse ERC-20 transfer logs with strict token whitelisting and decimals normalization.
 */
export function parseReceiptTransferLogs(
  logs: ReadonlyArray<{ address: string; topics: ReadonlyArray<string>; data: string }>,
  chainKey: string,
  treasuryAddress: string = SHUNYA_TREASURY_EVM_ADDRESS
): ParsedPaymentTransfer {
  if (!logs || !Array.isArray(logs)) {
    return { found: false, tokenSymbol: "", payer: "", recipient: "", amountMicroUsdc: 0n };
  }

  for (const log of logs) {
    if (!log || !log.topics || log.topics.length < 3) continue;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_EVENT_TOPIC.toLowerCase()) continue;

    // Check if token address is whitelisted for this chain
    const whitelist = isTokenWhitelisted(chainKey, log.address);
    if (!whitelist.whitelisted) {
      continue;
    }

    try {
      const fromAddr = ethers.getAddress("0x" + log.topics[1].slice(26));
      const toAddr = ethers.getAddress("0x" + log.topics[2].slice(26));

      // Require Transfer to == treasury
      if (toAddr.toLowerCase() !== treasuryAddress.toLowerCase()) {
        continue;
      }

      const rawValue = BigInt(log.data || "0x0");
      let amountMicroUsdc: bigint;
      if (whitelist.decimals === 6) {
        amountMicroUsdc = rawValue;
      } else if (whitelist.decimals > 6) {
        amountMicroUsdc = rawValue / (10n ** BigInt(whitelist.decimals - 6));
      } else {
        amountMicroUsdc = rawValue * (10n ** BigInt(6 - whitelist.decimals));
      }

      return {
        found: true,
        tokenSymbol: whitelist.symbol,
        payer: fromAddr,
        recipient: toAddr,
        amountMicroUsdc,
        tokenAddress: ethers.getAddress(log.address),
        decimals: whitelist.decimals,
      };
    } catch {
      continue;
    }
  }

  return {
    found: false,
    tokenSymbol: "",
    payer: "",
    recipient: "",
    amountMicroUsdc: 0n,
  };
}

/**
 * Universal Multi-Chain & Multi-Currency Buyer Payment Verifier.
 * Verifies on-chain transactions across Ethereum Sepolia, Arbitrum Sepolia, Base Sepolia, HashKey Testnet.
 * Accepts verified native HSK / ETH or whitelisted Circle USDC sent directly to ShunyaGrid Treasury.
 */
export async function verifyUniversalBuyerPayment(params: {
  txHash: string;
  buyerAddress?: string;
  requiredMicroUsdc: number;
  chainKey?: string;
  tokenSymbol?: string;
  listingId?: string;
}): Promise<UniversalPaymentVerificationResult> {
  const cleanTxHash = (params.txHash || "").trim().toLowerCase();
  const expectedBuyerAddress = params.buyerAddress ? params.buyerAddress.trim() : "";
  const requiredMicroUsdc = params.requiredMicroUsdc;

  // 1. Format validation: must be 0x-prefixed 32-byte hex string (66 characters total)
  if (!/^0x[0-9a-fA-F]{64}$/.test(cleanTxHash)) {
    return {
      verified: false,
      error: "Invalid Ethereum transaction hash format (expected 66-character 0x... string)",
    };
  }

  // 2. Replay/TOCTOU Protection: Synchronously reserve before any await!
  const reservation = paymentStore.reserve(cleanTxHash, { listingId: params.listingId });
  if (!reservation.success) {
    return {
      verified: false,
      error: reservation.error || "Transaction already reserved or consumed",
    };
  }

  let matchedChainKey = "";
  let matchedConfig: ChainPaymentConfig | null = null;
  let receipt: ethers.TransactionReceipt | null = null;
  let provider: ethers.JsonRpcProvider | null = null;
  let isTransientFailure = false;

  try {
    const candidateChainKeys: string[] = [];
    if (params.chainKey && PAYMENT_CHAINS[params.chainKey]) {
      candidateChainKeys.push(params.chainKey);
    }
    for (const k of Object.keys(PAYMENT_CHAINS)) {
      if (!candidateChainKeys.includes(k)) candidateChainKeys.push(k);
    }

    for (const key of candidateChainKeys) {
      const cfg = PAYMENT_CHAINS[key];
      try {
        const p = new ethers.JsonRpcProvider(cfg.rpcUrl, cfg.chainId, { staticNetwork: true });
        let r = await p.getTransactionReceipt(cleanTxHash);
        if (!r) {
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
      } catch (rpcErr) {
        // RPC network failure on this candidate endpoint
      }
    }

    if (!receipt || !matchedConfig || !provider) {
      isTransientFailure = true;
      paymentStore.release(cleanTxHash);
      return {
        verified: false,
        error: `Transaction receipt not yet confirmed on ${params.chainKey || "supported EVM testnets"}. Please wait for block confirmation.`,
      };
    }

    // Receipt status check: status must be 1 (success)
    if (receipt.status !== 1) {
      return {
        verified: false,
        error: `Transaction failed on ${matchedConfig.name} (reverted on-chain).`,
      };
    }

    // Require >= 1 confirmation
    let currentBlockNumber: number;
    try {
      currentBlockNumber = await provider.getBlockNumber();
    } catch {
      isTransientFailure = true;
      paymentStore.release(cleanTxHash);
      return {
        verified: false,
        error: "Failed to query current block number from RPC provider for confirmation check.",
      };
    }

    const confirmations = currentBlockNumber - receipt.blockNumber + 1;
    if (confirmations < 1) {
      isTransientFailure = true;
      paymentStore.release(cleanTxHash);
      return {
        verified: false,
        error: `Transaction has ${confirmations} confirmations; at least 1 confirmation required.`,
      };
    }

    // Require tx block timestamp within the last hour
    let block: ethers.Block | null;
    try {
      block = await provider.getBlock(receipt.blockNumber);
    } catch {
      isTransientFailure = true;
      paymentStore.release(cleanTxHash);
      return {
        verified: false,
        error: "Failed to query block timestamp from RPC provider.",
      };
    }

    if (!block) {
      isTransientFailure = true;
      paymentStore.release(cleanTxHash);
      return {
        verified: false,
        error: "Block data not found on RPC provider.",
      };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const ONE_HOUR = 3600;
    if (block.timestamp < nowSeconds - ONE_HOUR) {
      return {
        verified: false,
        error: `Transaction block timestamp (${new Date(block.timestamp * 1000).toISOString()}) is older than 1 hour.`,
      };
    }
    if (block.timestamp > nowSeconds + 300) {
      return {
        verified: false,
        error: "Transaction block timestamp is in the future.",
      };
    }

    // 3. Confirm target recipient or contract
    const targetTo = receipt.to?.toLowerCase() || "";
    const isDirectTreasury = targetTo === SHUNYA_TREASURY_EVM_ADDRESS.toLowerCase();

    // 4. Parse Transfer(from, to, value) Event Logs from whitelisted tokens
    const parsedTransfer = parseReceiptTransferLogs(receipt.logs, matchedChainKey);

    let transferLogFound = false;
    let transferAmount = 0n;
    let verifiedPayer = "";
    let recipientAddress = "";
    let resolvedTokenSymbol = "";

    if (parsedTransfer.found) {
      transferLogFound = true;
      verifiedPayer = parsedTransfer.payer;
      recipientAddress = parsedTransfer.recipient;
      transferAmount = parsedTransfer.amountMicroUsdc;
      resolvedTokenSymbol = parsedTransfer.tokenSymbol;
    }

    // 5. Direct Native HSK / ETH Payment to Treasury check (if no ERC-20 log)
    // Finding 4: Require tx.to == treasury exactly for native payments. Empty to (contract creation) must not count.
    if (!transferLogFound && isDirectTreasury) {
      try {
        const tx = await provider.getTransaction(cleanTxHash);
        if (tx && tx.to && tx.to.toLowerCase() === SHUNYA_TREASURY_EVM_ADDRESS.toLowerCase() && tx.value > 0n) {
          const nativeVal = parseFloat(ethers.formatEther(tx.value));
          const estimatedMicroUsdc = Math.round(nativeVal * matchedConfig.nativeUsdPrice * 1_000_000);
          transferLogFound = true;
          transferAmount = BigInt(estimatedMicroUsdc);
          verifiedPayer = ethers.getAddress(tx.from);
          recipientAddress = SHUNYA_TREASURY_EVM_ADDRESS;
          resolvedTokenSymbol = matchedConfig.nativeSymbol;
        }
      } catch (txErr) {
        console.warn("[UniversalPaymentVerifier] getTransaction notice:", txErr);
      }
    }

    // Finding 3: Uniswap router bypass removed.

    if (!transferLogFound) {
      return {
        verified: false,
        error: `No valid payment to ShunyaGrid Treasury (${SHUNYA_TREASURY_EVM_ADDRESS}) found. Native payments must be sent directly to treasury; ERC-20 payments must transfer whitelisted USDC to treasury.`,
      };
    }

    // 6. Verify Buyer Address matches payer if buyerAddress was provided
    // Finding 6: Payer = tx.from (ERC-20: Transfer from). If body.buyerAddress is given and differs -> 402
    if (expectedBuyerAddress) {
      if (verifiedPayer.toLowerCase() !== expectedBuyerAddress.toLowerCase()) {
        return {
          verified: false,
          error: `Sender address mismatch. Expected buyer address ${expectedBuyerAddress}, but payment transaction payer was ${verifiedPayer}.`,
        };
      }
    }

    // 7. Verify Amount matches or exceeds required upfront charge (with 5% slippage buffer for native rate flux)
    const requiredBigInt = BigInt(requiredMicroUsdc);
    const minAcceptableBigInt = (requiredBigInt * 95n) / 100n;
    if (transferAmount < minAcceptableBigInt) {
      return {
        verified: false,
        error: `Insufficient payment amount. Required ${requiredMicroUsdc} micro-USDC, received ${transferAmount.toString()} micro-USDC.`,
      };
    }

    // 8. Replay Protection: Bind consumed record to {listingId, payer}
    paymentStore.consume(cleanTxHash, {
      listingId: params.listingId,
      payer: verifiedPayer,
    });

    const amountMicro = Number(transferAmount);
    return {
      verified: true,
      txHash: cleanTxHash,
      blockNumber: receipt.blockNumber,
      from: verifiedPayer,
      payer: verifiedPayer,
      to: recipientAddress,
      amountMicroUsdc: amountMicro,
      amountUsdc: amountMicro / 1_000_000,
      chainKey: matchedChainKey,
      tokenSymbol: resolvedTokenSymbol || params.tokenSymbol || matchedConfig.nativeSymbol,
      etherscanUrl: `${matchedConfig.explorerBaseUrl}${cleanTxHash}`,
    };
  } catch (error: any) {
    if (!isTransientFailure) {
      paymentStore.release(cleanTxHash);
    }
    return {
      verified: false,
      error: `Payment verification failed due to RPC error: ${error?.message || String(error)}`,
    };
  }
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

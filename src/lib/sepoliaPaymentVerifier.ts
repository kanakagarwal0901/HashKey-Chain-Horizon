import fs from "fs";
import path from "path";
import { ethers } from "ethers";

// Official Circle Testnet USDC on Ethereum Sepolia
export const SEPOLIA_CIRCLE_USDC_ADDRESS =
  process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS ||
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

// ShunyaGrid Protocol Treasury EVM Address (derived from Hedera Operator ECDSA key)
export const SHUNYA_TREASURY_EVM_ADDRESS =
  process.env.NEXT_PUBLIC_SHUNYA_TREASURY_EVM_ADDRESS ||
  "0x9b3b7375b0591E8A304A8f66D11186Fb07672625";

// Default Sepolia RPC URL
const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  process.env.SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

export interface SepoliaPaymentVerificationResult {
  verified: boolean;
  error?: string;
  txHash?: string;
  blockNumber?: number;
  from?: string;
  to?: string;
  amountMicroUsdc?: number;
  amountUsdc?: number;
  etherscanUrl?: string;
}

// In-Memory & On-Disk Replay Protection Store
class SepoliaPaymentStore {
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
          this.consumedTxs = new Set(data);
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

const paymentStore = new SepoliaPaymentStore();

// Standard ERC-20 Transfer Event Topic (keccak256("Transfer(address,address,uint256)"))
const TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/**
 * Verifies an authentic on-chain Circle USDC payment on Ethereum Sepolia.
 * @param txHash The 0x transaction hash from MetaMask on Sepolia
 * @param expectedBuyerAddress The connected buyer wallet address
 * @param requiredMicroUsdc Upfront deposit required (in 6-decimal micro-USDC, e.g. 241920)
 */
export async function verifySepoliaUsdcPayment(
  txHash: string,
  expectedBuyerAddress: string,
  requiredMicroUsdc: number
): Promise<SepoliaPaymentVerificationResult> {
  const cleanTxHash = txHash.trim();
  if (!cleanTxHash.startsWith("0x") || cleanTxHash.length !== 66) {
    return { verified: false, error: "Invalid Ethereum transaction hash format" };
  }

  // 1. Replay Protection: Check if transaction has already been consumed
  if (paymentStore.has(cleanTxHash)) {
    return {
      verified: false,
      error: `Replay Protection: Transaction ${cleanTxHash.slice(0, 14)}... has already been used for a previous job.`,
    };
  }

  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

    // 2. Fetch Transaction Receipt on Sepolia
    const receipt = await provider.getTransactionReceipt(cleanTxHash);
    if (!receipt) {
      return {
        verified: false,
        error: "Transaction receipt not yet confirmed on Ethereum Sepolia. Please wait for block confirmation.",
      };
    }

    if (receipt.status !== 1) {
      return { verified: false, error: "Transaction failed on Ethereum Sepolia (reverted on-chain)." };
    }

    // 3. Confirm target contract is Circle USDC
    if (receipt.to?.toLowerCase() !== SEPOLIA_CIRCLE_USDC_ADDRESS.toLowerCase()) {
      return {
        verified: false,
        error: `Transaction was sent to ${receipt.to}, not official Circle Sepolia USDC (${SEPOLIA_CIRCLE_USDC_ADDRESS}).`,
      };
    }

    // 4. Parse Transfer(from, to, value) Event Logs
    let transferLogFound = false;
    let transferAmount = 0n;
    let senderAddress = "";
    let recipientAddress = "";

    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() === SEPOLIA_CIRCLE_USDC_ADDRESS.toLowerCase() &&
        log.topics[0] === TRANSFER_EVENT_TOPIC &&
        log.topics.length >= 3
      ) {
        // topics[1] = from (32 bytes padded)
        senderAddress = ethers.getAddress("0x" + log.topics[1].slice(26));
        // topics[2] = to (32 bytes padded)
        recipientAddress = ethers.getAddress("0x" + log.topics[2].slice(26));
        // data = value (uint256)
        transferAmount = BigInt(log.data);

        // Check if recipient is our Protocol Treasury
        if (recipientAddress.toLowerCase() === SHUNYA_TREASURY_EVM_ADDRESS.toLowerCase()) {
          transferLogFound = true;
          break;
        }
      }
    }

    if (!transferLogFound) {
      return {
        verified: false,
        error: `No valid Circle USDC transfer to ShunyaGrid Treasury (${SHUNYA_TREASURY_EVM_ADDRESS}) found in transaction logs.`,
      };
    }

    // 5. Verify Buyer Address matches sender
    if (
      expectedBuyerAddress &&
      senderAddress.toLowerCase() !== expectedBuyerAddress.toLowerCase()
    ) {
      return {
        verified: false,
        error: `Sender address mismatch. Expected ${expectedBuyerAddress}, got ${senderAddress}.`,
      };
    }

    // 6. Verify Amount matches or exceeds required upfront charge
    const requiredBigInt = BigInt(requiredMicroUsdc);
    if (transferAmount < requiredBigInt) {
      return {
        verified: false,
        error: `Insufficient payment amount. Required ${requiredMicroUsdc} micro-USDC, received ${transferAmount.toString()}.`,
      };
    }

    // 7. Mark as consumed in Replay Store
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
      etherscanUrl: `https://sepolia.etherscan.io/tx/${cleanTxHash}`,
    };
  } catch (err: any) {
    console.error("[SepoliaPaymentVerifier] Error verifying Sepolia payment:", err);
    return {
      verified: false,
      error: `Sepolia RPC verification error: ${err.message}`,
    };
  }
}

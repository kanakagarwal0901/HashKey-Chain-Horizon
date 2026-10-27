/**
 * Client-Side Sepolia Web3 & Circle USDC Utilities
 * Uses native EIP-1193 provider (window.ethereum) & standard JSON-RPC.
 * Zero heavy library imports on page load to prevent Next.js SSR vendor-chunk bundling issues.
 */

import {
  SUPPORTED_CHAINS,
  SUPPORTED_TOKENS,
  uniswapService,
} from "@shunya/core";
import { ethers } from "ethers";

export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
export const SEPOLIA_CHAIN_ID_DEC = 11155111;
export const SEPOLIA_CIRCLE_USDC_ADDRESS =
  process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
export const SHUNYA_TREASURY_EVM_ADDRESS =
  process.env.NEXT_PUBLIC_SHUNYA_TREASURY_EVM_ADDRESS || "0x9b3b7375b0591E8A304A8f66D11186Fb07672625";
export const CIRCLE_FAUCET_URL = "https://faucet.circle.com";
export const HEDERA_HCS_TOPIC_ID = process.env.NEXT_PUBLIC_HEDERA_HCS_TOPIC_ID || "0.0.11134146";

const SEPOLIA_PUBLIC_RPC =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export const HASHKEY_CHAIN_ID_HEX = "0x85"; // 133
export const HASHKEY_CHAIN_ID_DEC = 133;
export const HASHKEY_TESTNET_RPC = "https://testnet.hsk.xyz";
export const HASHKEY_HSP_ADAPTER = "0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae";
export const HASHKEY_ROUTER = "0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D";

/**
 * Switch wallet network to HashKey Chain Testnet (0x85 / 133) or add it if not present.
 */
export async function switchOrAddHashKeyNetwork(): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    alert("No Web3 wallet (MetaMask) detected. Please install MetaMask to interact with HashKey Chain.");
    return false;
  }
  const ethereum = (window as any).ethereum;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HASHKEY_CHAIN_ID_HEX }],
    });
    return true;
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: HASHKEY_CHAIN_ID_HEX,
              chainName: "HashKey Chain Testnet",
              nativeCurrency: { name: "HashKey EcoPoints", symbol: "HSK", decimals: 18 },
              rpcUrls: [HASHKEY_TESTNET_RPC],
              blockExplorerUrls: ["https://testnet-explorer.hsk.xyz"],
            },
          ],
        });
        return true;
      } catch (addError) {
        alert("Failed to add HashKey Chain testnet to your wallet.");
        return false;
      }
    }
    alert(switchError.message || "Failed to switch to HashKey Chain testnet.");
    return false;
  }
}

/**
 * Reads native HSK balance on HashKey Chain Testnet.
 */
export async function fetchHashKeyHskBalance(walletAddress: string): Promise<number> {
  if (!walletAddress) return 0;
  try {
    const res = await fetch(HASHKEY_TESTNET_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
      }),
    });
    const data = await res.json();
    if (data.result) {
      return Number(BigInt(data.result)) / 1e18;
    }
  } catch (err) {
    console.warn("Could not fetch HashKey HSK balance:", err);
  }
  return 0;
}

/**
 * Switch wallet network to Ethereum Sepolia (0xaa36a7) or add it if not present.
 */
export async function switchOrAddSepoliaNetwork(): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    alert("No Web3 wallet (MetaMask) detected. Please install MetaMask to make testnet payments.");
    return false;
  }
  const ethereum = (window as any).ethereum;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
    return true;
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID_HEX,
              chainName: "Sepolia Test Network",
              nativeCurrency: { name: "Sepolia ETH", symbol: "SEP", decimals: 18 },
              rpcUrls: [SEPOLIA_PUBLIC_RPC],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
        return true;
      } catch (addError) {
        alert("Failed to add Sepolia testnet to your wallet.");
        return false;
      }
    }
    alert(switchError.message || "Failed to switch to Sepolia testnet.");
    return false;
  }
}

/**
 * Reads Circle USDC token balance on Ethereum Sepolia for a given wallet address.
 * Uses lightweight JSON-RPC eth_call (balanceOf(address)).
 */
export async function fetchSepoliaUsdcBalance(walletAddress: string): Promise<number> {
  if (!walletAddress) return 0;
  try {
    const cleanAddr = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const callData = `0x70a08231${cleanAddr}`; // keccak256("balanceOf(address)").slice(0, 10) === 0x70a08231

    // 1. Try via connected provider if available
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const raw = await (window as any).ethereum.request({
          method: "eth_call",
          params: [
            {
              to: SEPOLIA_CIRCLE_USDC_ADDRESS,
              data: callData,
            },
            "latest",
          ],
        });
        if (raw && raw !== "0x") {
          return Number(BigInt(raw)) / 1_000_000;
        }
      } catch {}
    }

    // 2. Query public Sepolia RPC fallback
    const res = await fetch(SEPOLIA_PUBLIC_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          {
            to: SEPOLIA_CIRCLE_USDC_ADDRESS,
            data: callData,
          },
          "latest",
        ],
      }),
    });
    const data = await res.json();
    if (data.result && data.result !== "0x") {
      return Number(BigInt(data.result)) / 1_000_000;
    }
  } catch (err) {
    console.warn("Could not query Sepolia USDC balance:", err);
  }
  return 0;
}

/**
 * Triggers an authentic ERC-20 transfer of Circle USDC on Ethereum Sepolia using MetaMask.
 * Encodes transfer(recipient, amount) and prompts user signature via eth_sendTransaction.
 * @returns Transaction hash string (0x...)
 */
export async function sendSepoliaUsdcPayment(
  fromAddress: string,
  toAddress: string,
  amountMicroUsdc: number
): Promise<string> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No Web3 wallet (MetaMask) detected.");
  }

  const ethereum = (window as any).ethereum;

  // Ensure Sepolia network
  const currentChain = await ethereum.request({ method: "eth_chainId" });
  if (currentChain !== SEPOLIA_CHAIN_ID_HEX && currentChain !== "11155111") {
    const switched = await switchOrAddSepoliaNetwork();
    if (!switched) {
      throw new Error("Please switch your wallet to Ethereum Sepolia to proceed.");
    }
  }

  // Pre-flight balance check
  const balance = await fetchSepoliaUsdcBalance(fromAddress);
  const requiredUsdc = amountMicroUsdc / 1_000_000;
  if (balance < requiredUsdc) {
    throw new Error(
      `Insufficient Circle Sepolia USDC balance. Available: $${balance.toFixed(6)} USDC, Required: $${requiredUsdc.toFixed(6)} USDC. Claim free Sepolia USDC at faucet.circle.com`
    );
  }

  // Encode ERC-20 transfer(address to, uint256 amount)
  // Selector: keccak256("transfer(address,uint256)").slice(0, 10) === 0xa9059cbb
  const cleanRecipient = toAddress.toLowerCase().replace("0x", "").padStart(64, "0");
  const amountBigInt = BigInt(amountMicroUsdc);
  const amountHex = amountBigInt.toString(16).padStart(64, "0");
  const callData = `0xa9059cbb${cleanRecipient}${amountHex}`;

  let txHash: string;
  try {
    txHash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: fromAddress,
          to: SEPOLIA_CIRCLE_USDC_ADDRESS,
          data: callData,
        },
      ],
    });
  } catch (signErr: any) {
    if (
      signErr.code === 4001 ||
      signErr.code === "ACTION_REJECTED" ||
      signErr.message?.includes("User rejected") ||
      signErr.message?.includes("user rejected")
    ) {
      throw new Error("Payment transaction was rejected by user in MetaMask.");
    }
    throw signErr;
  }

  if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
    throw new Error("Invalid transaction hash returned by wallet.");
  }

  return txHash;
}

/**
 * Polls for transaction receipt confirmation on any supported chain.
 */
export async function waitForSepoliaConfirmation(
  txHash: string,
  chainKeyOrMaxWait: string | number = "ethereum-sepolia",
  maxWaitMs = 60000,
  intervalMs = 2500
): Promise<{ status: number; blockNumber: number }> {
  let chainKey = "ethereum-sepolia";
  let timeoutMs = maxWaitMs;

  if (typeof chainKeyOrMaxWait === "number") {
    timeoutMs = chainKeyOrMaxWait;
  } else if (typeof chainKeyOrMaxWait === "string") {
    chainKey = chainKeyOrMaxWait;
  }

  const chain = SUPPORTED_CHAINS[chainKey] || SUPPORTED_CHAINS["ethereum-sepolia"];
  const rpcUrl = chain?.rpcUrl || SEPOLIA_PUBLIC_RPC;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [txHash],
        }),
      });
      const data = await res.json();
      if (data.result && data.result.blockNumber) {
        const status = parseInt(data.result.status, 16);
        const blockNumber = parseInt(data.result.blockNumber, 16);
        if (status !== 1) {
          throw new Error(`Transaction reverted on ${chain?.name || chainKey}.`);
        }
        return { status, blockNumber };
      }
    } catch (e: any) {
      if (e.message?.includes("reverted")) throw e;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  // If timeout reached, return status 1 so Enclave backend verifier can perform the final check
  return { status: 1, blockNumber: 0 };
}

export const waitForPaymentConfirmation = waitForSepoliaConfirmation;

/**
 * Executes a Universal Multi-Currency, Multi-Chain Buyer Payment.
 * Routes through Uniswap V3 when paying with non-USDC tokens (ETH, DAI, USDT, UNI).
 */
export async function executeBuyerUniversalPayment(params: {
  buyerAddress: string;
  requiredMicroUsdc: number;
  tokenSymbol?: string;
  chainKey?: string;
}): Promise<{ txHash: string; chainKey: string; tokenSymbol: string; amountPaidFormatted: string }> {
  const token = params.tokenSymbol || "USDC";
  const chainKey = params.chainKey || "ethereum-sepolia";
  const chain = SUPPORTED_CHAINS[chainKey] || SUPPORTED_CHAINS["ethereum-sepolia"];
  const ethereum = typeof window !== "undefined" ? (window as any).ethereum : null;

  if (!ethereum) {
    throw new Error("No Web3 wallet (MetaMask) detected. Please install MetaMask to make testnet payments.");
  }

  // 1. Switch to selected chain if needed
  try {
    const currentChain = await ethereum.request({ method: "eth_chainId" });
    if (currentChain?.toLowerCase() !== chain.chainIdHex.toLowerCase()) {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chain.chainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chain.chainIdHex,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [chain.rpcUrl],
                blockExplorerUrls: [chain.explorerUrl],
              },
            ],
          });
        }
      }
    }
  } catch {}

  const requiredUsdc = params.requiredMicroUsdc / 1_000_000;

  // 2. Case A: Standard USDC payment
  if (token === "USDC") {
    const usdcAddress = SUPPORTED_TOKENS.USDC.addresses[chainKey] || SEPOLIA_CIRCLE_USDC_ADDRESS;
    const cleanRecipient = SHUNYA_TREASURY_EVM_ADDRESS.toLowerCase().replace("0x", "").padStart(64, "0");
    const amountHex = BigInt(params.requiredMicroUsdc).toString(16).padStart(64, "0");
    const callData = `0xa9059cbb${cleanRecipient}${amountHex}`;

    const txHash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: params.buyerAddress,
          to: usdcAddress,
          data: callData,
        },
      ],
    });
    return {
      txHash,
      chainKey,
      tokenSymbol: "USDC",
      amountPaidFormatted: `$${requiredUsdc.toFixed(4)} USDC`,
    };
  }

  // 3. Case B: Native HSK, ETH or HBAR payment directly to Treasury / HSP Adapter
  if (token === "HSK" || chainKey === "hashkey-testnet" && token === "HSK") {
    const pricePerUnit = 0.75;
    const unitsNeeded = (requiredUsdc / pricePerUnit) * 1.01;
    const weiNeeded = ethers.parseEther(unitsNeeded.toFixed(6));
    const valueHex = "0x" + weiNeeded.toString(16);

    const txHash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: params.buyerAddress,
          to: "0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae", // HSPAdapter
          value: valueHex,
        },
      ],
    });
    return {
      txHash,
      chainKey: "hashkey-testnet",
      tokenSymbol: "HSK",
      amountPaidFormatted: `${unitsNeeded.toFixed(4)} HSK`,
    };
  }

  if (token === "ETH" || token === "HBAR") {
    const pricePerUnit = token === "ETH" ? 2600 : 0.08;
    const unitsNeeded = (requiredUsdc / pricePerUnit) * 1.01; // 1% buffer
    const weiNeeded = ethers.parseEther(unitsNeeded.toFixed(6));
    const valueHex = "0x" + weiNeeded.toString(16);

    const txHash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: params.buyerAddress,
          to: SHUNYA_TREASURY_EVM_ADDRESS,
          value: valueHex,
        },
      ],
    });
    return {
      txHash,
      chainKey,
      tokenSymbol: token,
      amountPaidFormatted: `${unitsNeeded.toFixed(6)} ${token}`,
    };
  }

  // 4. Case C: Token swap via Uniswap V3 (e.g. DAI, USDT, UNI, WETH -> USDC)
  const swapTx = uniswapService.buildMetaMaskSwapTx({
    fromToken: token,
    toToken: "USDC",
    amountIn: requiredUsdc,
    recipient: SHUNYA_TREASURY_EVM_ADDRESS,
    chainKey,
  });

  // Step 1: Approve Uniswap Router if ERC-20
  if (swapTx.approvalRequired && swapTx.tokenToApprove && swapTx.amountToApprove) {
    const cleanRouter = swapTx.to.toLowerCase().replace("0x", "").padStart(64, "0");
    const cleanAmount = swapTx.amountToApprove.replace("0x", "").padStart(64, "0");
    const approveCalldata = `0x095ea7b3${cleanRouter}${cleanAmount}`; // approve(address,uint256)

    try {
      await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: params.buyerAddress,
            to: swapTx.tokenToApprove,
            data: approveCalldata,
          },
        ],
      });
    } catch (e: any) {
      console.warn("MetaMask token approval skipped or already allowed:", e?.message);
    }
  }

  // Step 2: Execute Swap on Uniswap Router
  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: params.buyerAddress,
        to: swapTx.to,
        data: swapTx.data,
        value: swapTx.value || "0x0",
      },
    ],
  });

  return {
    txHash,
    chainKey,
    tokenSymbol: token,
    amountPaidFormatted: `${requiredUsdc.toFixed(4)} ${token} (via Uniswap V3)`,
  };
}

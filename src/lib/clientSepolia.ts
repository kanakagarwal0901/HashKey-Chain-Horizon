/**
 * Client-Side Sepolia Web3 & Circle USDC Utilities
 * Uses native EIP-1193 provider (window.ethereum) & standard JSON-RPC.
 * Zero heavy library imports on page load to prevent Next.js SSR vendor-chunk bundling issues.
 */

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
 * Polls for transaction receipt confirmation on Ethereum Sepolia.
 */
export async function waitForSepoliaConfirmation(
  txHash: string,
  maxWaitMs = 60000,
  intervalMs = 2500
): Promise<{ status: number; blockNumber: number }> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(SEPOLIA_PUBLIC_RPC, {
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
          throw new Error("Transaction reverted on Ethereum Sepolia.");
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

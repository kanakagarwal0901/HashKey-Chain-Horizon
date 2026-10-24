"use client";

import { useState, useEffect } from "react";
import {
  ArrowRightLeft,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Coins,
  Wallet,
  Sparkles,
  Layers,
  PlusCircle,
  Network,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ArcBridgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableUsdcEarnings?: number;
  sellerHederaAccountId?: string;
  onSweepSuccess?: () => void;
  onRefresh?: () => void;
}

export const SGUSDC_EVM_CONTRACT = "0x0000000000000000000000000000000000a9e4c1"; // Token 0.0.11134145

interface TokenOption {
  symbol: string;
  name: string;
  decimals: number;
  iconBg: string;
  isNative?: boolean;
}

const SUPPORTED_TARGET_TOKENS: TokenOption[] = [
  { symbol: "USDC", name: "USD Coin", decimals: 6, iconBg: "bg-blue-500/20 text-blue-400" },
  { symbol: "ETH", name: "Ethereum", decimals: 18, isNative: true, iconBg: "bg-purple-500/20 text-purple-400" },
  { symbol: "HBAR", name: "Hedera HBAR", decimals: 18, isNative: true, iconBg: "bg-emerald-500/20 text-emerald-400" },
  { symbol: "DAI", name: "Dai Stablecoin", decimals: 18, iconBg: "bg-amber-500/20 text-amber-400" },
  { symbol: "USDT", name: "Tether USD", decimals: 6, iconBg: "bg-teal-500/20 text-teal-400" },
  { symbol: "UNI", name: "Uniswap", decimals: 18, iconBg: "bg-pink-500/20 text-pink-400" },
];

const SUPPORTED_CHAINS = [
  { id: "hedera-testnet", name: "Hedera Testnet (EVM)", chainId: 296, hexId: "0x128" },
  { id: "ethereum-sepolia", name: "Ethereum Sepolia", chainId: 11155111, hexId: "0xaa36a7" },
  { id: "arbitrum-sepolia", name: "Arbitrum Sepolia", chainId: 421614, hexId: "0x66eee" },
  { id: "base-sepolia", name: "Base Sepolia", chainId: 84532, hexId: "0x14a34" },
];

export default function ArcBridgeDrawer({
  isOpen,
  onClose,
  availableUsdcEarnings = 1.0,
  sellerHederaAccountId = "",
  onSweepSuccess,
  onRefresh,
}: ArcBridgeDrawerProps) {
  const { walletAddress } = useAuth();
  const [selectedToken, setSelectedToken] = useState<string>("USDC");
  const [selectedChain, setSelectedChain] = useState<string>("hedera-testnet");
  const [sourceAccountId, setSourceAccountId] = useState<string>(sellerHederaAccountId || "");
  const [sweepAmount, setSweepAmount] = useState<string>(availableUsdcEarnings.toFixed(5));
  const [destinationEvmAddress, setDestinationEvmAddress] = useState<string>(
    walletAddress || "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444"
  );
  const [isBridging, setIsBridging] = useState<boolean>(false);
  const [addedTokenSuccess, setAddedTokenSuccess] = useState<boolean>(false);
  const [addedNetworkSuccess, setAddedNetworkSuccess] = useState<boolean>(false);

  // Derived balance constraint checks
  const currentAvailable = Number((availableUsdcEarnings ?? 0).toFixed(6));
  const parsedAmount = parseFloat(sweepAmount);
  const isZeroBalance = currentAvailable <= 0;
  const isExceedingBalance = !isNaN(parsedAmount) && parsedAmount > currentAvailable + 0.000001;
  const isInvalidAmount = isNaN(parsedAmount) || parsedAmount <= 0;

  useEffect(() => {
    if (sellerHederaAccountId) {
      setSourceAccountId(sellerHederaAccountId);
    }
  }, [sellerHederaAccountId]);

  // When drawer opens, immediately fetch latest balance
  useEffect(() => {
    if (isOpen && onRefresh) {
      onRefresh();
    }
  }, [isOpen]);

  // Live Uniswap Quote State
  const [quotePreview, setQuotePreview] = useState<{
    expectedOut: number;
    rate: number;
    router: string;
    feeTier: string;
    loading: boolean;
  }>({
    expectedOut: 1.0,
    rate: 1.0,
    router: "Uniswap-V3",
    feeTier: "0.3%",
    loading: false,
  });

  useEffect(() => {
    if (availableUsdcEarnings !== undefined) {
      setSweepAmount(availableUsdcEarnings > 0 ? availableUsdcEarnings.toFixed(5) : "0.00000");
    }
  }, [availableUsdcEarnings]);

  useEffect(() => {
    if (walletAddress) {
      setDestinationEvmAddress(walletAddress);
    }
  }, [walletAddress]);

  // Fetch live Uniswap quote when amount, target token, or chain changes
  useEffect(() => {
    let isCancelled = false;
    const fetchQuote = async () => {
      const parsed = parseFloat(sweepAmount);
      if (isNaN(parsed) || parsed <= 0) return;

      setQuotePreview((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch(
          `/api/uniswap/quote?from=USDC&to=${selectedToken}&amount=${parsed}&chainId=${selectedChain}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.quote && !isCancelled) {
            setQuotePreview({
              expectedOut: data.quote.expectedAmountOut,
              rate: data.quote.rate,
              router: data.quote.sourceDex || "Uniswap-V3",
              feeTier: "0.3%",
              loading: false,
            });
          }
        }
      } catch (e) {
        console.warn("Quote fetch error:", e);
      } finally {
        if (!isCancelled) {
          setQuotePreview((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    fetchQuote();
    return () => {
      isCancelled = true;
    };
  }, [sweepAmount, selectedToken, selectedChain]);

  const [bridgeResult, setBridgeResult] = useState<{
    txId: string;
    hashscanUrl: string;
    settledAmount: number;
    currency: string;
    swappedToken: string;
    swappedAmount: number;
    dexRouter?: string;
    dexRate?: number;
    recipientAddress: string;
    blockNumber?: number;
    gasSentHbar?: number;
    hcsSequenceNumber?: number;
  } | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSweepEarnings = async () => {
    setIsBridging(true);
    setBridgeError(null);
    setBridgeResult(null);

    try {
      const parsedAmount = parseFloat(sweepAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Invalid sweep amount: Please specify an amount greater than 0.");
      }

      if (isZeroBalance) {
        throw new Error("Cannot sweep: Your available Hedera USDC balance is $0.000000. You cannot sweep if your balance is 0.");
      }

      if (isExceedingBalance) {
        throw new Error(
          `Cannot sweep $${parsedAmount.toFixed(6)} USDC: Amount cannot be greater than the current balance of $${currentAvailable.toFixed(6)} USDC.`
        );
      }

      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethAddressRegex.test(destinationEvmAddress.trim())) {
        throw new Error("Invalid recipient address: Must be a connected 42-character Ethereum EVM address (0x...).");
      }

      const cleanSourceAccount = (sourceAccountId || sellerHederaAccountId || "").trim();
      if (!cleanSourceAccount) {
        throw new Error("Missing Hedera Account ID: Please manually fill the Hedera Payout Account ID (0.0.xxxxx) to sweep funds from.");
      }
      const hederaRegex = /^0\.0\.\d+$/;
      if (!hederaRegex.test(cleanSourceAccount)) {
        throw new Error("Invalid Hedera Account ID format: Must be 0.0.xxxxx (e.g. 0.0.11145557).");
      }

      const res = await fetch("/api/bridge/cctp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceChain: "hedera-testnet",
          destinationChain: selectedChain,
          sourceAccount: cleanSourceAccount,
          recipientAddress: destinationEvmAddress.trim(),
          amountUsdc: parsedAmount,
          targetToken: selectedToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Sweep transfer failed.");
      }

      const bridgeTx = data.bridgeTx || {};
      const txHash = data.sourceBurnTxId || bridgeTx.evmTxHash || bridgeTx.txHash;
      const scanUrl =
        data.hashscanUrl ||
        bridgeTx.hashscanUrl ||
        `https://hashscan.io/testnet/transaction/${txHash}`;

      setBridgeResult({
        txId: txHash,
        hashscanUrl: scanUrl,
        settledAmount: parsedAmount,
        currency: "USDC",
        swappedToken: data.swappedToken || selectedToken,
        swappedAmount: data.swappedAmount || quotePreview.expectedOut,
        dexRouter: data.dexRouter || "Uniswap V3 SwapRouter02",
        dexRate: data.dexRate || quotePreview.rate,
        recipientAddress: destinationEvmAddress.trim(),
        blockNumber: data.blockNumber || bridgeTx.blockNumber,
        gasSentHbar: data.gasSentHbar || bridgeTx.gasSentHbar,
        hcsSequenceNumber: data.hcsSequenceNumber || bridgeTx.hcsSequenceNumber,
      });

      // Immediately calculate optimistic remaining balance for the drawer
      const newRemaining = Math.max(0, availableUsdcEarnings - parsedAmount);
      setSweepAmount(newRemaining > 0 ? newRemaining.toFixed(5) : "0.00000");

      // Broadcast sweep completed locally and cross-tab
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("shunyagrid_last_sweep_at", Date.now().toString());
          window.dispatchEvent(new Event("shunyagrid_settlement_completed"));
        } catch {}
      }

      // Notify parent to refresh balance from Mirror Node and Sweep Ledger
      if (onSweepSuccess) {
        onSweepSuccess();
      }
    } catch (err: any) {
      setBridgeError(err.message || "An unexpected error occurred during sweep.");
    } finally {
      setIsBridging(false);
    }
  };

  const handleAddTokenToMetaMask = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: SGUSDC_EVM_CONTRACT,
              symbol: "SGUSDC",
              decimals: 6,
              image: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
            },
          },
        });
        setAddedTokenSuccess(true);
        setTimeout(() => setAddedTokenSuccess(false), 4000);
      } catch (err) {
        console.warn("Failed to watch asset:", err);
      }
    } else {
      alert("No MetaMask extension detected in this browser window.");
    }
  };

  const handleAddHederaNetwork = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x128", // 296 in hex
              chainName: "Hedera Testnet",
              nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
              rpcUrls: ["https://testnet.hashio.io/api"],
              blockExplorerUrls: ["https://hashscan.io/testnet"],
            },
          ],
        });
        setAddedNetworkSuccess(true);
        setTimeout(() => setAddedNetworkSuccess(false), 4000);
      } catch (err) {
        console.warn("Failed to add Hedera chain:", err);
      }
    } else {
      alert("No MetaMask extension detected in this browser window.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Universal Seller Sweeper & Uniswap Bridge</h3>
            <p className="text-xs text-slate-400">
              Sweep accumulated Hedera HTS USDC to any token on any chain directly to your connected MetaMask
            </p>
          </div>
        </div>

        {bridgeResult ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h4 className="font-semibold text-white">Sweep & Swap Executed Successfully!</h4>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Swapped <strong className="text-white">${bridgeResult.settledAmount.toFixed(4)} USDC</strong> to{" "}
                <strong className="text-white font-mono">{bridgeResult.swappedAmount.toFixed(6)} {bridgeResult.swappedToken}</strong>{" "}
                via <strong className="text-cyan-300">{bridgeResult.dexRouter || "Uniswap V3"}</strong> and delivered directly to your connected MetaMask wallet (
                <code className="text-emerald-300 font-mono">
                  {bridgeResult.recipientAddress.slice(0, 8)}...{bridgeResult.recipientAddress.slice(-6)}
                </code>
                ).
                {bridgeResult.gasSentHbar ? ` Included +${bridgeResult.gasSentHbar} HBAR gas!` : ""}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>{bridgeResult.hashscanUrl?.includes("sepolia.etherscan.io") ? "Sepolia Etherscan Tx:" : "On-Chain EVM Tx:"}</span>
                <a
                  href={bridgeResult.hashscanUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  {bridgeResult.txId.slice(0, 16)}... <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {bridgeResult.blockNumber && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>Confirmed Block:</span>
                  <span className="text-slate-300">#{bridgeResult.blockNumber}</span>
                </div>
              )}

              {bridgeResult.hcsSequenceNumber && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>HCS Consensus Sequence:</span>
                  <span className="text-indigo-400 font-bold">Seq #{bridgeResult.hcsSequenceNumber}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-400">
                <span>DEX Routing & Rate:</span>
                <span className="text-amber-300">
                  1 USDC ≈ {bridgeResult.dexRate?.toFixed(6)} {bridgeResult.swappedToken}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>MetaMask Balance:</span>
                <span className="text-emerald-400 font-semibold">Updated On-Chain</span>
              </div>

              {bridgeResult.hashscanUrl?.includes("sepolia.etherscan.io") && (
                <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-300 font-sans">
                  Delivered on <strong>Ethereum Sepolia</strong>. In MetaMask, ensure your active network is <strong>Ethereum Sepolia</strong> to see your new balance.
                </div>
              )}
            </div>

            {/* Quick Actions for MetaMask Integration */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddTokenToMetaMask}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 hover:text-white transition"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                {addedTokenSuccess ? "Added to Wallet!" : "Add Token to MetaMask"}
              </button>

              <button
                type="button"
                onClick={handleAddHederaNetwork}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 hover:text-white transition"
              >
                <Network className="w-3.5 h-3.5 text-emerald-400" />
                {addedNetworkSuccess ? "Added Network!" : "Switch Hedera Network"}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setBridgeResult(null);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Available Balance Header */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Available Hedera USDC Balance:</span>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  ${availableUsdcEarnings.toFixed(5)} <span className="text-xs font-normal text-slate-400">USDC</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    title="Refresh live on-chain balance from Mirror Node"
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  disabled={isZeroBalance}
                  onClick={() => setSweepAmount(currentAvailable > 0 ? currentAvailable.toFixed(5) : "0.00000")}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Sweep Max
                </button>
              </div>
            </div>

            {/* Hedera Source Payout Account */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">Hedera Source Payout Account</label>
                <span className="text-[10px] font-mono text-amber-300">Manual Entry</span>
              </div>
              <input
                type="text"
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value.trim())}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                placeholder="0.0.xxxxx (e.g. 0.0.11145557)"
              />
            </div>

            {/* Sweep Amount Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">Sweep Amount</label>
                <span className="text-slate-400 font-mono">
                  {sourceAccountId.trim() ? `From: ${sourceAccountId.trim()}` : "From: (Enter ID above)"}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={sweepAmount}
                  onChange={(e) => setSweepAmount(e.target.value)}
                  className={`w-full rounded-xl bg-slate-950 border px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none transition ${
                    isExceedingBalance
                      ? "border-rose-500 text-rose-300 focus:border-rose-400"
                      : isZeroBalance
                      ? "border-amber-500/50 text-amber-300 focus:border-amber-400"
                      : "border-slate-700 text-white focus:border-indigo-500"
                  }`}
                  placeholder="0.00"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-slate-400">USDC</span>
              </div>
              {isZeroBalance && (
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 mt-1">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Current balance is $0.00 USDC. You cannot sweep if your balance is 0.</span>
                </div>
              )}
              {isExceedingBalance && (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 mt-1">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Cannot sweep amount greater than the current balance (${currentAvailable.toFixed(5)} USDC).</span>
                </div>
              )}
            </div>

            {/* Destination Chain Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Destination Network</label>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    type="button"
                    onClick={() => setSelectedChain(chain.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition ${
                      selectedChain === chain.id
                        ? "border-indigo-500 bg-indigo-500/10 text-white shadow-sm"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>{chain.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{chain.chainId}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Token Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Target Token (Swap via Uniswap V3)</label>
              <div className="grid grid-cols-3 gap-2">
                {SUPPORTED_TARGET_TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    type="button"
                    onClick={() => setSelectedToken(token.symbol)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition ${
                      selectedToken === token.symbol
                        ? "border-indigo-500 bg-indigo-500/10 text-white shadow-sm"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${token.iconBg}`} />
                    <span className="font-semibold">{token.symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Uniswap Quote Card */}
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Uniswap V3 Quote Preview</span>
                </div>
                <div className="text-slate-300">
                  {quotePreview.loading ? (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> Fetching live rate...
                    </span>
                  ) : (
                    <span>
                      Receive ≈ <strong className="text-white font-mono">{quotePreview.expectedOut.toFixed(6)} {selectedToken}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <div>Rate: 1 USDC ≈ {quotePreview.rate.toFixed(6)}</div>
                <div className="text-indigo-400 font-mono">0.3% Pool Tier</div>
              </div>
            </div>

            {/* Connected MetaMask EVM Address */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">Destination MetaMask EVM Address</label>
                {walletAddress && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Connected Wallet
                  </span>
                )}
              </div>
              <input
                type="text"
                value={destinationEvmAddress}
                onChange={(e) => setDestinationEvmAddress(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                placeholder="0x..."
              />
              <p className="text-[11px] text-slate-400">
                Your MetaMask balance updates automatically once the swap transaction confirms on-chain.
              </p>
            </div>

            {bridgeError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bridgeError}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                disabled={isBridging || isZeroBalance || isExceedingBalance || isInvalidAmount}
                onClick={handleSweepEarnings}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {isBridging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Live Uniswap Swap & Sweep...
                  </>
                ) : isZeroBalance ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-300" />
                    Cannot Sweep: Balance is $0.00 USDC
                  </>
                ) : isExceedingBalance ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-300" />
                    Cannot Sweep: Exceeds Available Balance
                  </>
                ) : isInvalidAmount ? (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    Enter Valid Sweep Amount
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    Sweep & Swap to MetaMask ({selectedToken})
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

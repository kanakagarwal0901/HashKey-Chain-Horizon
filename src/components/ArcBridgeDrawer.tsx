"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  availableHskEarnings?: number;
  hskUsdRate?: number;
  sellerNodeAddress?: string;
  onSweepSuccess?: () => void;
  onRefresh?: () => void;
}

export const SGUSDC_EVM_CONTRACT = "0x054ed45810DbBAb8B27668922D110669c9D88D0a"; // HashKey Testnet USDC

interface TokenOption {
  symbol: string;
  name: string;
  decimals: number;
  iconBg: string;
  isNative?: boolean;
}

const SUPPORTED_TARGET_TOKENS: TokenOption[] = [
  { symbol: "HSK", name: "HashKey EcoPoints (Native)", decimals: 18, isNative: true, iconBg: "bg-emerald-950 text-emerald-400" },
  { symbol: "USDC", name: "USD Coin", decimals: 6, iconBg: "bg-neutral-800 text-neutral-300" },
  { symbol: "USDT", name: "Tether USD", decimals: 6, iconBg: "bg-neutral-800 text-neutral-300" },
  { symbol: "ETH", name: "Ethereum", decimals: 18, isNative: true, iconBg: "bg-neutral-800 text-neutral-300" },
  { symbol: "DAI", name: "Dai Stablecoin", decimals: 18, iconBg: "bg-neutral-800 text-neutral-300" },
];

const SUPPORTED_CHAINS = [
  { id: "hashkey-testnet", name: "HashKey Chain Testnet (Chain ID 133)", chainId: 133, hexId: "0x85" },
  { id: "ethereum-sepolia", name: "Ethereum Sepolia", chainId: 11155111, hexId: "0xaa36a7" },
  { id: "arbitrum-sepolia", name: "Arbitrum Sepolia", chainId: 421614, hexId: "0x66eee" },
  { id: "base-sepolia", name: "Base Sepolia", chainId: 84532, hexId: "0x14a34" },
];

export default function ArcBridgeDrawer({
  isOpen,
  onClose,
  availableUsdcEarnings = 0,
  availableHskEarnings = 0,
  hskUsdRate = 0.0894,
  sellerNodeAddress = "",
  onSweepSuccess,
  onRefresh,
}: ArcBridgeDrawerProps) {
  const { walletAddress } = useAuth();
  const [selectedToken, setSelectedToken] = useState<string>("HSK");
  const [selectedChain, setSelectedChain] = useState<string>("hashkey-testnet");
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    sellerNodeAddress || walletAddress || ""
  );
  const [sweepAmount, setSweepAmount] = useState<string>(
    availableHskEarnings > 0 ? (availableHskEarnings < 0.001 ? availableHskEarnings.toFixed(6) : availableHskEarnings.toFixed(4)) : "0.0000"
  );
  const [destinationEvmAddress, setDestinationEvmAddress] = useState<string>(
    walletAddress || ""
  );
  const [isBridging, setIsBridging] = useState<boolean>(false);
  const [addedTokenSuccess, setAddedTokenSuccess] = useState<boolean>(false);
  const [addedNetworkSuccess, setAddedNetworkSuccess] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Derived balance constraint checks
  const currentAvailable = Number((availableHskEarnings ?? 0).toFixed(6));
  const parsedAmount = parseFloat(sweepAmount);
  const isZeroBalance = currentAvailable <= 0;
  const isExceedingBalance = !isNaN(parsedAmount) && parsedAmount > currentAvailable + 0.000001;
  const isInvalidAmount = isNaN(parsedAmount) || parsedAmount <= 0;

  useEffect(() => {
    if (sellerNodeAddress) {
      setSourceAccountId(sellerNodeAddress);
    } else if (walletAddress) {
      setSourceAccountId(walletAddress);
    }
  }, [sellerNodeAddress, walletAddress]);

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
    router: "HashKey-HSP-Native",
    feeTier: "0.3%",
    loading: false,
  });

  useEffect(() => {
    if (availableHskEarnings !== undefined) {
      setSweepAmount(
        availableHskEarnings > 0 ? (availableHskEarnings < 0.001 ? availableHskEarnings.toFixed(6) : availableHskEarnings.toFixed(4)) : "0.0000"
      );
    }
  }, [availableHskEarnings]);

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

      if (selectedToken === "HSK") {
        setQuotePreview({
          expectedOut: parsed,
          rate: 1.0,
          router: "HashKey-HSP-Native",
          feeTier: "0.0%",
          loading: false,
        });
        return;
      }

      setQuotePreview((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch(
          `/api/uniswap/quote?from=HSK&to=${selectedToken}&amount=${parsed}&chainId=${selectedChain}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.quote && !isCancelled) {
            setQuotePreview({
              expectedOut: data.quote.expectedAmountOut,
              rate: data.quote.rate,
              router: data.quote.sourceDex || "HashKey-HSP-Router",
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
    explorerUrl: string;
    settledAmount: number;
    currency: string;
    swappedToken: string;
    swappedAmount: number;
    dexRouter?: string;
    dexRate?: number;
    recipientAddress: string;
    blockNumber?: number;
  } | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  if (!isOpen || !mounted) return null;

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
        throw new Error("Cannot sweep: Your available HSK balance is 0.0000 HSK. You cannot sweep until you have an HSK balance on HashKey Chain.");
      }

      if (isExceedingBalance) {
        throw new Error(
          `Cannot sweep ${parsedAmount.toFixed(4)} HSK: Amount cannot be greater than the available balance of ${currentAvailable.toFixed(4)} HSK.`
        );
      }

      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethAddressRegex.test(destinationEvmAddress.trim())) {
        throw new Error("Invalid recipient address: Must be a connected 42-character Ethereum EVM address (0x...).");
      }

      const cleanSourceAccount = (
        sourceAccountId ||
        sellerNodeAddress ||
        walletAddress ||
        ""
      ).trim();

      if (!cleanSourceAccount || !cleanSourceAccount.startsWith("0x")) {
        throw new Error("Missing connected seller wallet address. Please connect your MetaMask.");
      }

      const res = await fetch("/api/bridge/cctp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceChain: "hashkey-testnet",
          destinationChain: selectedChain,
          sourceAccount: cleanSourceAccount,
          recipientAddress: destinationEvmAddress.trim(),
          amountUsdc: parsedAmount * (hskUsdRate && hskUsdRate > 0 ? hskUsdRate : 0.0894),
          amountHsk: parsedAmount,
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
        data.explorerUrl ||
        bridgeTx.explorerUrl ||
        `https://testnet-explorer.hskchain.net/tx/${txHash}`;

      setBridgeResult({
        txId: txHash,
        explorerUrl: scanUrl,
        settledAmount: parsedAmount,
        currency: "HSK",
        swappedToken: data.swappedToken || selectedToken,
        swappedAmount: data.swappedAmount || quotePreview.expectedOut,
        dexRouter: data.dexRouter || "Uniswap V3 SwapRouter02",
        dexRate: data.dexRate || quotePreview.rate,
        recipientAddress: destinationEvmAddress.trim(),
        blockNumber: data.blockNumber || bridgeTx.blockNumber,
      });

      // Immediately calculate optimistic remaining balance for the drawer
      const newRemaining = Math.max(0, (availableHskEarnings ?? 0) - parsedAmount);
      setSweepAmount(
        newRemaining > 0 ? (newRemaining < 0.001 ? newRemaining.toFixed(6) : newRemaining.toFixed(4)) : "0.0000"
      );

      // Broadcast sweep completed locally and cross-tab
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("shunyagrid_last_sweep_at", Date.now().toString());
          window.dispatchEvent(new Event("shunyagrid_settlement_completed"));
        } catch {}
      }

      // Notify parent to refresh balance from HashKey Chain and Sweep Ledger
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

  const handleAddHashKeyNetwork = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x85", // 133 in hex
              chainName: "HashKey Chain Testnet",
              nativeCurrency: { name: "HashKey EcoPoints", symbol: "HSK", decimals: 18 },
              rpcUrls: ["https://testnet.hsk.xyz"],
              blockExplorerUrls: ["https://testnet-explorer.hskchain.net"],
            },
          ],
        });
        setAddedNetworkSuccess(true);
        setTimeout(() => setAddedNetworkSuccess(false), 4000);
      } catch (err) {
        console.warn("Failed to add HashKey chain:", err);
      }
    } else {
      alert("No MetaMask extension detected in this browser window.");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
      <div data-ui="dialog" className="relative w-full max-w-lg rounded-3xl apple-surface border border-[var(--border-subtle)] p-6 sm:p-7 shadow-2xl text-neutral-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-neutral-900 border border-[var(--border-subtle)] text-white">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Withdraw Your Earnings</h3>
            <p className="text-xs text-neutral-400">
              Sweep accumulated HSK to any token on any chain directly to your connected MetaMask
            </p>
          </div>
        </div>

        {bridgeResult ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-neutral-800 text-emerald-300">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h4 className="font-semibold text-white">Sweep & Swap Executed Successfully</h4>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Swapped <strong className="text-white tabular-data">{bridgeResult.settledAmount.toFixed(4)} HSK</strong> to{" "}
                <strong className="text-white tabular-data">{bridgeResult.swappedAmount.toFixed(6)} {bridgeResult.swappedToken}</strong>{" "}
                via <strong className="text-white">{bridgeResult.dexRouter || "Uniswap V3"}</strong> and delivered directly to your connected MetaMask wallet (
                <code className="text-neutral-300 font-mono">
                  {bridgeResult.recipientAddress.slice(0, 8)}...{bridgeResult.recipientAddress.slice(-6)}
                </code>
                ).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span>{bridgeResult.explorerUrl?.includes("sepolia.etherscan.io") ? "Sepolia Etherscan Tx:" : "On-Chain Explorer Tx:"}</span>
                <a
                  href={bridgeResult.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:underline flex items-center gap-1 font-semibold"
                >
                  {bridgeResult.txId.slice(0, 16)}... <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {bridgeResult.blockNumber && (
                <div className="flex items-center justify-between text-neutral-400">
                  <span>Confirmed Block:</span>
                  <span className="text-neutral-200 tabular-data">#{bridgeResult.blockNumber}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-neutral-400">
                <span>DEX Routing & Rate:</span>
                <span className="text-neutral-200 tabular-data">
                  1 HSK ≈ {bridgeResult.dexRate?.toFixed(6)} {bridgeResult.swappedToken}
                </span>
              </div>

              <div className="flex items-center justify-between text-neutral-400">
                <span>MetaMask Balance:</span>
                <span className="text-emerald-400 font-semibold">Updated On-Chain</span>
              </div>

              {bridgeResult.explorerUrl?.includes("sepolia.etherscan.io") && (
                <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-neutral-300">
                  Delivered on <strong>Ethereum Sepolia</strong>. In MetaMask, ensure your active network is <strong>Ethereum Sepolia</strong> to see your new balance.
                </div>
              )}
            </div>

            {/* Quick Actions for MetaMask Integration */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddTokenToMetaMask}
                className="flex items-center justify-center gap-1.5 p-2 rounded-full btn-secondary-apple text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-neutral-300" />
                {addedTokenSuccess ? "Added to Wallet!" : "Add Token to MetaMask"}
              </button>

              <button
                type="button"
                onClick={handleAddHashKeyNetwork}
                className="flex items-center justify-center gap-1.5 p-2 rounded-full btn-secondary-apple text-xs"
              >
                <Network className="w-3.5 h-3.5 text-emerald-400" />
                {addedNetworkSuccess ? "Added Network!" : "Switch to HashKey Testnet"}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setBridgeResult(null);
                  onClose();
                }}
                className="btn-primary-apple px-5 py-2 rounded-full text-xs font-semibold"
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
                <span className="text-xs text-slate-400">Available HSK Balance:</span>
                <div className="text-xl font-bold tabular-data text-emerald-400 flex items-baseline gap-2">
                  <span>{(availableHskEarnings ?? 0).toFixed(4)} <span className="text-xs font-normal text-emerald-300">HSK</span></span>
                  <span className="text-xs font-normal text-neutral-400">
                    (&asymp; ${((availableHskEarnings ?? 0) * (hskUsdRate && hskUsdRate > 0 ? hskUsdRate : 0.0894)).toFixed(2)} USD)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    title="Refresh live on-chain balance from HashKey Chain"
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  disabled={isZeroBalance}
                  onClick={() => setSweepAmount(currentAvailable > 0 ? (currentAvailable < 0.001 ? currentAvailable.toFixed(6) : currentAvailable.toFixed(4)) : "0.0000")}
                  className="btn-secondary-apple text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sweep Max
                </button>
              </div>
            </div>

            {/* Seller Node Address (EVM) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-neutral-300">Seller Node Address (EVM)</label>
                <span className="text-neutral-400">Manual Entry</span>
              </div>
              <input
                type="text"
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value.trim())}
                className="w-full rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] px-4 py-2.5 text-xs text-white focus:border-neutral-400 focus:outline-none"
                placeholder="0x... (Connected Seller Address)"
              />
            </div>

            {/* Sweep Amount Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-neutral-300">Sweep Amount (HSK)</label>
                <span className="text-neutral-400 tabular-data">
                  {sourceAccountId.trim() ? `From: ${sourceAccountId.trim()}` : "From: (Enter ID above)"}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={sweepAmount}
                  onChange={(e) => setSweepAmount(e.target.value)}
                  className={`w-full rounded-full bg-[var(--surface-2)] border px-4 py-2.5 text-sm text-white focus:outline-none transition ${
                    isExceedingBalance
                      ? "border-rose-500 text-rose-300 focus:border-rose-400"
                      : isZeroBalance
                      ? "border-amber-500/50 text-amber-300 focus:border-amber-400"
                      : "border-[var(--border-subtle)] text-white focus:border-neutral-400"
                  }`}
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-2.5 text-xs font-semibold text-emerald-400">HSK</span>
              </div>
              {isZeroBalance && (
                <div className="p-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 mt-1">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Current balance is 0.0000 HSK. Sweeps unlock once your connected wallet holds an HSK balance on HashKey Chain.</span>
                </div>
              )}
              {isExceedingBalance && (
                <div className="p-2.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 mt-1">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Cannot sweep amount greater than the current balance ({currentAvailable.toFixed(4)} HSK).</span>
                </div>
              )}
            </div>

            {/* Destination Chain Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Destination Network</label>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    type="button"
                    onClick={() => setSelectedChain(chain.id)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs font-medium transition ${
                      selectedChain === chain.id
                        ? "border-neutral-500 bg-neutral-900 text-white font-semibold"
                        : "border-[var(--border-subtle)] bg-[var(--surface-2)] text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span>{chain.name}</span>
                    <span className="text-[10px] text-neutral-500 tabular-data">{chain.chainId}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Token Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Target Token (Swap via Uniswap V3)</label>
              <div className="grid grid-cols-3 gap-2">
                {SUPPORTED_TARGET_TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    type="button"
                    onClick={() => setSelectedToken(token.symbol)}
                    className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs font-medium transition ${
                      selectedToken === token.symbol
                        ? "border-neutral-500 bg-neutral-900 text-white font-semibold"
                        : "border-[var(--border-subtle)] bg-[var(--surface-2)] text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${token.iconBg}`} />
                    <span className="font-semibold">{token.symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Uniswap Quote Card */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-white font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Uniswap V3 Quote Preview</span>
                </div>
                <div className="text-neutral-300">
                  {quotePreview.loading ? (
                    <span className="flex items-center gap-1 text-neutral-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> Fetching live rate...
                    </span>
                  ) : (
                    <span>
                      Receive ≈ <strong className="text-white tabular-data">{quotePreview.expectedOut.toFixed(6)} {selectedToken}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-[11px] text-neutral-400">
                <div className="tabular-data">Rate: 1 HSK ≈ {quotePreview.rate < 0.001 ? quotePreview.rate.toFixed(6) : quotePreview.rate.toFixed(4)} {selectedToken}</div>
                <div className="text-neutral-300">0.3% Pool Tier</div>
              </div>
            </div>

            {/* Connected MetaMask EVM Address */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-neutral-300">Destination MetaMask EVM Address</label>
                {walletAddress && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Connected Wallet
                  </span>
                )}
              </div>
              <input
                type="text"
                value={destinationEvmAddress}
                onChange={(e) => setDestinationEvmAddress(e.target.value)}
                className="w-full rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] px-4 py-2.5 text-xs text-white focus:border-neutral-400 focus:outline-none"
                placeholder="0x..."
              />
              <p className="text-xs text-neutral-400">
                Your MetaMask balance updates automatically once the swap transaction confirms on-chain.
              </p>
            </div>

            {bridgeError && (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bridgeError}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                disabled={isBridging || isZeroBalance || isExceedingBalance || isInvalidAmount}
                onClick={handleSweepEarnings}
                className="w-full py-3 px-4 rounded-full btn-primary-apple disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center justify-center gap-2"
              >
                {isBridging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Live Uniswap Swap & Sweep...
                  </>
                ) : isZeroBalance ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-300" />
                    Cannot Sweep: Balance is 0.0000 HSK
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
    </div>,
    document.body
  );
}

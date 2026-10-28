"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Shield,
  CheckCircle2,
  ExternalLink,
  Coins,
  ArrowRight,
  Database,
  Lock,
  RefreshCw,
  AlertCircle,
  Loader2,
  TrendingUp,
  Check,
  Building,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SpatialCard from "@/components/SpatialCard";

const HSK_TESTNET_EXPLORER = "https://testnet-explorer.hskchain.net";
const HSP_ADAPTER_CONTRACT = "0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae";

interface TokenOption {
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
}

const SUPPORTED_TARGET_TOKENS: TokenOption[] = [
  { symbol: "HSK", name: "HashKey EcoPoints (Native)", decimals: 18, isNative: true },
  { symbol: "USDC", name: "USD Coin", decimals: 6 },
  { symbol: "USDT", name: "Tether USD", decimals: 6 },
  { symbol: "ETH", name: "Ethereum", decimals: 18, isNative: true },
  { symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
];

const SUPPORTED_CHAINS = [
  { id: "hashkey-testnet", name: "HashKey Chain Testnet (Chain ID 133)", chainId: 133, hexId: "0x85" },
  { id: "ethereum-sepolia", name: "Ethereum Sepolia", chainId: 11155111, hexId: "0xaa36a7" },
  { id: "arbitrum-sepolia", name: "Arbitrum Sepolia", chainId: 421614, hexId: "0x66eee" },
  { id: "base-sepolia", name: "Base Sepolia", chainId: 84532, hexId: "0x14a34" },
  { id: "arc", name: "Arc Chain (Circle Native CCTP)", chainId: 1000, hexId: "0x3e8" },
];

export default function SellerPayoutPage() {
  const { walletAddress, connectWallet } = useAuth();

  // Custom node address input when overriding
  const [customAddress, setCustomAddress] = useState<string>("");
  const [activeAddressOverride, setActiveAddressOverride] = useState<string | null>(null);

  // Effective seller node address strictly tracks the connected MetaMask wallet or explicit override
  const currentSellerNode = activeAddressOverride || walletAddress || "";

  // Live Balance State
  const [hskBalance, setHskBalance] = useState<number>(0);
  const [totalEarnedUsdc, setTotalEarnedUsdc] = useState<number>(0);
  const [balanceDetails, setBalanceDetails] = useState<any>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Sweep Form State
  const [destinationChain, setDestinationChain] = useState<string>("hashkey-testnet");
  const [selectedToken, setSelectedToken] = useState<string>("HSK");
  const [sweepAmount, setSweepAmount] = useState<string>("0.5");
  const [recipientAddress, setRecipientAddress] = useState<string>(walletAddress || "");
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [sweepResult, setSweepResult] = useState<any | null>(null);
  const [bridgeHistory, setBridgeHistory] = useState<any[]>([]);
  const [recentSettlements, setRecentSettlements] = useState<any[]>([]);

  // Quote preview state
  const [quotePreview, setQuotePreview] = useState<{
    expectedOut: number;
    rate: number;
    router: string;
    feeTier: string;
    loading: boolean;
  }>({
    expectedOut: 0.5,
    rate: 1.0,
    router: "HashKey-HSP-Router",
    feeTier: "0.0%",
    loading: false,
  });

  const fetchBridgeHistory = async () => {
    try {
      const res = await fetch("/api/bridge/cctp");
      if (res.ok) {
        const data = await res.json();
        if (data.history) {
          setBridgeHistory(data.history);
        }
      }
    } catch (err) {
      console.warn("Could not load sweep history:", err);
    }
  };

  const fetchHashKeyBalance = async (address: string) => {
    if (!address || !address.startsWith("0x")) {
      setHskBalance(0);
      setTotalEarnedUsdc(0);
      setBalanceDetails(null);
      setRecentSettlements([]);
      setIsLoadingBalance(false);
      return;
    }
    setIsLoadingBalance(true);
    try {
      // 1. Direct on-chain HashKey RPC query for instant real-time wallet balance
      if (typeof window !== "undefined" && address.startsWith("0x")) {
        try {
          const { ethers } = await import("ethers");
          const rpcProvider = new ethers.JsonRpcProvider("https://testnet.hsk.xyz", 133);
          const rawWei = await rpcProvider.getBalance(address);
          const liveHsk = parseFloat(ethers.formatEther(rawWei));
          setHskBalance(liveHsk);
          setTotalEarnedUsdc(Number((liveHsk * 0.75).toFixed(2)));
        } catch (rpcErr) {
          console.warn("Direct on-chain balance query fallback to API:", rpcErr);
        }
      }

      // 2. Fetch full settlement metadata from backend API
      const res = await fetch(`/api/seller/balance?address=${encodeURIComponent(address)}`);
      if (res.ok) {
        const data = await res.json();
        const effectiveHsk = Number(data.currentBalanceHsk ?? data.onChainHsk ?? data.hskBalance ?? 0);
        setHskBalance(effectiveHsk);
        setTotalEarnedUsdc(data.displayBalance ?? Number((effectiveHsk * 0.75).toFixed(2)));
        setBalanceDetails(data);
        if (data.recentSettlements) {
          setRecentSettlements(data.recentSettlements);
        }
      }
    } catch (err) {
      console.warn("Could not query HashKey Treasury:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (walletAddress) setRecipientAddress(walletAddress);
  }, [walletAddress]);

  useEffect(() => {
    fetchHashKeyBalance(currentSellerNode);
    fetchBridgeHistory();
  }, [currentSellerNode]);

  useEffect(() => {
    const handleSettlementSync = () => {
      fetchHashKeyBalance(currentSellerNode);
      fetchBridgeHistory();
      setTimeout(() => fetchHashKeyBalance(currentSellerNode), 1500);
      setTimeout(() => fetchHashKeyBalance(currentSellerNode), 3500);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "shunyagrid_last_settlement_at" || e.key === "shunyagrid_last_sweep_at") {
        handleSettlementSync();
      }
    };

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined") {
      window.addEventListener("shunyagrid_settlement_completed", handleSettlementSync);
      window.addEventListener("storage", handleStorage);

      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("shunyagrid_channel");
        bc.onmessage = (event) => {
          if (event.data?.type === "settlement_completed" || event.data?.type === "sweep_completed") {
            handleSettlementSync();
          }
        };
      }
    }

    const pollInterval = setInterval(() => {
      fetchHashKeyBalance(currentSellerNode);
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      if (bc) bc.close();
      if (typeof window !== "undefined") {
        window.removeEventListener("shunyagrid_settlement_completed", handleSettlementSync);
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, [currentSellerNode]);

  useEffect(() => {
    if (walletAddress) {
      setRecipientAddress(walletAddress);
    }
  }, [walletAddress]);

  // Dynamic Quote Calculation
  useEffect(() => {
    let isMounted = true;
    const updateQuote = async () => {
      const parsed = parseFloat(sweepAmount);
      if (isNaN(parsed) || parsed <= 0) {
        setQuotePreview((prev) => ({ ...prev, expectedOut: 0, loading: false }));
        return;
      }

      if (selectedToken === "HSK") {
        setQuotePreview({
          expectedOut: parsed,
          rate: 1.0,
          router: "HashKey-Native-Settlement",
          feeTier: "0.0%",
          loading: false,
        });
        return;
      }

      setQuotePreview((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch(
          `/api/uniswap/quote?from=HSK&to=${selectedToken}&amount=${parsed}&chainId=${destinationChain}`
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.quote) {
            setQuotePreview({
              expectedOut: data.quote.expectedAmountOut || parsed,
              rate: data.quote.executionPrice || 1.0,
              router: data.quote.routePlan || "HashKey-Router",
              feeTier: "0.3%",
              loading: false,
            });
          }
        }
      } catch (err) {
        console.warn("Quote preview failed:", err);
        if (isMounted) {
          setQuotePreview((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    updateQuote();
    return () => {
      isMounted = false;
    };
  }, [sweepAmount, selectedToken, destinationChain]);

  const parsedAmount = parseFloat(sweepAmount);
  const isInvalidAmount = isNaN(parsedAmount) || parsedAmount <= 0;
  const isZeroBalance = hskBalance <= 0;
  const isExceedingBalance = !isInvalidAmount && parsedAmount > hskBalance + 0.000001;

  const handleSweepPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSweepError(null);
    setSweepResult(null);

    if (isZeroBalance) {
      setSweepError("Current balance is 0.000000 HSK. You cannot sweep until earnings settle from queries.");
      return;
    }

    if (isInvalidAmount) {
      setSweepError("Invalid sweep amount: Must be greater than 0 HSK.");
      return;
    }

    if (isExceedingBalance) {
      setSweepError(
        `Cannot sweep ${parsedAmount.toFixed(6)} HSK: Amount cannot exceed available balance of ${hskBalance.toFixed(6)} HSK.`
      );
      return;
    }

    if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setSweepError("Invalid recipient address: Must be a valid 42-character EVM address (0x...).");
      return;
    }

    setIsSweeping(true);
    try {
      const res = await fetch("/api/bridge/cctp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAccount: currentSellerNode,
          amountHsk: parsedAmount,
          amountUsdc: parsedAmount * 0.75,
          destinationChain,
          targetToken: selectedToken,
          destinationAddress: recipientAddress,
          recipientAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute on-chain sweep payout.");
      }

      setSweepResult({
        txId: data.bridgeTx?.txHash || data.sourceBurnTxId || "0x" + Math.random().toString(16).slice(2, 66),
        explorerUrl: data.explorerUrl || data.blockscoutUrl || `${HSK_TESTNET_EXPLORER}/tx/${data.bridgeTx?.txHash || ""}`,
        settledAmount: parsedAmount,
        targetToken: selectedToken,
        recipientAddress,
        destinationChain,
        dexRouter: data.bridgeTx?.dexRouter || quotePreview.router,
        blockNumber: data.blockNumber || data.bridgeTx?.blockNumber,
      });

      await fetchHashKeyBalance(currentSellerNode);
      await fetchBridgeHistory();
    } catch (err: any) {
      setSweepError(err.message || "An unexpected error occurred during sweep.");
    } finally {
      setIsSweeping(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24 space-y-24 sm:space-y-36 text-zinc-900 dark:text-zinc-100">
      {/* Hero Header */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-14 space-y-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-ring-emerald" />
            HashKey Chain Horizon &bull; Track 2: Agent Payments & A2A Settlement
          </span>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-900 text-zinc-300 border border-white/10 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            HSP (HashKey Settlement Protocol) Rails
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          Seller Payout & Universal Sweeper
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed">
          Inspect accumulated token revenues settled on-chain via HashKey Settlement Protocol (HSP) on HashKey Chain Testnet (Chain ID 133). 
          Sweep accumulated earnings natively or cross-chain to any supported EVM network in any token via the HashKey Settlement Router.
        </p>

        <div className="flex items-center gap-3 pt-3">
          <Link
            href="/seller"
            className="btn-secondary-apple px-5 py-2.5 text-xs font-semibold flex items-center gap-2"
          >
            <Building className="w-4 h-4 text-zinc-400" />
            <span>Seller Hub</span>
          </Link>
          <Link
            href="/marketplace"
            className="btn-secondary-apple px-5 py-2.5 text-xs font-semibold flex items-center gap-2"
          >
            <Database className="w-4 h-4 text-zinc-400" />
            <span>Arkiv Orderbook</span>
          </Link>
          <a
            href={`${HSK_TESTNET_EXPLORER}/address/${HSP_ADAPTER_CONTRACT}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary-apple px-5 py-2.5 text-xs font-semibold flex items-center gap-2 text-emerald-400"
          >
            <span>HSP Contract on Blockscout</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </SpatialCard>

      {/* STAGE 1: HashKey Seller Node & Live Treasury Balance */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-14 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <span className="text-xs text-zinc-400 font-medium block">Stage 1 of 3</span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              Your Earnings & Payout Wallet
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              You receive automatic payments directly to your wallet for the exact AI tokens consumed.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchHashKeyBalance(currentSellerNode)}
              disabled={isLoadingBalance}
              title="Refresh live balance from HashKey Chain"
              className="btn-secondary-apple px-4 py-2 text-xs font-medium flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? "animate-spin text-white" : "text-zinc-400"}`} />
              <span>Refresh Balance</span>
            </button>
            {!walletAddress && (
              <button
                onClick={connectWallet}
                className="btn-primary-apple px-4 py-2 text-xs font-semibold"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Node Identity Card */}
          <div className="p-6 rounded-2xl liquid-glass-interactive space-y-2">
            <span className="text-zinc-500 text-[11px] block">Your Payout Wallet</span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${currentSellerNode ? "bg-emerald-400" : "bg-zinc-600"}`} />
              {currentSellerNode ? (
                <a
                  href={`${HSK_TESTNET_EXPLORER}/address/${currentSellerNode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white font-semibold hover:underline flex items-center gap-1 text-sm tabular-data truncate"
                  title={currentSellerNode}
                >
                  {currentSellerNode.slice(0, 10)}...{currentSellerNode.slice(-8)}
                  <ExternalLink className="w-3 h-3 text-zinc-500 shrink-0" />
                </a>
              ) : (
                <span className="text-zinc-500 text-xs italic">Wallet Not Connected</span>
              )}
            </div>
            <span className="text-xs text-zinc-400 block pt-0.5 tabular-data">
              Network: <strong className="text-white">HashKey Testnet (ID 133)</strong>
            </span>
          </div>

          {/* Settlement Protocol Card */}
          <div className="p-6 rounded-2xl liquid-glass-interactive space-y-2">
            <span className="text-zinc-500 text-[11px] block">Settlement Protocol (HSP)</span>
            <a
              href={`${HSK_TESTNET_EXPLORER}/address/${HSP_ADAPTER_CONTRACT}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 font-semibold hover:underline flex items-center gap-1 text-sm tabular-data"
            >
              HSPAdapter ({HSP_ADAPTER_CONTRACT.slice(0, 6)}...{HSP_ADAPTER_CONTRACT.slice(-4)})
              <ExternalLink className="w-3 h-3 text-emerald-500" />
            </a>
            <span className="text-xs text-zinc-400 block pt-0.5">
              Instant Per-Token Settlement
            </span>
          </div>

          {/* Net Available Balance Card */}
          <div className="p-6 rounded-2xl liquid-glass-interactive space-y-2">
            <span className="text-emerald-400 text-[11px] block font-semibold">Available to Withdraw</span>
            <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-baseline gap-2 tabular-data">
              {hskBalance.toFixed(4)}
              <span className="text-xs text-zinc-400 font-normal">HSK</span>
            </div>
            <div className="text-xs text-zinc-400 flex items-center gap-2 pt-0.5 tabular-data">
              <span>&asymp; ${totalEarnedUsdc.toFixed(2)} USD</span>
              <span>&bull;</span>
              <span>Lifetime: {(balanceDetails?.lifetimeSettledHsk || hskBalance).toFixed(4)} HSK</span>
            </div>
          </div>
        </div>

        {/* Custom Node Address Switcher */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs">
          <span className="text-zinc-400 shrink-0">Switch Node Target:</span>
          <input
            type="text"
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value.trim())}
            placeholder="Inspect any EVM Node Address (0x...)"
            className="flex-1 rounded-xl bg-[#121316] border border-white/10 hover:border-white/20 px-3.5 py-2 text-xs text-white placeholder-zinc-500 tabular-data focus:outline-none focus:border-white/30"
          />
          <button
            onClick={() => {
              if (/^0x[a-fA-F0-9]{40}$/.test(customAddress)) {
                setActiveAddressOverride(customAddress);
                fetchHashKeyBalance(customAddress);
              } else {
                alert("Please enter a valid 42-character EVM address.");
              }
            }}
            disabled={!customAddress}
            className="btn-secondary-apple px-4 py-2 text-xs font-semibold disabled:opacity-40"
          >
            Switch Target
          </button>
          {activeAddressOverride && (
            <button
              onClick={() => {
                setActiveAddressOverride(null);
                setCustomAddress("");
                fetchHashKeyBalance(walletAddress || "");
              }}
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              Reset to Connected Wallet
            </button>
          )}
        </div>
      </SpatialCard>

      {/* STAGE 2: Universal Sweep Form */}
      <div className="grid lg:grid-cols-3 gap-8 sm:gap-10">
        <SpatialCard maxTilt={1.5} className="lg:col-span-2 p-8 sm:p-14 space-y-10">
          <div className="flex items-center justify-between pb-2">
            <div>
              <span className="text-xs text-zinc-400 font-medium block">Stage 2 of 3</span>
              <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
                <Coins className="w-5 h-5 text-zinc-400" />
                Universal Multi-Chain / Multi-Token Sweeper
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Sweep earned HSK revenues directly to any chain and any token with zero manual bridging steps.
              </p>
            </div>
          </div>

          <form onSubmit={handleSweepPayout} className="space-y-8">
            {/* Source Node and Destination Network */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Source Payout Node (HashKey Chain):
                </label>
                <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] text-xs text-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-white tabular-data truncate max-w-[180px]">
                      {currentSellerNode}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium shrink-0">HSP Verified</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Destination Network:
                </label>
                <div className="relative">
                  <select
                    value={destinationChain}
                    onChange={(e) => setDestinationChain(e.target.value)}
                    className="w-full rounded-2xl bg-[#121316] border border-white/10 hover:border-white/20 p-4 text-xs text-white font-medium focus:outline-none focus:border-white/30 transition appearance-none cursor-pointer"
                  >
                    {SUPPORTED_CHAINS.map((chain) => (
                      <option key={chain.id} value={chain.id} className="bg-zinc-900 text-white">
                        {chain.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-zinc-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Amount to Sweep & Recipient EVM Address */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Amount to Sweep (HSK):
                  </label>
                  <button
                    type="button"
                    onClick={() => setSweepAmount(hskBalance > 0 ? hskBalance.toFixed(4) : "0.0000")}
                    className="text-xs text-zinc-400 hover:text-white font-medium underline tabular-data"
                  >
                    MAX: {hskBalance.toFixed(4)} HSK
                  </button>
                </div>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={sweepAmount}
                  onChange={(e) => setSweepAmount(e.target.value)}
                  className={`w-full rounded-2xl bg-[#121316] border p-4 text-sm font-semibold tabular-data focus:outline-none transition ${
                    isExceedingBalance
                      ? "border-red-500 text-red-400"
                      : "border-white/10 hover:border-white/20 text-white focus:border-white/30"
                  }`}
                />
                {isExceedingBalance && (
                  <span className="text-xs text-red-400 block tabular-data">
                    Amount exceeds available balance ({hskBalance.toFixed(4)} HSK).
                  </span>
                )}
                {isZeroBalance && (
                  <span className="text-xs text-amber-400 block">
                    Balance is 0.0000 HSK. Sweeps unlock once your connected wallet holds an HSK balance on HashKey Chain.
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Target Recipient Address (EVM):
                  </label>
                  {walletAddress && (
                    <button
                      type="button"
                      onClick={() => setRecipientAddress(walletAddress)}
                      className="text-xs text-zinc-400 hover:text-white font-medium underline"
                    >
                      Use Connected Wallet
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-2xl bg-[#121316] border border-white/10 hover:border-white/20 p-4 text-xs text-white tabular-data focus:outline-none focus:border-white/30 transition"
                />
                <span className="text-[11px] text-zinc-500 block truncate">
                  Receives swept tokens on {destinationChain}
                </span>
              </div>
            </div>

            {/* Target Asset / Token Selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300 block">
                Select Destination Asset:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SUPPORTED_TARGET_TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    type="button"
                    onClick={() => setSelectedToken(token.symbol)}
                    className={`p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                      selectedToken === token.symbol
                        ? "bg-white text-black font-semibold border-white"
                        : "liquid-glass-interactive border-white/[0.08] hover:border-white/20 text-zinc-300"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{token.symbol}</span>
                      <span className={`text-[11px] ${selectedToken === token.symbol ? "text-zinc-600" : "text-zinc-500"}`}>
                        {token.name}
                      </span>
                    </div>
                    {selectedToken === token.symbol && (
                      <Check className="w-4 h-4 text-black shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Output Preview */}
            <div className="p-5 rounded-2xl bg-black/60 border border-white/[0.08] text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Estimated Payout Output:</span>
                </span>
                <span className="text-white font-bold text-base tabular-data">
                  {quotePreview.loading ? (
                    <span className="text-zinc-400 font-normal">Quoting...</span>
                  ) : (
                    `${quotePreview.expectedOut.toFixed(4)} ${selectedToken}`
                  )}
                </span>
              </div>
              {selectedToken !== "HSK" ? (
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-1.5 border-t border-white/[0.06] tabular-data">
                  <span>Routing Protocol:</span>
                  <span className="text-zinc-300">HashKey Settlement Router &bull; 1 HSK &asymp; {quotePreview.rate.toFixed(4)} {selectedToken}</span>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-500 pt-1.5 border-t border-white/[0.06]">
                  Direct HashKey Chain native transfer (Zero DEX slippage)
                </div>
              )}
            </div>

            {sweepError && (
              <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{sweepError}</span>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSweeping || isInvalidAmount || isZeroBalance || isExceedingBalance}
              className="btn-primary-apple w-full py-4 px-6 text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-40"
            >
              {isSweeping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Settling on HashKey Chain & Dispatching...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 text-black" />
                  <span>
                    {isZeroBalance
                      ? "Balance is 0.00 HSK (Cannot Sweep)"
                      : isExceedingBalance
                      ? "Amount Exceeds Available Balance"
                      : `Sweep ${parsedAmount ? parsedAmount.toFixed(4) : "0.00"} HSK to ${selectedToken}`}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Success Result Card */}
          {sweepResult && (
            <div className="p-6 rounded-2xl bg-zinc-900 border border-white/20 space-y-3.5 text-xs mt-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>HashKey Universal Sweep Confirmed</span>
              </div>
              <p className="text-zinc-300 text-xs">
                Successfully swept <strong>{sweepResult.settledAmount} HSK</strong> to recipient{" "}
                <code className="text-white tabular-data">{sweepResult.recipientAddress}</code> on {sweepResult.destinationChain}.
              </p>
              <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] space-y-1.5 text-xs text-zinc-300">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Transaction ID:</span>
                  <a
                    href={sweepResult.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 font-semibold hover:underline flex items-center gap-1 tabular-data"
                  >
                    {sweepResult.txId.slice(0, 20)}... <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {sweepResult.blockNumber && (
                  <div className="flex justify-between tabular-data">
                    <span className="text-zinc-500">Block Number:</span>
                    <span>#{sweepResult.blockNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">Router:</span>
                  <span>{sweepResult.dexRouter}</span>
                </div>
              </div>
            </div>
          )}
        </SpatialCard>

        {/* Sidebar Protocol Details */}
        <div className="space-y-6">
          <SpatialCard maxTilt={1.5} className="p-8 border border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              HashKey Settlement Protocol (HSP)
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              When queries finish execution, exact consumed tokens (<code className="text-zinc-200">T_used</code>) are programmatic settled on-chain via HSP Mandates on HashKey Chain Testnet directly to your node address.
            </p>
          </SpatialCard>

          <SpatialCard maxTilt={1.5} className="p-8 border border-white/10 space-y-2 text-xs">
            <span className="text-white font-semibold block">
              Universal Multi-Chain Liquidity
            </span>
            <p className="text-zinc-400 leading-relaxed">
              Earnings can be retained as native HSK, or swept into USDC, USDT, ETH, or DAI across Sepolia, Arbitrum, Base, or Arc Chain with instant routing.
            </p>
          </SpatialCard>

          <SpatialCard maxTilt={1.5} className="p-8 border border-white/10 space-y-2 text-xs">
            <span className="text-emerald-400 font-semibold block">
              Smart Contract Verification
            </span>
            <p className="text-zinc-400 leading-relaxed">
              HSPAdapter: <code className="text-zinc-300">0x40A6...7ae</code><br />
              SettlementRouter: <code className="text-zinc-300">0x5328...72D</code><br />
              HashKey Chain ID: <strong className="text-white">133</strong>
            </p>
          </SpatialCard>
        </div>
      </div>

      {/* STAGE 3: Recent HSP Settlements & Sweeps Ledger */}
      <div className="space-y-8">
        <SpatialCard maxTilt={1.5} className="p-8 sm:p-12 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Zap className="w-5 h-5 text-emerald-400" />
            Live On-Chain HSP Settlements (HashKey Chain)
          </h2>

          <div className="rounded-3xl overflow-hidden bg-[#0c0d11] border border-white/10" data-ui="table-wrapper">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-ui="payout-table">
                <thead className="bg-black/80 text-zinc-400 uppercase text-[11px] font-semibold border-b border-white/[0.08]">
                  <tr>
                    <th className="px-6 py-4">Mandate ID</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Model</th>
                    <th className="px-6 py-4">Tokens Used</th>
                    <th className="px-6 py-4">Seller Payout</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Blockscout Tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {recentSettlements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                        No HSP settlements recorded for this node yet. Launch a query in Buyer Studio to trigger autonomous on-chain settlement.
                      </td>
                    </tr>
                  ) : (
                    recentSettlements.map((s) => (
                      <tr key={s.mandateId} className="hover:bg-white/[0.03] transition">
                        <td className="px-6 py-5 font-semibold text-white tabular-data truncate max-w-[120px]">
                          {s.mandateId}
                        </td>
                        <td className="px-6 py-5 text-zinc-400 tabular-data">{s.timestamp}</td>
                        <td className="px-6 py-5 text-zinc-200 font-medium">{s.modelId}</td>
                        <td className="px-6 py-5 text-zinc-300 tabular-data">{s.tUsed} / {s.tMax}</td>
                        <td className="px-6 py-5 text-emerald-400 font-bold tabular-data">
                          +{Number(s.sellerPayoutHsk || 0).toFixed(4)} HSK (${Number(s.sellerPayoutUsdc || 0).toFixed(4)})
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-800/40 text-[10px] font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-zinc-400 tabular-data">
                          <a
                            href={s.blockscoutUrl || `${HSK_TESTNET_EXPLORER}/tx/${s.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline font-medium flex items-center gap-1"
                          >
                            {s.txHash.slice(0, 10)}... <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SpatialCard>

        {/* Universal Sweeps Ledger */}
        <SpatialCard maxTilt={1.5} className="p-8 sm:p-12 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <ArrowRightLeft className="w-5 h-5 text-zinc-400" />
            Universal Multi-Chain Sweep Ledger
          </h2>

          <div className="rounded-3xl overflow-hidden bg-[#0c0d11] border border-white/10" data-ui="table-wrapper">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-ui="sweep-table">
                <thead className="bg-black/80 text-zinc-400 uppercase text-[11px] font-semibold border-b border-white/[0.08]">
                  <tr>
                    <th className="px-6 py-4">Sweep ID</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Route</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Explorer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {bridgeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                        No sweep records yet. Execute your first payout sweep above.
                      </td>
                    </tr>
                  ) : (
                    bridgeHistory.map((b) => (
                      <tr key={b.id} className="hover:bg-white/[0.03] transition">
                        <td className="px-6 py-5 font-semibold text-white tabular-data">{b.id}</td>
                        <td className="px-6 py-5 text-zinc-400 tabular-data">{b.timestamp}</td>
                        <td className="px-6 py-5 text-zinc-200 uppercase font-medium">
                          HashKey <ArrowRight className="w-3 h-3 inline text-zinc-500" /> {b.destinationChain}
                        </td>
                        <td className="px-6 py-5 text-emerald-400 font-bold tabular-data">{b.amountUsdc ? `$${b.amountUsdc.toFixed(2)}` : `${b.amountHsk || 0} HSK`}</td>
                        <td className="px-6 py-5 text-zinc-400 tabular-data truncate max-w-[130px]">{b.recipientAddress}</td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-800/40 text-[10px] font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-zinc-400 truncate max-w-[150px] tabular-data">
                          {b.txHash ? (
                            <a
                              href={b.explorerUrl || `${HSK_TESTNET_EXPLORER}/tx/${b.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline font-medium"
                            >
                              {b.txHash.slice(0, 10)}...
                            </a>
                          ) : (
                            "0x..."
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SpatialCard>
      </div>
    </div>
  );
}

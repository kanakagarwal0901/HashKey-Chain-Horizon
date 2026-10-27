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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SpatialCard from "@/components/SpatialCard";
import AntigravityStagger from "@/components/AntigravityStagger";

const SGUSDC_EVM_CONTRACT = "0x0000000000000000000000000000000000a9e4c1"; // Token 0.0.11134145

interface TokenOption {
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
}

const SUPPORTED_TARGET_TOKENS: TokenOption[] = [
  { symbol: "HSK", name: "HashKey EcoPoints", decimals: 18, isNative: true },
  { symbol: "USDC", name: "USD Coin", decimals: 6 },
  { symbol: "ETH", name: "Ethereum", decimals: 18, isNative: true },
  { symbol: "HBAR", name: "Hedera HBAR", decimals: 18, isNative: true },
  { symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  { symbol: "USDT", name: "Tether USD", decimals: 6 },
  { symbol: "UNI", name: "Uniswap", decimals: 18 },
];

const SUPPORTED_CHAINS = [
  { id: "hashkey-testnet", name: "HashKey Chain Testnet", chainId: 133, hexId: "0x85" },
  { id: "hedera-testnet", name: "Hedera Testnet (EVM)", chainId: 296, hexId: "0x128" },
  { id: "arc", name: "Arc Chain (Circle Native CCTP)", chainId: 1000, hexId: "0x3e8" },
  { id: "ethereum-sepolia", name: "Ethereum Sepolia", chainId: 11155111, hexId: "0xaa36a7" },
  { id: "arbitrum-sepolia", name: "Arbitrum Sepolia", chainId: 421614, hexId: "0x66eee" },
  { id: "base-sepolia", name: "Base Sepolia", chainId: 84532, hexId: "0x14a34" },
];

export default function SellerPayoutPage() {
  const {
    walletAddress,
    sellerHederaAccount,
    isConnectingHedera,
    connectSellerHedera,
    disconnectSellerHedera,
  } = useAuth();

  // Hedera Login Gateway State
  const [inputHederaAccount, setInputHederaAccount] = useState<string>("");
  const [hederaConnectError, setHederaConnectError] = useState<string | null>(null);

  // Live Balance State
  const [totalEarnedUsdc, setTotalEarnedUsdc] = useState<number>(0);
  const [hbarBalance, setHbarBalance] = useState<number>(0);
  const [balanceDetails, setBalanceDetails] = useState<any>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Sweep Form State
  const [destinationChain, setDestinationChain] = useState<string>("hedera-testnet");
  const [selectedToken, setSelectedToken] = useState<string>("USDC");
  const [sweepAmount, setSweepAmount] = useState<string>("0.05");
  const [recipientAddress, setRecipientAddress] = useState<string>(
    walletAddress || "0x8fDE3F07fFF6432fF22FB805f34011785e0C8444"
  );
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [sweepResult, setSweepResult] = useState<any | null>(null);
  const [bridgeHistory, setBridgeHistory] = useState<any[]>([]);

  // Uniswap live quote state
  const [quotePreview, setQuotePreview] = useState<{
    expectedOut: number;
    rate: number;
    router: string;
    feeTier: string;
    loading: boolean;
  }>({
    expectedOut: 0.05,
    rate: 1.0,
    router: "Uniswap-V3",
    feeTier: "0.3%",
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
      console.warn("Could not load bridge history:", err);
    }
  };

  const fetchHederaBalance = async (accountId: string) => {
    if (!accountId) return;
    setIsLoadingBalance(true);
    try {
      const res = await fetch(`/api/seller/hedera-balance?accountId=${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setTotalEarnedUsdc(data.displayBalance || 0);
        setHbarBalance(data.hbarBalance || 0);
        setBalanceDetails(data);
      }
    } catch (err) {
      console.warn("Could not query Hedera Mirror Node:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (sellerHederaAccount) {
      fetchHederaBalance(sellerHederaAccount);
    }
    fetchBridgeHistory();
  }, [sellerHederaAccount]);

  useEffect(() => {
    const handleSettlementSync = (e: any) => {
      if (sellerHederaAccount) {
        fetchHederaBalance(sellerHederaAccount);
        fetchBridgeHistory();
      }
    };
    window.addEventListener("shunyagrid_settlement_completed", handleSettlementSync);
    return () => {
      window.removeEventListener("shunyagrid_settlement_completed", handleSettlementSync);
    };
  }, [sellerHederaAccount]);

  useEffect(() => {
    if (walletAddress && (!recipientAddress || recipientAddress.startsWith("0x8fDE"))) {
      setRecipientAddress(walletAddress);
    }
  }, [walletAddress]);

  // Fetch Uniswap Quote Preview
  useEffect(() => {
    let isMounted = true;
    const updateQuote = async () => {
      const parsed = parseFloat(sweepAmount);
      if (isNaN(parsed) || parsed <= 0) {
        setQuotePreview((prev) => ({ ...prev, expectedOut: 0, loading: false }));
        return;
      }

      if (selectedToken === "USDC") {
        setQuotePreview({
          expectedOut: parsed,
          rate: 1.0,
          router: "Direct-HTS-Relay",
          feeTier: "0.0%",
          loading: false,
        });
        return;
      }

      setQuotePreview((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch(
          `/api/uniswap/quote?from=USDC&to=${selectedToken}&amount=${parsed}&chainId=${destinationChain}`
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.quote) {
            setQuotePreview({
              expectedOut: data.quote.expectedAmountOut || parsed,
              rate: data.quote.executionPrice || 1.0,
              router: data.quote.routePlan || "Uniswap-V3",
              feeTier: "0.3%",
              loading: false,
            });
          }
        }
      } catch (err) {
        console.warn("Uniswap quote preview failed:", err);
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

  const handleConnectHedera = async () => {
    setHederaConnectError(null);
    if (!inputHederaAccount.trim()) {
      setHederaConnectError("Please enter a valid Hedera Account ID.");
      return;
    }

    const ok = await connectSellerHedera(inputHederaAccount.trim());
    if (ok) {
      setInputHederaAccount("");
      fetchHederaBalance(inputHederaAccount.trim());
    } else {
      setHederaConnectError("Account verification failed. Ensure format is 0.0.xxxxx.");
    }
  };

  const parsedAmount = parseFloat(sweepAmount);
  const isInvalidAmount = isNaN(parsedAmount) || parsedAmount <= 0;
  const isZeroBalance = totalEarnedUsdc <= 0;
  const isExceedingBalance = !isInvalidAmount && parsedAmount > totalEarnedUsdc + 0.000001;

  const handleSweepPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSweepError(null);
    setSweepResult(null);

    if (!sellerHederaAccount) {
      setSweepError("Please connect your Hedera payout account in Step 1 first.");
      return;
    }

    if (isZeroBalance) {
      setSweepError("Current balance is $0.000000 USDC. You cannot sweep if your balance is 0.");
      return;
    }

    if (isInvalidAmount) {
      setSweepError("Invalid sweep amount: Must be greater than 0 USDC.");
      return;
    }

    if (isExceedingBalance) {
      setSweepError(
        `Cannot sweep $${parsedAmount.toFixed(6)} USDC: Amount cannot exceed available balance of $${totalEarnedUsdc.toFixed(6)} USDC.`
      );
      return;
    }

    if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setSweepError("Invalid recipient address: Must be a connected 42-character Ethereum EVM address (0x...).");
      return;
    }

    setIsSweeping(true);
    try {
      const res = await fetch("/api/bridge/cctp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAccount: sellerHederaAccount,
          amountUsdc: parsedAmount,
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
        txId: data.bridgeTx?.txHash || data.sourceBurnTxId,
        hashscanUrl: data.hashscanUrl || data.bridgeTx?.hashscanUrl,
        settledAmount: parsedAmount,
        recipientAddress,
        dexRouter: data.bridgeTx?.dexRouter || quotePreview.router,
        blockNumber: data.blockNumber || data.bridgeTx?.blockNumber,
        gasSentHbar: data.gasSentHbar,
      });

      await fetchHederaBalance(sellerHederaAccount);
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
          <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-900 text-zinc-200 border border-white/10 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-zinc-400" />
            Hedera HTS & Circle CCTP Settlement
          </span>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Autonomous Revenue Stream
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          Seller Payout & Earnings Sweeper
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed">
          Inspect accumulated token revenues settled on-chain via Hedera HTS micropayments. Sweep directly to your connected EVM wallet or swap into native assets via Uniswap V3.
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
            <span>Orderbook</span>
          </Link>
        </div>
      </SpatialCard>

      {/* STAGE 1: Hedera Account Connection & Live Balance Gateway */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-14 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <span className="text-xs text-zinc-400 font-medium block">Stage 1 of 3</span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              Hedera Payout Account Gateway
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Connect the Hedera Account (0.0.xxxxx) designated to receive HTS USDC earnings from AI queries.
            </p>
          </div>

          {sellerHederaAccount && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => fetchHederaBalance(sellerHederaAccount)}
                disabled={isLoadingBalance}
                title="Refresh balance from Hedera Mirror Node"
                className="btn-secondary-apple px-4 py-2 text-xs font-medium flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? "animate-spin text-white" : "text-zinc-400"}`} />
                <span>Refresh Balance</span>
              </button>
              <button
                onClick={disconnectSellerHedera}
                className="px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition"
              >
                Switch Account
              </button>
            </div>
          )}
        </div>

        {/* When NOT Connected */}
        {!sellerHederaAccount ? (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10 text-xs text-zinc-300 flex items-start gap-3.5">
              <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block text-white text-sm">Hedera Account Login Required</span>
                <p className="text-zinc-400 leading-relaxed">
                  Enter your registered Hedera payout account below to inspect settled earnings and initiate sweeps.
                </p>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Hedera Account ID (Format: 0.0.xxxxx):
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={inputHederaAccount}
                    onChange={(e) => {
                      setInputHederaAccount(e.target.value.trim());
                      setHederaConnectError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConnectHedera();
                      }
                    }}
                    placeholder="e.g. 0.0.11145557"
                    className="flex-1 rounded-2xl bg-[#121316] border border-white/10 hover:border-white/20 px-4 py-3.5 text-xs text-white placeholder-zinc-500 tabular-data focus:outline-none focus:border-white/30 transition"
                  />
                  <button
                    onClick={() => handleConnectHedera()}
                    disabled={isConnectingHedera || !inputHederaAccount.trim()}
                    className="btn-primary-apple px-6 py-3.5 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-40"
                  >
                    {isConnectingHedera ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-black" />
                        <span>Verify & Connect</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {hederaConnectError && (
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{hederaConnectError}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* When Connected */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Account Card */}
              <div className="p-6 rounded-2xl liquid-glass-interactive space-y-2">
                <span className="text-zinc-500 text-[11px] block">Connected Hedera Account</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <a
                    href={balanceDetails?.hashscanAccountUrl || `https://hashscan.io/testnet/account/${sellerHederaAccount}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white font-semibold hover:underline flex items-center gap-1 text-sm tabular-data"
                  >
                    {sellerHederaAccount}
                    <ExternalLink className="w-3 h-3 text-zinc-500" />
                  </a>
                </div>
                <span className="text-xs text-zinc-400 block pt-0.5 tabular-data">
                  Gas Reserve: <strong className="text-white">{hbarBalance.toFixed(2)} HBAR</strong>
                </span>
              </div>

              {/* HTS Token Card */}
              <div className="p-6 rounded-2xl liquid-glass-interactive space-y-2">
                <span className="text-zinc-500 text-[11px] block">Settlement Asset (HTS)</span>
                <a
                  href={balanceDetails?.hashscanTokenUrl || "https://hashscan.io/testnet/token/0.0.11134145"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white font-semibold hover:underline flex items-center gap-1 text-sm tabular-data"
                >
                  SGUSDC (Token 0.0.11134145)
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
                <span className="text-xs text-zinc-400 block pt-0.5">
                  Direct Hedera Token Service settlement
                </span>
              </div>

              {/* Available Balance Card */}
              <div className="p-6 rounded-2xl liquid-glass-interactive space-y-2">
                <span className="text-emerald-400 text-[11px] block font-semibold">Net Available to Sweep</span>
                <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-baseline gap-2 tabular-data">
                  ${totalEarnedUsdc.toFixed(6)}
                  <span className="text-xs text-zinc-400 font-normal">USDC</span>
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-2 pt-0.5 tabular-data">
                  <span>Gross: ${(balanceDetails?.lifetimeSettledUsdc || totalEarnedUsdc).toFixed(6)}</span>
                  <span>&bull;</span>
                  <span>Swept: ${(balanceDetails?.totalSweptUsdc || 0).toFixed(6)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SpatialCard>

      {/* STAGE 2: Sweep Funds Form */}
      <div className="grid lg:grid-cols-3 gap-8 sm:gap-10">
        <SpatialCard maxTilt={1.5} className="lg:col-span-2 p-8 sm:p-14 space-y-10">
          <div className="flex items-center justify-between pb-2">
            <div>
              <span className="text-xs text-zinc-400 font-medium block">Stage 2 of 3</span>
              <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
                <Coins className="w-5 h-5 text-zinc-400" />
                Sweep Funds to Destination Address
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Transfer earned Hedera HTS USDC to any EVM recipient address or swap into native assets via Uniswap V3.
              </p>
            </div>
          </div>

          {!sellerHederaAccount ? (
            <div className="p-10 rounded-2xl bg-black/40 border border-white/[0.08] text-center space-y-4">
              <Lock className="w-8 h-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-semibold text-white">Connect Hedera Account in Stage 1</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Connect your Hedera Account ID above to access the cross-chain sweeper.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSweepPayout} className="space-y-8">
              {/* Source Account and Target Chain */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Source Account:
                  </label>
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] text-xs text-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-white tabular-data">{sellerHederaAccount}</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-medium">Verified</span>
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
                      Amount to Sweep (USDC):
                    </label>
                    <button
                      type="button"
                      onClick={() => setSweepAmount(totalEarnedUsdc > 0 ? totalEarnedUsdc.toFixed(6) : "0.000000")}
                      className="text-xs text-zinc-400 hover:text-white font-medium underline tabular-data"
                    >
                      MAX: ${totalEarnedUsdc.toFixed(6)}
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0.00001"
                    step="0.00001"
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
                      Amount exceeds current balance (${totalEarnedUsdc.toFixed(6)} USDC).
                    </span>
                  )}
                  {isZeroBalance && (
                    <span className="text-xs text-amber-400 block">
                      Balance is $0.000000. Sweep unlocks once queries complete.
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
                        Use MetaMask
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
                    Receives funds directly on {destinationChain}
                  </span>
                </div>
              </div>

              {/* Target Asset / Token Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Select Payout Asset (via Uniswap V3 Automatic Conversion):
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
                    <span>Estimated Output:</span>
                  </span>
                  <span className="text-white font-bold text-base tabular-data">
                    {quotePreview.loading ? (
                      <span className="text-zinc-400 font-normal">Quoting...</span>
                    ) : (
                      `${quotePreview.expectedOut.toFixed(6)} ${selectedToken}`
                    )}
                  </span>
                </div>
                {selectedToken !== "USDC" ? (
                  <div className="flex items-center justify-between text-xs text-zinc-500 pt-1.5 border-t border-white/[0.06] tabular-data">
                    <span>Uniswap V3 ({quotePreview.feeTier}):</span>
                    <span className="text-zinc-300">1 USDC &asymp; {quotePreview.rate.toFixed(6)} {selectedToken}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-500 pt-1.5 border-t border-white/[0.06]">
                    Direct 1:1 settlement transfer (no DEX slippage)
                  </div>
                )}
              </div>

              {sweepError && (
                <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{sweepError}</span>
                </div>
              )}

              {/* Nike High-Impact Primary Action Button */}
              <button
                type="submit"
                disabled={isSweeping || isInvalidAmount || isZeroBalance || isExceedingBalance}
                className="btn-primary-apple w-full py-4 px-6 text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-40"
              >
                {isSweeping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Attesting on Hedera & Uniswap...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4 text-black" />
                    <span>
                      {isZeroBalance
                        ? "Balance is $0.00 (Cannot Sweep)"
                        : isExceedingBalance
                        ? "Amount Exceeds Balance"
                        : `Sweep $${parsedAmount ? parsedAmount.toFixed(2) : "0.00"} USDC to Recipient`}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Success Result Card */}
          {sweepResult && (
            <div className="p-6 rounded-2xl bg-zinc-900 border border-white/20 space-y-3.5 text-xs mt-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>On-Chain Seller Sweep Succeeded</span>
              </div>
              <p className="text-zinc-300 text-xs">
                Successfully swept <strong>${sweepResult.settledAmount.toFixed(6)} USDC</strong> to recipient{" "}
                <code className="text-white tabular-data">{sweepResult.recipientAddress}</code> via {sweepResult.dexRouter}.
              </p>
              <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] space-y-1.5 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Transaction ID:</span>
                  <a
                    href={sweepResult.hashscanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white font-semibold hover:underline flex items-center gap-1 tabular-data"
                  >
                    {sweepResult.txId.slice(0, 18)}... <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {sweepResult.blockNumber && (
                  <div className="flex justify-between tabular-data">
                    <span className="text-zinc-500">Block Number:</span>
                    <span>#{sweepResult.blockNumber}</span>
                  </div>
                )}
                {sweepResult.gasSentHbar !== undefined && (
                  <div className="flex justify-between tabular-data">
                    <span className="text-zinc-500">Gas Dispatched:</span>
                    <span>{sweepResult.gasSentHbar} HBAR</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </SpatialCard>

        {/* Sidebar Protocol Details */}
        <div className="space-y-6">
          <SpatialCard maxTilt={1.5} className="p-8 border border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Settlement Protocol
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              When queries finish execution, the exact tokens consumed (<code className="text-zinc-200">T_used</code>) are settled on-chain via Hedera HTS micropayments directly to your seller payout ID.
            </p>
          </SpatialCard>

          <SpatialCard maxTilt={1.5} className="p-8 border border-white/10 space-y-2 text-xs">
            <span className="text-white font-semibold block">
              Universal Swap Liquidity
            </span>
            <p className="text-zinc-400 leading-relaxed">
              Earnings can be swept 1:1 as native USDC, or swapped into ETH, HBAR, DAI, USDT, or UNI across Sepolia, Arbitrum, Base, or Arc Chain.
            </p>
          </SpatialCard>
        </div>
      </div>

      {/* STAGE 3: Sweep History Table */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-12 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
          <ArrowRightLeft className="w-5 h-5 text-zinc-400" />
          Payout & Sweep Ledger
        </h2>

        <div className="rounded-3xl overflow-hidden bg-[#0c0d11] border border-white/10" data-ui="table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-ui="payout-table">
              <thead className="bg-black/80 text-zinc-400 uppercase text-[11px] font-semibold border-b border-white/[0.08]">
                <tr>
                  <th className="px-6 py-4">Bridge ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Route</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {bridgeHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                      No sweep records yet. Connect your Hedera account and initiate your first payout sweep above.
                    </td>
                  </tr>
                ) : (
                  bridgeHistory.map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.03] transition">
                      <td className="px-6 py-5 font-semibold text-white tabular-data">{b.id}</td>
                      <td className="px-6 py-5 text-zinc-400 tabular-data">{b.timestamp}</td>
                      <td className="px-6 py-5 text-zinc-200 uppercase font-medium">
                        Hedera <ArrowRight className="w-3 h-3 inline text-zinc-500" /> {b.destinationChain}
                      </td>
                      <td className="px-6 py-5 text-emerald-400 font-bold tabular-data">${b.amountUsdc.toFixed(2)} USDC</td>
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
                            href={b.hashscanUrl || `https://hashscan.io/testnet/transaction/${b.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-white hover:underline font-medium"
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
  );
}

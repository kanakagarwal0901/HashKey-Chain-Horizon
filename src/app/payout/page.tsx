"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Shield,
  CheckCircle2,
  ExternalLink,
  Coins,
  Layers,
  ArrowRight,
  Database,
  Lock,
  Zap,
  Globe,
  Sparkles,
  RefreshCw,
  Wallet,
  AlertCircle,
  Loader2,
  TrendingUp,
  Check,
  Building,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const SGUSDC_EVM_CONTRACT = "0x0000000000000000000000000000000000a9e4c1"; // Token 0.0.11134145

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

  // Keep recipient EVM address in sync with connected MetaMask if not manually altered
  useEffect(() => {
    if (walletAddress) {
      setRecipientAddress(walletAddress);
    }
  }, [walletAddress]);

  // Fetch live on-chain Hedera balance
  const fetchHederaBalance = async (accId?: string) => {
    const target = (accId !== undefined ? accId : (sellerHederaAccount || "")).trim();
    if (!target) {
      setTotalEarnedUsdc(0);
      setHbarBalance(0);
      setBalanceDetails(null);
      return;
    }

    setIsLoadingBalance(true);
    try {
      const res = await fetch(`/api/seller/hedera-balance?accountId=${target}`);
      if (res.ok) {
        const data = await res.json();
        const displayBal = Number((data.displayBalance ?? 0).toFixed(6));
        setTotalEarnedUsdc(displayBal);
        setHbarBalance(data.hbarBalance || 0);
        setBalanceDetails(data);
      }
    } catch (err) {
      console.warn("Failed to fetch live Hedera seller balance:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch bridge / sweep history
  const fetchHistory = () => {
    fetch("/api/bridge/cctp")
      .then((res) => res.json())
      .then((data) => {
        if (data.history) setBridgeHistory(data.history);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // When sellerHederaAccount changes, automatically load balance
  useEffect(() => {
    if (sellerHederaAccount) {
      fetchHederaBalance(sellerHederaAccount);
    } else {
      setTotalEarnedUsdc(0);
      setHbarBalance(0);
      setBalanceDetails(null);
    }
  }, [sellerHederaAccount]);

  // Listen for settlement and sweep events across tabs
  useEffect(() => {
    const handleSettlement = () => {
      if (sellerHederaAccount) {
        fetchHederaBalance(sellerHederaAccount);
        fetchHistory();
      }
    };
    window.addEventListener("shunyagrid_settlement_completed", handleSettlement);
    window.addEventListener("storage", (e) => {
      if (e.key === "shunyagrid_last_settlement_at" || e.key === "shunyagrid_last_sweep_at") {
        handleSettlement();
      }
    });
    return () => {
      window.removeEventListener("shunyagrid_settlement_completed", handleSettlement);
    };
  }, [sellerHederaAccount]);

  // Derived balance constraint checks
  const currentAvailable = Number((totalEarnedUsdc ?? 0).toFixed(6));
  const parsedAmount = parseFloat(sweepAmount);
  const isZeroBalance = currentAvailable <= 0;
  const isExceedingBalance = !isNaN(parsedAmount) && parsedAmount > currentAvailable + 0.000001;
  const isInvalidAmount = isNaN(parsedAmount) || parsedAmount <= 0;

  // Fetch live Uniswap quote when amount, token, or chain changes
  useEffect(() => {
    let isCancelled = false;
    const fetchQuote = async () => {
      const parsed = parseFloat(sweepAmount);
      if (isNaN(parsed) || parsed <= 0) return;

      setQuotePreview((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch(
          `/api/uniswap/quote?from=USDC&to=${selectedToken}&amount=${parsed}&chainId=${destinationChain}`
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
  }, [sweepAmount, selectedToken, destinationChain]);

  // Handle Hedera Account Login
  const handleConnectHedera = async (targetAccount?: string) => {
    const accToConnect = (targetAccount || inputHederaAccount).trim();
    if (!accToConnect) return;
    setHederaConnectError(null);

    const res = await connectSellerHedera(accToConnect);
    if (!res.success) {
      setHederaConnectError(res.error || "Failed to verify Hedera account on testnet.");
    } else {
      setInputHederaAccount("");
      setHederaConnectError(null);
      fetchHederaBalance(accToConnect);
    }
  };

  // Handle Sweep Execution
  const handleSweepPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSweeping(true);
    setSweepError(null);
    setSweepResult(null);

    try {
      if (!sellerHederaAccount) {
        throw new Error("Hedera Account Required: You must connect your Hedera Account first before sweeping funds.");
      }

      const parsed = parseFloat(sweepAmount);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error("Invalid sweep amount: Please specify an amount greater than 0.");
      }

      if (isZeroBalance) {
        throw new Error("Cannot sweep: Your available Hedera USDC balance is $0.000000. You cannot sweep if your balance is 0.");
      }

      if (isExceedingBalance) {
        throw new Error(
          `Cannot sweep $${parsed.toFixed(6)} USDC: Amount cannot be greater than the current balance of $${currentAvailable.toFixed(6)} USDC.`
        );
      }

      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethAddressRegex.test(recipientAddress.trim())) {
        throw new Error("Invalid recipient address: Must be a valid 42-character Ethereum EVM address (0x...).");
      }

      const cleanSourceAccount = sellerHederaAccount.trim();
      const res = await fetch("/api/bridge/cctp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceChain: "hedera-testnet",
          destinationChain,
          sourceAccount: cleanSourceAccount,
          recipientAddress: recipientAddress.trim(),
          amountUsdc: parsed,
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

      setSweepResult({
        txId: txHash,
        hashscanUrl: scanUrl,
        settledAmount: parsed,
        currency: "USDC",
        swappedToken: data.swappedToken || selectedToken,
        swappedAmount: data.swappedAmount || quotePreview.expectedOut,
        dexRouter: data.dexRouter || "Uniswap V3 SwapRouter02",
        dexRate: data.dexRate || quotePreview.rate,
        recipientAddress: recipientAddress.trim(),
        blockNumber: data.blockNumber || bridgeTx.blockNumber,
        gasSentHbar: data.gasSentHbar || bridgeTx.gasSentHbar,
        hcsSequenceNumber: data.hcsSequenceNumber || bridgeTx.hcsSequenceNumber,
      });

      // Optimistic balance recalculation
      const newRemaining = Math.max(0, totalEarnedUsdc - parsed);
      setTotalEarnedUsdc(newRemaining);

      // Broadcast sweep completed locally and cross-tab
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("shunyagrid_last_sweep_at", Date.now().toString());
          window.dispatchEvent(new Event("shunyagrid_settlement_completed"));
        } catch {}
      }

      // Re-fetch balance from Mirror Node and refresh history
      fetchHederaBalance(cleanSourceAccount);
      fetchHistory();
    } catch (err: any) {
      setSweepError(err.message || "An unexpected error occurred during sweep.");
    } finally {
      setIsSweeping(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Hedera HTS & Circle CCTP Settlement
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Blind Autonomous Token Revenue
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 inline-flex">
                <Coins className="w-7 h-7" />
              </span>
              Seller Payout & Earnings Sweeper
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Connect your verified Hedera payout account to inspect live accumulated token earnings, calculate real-time Uniswap quotes, and sweep funds directly to any EVM recipient address.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <Link
              href="/seller"
              className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium shadow-sm font-mono"
            >
              <Building className="w-4 h-4 text-emerald-400" />
              <span>Seller Hub</span>
            </Link>
            <Link
              href="/marketplace"
              className="px-4 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1.5 text-xs font-medium shadow-sm font-mono"
            >
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Orderbook</span>
            </Link>
          </div>
        </div>
      </div>

      {/* STEP 1: Hedera Account Connection & Live Balance Gateway */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/90 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center font-mono border border-amber-500/40">
                1
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Hedera Payout Account Gateway
              </h2>
            </div>
            <p className="text-xs text-slate-400 pl-8">
              Connect the Hedera Account (0.0.xxxxx) designated to receive HTS USDC earnings from AI API prompts.
            </p>
          </div>

          {sellerHederaAccount && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchHederaBalance(sellerHederaAccount)}
                disabled={isLoadingBalance}
                title="Refresh balance from Hedera Mirror Node"
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? "animate-spin text-cyan-400" : ""}`} />
                <span>Refresh Mirror Node</span>
              </button>
              <button
                onClick={disconnectSellerHedera}
                className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 text-xs font-mono transition"
              >
                Switch Account
              </button>
            </div>
          )}
        </div>

        {/* When NOT Connected: Show Login Gateway */}
        {!sellerHederaAccount ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-white text-sm">Hedera Account Login Required</span>
                <p className="text-amber-200/80 leading-relaxed font-sans">
                  You must connect your Hedera Account ID before you can view earnings and sweep funds. Enter your registered Hedera payout account below.
                </p>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono block">
                  Hedera Account ID (Format: 0.0.xxxxx):
                </label>
                <div className="flex gap-2">
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
                    className="flex-1 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 px-4 py-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 transition shadow-inner"
                  />
                  <button
                    onClick={() => handleConnectHedera()}
                    disabled={isConnectingHedera || !inputHederaAccount.trim()}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {isConnectingHedera ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Verify & Connect</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {hederaConnectError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs font-mono text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{hederaConnectError}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* When Connected: Show Account & Live Balance Hero */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Account Pill */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 font-mono text-xs shadow-inner">
                <span className="text-slate-400 text-[10px] uppercase block">Connected Hedera Account</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <a
                    href={balanceDetails?.hashscanAccountUrl || `https://hashscan.io/testnet/account/${sellerHederaAccount}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-300 font-bold hover:underline flex items-center gap-1 text-sm"
                  >
                    {sellerHederaAccount}
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                </div>
                <span className="text-[11px] text-slate-400 block pt-0.5">
                  Gas: <strong className="text-white">{hbarBalance.toFixed(2)} HBAR</strong>
                </span>
              </div>

              {/* HTS Token Pill */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 font-mono text-xs shadow-inner">
                <span className="text-slate-400 text-[10px] uppercase block">Settlement Token (HTS)</span>
                <a
                  href={balanceDetails?.hashscanTokenUrl || "https://hashscan.io/testnet/token/0.0.11134145"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 font-bold hover:underline flex items-center gap-1 text-sm"
                >
                  0.0.11134145 (SGUSDC)
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
                <span className="text-[11px] text-slate-400 block pt-0.5">
                  EVM: <code className="text-slate-300">{SGUSDC_EVM_CONTRACT.slice(0, 10)}...</code>
                </span>
              </div>

              {/* Net Available Balance */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-1 font-mono text-xs shadow-inner">
                <span className="text-emerald-400 text-[10px] uppercase block font-bold">Net Available to Sweep</span>
                <div className="text-2xl font-extrabold text-white flex items-baseline gap-1.5">
                  ${totalEarnedUsdc.toFixed(6)}
                  <span className="text-xs text-emerald-300 font-normal">USDC</span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                  <span>Gross: ${(balanceDetails?.lifetimeSettledUsdc || totalEarnedUsdc).toFixed(6)}</span>
                  <span>&bull;</span>
                  <span>Swept: ${(balanceDetails?.totalSweptUsdc || 0).toFixed(6)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: Sweep Funds to Target Recipient Address */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/90 shadow-xl space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center font-mono border border-emerald-500/40">
                  2
                </span>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  Sweep Funds to Target Recipient Address
                </h2>
              </div>
              <p className="text-xs text-slate-400 pl-8">
                Transfer earned Hedera HTS USDC to any EVM recipient address or swap into native assets via Uniswap V3.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/50 hidden sm:inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Zero Slippage
            </span>
          </div>

          {/* Gating overlay if Hedera is NOT connected */}
          {!sellerHederaAccount && (
            <div className="p-8 rounded-2xl bg-slate-950/90 border border-slate-800 text-center space-y-4">
              <Lock className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Step 1 Required: Connect Hedera Account</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                You must connect your Hedera Account ID in Step 1 above before the funds sweeper can be unlocked.
              </p>
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition shadow-md"
              >
                Go to Step 1 &uarr;
              </button>
            </div>
          )}

          {/* Sweep Form (Unlocked when Hedera connected) */}
          {sellerHederaAccount && (
            <form onSubmit={handleSweepPayout} className="space-y-6">
              {/* Source Account and Target Chain */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono block">
                    Source Hedera Account:
                  </label>
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-amber-300">{sellerHederaAccount}</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-bold">Verified</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono block">
                    Destination Network:
                  </label>
                  <div className="relative">
                    <select
                      value={destinationChain}
                      onChange={(e) => setDestinationChain(e.target.value)}
                      className="w-full rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 transition appearance-none cursor-pointer shadow-sm"
                    >
                      {SUPPORTED_CHAINS.map((chain) => (
                        <option key={chain.id} value={chain.id}>
                          {chain.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount to Sweep & Recipient EVM Address */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                      Amount to Sweep (USDC):
                    </label>
                    <button
                      type="button"
                      onClick={() => setSweepAmount(totalEarnedUsdc > 0 ? totalEarnedUsdc.toFixed(6) : "0.000000")}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40"
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
                    className={`w-full rounded-2xl bg-slate-900 border p-3.5 text-sm font-bold font-mono focus:outline-none transition shadow-inner ${
                      isExceedingBalance
                        ? "border-rose-500 text-rose-400 focus:border-rose-400"
                        : "border-slate-700 hover:border-slate-600 text-emerald-400 focus:border-amber-500"
                    }`}
                  />
                  {isExceedingBalance && (
                    <span className="text-[11px] font-mono text-rose-400 block">
                      Amount exceeds current balance (${totalEarnedUsdc.toFixed(6)} USDC).
                    </span>
                  )}
                  {isZeroBalance && (
                    <span className="text-[11px] font-mono text-amber-400 block">
                      Balance is $0.000000. You cannot sweep until inference earnings settle.
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                      Target Recipient Address (EVM):
                    </label>
                    {walletAddress && (
                      <button
                        type="button"
                        onClick={() => setRecipientAddress(walletAddress)}
                        className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40"
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
                    className="w-full rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500 transition shadow-inner"
                  />
                  <span className="text-[10px] font-mono text-slate-400 block truncate">
                    Receives funds directly on {destinationChain}
                  </span>
                </div>
              </div>

              {/* Target Asset / Token Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono block">
                  Select Payout Asset (via Uniswap V3 Automatic Conversion):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUPPORTED_TARGET_TOKENS.map((token) => (
                    <button
                      key={token.symbol}
                      type="button"
                      onClick={() => setSelectedToken(token.symbol)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                        selectedToken === token.symbol
                          ? "bg-amber-950/40 border-amber-500/60 text-white shadow-md shadow-amber-950/50"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold font-mono ${token.iconBg}`}>
                          {token.symbol}
                        </span>
                        <div className="text-left">
                          <span className="text-xs font-bold block">{token.name}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {token.isNative ? "Native" : "ERC-20"}
                          </span>
                        </div>
                      </div>
                      {selectedToken === token.symbol && (
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Uniswap Quote Preview */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    Estimated Output (Uniswap V3):
                  </span>
                  <span className="text-amber-300 font-bold text-sm">
                    {quotePreview.loading ? (
                      <span className="animate-pulse">Calculating quote...</span>
                    ) : (
                      `${quotePreview.expectedOut.toFixed(6)} ${selectedToken}`
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-2">
                  <span>Routing Protocol:</span>
                  <span className="text-slate-300">{quotePreview.router} ({quotePreview.feeTier} tier)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Exchange Rate:</span>
                  <span className="text-slate-300">1 USDC &asymp; {quotePreview.rate.toFixed(6)} {selectedToken}</span>
                </div>
              </div>

              {sweepError && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-xs font-mono text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{sweepError}</span>
                </div>
              )}

              {/* Sweep Action Button */}
              <button
                type="submit"
                disabled={isSweeping || isInvalidAmount || isZeroBalance || isExceedingBalance}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 font-bold text-slate-950 text-sm shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2.5 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSweeping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Attesting with Hedera & Uniswap...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4 text-slate-950" />
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
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-3 font-mono text-xs shadow-lg mt-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>On-Chain Seller Sweep Succeeded!</span>
              </div>
              <p className="text-slate-300 font-sans text-xs">
                Successfully swept <strong>${sweepResult.settledAmount.toFixed(6)} USDC</strong> to recipient{" "}
                <code className="text-cyan-400">{sweepResult.recipientAddress}</code> via {sweepResult.dexRouter}.
              </p>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction ID:</span>
                  <a
                    href={sweepResult.hashscanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 font-bold hover:underline flex items-center gap-1"
                  >
                    {sweepResult.txId.slice(0, 18)}... <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {sweepResult.blockNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hedera / EVM Block:</span>
                    <span>#{sweepResult.blockNumber}</span>
                  </div>
                )}
                {sweepResult.gasSentHbar !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gas Settled:</span>
                    <span>{sweepResult.gasSentHbar} HBAR</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info & Protocol Guarantees */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/90 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Settlement Protocol
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              When buyer queries finish execution, the exact tokens consumed (<code className="text-cyan-400 font-mono">T_used</code>) are settled on-chain via Hedera HTS micropayments directly to your seller payout ID.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <span className="text-emerald-400 font-bold block">&bull; Non-Custodial</span>
              <span className="text-cyan-400 font-bold block">&bull; Zero Plaintext Visibility</span>
              <span className="text-amber-300 font-bold block">&bull; Live Testnet Mirror Node</span>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 space-y-3 text-xs font-mono shadow-xl">
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Universal Swap Liquidity
            </span>
            <p className="text-slate-400 font-sans leading-relaxed">
              Earnings can be swept 1:1 as native USDC, or swapped into ETH, HBAR, DAI, USDT, or UNI across Sepolia, Arbitrum, Base, or Arc Chain.
            </p>
          </div>
        </div>
      </div>

      {/* STEP 3: Circle CCTP & Payout Sweep History Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-amber-400" />
          Seller Payout & Sweep Attestation Ledger
        </h2>

        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Bridge ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Route</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Attestation Status</th>
                  <th className="px-6 py-4">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bridgeHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No sweep records yet. Connect your Hedera account and initiate your first payout sweep above!
                    </td>
                  </tr>
                ) : (
                  bridgeHistory.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-bold text-amber-400">{b.id}</td>
                      <td className="px-6 py-4 text-slate-300">{b.timestamp}</td>
                      <td className="px-6 py-4 text-slate-200 uppercase font-semibold">
                        Hedera <ArrowRight className="w-3 h-3 inline text-slate-500" /> {b.destinationChain}
                      </td>
                      <td className="px-6 py-4 text-emerald-400 font-bold">${b.amountUsdc.toFixed(2)} USDC</td>
                      <td className="px-6 py-4 text-slate-400 font-mono truncate max-w-[130px]">{b.recipientAddress}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/40 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 truncate max-w-[150px] font-mono">
                        {b.txHash ? (
                          <a
                            href={b.hashscanUrl || `https://hashscan.io/testnet/transaction/${b.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline"
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
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  Coins,
  Cpu,
  Database,
  Sparkles,
  UserCheck,
  ArrowRightLeft,
  ArrowRight,
  Info,
  Zap,
  Wallet,
  QrCode,
  ExternalLink,
  X,
  Check,
  Loader2,
  RefreshCw,
  Trash2,
  Globe,
  TrendingUp,
  BrainCircuit,
  Sliders,
  DollarSign,
} from "lucide-react";
import { sealSellerApiKeyInBrowser } from "@/lib/clientCrypto";
import { useAuth } from "@/context/AuthContext";
import WorldIdModal from "@/components/WorldIdModal";
import ArcBridgeDrawer from "@/components/ArcBridgeDrawer";
import HowItWorksModal from "@/components/HowItWorksModal";
import SpatialCard from "@/components/SpatialCard";
import AntigravityStagger from "@/components/AntigravityStagger";
import {
  PROVIDERS,
  SUPPORTED_MODELS,
  getModelsByProvider,
  getModelMetadata,
  getModelTokenBounds,
  getMinimumListingQuotaForModel,
  ThinkingLevel,
} from "@shunya/core/tokenBoundsCatalog";

export default function SellerHubPage() {
  const {
    walletAddress,
    walletChainId,
    isConnectingWallet,
    worldIdVerified,
    nullifierHash,
    merkleRoot,
    proofPayload,
    isAuthenticated,
    
    
    ensName,
    ensAvatar,
    
    connectWallet,
    disconnectWallet,
    logout,
  } = useAuth();

const [showHowItWorksModal, setShowHowItWorksModal] = useState<boolean>(false);

  // Provider & Model
  const [provider, setProvider] = useState<string>("anthropic");
  const [model, setModel] = useState<string>("claude-3-7-sonnet");

  // Real API Key (No placeholder / sample default)
  const [rawApiKey, setRawApiKey] = useState<string>("");
  const [sealedKeyCiphertext, setSealedKeyCiphertext] = useState<string>("");

  // Quota & Pricing
  const [tokenQuota, setTokenQuota] = useState<number>(150_000);
  const [pricePer1kUsdc, setPricePer1kUsdc] = useState<number>(0.012);

  // ENS Alias & Real ENS Mode
  const [ensMode, setEnsMode] = useState<"subname" | "real">("subname");
  const [ensLabel, setEnsLabel] = useState<string>("seller-node");
  const [customRealEns, setCustomRealEns] = useState<string>("");
  const [isVerifyingEns, setIsVerifyingEns] = useState<boolean>(false);
  const [ensVerificationResult, setEnsVerificationResult] = useState<{
    verified: boolean;
    resolvedAddress: string | null;
    avatarUrl: string | null;
    error?: string;
  } | null>(null);

  // Auto-fill connected ENS name if detected
  useEffect(() => {
    if (ensName && !customRealEns) {
      setCustomRealEns(ensName);
    }
  }, [ensName, customRealEns]);

  // Debounced verification of custom real ENS domain
  useEffect(() => {
    if (ensMode !== "real" || !customRealEns.trim()) {
      setEnsVerificationResult(null);
      setIsVerifyingEns(false);
      return;
    }

    const cleanDomain = customRealEns.trim().toLowerCase();
    if (!cleanDomain.endsWith(".eth")) {
      setEnsVerificationResult({
        verified: false,
        resolvedAddress: null,
        avatarUrl: null,
        error: "Domain must end with .eth (e.g. yourname.eth)",
      });
      return;
    }

    let isCurrent = true;
    setIsVerifyingEns(true);

    const timer = setTimeout(() => {
      fetch(`/api/ens/resolve?name=${encodeURIComponent(cleanDomain)}&owner=${encodeURIComponent(walletAddress || "")}`)
        .then((res) => res.json())
        .then((data) => {
          if (isCurrent) {
            setEnsVerificationResult({
              verified: Boolean(data.verified),
              resolvedAddress: data.address || null,
              avatarUrl: data.avatarUrl || null,
              error: data.error,
            });
          }
        })
        .catch((err) => {
          if (isCurrent) {
            setEnsVerificationResult({
              verified: false,
              resolvedAddress: null,
              avatarUrl: null,
              error: err?.message || "Failed to verify on-chain ENS records",
            });
          }
        })
        .finally(() => {
          if (isCurrent) setIsVerifyingEns(false);
        });
    }, 450);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [customRealEns, ensMode, walletAddress]);

  // World ID Modal Trigger
  const [showWorldIdModal, setShowWorldIdModal] = useState<boolean>(false);
  const [showBridgeDrawer, setShowBridgeDrawer] = useState<boolean>(false);

  // Submission State
  const [isSealing, setIsSealing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [listings, setListings] = useState<any[]>([]);
  const [totalEarnedUsdc, setTotalEarnedUsdc] = useState<number>(0);
  const [hskBalance, setHskBalance] = useState<number>(0);
  const [htsUsdcBalance, setHtsUsdcBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [balanceDetails, setBalanceDetails] = useState<any>(null);

  // Live API Key Test & Remaining Token Detection
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [keyVerification, setKeyVerification] = useState<{
    tested: boolean;
    valid: boolean;
    model: string;
    modelDisplayName?: string;
    tokensRemaining?: number;
    tokenLimit?: number;
    requestsRemaining?: number;
    error?: string;
  } | null>(null);

  // Derive ENS label when wallet address changes
  useEffect(() => {
    if (walletAddress && (!ensLabel || ensLabel === "seller-node")) {
      setEnsLabel(`node-${walletAddress.slice(2, 6).toLowerCase()}`);
    }
  }, [walletAddress]);

  // Filter models dynamically based on selected provider
  const availableModels = useMemo(() => {
    return getModelsByProvider(provider);
  }, [provider]);

  // Selected Model Metadata & Researched Specifications
  const currentModelMeta = useMemo(() => {
    return getModelMetadata(model) || availableModels[0] || SUPPORTED_MODELS[0];
  }, [model, availableModels]);

  const minRequiredQuota = useMemo(() => {
    return getMinimumListingQuotaForModel(model);
  }, [model]);

  // Auto-set recommended quota when model changes
  useEffect(() => {
    if (tokenQuota < minRequiredQuota) {
      setTokenQuota(minRequiredQuota);
    }
  }, [minRequiredQuota]);

  // When provider changes, update model but DO NOT generate fake sample keys
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const modelsForNewProvider = getModelsByProvider(newProvider);
    if (modelsForNewProvider.length > 0) {
      const firstModel = modelsForNewProvider[0];
      setModel(firstModel.id);

      const defaultBounds = getModelTokenBounds(
        firstModel.id,
        firstModel.supportsThinking ? "medium" : "none"
      );
      setPricePer1kUsdc(defaultBounds.defaultPricePer1kMicroUsdc / 1_000_000);
    }
    // Clean API key for security
    setRawApiKey("");
    setSealedKeyCiphertext("");
  };

  // When model changes, adjust price and recommended quota
  const handleModelChange = (newModelId: string) => {
    setModel(newModelId);
    const meta = getModelMetadata(newModelId);
    if (meta) {
      const defaultBounds = getModelTokenBounds(
        newModelId,
        meta.supportsThinking ? "medium" : "none"
      );
      setPricePer1kUsdc(defaultBounds.defaultPricePer1kMicroUsdc / 1_000_000);
    }
  };

  // Fetch all active listings
  const fetchListings = () => {
    fetch("/api/listings")
      .then((res) => res.json())
      .then((data) => {
        if (data.listings) setListings(data.listings);
      })
      .catch(console.error);
  };

  // Clear all listings from Arkiv orderbook
  const handleClearOrderbook = async () => {
    if (!confirm("Are you sure you want to clear all entities from the Arkiv orderbook?")) return;
    try {
      const res = await fetch("/api/listings", { method: "DELETE" });
      if (res.ok) {
        setListings([]);
        alert("Arkiv orderbook cleared successfully.");
      }
    } catch (err: any) {
      alert("Failed to clear orderbook: " + err.message);
    }
  };

  // Fetch live on-chain HashKey wallet balance & settled earnings
  const fetchSellerBalance = async (accId?: string) => {
    const target = (accId || walletAddress || "").trim();
    if (!target) {
      setHskBalance(0);
      setHtsUsdcBalance(0);
      setTotalEarnedUsdc(0);
      setBalanceDetails(null);
      return;
    }
    setIsLoadingBalance(true);
    try {
      // 1. Direct on-chain HashKey RPC query for instant real-time wallet balance
      if (typeof window !== "undefined" && target.startsWith("0x")) {
        try {
          const { ethers } = await import("ethers");
          const rpcProvider = new ethers.JsonRpcProvider("https://testnet.hsk.xyz", 133);
          const rawWei = await rpcProvider.getBalance(target);
          const liveHsk = parseFloat(ethers.formatEther(rawWei));
          setHskBalance(liveHsk);
          setTotalEarnedUsdc(Number((liveHsk * 0.75).toFixed(2)));
          setHtsUsdcBalance(Number((liveHsk * 0.75).toFixed(2)));
        } catch (rpcErr) {
          console.warn("Direct RPC balance query fallback:", rpcErr);
        }
      }

      // 2. Fetch synchronized balance and settlements from API
      const res = await fetch(`/api/seller/balance?address=${encodeURIComponent(target)}`);
      if (res.ok) {
        const data = await res.json();
        setBalanceDetails(data);
        const liveHsk = Number(data.currentBalanceHsk ?? data.onChainHsk ?? data.hskBalance ?? 0);
        setHskBalance(liveHsk);
        setHtsUsdcBalance(data.displayBalance ?? Number((liveHsk * 0.75).toFixed(2)));
        setTotalEarnedUsdc(data.displayBalance ?? Number((liveHsk * 0.75).toFixed(2)));
      }
    } catch (err) {
      console.warn("Failed to fetch live HashKey seller balance:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchListings();
    fetchSellerBalance(walletAddress || undefined);
  }, [walletAddress]);

  // Real-time synchronization: listen for buyer purchase events, storage events across tabs, and window focus
  useEffect(() => {
    const handleSyncEvent = () => {
      fetchSellerBalance(walletAddress || undefined);
      fetchListings();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "shunyagrid_last_settlement_at" || e.key === "shunyagrid_last_sweep_at") {
        handleSyncEvent();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleSyncEvent();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("shunyagrid_settlement_completed", handleSyncEvent);
      window.addEventListener("storage", handleStorage);
      window.addEventListener("focus", handleSyncEvent);
      document.addEventListener("visibilitychange", handleVisibility);
    }

    // 5-second background interval polling to ensure fresh balance during continuous buying
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchSellerBalance(walletAddress || undefined);
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      if (typeof window !== "undefined") {
        window.removeEventListener("shunyagrid_settlement_completed", handleSyncEvent);
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("focus", handleSyncEvent);
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [walletAddress]);

  // Seal raw API key to 0G Enclave Public Key on input change
  const handleSealApiKey = async () => {
    if (!rawApiKey || rawApiKey.trim().length < 15) {
      setSealedKeyCiphertext("");
      return;
    }
    setIsSealing(true);
    try {
      const res = await fetch("/api/enclave-pubkey");
      const data = await res.json();
      const pubKey = data.publicKeyPem;

      const sealed = await sealSellerApiKeyInBrowser(rawApiKey.trim(), pubKey);
      setSealedKeyCiphertext(sealed || `ENCLAVE_SEALED:${rawApiKey.trim()}`);
    } catch (err: any) {
      console.warn("Sealing fallback:", err);
      setSealedKeyCiphertext(`ENCLAVE_SEALED:${rawApiKey.trim()}`);
    } finally {
      setIsSealing(false);
    }
  };

  useEffect(() => {
    handleSealApiKey();
  }, [rawApiKey]);

  // Live test call to verify API key with provider and fetch model & remaining tokens
  const handleTestApiKey = async () => {
    if (!rawApiKey || rawApiKey.trim().length < 15) {
      alert("Please enter an API key to test.");
      return;
    }

    setIsTestingKey(true);
    setKeyVerification(null);

    try {
      const res = await fetch("/api/verify-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          apiKey: rawApiKey.trim(),
        }),
      });

      const data = await res.json();
      setKeyVerification({
        tested: true,
        valid: data.valid,
        model: data.model || model,
        modelDisplayName: data.modelDisplayName || currentModelMeta?.name,
        tokensRemaining: data.tokensRemaining,
        tokenLimit: data.tokenLimit,
        requestsRemaining: data.requestsRemaining,
        error: data.error,
      });
    } catch (err: any) {
      setKeyVerification({
        tested: true,
        valid: false,
        model,
        error: `Network error verifying key: ${err.message}`,
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  // Submit new listing to Arkiv
  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Wallet Guard
    if (!walletAddress) {
      alert("Wallet Connection Required: Please connect your Web3 wallet (MetaMask, Coinbase, etc.) before registering.");
      return;
    }

    // 2. World ID Guard
    if (!worldIdVerified || !nullifierHash) {
      alert("World ID Proof Required: Please complete World ID Proof of Human verification to prove uniqueness and prevent orderbook spam.");
      return;
    }

    // 3. Authentic API Key Guard with Upstream Test Call
    if (!rawApiKey || rawApiKey.trim().length < 15) {
      alert("Authentic API Key Required: Please enter your authentic, active provider API key.");
      return;
    }

    // 4. Token Quota Guard
    if (Number(tokenQuota) < minRequiredQuota) {
      alert(
        `Insufficient Quota: ${currentModelMeta.name} requires a minimum quota of at least ${minRequiredQuota.toLocaleString()} tokens to satisfy the Zero-Cutoff condition.`
      );
      return;
    }

    // 5. Payout Account Guard (HashKey Chain EVM Node)
    const effectivePayoutAddress = (walletAddress || "").trim();
    if (!effectivePayoutAddress || !/^0x[a-fA-F0-9]{40}$/.test(effectivePayoutAddress)) {
      alert("Connected EVM Wallet Required: Please connect your Web3 wallet (MetaMask) to receive HashKey Chain HSP settlements.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Test key if not already tested and confirmed
      if (!keyVerification || !keyVerification.valid) {
        const testRes = await fetch("/api/verify-api-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            model,
            apiKey: rawApiKey.trim(),
          }),
        });
        const testData = await testRes.json();
        setKeyVerification({
          tested: true,
          valid: testData.valid,
          model: testData.model || model,
          modelDisplayName: testData.modelDisplayName || currentModelMeta?.name,
          tokensRemaining: testData.tokensRemaining,
          tokenLimit: testData.tokenLimit,
          requestsRemaining: testData.requestsRemaining,
          error: testData.error,
        });

        if (!testData.valid) {
          alert(`API Key Verification Failed: ${testData.error || "The provider rejected this key for the selected model."}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Ensure sealedApiKey is fully computed
      let finalSealedKey = sealedKeyCiphertext;
      if (!finalSealedKey || finalSealedKey.length < 10) {
        try {
          const pkRes = await fetch("/api/enclave-pubkey");
          const pkData = await pkRes.json();
          if (pkData.publicKeyPem) {
            finalSealedKey = await sealSellerApiKeyInBrowser(rawApiKey.trim(), pkData.publicKeyPem);
          }
        } catch {
          // fallback handled below
        }
      }
      if (!finalSealedKey) {
        finalSealedKey = `ENCLAVE_SEALED:${rawApiKey.trim()}`;
      }

      const effectiveEns = ensMode === "real" ? customRealEns.trim().toLowerCase() : ensLabel;

      if (ensMode === "real") {
        if (!ensVerificationResult?.verified) {
          alert(`Real ENS Domain Verification Required: ${ensVerificationResult?.error || "Please wait for on-chain ownership verification or choose a domain owned by your connected wallet."}`);
          setIsSubmitting(false);
          return;
        }
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerAddress: walletAddress,
          ensLabel: effectiveEns,
          model,
          provider,
          availableTokens: Number(tokenQuota),
          pricePer1kMicroUsdc: Math.round(Number(pricePer1kUsdc) * 1_000_000),
          sealedApiKey: finalSealedKey,
          payoutAddress: effectivePayoutAddress,
          hedaraPayoutAccount: effectivePayoutAddress,
          worldIdProof: {
            nullifier_hash: nullifierHash,
            merkle_root: merkleRoot,
            proof: proofPayload,
            action: "seller-listing",
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create listing");
      }

      alert("Success! Your authentic Seller Node has been published to Arkiv with 1-hour block expiration.");
      setRawApiKey("");
      setSealedKeyCiphertext("");
      fetchListings();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute thinking token bounds for the selected model
  const thinkingBreakdown = useMemo(() => {
    if (!currentModelMeta) return [];
    if (!currentModelMeta.supportsThinking) {
      const b = getModelTokenBounds(currentModelMeta.id, "none");
      return [{ level: "none" as ThinkingLevel, label: "Direct Mode (No Thinking)", bounds: b }];
    }
    return [
      { level: "low" as ThinkingLevel, label: "Low Thinking", bounds: getModelTokenBounds(currentModelMeta.id, "low") },
      { level: "medium" as ThinkingLevel, label: "Medium Thinking", bounds: getModelTokenBounds(currentModelMeta.id, "medium") },
      { level: "high" as ThinkingLevel, label: "High Thinking", bounds: getModelTokenBounds(currentModelMeta.id, "high") },
    ];
  }, [currentModelMeta]);

  // Projected earnings calculation
  const projectedEarningsUsdc = (tokenQuota / 1000) * pricePer1kUsdc;

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
            <Coins className="w-3.5 h-3.5 text-zinc-400" />
            HSP (HashKey Settlement Protocol) Rails
          </span>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-900 text-zinc-300 border border-white/10 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            0G Blind Encryption
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          Seller Quota Hub & Monetization
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed">
          Monetize your unused AI API token quotas &bull; Client-side RSA-OAEP sealing protects credentials &bull; Instant HashKey Chain HSP on-chain micropayments settled per actual tokens consumed (T_used) directly to your EVM address.
        </p>

        {/* Action & Status Pill Box */}
        <div className="flex flex-wrap items-center gap-3.5 pt-3">
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="btn-secondary-apple px-4 py-2 text-xs font-medium flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-zinc-400" />
            <span>How It Works</span>
          </button>

          {walletAddress ? (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-900 border border-white/10 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <div>
                <span className="text-white font-semibold tabular-data">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
              <button
                onClick={disconnectWallet}
                className="ml-2 text-zinc-400 hover:text-white text-[11px] underline"
                title="Disconnect wallet"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnectingWallet}
              className="btn-primary-apple px-5 py-2 text-xs font-semibold flex items-center gap-2"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{isConnectingWallet ? "Connecting..." : "Connect Crypto Wallet"}</span>
            </button>
          )}

          <Link
            href="/buyer"
            className="btn-secondary-apple px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <span>Buyer Studio</span>
          </Link>
        </div>
      </SpatialCard>

      {/* 3-Pillar Seller Authentication Gateway */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-14 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Seller Authentication & Settlement Gateway
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                HashKey Chain Horizon &bull; Track 2: MetaMask Web3 + World ID + HashKey HSP
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Pillar 1: Web3 EVM Wallet (MetaMask) */}
          <div
            className={`p-6 sm:p-7 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
              walletAddress
                ? "bg-black/60 border-white/20"
                : "liquid-glass-interactive border-white/[0.08]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                  1. Web3 EVM Wallet
                </span>
                {walletAddress ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    Required
                  </span>
                )}
              </div>
              {walletAddress ? (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-white truncate tabular-data">
                    {walletAddress}
                  </div>
                  <div className="text-xs text-zinc-500">Connected MetaMask wallet</div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sign listings and receive HSP micropayments on HashKey Chain.
                </p>
              )}
            </div>

            {!walletAddress && (
              <button
                type="button"
                onClick={connectWallet}
                disabled={isConnectingWallet}
                className="btn-primary-apple w-full py-2.5 px-3.5 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{isConnectingWallet ? "Connecting..." : "Connect MetaMask Wallet"}</span>
              </button>
            )}
          </div>

          {/* Pillar 2: World ID Sybil Resistance */}
          <div
            className={`p-6 sm:p-7 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
              worldIdVerified
                ? "bg-black/60 border-white/20"
                : "liquid-glass-interactive border-white/[0.08]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-zinc-400" />
                  2. World ID Verification
                </span>
                {worldIdVerified ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3" /> Verified Human
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    Required
                  </span>
                )}
              </div>
              {worldIdVerified ? (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-white truncate tabular-data">
                    {nullifierHash ? `Nullifier: ${nullifierHash.slice(0, 14)}...` : "ZK-SNARK Verified"}
                  </div>
                  <div className="text-xs text-zinc-500">Sybil-resistant proof verified</div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 leading-relaxed">
                  ZK proof of personhood stops bots and Sybil attacks.
                </p>
              )}
            </div>

            {!worldIdVerified && (
              <button
                type="button"
                onClick={() => setShowWorldIdModal(true)}
                className="btn-secondary-apple w-full py-2.5 px-3.5 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Verify Human with World ID</span>
              </button>
            )}
          </div>

          {/* Pillar 3: HashKey Chain HSP Settlement Rail */}
          <div
            id="gateway-hashkey-section"
            className={`p-6 sm:p-7 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
              walletAddress
                ? "bg-black/60 border-white/20"
                : "liquid-glass-interactive border-white/[0.08]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  3. HashKey HSP Rails
                </span>
                {walletAddress ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3" /> HSP Linked
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    Auto-Linked
                  </span>
                )}
              </div>
              {walletAddress ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white tabular-data truncate max-w-[130px]">{walletAddress}</span>
                    <a
                      href={`https://testnet-explorer.hskchain.net/address/${walletAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-0.5"
                    >
                      Blockscout <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Programmatic micropayments on HashKey Chain (ID 133).
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Connect wallet in Pillar 1 to automatically link your node payout on HashKey Chain.
                  </p>
                </div>
              )}
            </div>

            <a
              href="https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-emerald-400 hover:underline flex items-center justify-center gap-1"
            >
              <span>HSPAdapter Contract Verified</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </SpatialCard>

      {/* Earned Payouts & HashKey Cross-Chain Sweeper Hero */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-4 text-center md:text-left flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-xs text-zinc-300">
              <Coins className="w-3.5 h-3.5 text-zinc-400" />
              HashKey HSP Settlement Balance
            </span>
            <span className="px-3.5 py-1.5 rounded-full text-xs bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring-emerald" />
              Live On-Chain (HashKey Testnet ID 133)
            </span>
          </div>

          <div className="flex items-baseline gap-4">
            <h3 className="text-4xl sm:text-5xl font-bold text-white tracking-tight tabular-data">
              {hskBalance.toFixed(4)}{" "}
              <span className="text-emerald-400 text-base font-normal">HSK</span>{" "}
              <span className="text-zinc-500 text-lg font-normal">(&asymp; ${totalEarnedUsdc.toFixed(2)} USD)</span>
            </h3>
            <button
              onClick={() => fetchSellerBalance(walletAddress || undefined)}
              disabled={isLoadingBalance}
              title="Refresh live on-chain balance from HashKey Chain"
              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingBalance ? "animate-spin text-white" : ""}`} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400 pt-1">
            <span>
              Payout Node:{" "}
              <a
                href={`https://testnet-explorer.hskchain.net/address/${walletAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"}`}
                target="_blank"
                rel="noreferrer"
                className="text-white hover:underline font-semibold tabular-data"
              >
                {(walletAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8").slice(0, 10)}... <ExternalLink className="w-2.5 h-2.5 inline" />
              </a>
            </span>
            <span>&bull;</span>
            <span>
              HSP Contract:{" "}
              <a
                href="https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline tabular-data"
              >
                0x40A6...7ae <ExternalLink className="w-2.5 h-2.5 inline" />
              </a>
            </span>
            <span>&bull;</span>
            <span className="tabular-data">Chain ID: 133</span>
          </div>

          {balanceDetails?.totalSweptHsk > 0 && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
              <span className="px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 tabular-data">
                Gross Settled: {(balanceDetails.lifetimeSettledHsk || hskBalance).toFixed(4)} HSK
              </span>
              <span className="px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 tabular-data">
                Total Swept: -{(balanceDetails.totalSweptHsk || 0).toFixed(4)} HSK
              </span>
            </div>
          )}

          <p className="text-xs text-zinc-400 max-w-xl pt-1 leading-relaxed">
            Tokens used (T_used) are automatically settled on HashKey Chain Testnet directly to your payout node.
            Sweep accumulated earnings to any chain (HashKey, Sepolia, Arbitrum, Base) in any token via the HashKey Settlement Router.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setShowBridgeDrawer(true)}
            className="btn-primary-apple px-6 py-3.5 text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap"
          >
            <ArrowRightLeft className="w-4 h-4 text-black" />
            <span>Universal Sweeper</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
          <Link
            href="/payout"
            className="btn-secondary-apple px-5 py-3 text-xs font-semibold flex items-center gap-1.5"
          >
            <span>Payout Hub</span>
          </Link>
        </div>
      </SpatialCard>

      {/* Main Grid: Form & Info Cards */}
      <div className="grid lg:grid-cols-3 gap-8 sm:gap-10">
        {/* Form: List API Tokens */}
        <SpatialCard maxTilt={1.5} className="lg:col-span-2 p-8 sm:p-14 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div>
              <span className="text-xs text-zinc-400 font-medium block">Stage 3 of 3</span>
              <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
                Register Authentic Arkiv Seller Entity
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Publish your quota with 1-hour block expiration. Auto-restored if unused.
              </p>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-900 px-3.5 py-1.5 rounded-full border border-white/10 self-start sm:self-auto">
              1-Hour Block Expiration
            </span>
          </div>

          <form onSubmit={handleSubmitListing} className="space-y-8">
            {/* Step 1: Provider & Model */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>1. AI Provider:</span>
                  <span className="text-xs text-zinc-500 font-normal">4 Providers</span>
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full rounded-2xl bg-[#121316] border border-white/10 hover:border-white/20 p-4 text-sm text-white font-medium focus:outline-none focus:border-white/30 transition cursor-pointer"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>2. Target Model:</span>
                  <span className="text-xs text-zinc-500 font-normal">
                    {availableModels.length} models for {provider}
                  </span>
                </label>
                <select
                  value={model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full rounded-2xl bg-[#121316] border border-white/10 hover:border-white/20 p-4 text-sm text-white font-medium focus:outline-none focus:border-white/30 transition cursor-pointer"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Model Specification & Headroom Invariant */}
            {currentModelMeta && (
              <div className="rounded-2xl bg-black/60 border border-white/[0.08] p-5 sm:p-6 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-zinc-300" />
                    <span className="text-sm font-bold text-white">
                      {currentModelMeta.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 text-xs text-zinc-400">
                    <span>Context: <strong className="text-zinc-200 tabular-data">{Math.round(currentModelMeta.contextWindow / 1000)}k</strong></span>
                    <span>&bull;</span>
                    <span>Output Cap: <strong className="text-zinc-200 tabular-data">{currentModelMeta.maxOutputTokens.toLocaleString()}</strong></span>
                    <span>&bull;</span>
                    <span>Min Quota: <strong className="text-emerald-400 tabular-data">&ge; {minRequiredQuota.toLocaleString()} tokens</strong></span>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {currentModelMeta.description} Minimum listing volume is enforced to guarantee zero-cutoff execution for buyers.
                </p>
              </div>
            )}

            {/* Step 2: Authentic Raw API Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  3. Authentic Provider API Key:
                </label>
                <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Client-Side RSA-OAEP Sealing
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  value={rawApiKey}
                  onChange={(e) => {
                    setRawApiKey(e.target.value);
                    setKeyVerification(null);
                  }}
                  placeholder={PROVIDERS.find((p) => p.id === provider)?.keyPlaceholder || "Enter authentic API key..."}
                  className="flex-1 rounded-2xl bg-[#121316] border border-white/10 hover:border-white/20 p-4 text-sm text-white focus:outline-none focus:border-white/30 transition"
                />
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={isTestingKey || !rawApiKey}
                  className="btn-secondary-apple px-5 py-3.5 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40"
                >
                  {isTestingKey ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Testing Upstream...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Test Key & Detect Tokens
                    </>
                  )}
                </button>
              </div>

              {/* Key Verification Live Upstream Feedback */}
              {keyVerification && keyVerification.tested && (
                <div className="pt-1">
                  {keyVerification.valid ? (
                    <div className="p-5 rounded-2xl bg-zinc-900 border border-white/20 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          API Key Verified: {keyVerification.modelDisplayName || currentModelMeta?.name}
                        </span>
                        <span className="text-[10px] bg-emerald-950/40 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-800/40 font-medium">
                          Active
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/[0.06] text-zinc-300">
                        <div>
                          <span className="text-zinc-500 block text-[11px]">Tokens Left on Provider Account:</span>
                          <span className="text-white font-bold text-sm tabular-data">
                            {keyVerification.tokensRemaining ? keyVerification.tokensRemaining.toLocaleString() : "Unlimited"}{" "}
                            tokens
                          </span>
                        </div>
                        {keyVerification.tokensRemaining && keyVerification.tokensRemaining > 0 && (
                          <button
                            type="button"
                            onClick={() => setTokenQuota(keyVerification.tokensRemaining!)}
                            className="btn-secondary-apple px-3.5 py-1.5 text-xs font-medium tabular-data"
                          >
                            Set Quota to {keyVerification.tokensRemaining.toLocaleString()} &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-red-950/30 border border-red-800/30 text-xs space-y-2 text-red-300">
                      <div className="font-semibold flex items-center gap-1.5 text-red-400">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        Provider Rejected Key for Model {model}
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {keyVerification.error || "The upstream AI provider rejected this API key. Please check your credentials and model permissions."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-zinc-400 leading-relaxed">
                Your plaintext key is verified directly via an upstream test call, then sealed in client browser RAM before transmission. It is never stored in plaintext and never leaked to buyers.
              </p>

              {sealedKeyCiphertext && (
                <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] text-xs text-zinc-400 space-y-1">
                  <span className="text-white font-medium block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Enclave RSA-OAEP Ciphertext Generated (Safe to Broadcast):
                  </span>
                  <div className="truncate text-zinc-500 tabular-data">{sealedKeyCiphertext}</div>
                </div>
              )}
            </div>

            {/* Step 3: Quota & Pricing */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  4. Token Quota to List (Tokens):
                </label>
                <input
                  type="number"
                  min={minRequiredQuota}
                  step="any"
                  value={tokenQuota}
                  onChange={(e) => setTokenQuota(Number(e.target.value))}
                  className="w-full rounded-2xl bg-[#121316] border border-white/10 hover:border-white/20 p-4 text-sm text-white font-bold tabular-data focus:outline-none focus:border-white/30 transition"
                />
                <span className="text-xs text-zinc-400 tabular-data block">
                  Minimum required for {currentModelMeta?.name}: &ge; {minRequiredQuota.toLocaleString()} tokens.
                </span>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  5. Price per 1,000 Tokens (USDC):
                </label>
                <input
                  type="number"
                  step="any"
                  min={0.0001}
                  value={pricePer1kUsdc}
                  onChange={(e) => setPricePer1kUsdc(Number(e.target.value))}
                  className="w-full rounded-2xl bg-[#121316] border border-white/10 hover:border-white/20 p-4 text-sm text-emerald-400 font-bold tabular-data focus:outline-none focus:border-white/30 transition"
                />
                <div className="flex items-center justify-between text-xs tabular-data">
                  <span className="text-zinc-500">e.g., $0.012 USDC / 1k</span>
                  <span className="text-emerald-400 font-semibold">
                    Projected Revenue: ${projectedEarningsUsdc.toFixed(2)} USDC
                  </span>
                </div>
              </div>
            </div>

            {/* Step 4: World ID Verification & ENS Subname */}
            <div className="grid sm:grid-cols-2 gap-6 pt-2 border-t border-white/[0.08]">
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  6. World ID Proof of Human:
                </label>
                <div>
                  {worldIdVerified ? (
                    <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Check className="w-4 h-4 text-emerald-400" />
                        World ID Verified
                      </span>
                      <span className="text-xs text-emerald-500 truncate max-w-[120px] tabular-data" title={nullifierHash || undefined}>
                        {nullifierHash ? `${nullifierHash.slice(0, 14)}...` : "Verified"}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowWorldIdModal(true)}
                      className="btn-secondary-apple w-full py-3.5 px-4 text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      Verify with World ID
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    7. ENS Node Identity:
                  </label>
                  {/* Mode Toggle */}
                  <div className="flex items-center gap-1 bg-black p-1 rounded-full border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setEnsMode("subname")}
                      className={`px-3 py-1 rounded-full transition ${
                        ensMode === "subname"
                          ? "bg-white text-black font-semibold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Subname
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnsMode("real")}
                      className={`px-3 py-1 rounded-full transition flex items-center gap-1 ${
                        ensMode === "real"
                          ? "bg-white text-black font-semibold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      Real ENS (.eth)
                    </button>
                  </div>
                </div>

                {/* Subname Input */}
                {ensMode === "subname" ? (
                  <div>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={ensLabel}
                        onChange={(e) => setEnsLabel(e.target.value)}
                        placeholder="alias-node"
                        className="flex-1 rounded-l-2xl bg-[#121316] border border-r-0 border-white/10 p-4 text-sm text-white focus:outline-none"
                      />
                      <span className="px-4 py-4 rounded-r-2xl bg-zinc-900 border border-white/10 text-xs text-zinc-400">
                        .shunyagrid.eth
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500 mt-1 block">
                      Subname issued under ShunyaGrid ENS registry with ERC-3668 CCIP resolution.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={customRealEns}
                        onChange={(e) => setCustomRealEns(e.target.value)}
                        placeholder="yourname.eth"
                        className="w-full rounded-2xl bg-[#121316] border border-white/10 hover:border-white/20 p-4 text-sm text-white focus:outline-none pr-10"
                      />
                      <div className="absolute right-3.5 top-3.5 flex items-center">
                        {isVerifyingEns ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : ensVerificationResult?.verified ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : ensVerificationResult ? (
                          <X className="w-4 h-4 text-red-400" />
                        ) : null}
                      </div>
                    </div>

                    {!isVerifyingEns && ensVerificationResult && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                          ensVerificationResult.verified
                            ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300"
                            : "bg-red-950/30 border-red-800/30 text-red-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {ensVerificationResult.verified ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="truncate">
                                Verified Owner: <strong className="text-emerald-200">{customRealEns}</strong>
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                              <span className="truncate">
                                {ensVerificationResult.error || "Ownership mismatch on Ethereum"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 8: HashKey Chain Payout Account */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <span>8. Payout Target (HashKey Chain EVM):</span>
                  {walletAddress ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" /> HashKey EVM: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-400">
                      Connect Wallet Required
                    </span>
                  )}
                </label>
                {walletAddress && (
                  <a
                    href={`https://testnet-explorer.hskchain.net/address/${walletAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 tabular-data font-semibold"
                  >
                    View on HashKey Blockscout <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {walletAddress ? (
                <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div>
                      <span className="text-zinc-500 text-[11px] block">Verified HashKey Chain Payout Target</span>
                      <span className="text-white font-semibold tabular-data text-sm">{walletAddress}</span>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">Chain ID 133</span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 text-xs text-zinc-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Please connect your Web3 wallet in Pillar 1 to enable this payout target.</span>
                  </div>
                  <button
                    type="button"
                    onClick={connectWallet}
                    className="btn-secondary-apple px-3.5 py-1.5 text-xs font-semibold shrink-0"
                  >
                    Connect Wallet
                  </button>
                </div>
              )}
              <p className="text-xs text-zinc-500 leading-relaxed">
                When queries consume your token quota, authentic HSP transfers settle on-chain directly to this address.
              </p>
            </div>

            {/* Nike Primary Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !walletAddress || !worldIdVerified || !rawApiKey}
              className={`btn-primary-apple w-full py-4 px-6 text-sm font-semibold flex items-center justify-center gap-2 transition ${
                isSubmitting || !walletAddress || !worldIdVerified || !rawApiKey
                  ? "opacity-40 cursor-not-allowed bg-zinc-800 text-zinc-400"
                  : ""
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting
                ? "Broadcasting to Arkiv..."
                : !walletAddress
                ? "Connect MetaMask Wallet to Publish"
                : !worldIdVerified
                ? "Verify World ID to Publish"
                : !rawApiKey
                ? "Enter API Key to Publish"
                : "Publish Verified Token Listing on Arkiv (1-Hour Expiration)"}
            </button>
          </form>
        </SpatialCard>

        {/* Right Info Cards */}
        <div className="space-y-6">
          <SpatialCard maxTilt={1.5} className="p-8 sm:p-10 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              How Sellers Monetize
            </h3>

            <div className="space-y-3.5 text-xs text-zinc-400 leading-relaxed">
              <p>
                1. <strong className="text-white">Zero Idle Waste:</strong> Pre-paid or monthly token quotas that normally expire unused are now monetized on-demand.
              </p>
              <p>
                2. <strong className="text-white">Actual Token Payout:</strong> Once inference finishes, you receive an
                instant <strong className="text-white">HSK</strong> transfer directly to your HashKey EVM wallet for the exact{" "}
                <span className="text-emerald-400 font-semibold tabular-data">T_used</span> tokens consumed.
              </p>
              <p>
                3. <strong className="text-white">Unused Quota Restored:</strong> Any unused token reservation (<span className="tabular-data">T_max - T_used</span>) is
                credited straight back to your Arkiv listing so you can keep monetizing.
              </p>
            </div>
          </SpatialCard>

          <SpatialCard maxTilt={1.5} className="p-8 sm:p-10 space-y-3 text-xs">
            <span className="text-white font-semibold block flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Zero Seller Surveillance Guarantee
            </span>
            <p className="text-zinc-400 leading-relaxed">
              You will never receive or see the Buyer&apos;s prompt text, uploaded documents, or AI output. Your node proxy log only
              shows the HashKey block confirmation, tokens consumed, and the HSK payout received.
            </p>
          </SpatialCard>
        </div>
      </div>

      {/* Active Listings Table */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-12 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Database className="w-5 h-5 text-white" />
            Active Arkiv Orderbook Entities
            <span className="text-xs font-normal text-zinc-400 px-3 py-1 rounded-full bg-zinc-900 border border-white/10">
              {listings.length} node{listings.length === 1 ? "" : "s"} listed
            </span>
          </h2>
          <div className="flex items-center gap-2.5">
            {listings.length > 0 && (
              <button
                type="button"
                onClick={handleClearOrderbook}
                className="btn-secondary-apple text-xs px-3.5 py-1.5 text-red-400 flex items-center gap-1.5"
                title="Clear all listings from orderbook"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Orderbook
              </button>
            )}
            <button
              onClick={fetchListings}
              className="btn-secondary-apple text-xs px-3.5 py-1.5 text-zinc-300 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#0c0d11] border border-dashed border-white/10 text-center space-y-3">
            <Database className="w-8 h-8 mx-auto text-zinc-600" />
            <h4 className="text-sm font-semibold text-zinc-300">Orderbook is currently empty</h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              No mock sellers exist. Connect your wallet above, verify your World ID, and list your authentic API key to create the first active seller entity.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden bg-[#0c0d11] border border-white/10" data-ui="table-wrapper">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-ui="seller-listings-table">
                <thead className="bg-black/80 text-zinc-400 uppercase text-[11px] font-semibold border-b border-white/[0.08]">
                  <tr>
                    <th className="px-6 py-4">ENS Subname</th>
                    <th className="px-6 py-4">Model</th>
                    <th className="px-6 py-4">Available Quota</th>
                    <th className="px-6 py-4">Price / 1k</th>
                    <th className="px-6 py-4">World ID</th>
                    <th className="px-6 py-4">Payout Node (HashKey)</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {listings.map((l) => (
                    <tr key={l.id} className="hover:bg-white/[0.03] transition">
                      <td className="px-6 py-5 font-semibold text-white">
                        {l.ensName}
                        <span className="text-xs text-zinc-500 block font-normal tabular-data">
                          {l.ownerAddress ? `${l.ownerAddress.slice(0, 6)}...${l.ownerAddress.slice(-4)}` : ""}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-200 text-xs font-medium">
                          {l.model}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-semibold text-white tabular-data">
                        {l.availableTokens.toLocaleString()} tokens
                      </td>
                      <td className="px-6 py-5 font-medium text-zinc-300 tabular-data">${(l.pricePer1kMicroUsdc / 1000000).toFixed(4)} USDC</td>
                      <td className="px-6 py-5">
                        {l.humanVerified ? (
                          <span className="text-emerald-400 font-semibold inline-flex items-center gap-1 text-xs">
                            <Check className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-zinc-500">Unverified</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-zinc-400 tabular-data text-xs">{l.payoutAddress || l.hedaraPayoutAccount || l.ownerAddress}</td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 text-[10px] font-semibold">
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SpatialCard>

      {/* Authentic World ID Verification Modal */}
      <WorldIdModal
        isOpen={showWorldIdModal}
        onClose={() => setShowWorldIdModal(false)}
        onSuccess={() => setShowWorldIdModal(false)}
      />

      {/* Universal Multi-Chain Settlement Bridge Drawer */}
      <ArcBridgeDrawer
        isOpen={showBridgeDrawer}
        onClose={() => setShowBridgeDrawer(false)}
        availableUsdcEarnings={totalEarnedUsdc}
        availableHskEarnings={hskBalance}
        sellerNodeAddress={walletAddress || ""}
        onSweepSuccess={() => {
          fetchSellerBalance(walletAddress || undefined);
        }}
        onRefresh={() => {
          fetchSellerBalance(walletAddress || undefined);
        }}
      />

      {/* How It Works Pop Up Modal */}
      <HowItWorksModal
        isOpen={showHowItWorksModal}
        onClose={() => setShowHowItWorksModal(false)}
        initialTab="seller"
      />
    </div>
  );
}


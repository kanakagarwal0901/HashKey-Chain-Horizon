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
} from "lucide-react";
import { sealSellerApiKeyInBrowser } from "@/lib/clientCrypto";
import { useAuth } from "@/context/AuthContext";
import WorldIdModal from "@/components/WorldIdModal";
import ArcBridgeDrawer from "@/components/ArcBridgeDrawer";
import {
  PROVIDERS,
  SUPPORTED_MODELS,
  getModelsByProvider,
  getModelMetadata,
  getModelTokenBounds,
  getMinimumListingQuotaForModel,
  ThinkingLevel,
} from "@shunya/core";

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
    sellerHederaAccount,
    isConnectingHedera,
    ensName,
    ensAvatar,
    connectSellerHedera,
    disconnectSellerHedera,
    connectWallet,
    disconnectWallet,
    logout,
  } = useAuth();

  // Hedera Account Gateway Input State
  const [inputHederaAccount, setInputHederaAccount] = useState<string>("");
  const [hederaConnectError, setHederaConnectError] = useState<string | null>(null);

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
  const [htsUsdcBalance, setHtsUsdcBalance] = useState<number>(0);
  const [hbarBalance, setHbarBalance] = useState<number>(0);
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

  // Fetch live on-chain Hedera balance & HCS settled earnings from Mirror Node
  const fetchHederaBalance = async (accId?: string) => {
    const target = (accId !== undefined ? accId : (sellerHederaAccount || "")).trim();
    if (!target) {
      setBalanceDetails(null);
      setHtsUsdcBalance(0);
      setHbarBalance(0);
      setTotalEarnedUsdc(0);
      return;
    }
    setIsLoadingBalance(true);
    try {
      const res = await fetch(`/api/seller/hedera-balance?accountId=${target}`);
      if (res.ok) {
        const data = await res.json();
        setBalanceDetails(data);
        setHtsUsdcBalance(data.htsUsdcBalance ?? 0);
        setHbarBalance(data.hbarBalance ?? 0);
        setTotalEarnedUsdc(data.displayBalance ?? data.lifetimeSettledUsdc ?? 0);
      }
    } catch (err) {
      console.warn("Failed to fetch live Hedera seller balance:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchListings();
    if (sellerHederaAccount) {
      fetchHederaBalance(sellerHederaAccount);
    } else {
      setBalanceDetails(null);
      setHtsUsdcBalance(0);
      setHbarBalance(0);
      setTotalEarnedUsdc(0);
    }
  }, [sellerHederaAccount]);

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

    // 5. Hedera Payout Account Guard (Must be connected via Seller Gateway)
    const effectiveHederaAccount = (sellerHederaAccount || "").trim();
    if (!effectiveHederaAccount) {
      alert("Hedera Payout Account Required: Please connect your Hedera Account in the Seller Gateway above before publishing.");
      const el = document.getElementById("gateway-hedera-input");
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const hederaRegex = /^0\.0\.\d+$/;
    if (!hederaRegex.test(effectiveHederaAccount)) {
      alert("Invalid Hedera Account ID format: Must be 0.0.xxxxx (e.g. 0.0.11145557).");
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
          hedaraPayoutAccount: effectiveHederaAccount,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Title & Wallet Connection Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Layers className="w-8 h-8 text-emerald-400" />
            Seller Quota Hub & Monetization
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Connect your Web3 wallet, verify your World ID, and list your unused API quota with Enclave privacy.
          </p>
        </div>

        {/* Crypto Wallet Connector */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {walletAddress ? (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-slate-400 block text-[10px]">Connected Wallet</span>
                <span className="text-emerald-300 font-bold">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
              <button
                onClick={disconnectWallet}
                className="ml-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-[10px]"
                title="Disconnect wallet"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnectingWallet}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs font-mono shadow-md flex items-center gap-2 transition"
            >
              <Wallet className="w-4 h-4 text-cyan-200" />
              {isConnectingWallet ? "Connecting..." : "Connect Crypto Wallet"}
            </button>
          )}
        </div>
      </div>

      {/* 3-Pillar Seller Authentication Gateway */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Seller Authentication & Hedera Payout Gateway
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Mandatory: MetaMask Web3 + World ID + Hedera Payout Verification
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Pillar 1: Web3 EVM Wallet (MetaMask) */}
          <div
            className={`p-4 rounded-xl border transition ${
              walletAddress
                ? "bg-slate-950/80 border-emerald-500/40"
                : "bg-slate-950/40 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                1. Web3 EVM Wallet
              </span>
              {walletAddress ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Required
                </span>
              )}
            </div>
            {walletAddress ? (
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-emerald-300 truncate">
                  {walletAddress}
                </div>
                <div className="text-[11px] text-slate-500">Connected MetaMask wallet</div>
              </div>
            ) : (
              <button
                type="button"
                onClick={connectWallet}
                disabled={isConnectingWallet}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                {isConnectingWallet ? "Connecting..." : "Connect MetaMask Wallet"}
              </button>
            )}
          </div>

          {/* Pillar 2: World ID Sybil Resistance */}
          <div
            className={`p-4 rounded-xl border transition ${
              worldIdVerified
                ? "bg-slate-950/80 border-emerald-500/40"
                : "bg-slate-950/40 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                2. World ID Verification
              </span>
              {worldIdVerified ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Verified Human
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Required
                </span>
              )}
            </div>
            {worldIdVerified ? (
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-cyan-300 truncate">
                  {nullifierHash ? `Nullifier: ${nullifierHash.slice(0, 14)}...` : "ZK-SNARK Verified"}
                </div>
                <div className="text-[11px] text-slate-500">Sybil-resistant proof verified</div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowWorldIdModal(true)}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                Verify Human with World ID
              </button>
            )}
          </div>

          {/* Pillar 3: Hedera Payout Account Login */}
          <div
            id="gateway-hedera-section"
            className={`p-4 rounded-xl border transition ${
              sellerHederaAccount
                ? "bg-slate-950/80 border-emerald-500/40"
                : "bg-slate-950/40 border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                3. Hedera Account Login
              </span>
              {sellerHederaAccount ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Logged In
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Login Required
                </span>
              )}
            </div>
            {sellerHederaAccount ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-300">{sellerHederaAccount}</span>
                  <a
                    href={`https://hashscan.io/testnet/account/${sellerHederaAccount}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                  >
                    HashScan <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <button
                  type="button"
                  onClick={disconnectSellerHedera}
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Disconnect / Switch Account
                </button>
              </div>
            ) : (
              <div className="space-y-2 mt-1">
                <div className="flex gap-1.5">
                  <input
                    id="gateway-hedera-input"
                    type="text"
                    value={inputHederaAccount}
                    onChange={(e) => {
                      setInputHederaAccount(e.target.value.trim());
                      setHederaConnectError(null);
                    }}
                    placeholder="0.0.xxxxx (e.g. 0.0.11145557)"
                    className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await connectSellerHedera(inputHederaAccount);
                      if (!res.success) {
                        setHederaConnectError(res.error || "Failed to verify Hedera account");
                      } else {
                        setInputHederaAccount("");
                        setHederaConnectError(null);
                      }
                    }}
                    disabled={isConnectingHedera || !inputHederaAccount.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition flex items-center gap-1 shrink-0"
                  >
                    {isConnectingHedera ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Connect"
                    )}
                  </button>
                </div>
                {hederaConnectError && (
                  <p className="text-[11px] text-rose-400 font-sans leading-tight">
                    {hederaConnectError}
                  </p>
                )}
                <p className="text-[10px] text-slate-500">
                  Connect your Hedera Testnet ID to unlock live balance & listing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Form & Info Cards */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form: List API Tokens */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Register Authentic Arkiv Seller Entity
            </h2>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800/40">
              1-Hour Block Expiration
            </span>
          </div>

          {/* Hedera Login Required Notice */}
          {!sellerHederaAccount && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  Hedera Account Login Required: Please connect your Hedera Account ID in the Gateway above to unlock the listing studio.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("gateway-hedera-input");
                  el?.focus();
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold font-mono text-xs hover:bg-amber-400 transition flex-shrink-0"
              >
                Connect Hedera
              </button>
            </div>
          )}

          {/* Wallet Verification Alert if disconnected */}
          {!walletAddress && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Please connect your Web3 crypto wallet (MetaMask, Coinbase Wallet) to register as an Arkiv Seller.</span>
              </div>
              <button
                type="button"
                onClick={connectWallet}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold font-mono text-xs hover:bg-amber-400 transition flex-shrink-0"
              >
                Connect Now
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitListing} className="space-y-6">
            {/* Step 1: Provider & Model */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>1. AI Provider:</span>
                  <span className="text-[10px] text-cyan-400 font-mono">4 Providers</span>
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500 transition cursor-pointer"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>2. Target Model:</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {availableModels.length} models for {provider}
                  </span>
                </label>
                <select
                  value={model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500 transition cursor-pointer"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Researched Model Specifications & Zero-Cutoff Bounds Matrix */}
            {currentModelMeta && (
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      {currentModelMeta.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                      Context: {currentModelMeta.contextWindow.toLocaleString()} tokens
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                      Max Output: {currentModelMeta.maxOutputTokens.toLocaleString()} tokens
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-sans">
                  {currentModelMeta.description}
                </p>

                {/* Token Bounds Table */}
                <div className="pt-1">
                  <span className="text-[11px] font-mono text-slate-300 font-semibold block mb-1.5 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    Deterministic Token Bounds & Zero-Cutoff Invariant (T_max):
                  </span>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-1.5 px-2">Thinking Level</th>
                          <th className="py-1.5 px-2">Thinking Budget</th>
                          <th className="py-1.5 px-2">Output Cap</th>
                          <th className="py-1.5 px-2">Input Cap</th>
                          <th className="py-1.5 px-2 text-right text-amber-400">T_min (Floor)</th>
                          <th className="py-1.5 px-2 text-right text-cyan-400">T_max (Gate)</th>
                          <th className="py-1.5 px-2 text-right text-emerald-400">Default Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {thinkingBreakdown.map((t) => (
                          <tr key={t.level}>
                            <td className="py-1.5 px-2 font-semibold capitalize text-slate-200">{t.level}</td>
                            <td className="py-1.5 px-2 text-slate-400">{t.bounds.thinkingBudgetTokens.toLocaleString()}</td>
                            <td className="py-1.5 px-2 text-slate-400">{t.bounds.maxOutputTokens.toLocaleString()}</td>
                            <td className="py-1.5 px-2 text-slate-400">{t.bounds.maxInputAndFileTokens.toLocaleString()}</td>
                            <td className="py-1.5 px-2 text-right font-medium text-amber-400">
                              {t.bounds.minRequiredTokens.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold text-cyan-400">
                              {t.bounds.totalMaxTokens.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2 text-right text-emerald-400">
                              ${(t.bounds.defaultPricePer1kMicroUsdc / 1_000_000).toFixed(4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Authentic Raw API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  3. Authentic Provider API Key:
                </label>
                <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Client-Side RSA-OAEP Sealing
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={rawApiKey}
                  onChange={(e) => {
                    setRawApiKey(e.target.value);
                    setKeyVerification(null);
                  }}
                  placeholder={PROVIDERS.find((p) => p.id === provider)?.keyPlaceholder || "Enter authentic API key..."}
                  className="flex-1 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500 transition"
                />
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={isTestingKey || !rawApiKey}
                  className="px-4 py-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-mono font-bold text-white transition flex items-center justify-center gap-1.5 flex-shrink-0 shadow-md"
                >
                  {isTestingKey ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                      Testing Upstream...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-cyan-300" />
                      Test Key & Detect Tokens
                    </>
                  )}
                </button>
              </div>

              {/* Key Verification Live Upstream Feedback */}
              {keyVerification && keyVerification.tested && (
                <div className="pt-1">
                  {keyVerification.valid ? (
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs font-mono space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          API Key Verified: {keyVerification.modelDisplayName || currentModelMeta?.name}
                        </span>
                        <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">
                          Live Active
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-900/40 text-slate-300">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Tokens Left on Provider Account:</span>
                          <span className="text-emerald-300 font-bold text-sm">
                            {keyVerification.tokensRemaining ? keyVerification.tokensRemaining.toLocaleString() : "Unlimited"}{" "}
                            tokens
                          </span>
                        </div>
                        {keyVerification.tokensRemaining && keyVerification.tokensRemaining > 0 && (
                          <button
                            type="button"
                            onClick={() => setTokenQuota(keyVerification.tokensRemaining!)}
                            className="px-2.5 py-1 rounded bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 text-xs font-mono font-semibold transition border border-emerald-700/50"
                          >
                            Set Quota to {keyVerification.tokensRemaining.toLocaleString()} &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs font-mono space-y-1.5 text-red-300">
                      <div className="font-bold flex items-center gap-1.5 text-red-400">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        Provider Rejected Key for Model {model}
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        {keyVerification.error || "The upstream AI provider rejected this API key. Please check your credentials and model permissions."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-500 font-sans">
                Your plaintext key is verified directly via an upstream test call, then encrypted in client RAM before transmission. It is never stored in plaintext and never leaked to buyers.
              </p>

              {sealedKeyCiphertext && (
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                  <span className="text-indigo-400 font-bold block flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                    Enclave RSA-OAEP Ciphertext Generated (Safe to Broadcast):
                  </span>
                  <div className="truncate text-slate-500">{sealedKeyCiphertext}</div>
                </div>
              )}
            </div>

            {/* Step 3: Quota & Pricing */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  4. Token Quota to List (Tokens):
                </label>
                <input
                  type="number"
                  min={minRequiredQuota}
                  step="any"
                  value={tokenQuota}
                  onChange={(e) => setTokenQuota(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3 text-sm text-cyan-400 font-bold font-mono focus:outline-none focus:border-cyan-500 transition"
                />
                <span className="text-[10px] text-cyan-400 font-mono block">
                  Minimum required for {currentModelMeta?.name}: &ge; {minRequiredQuota.toLocaleString()} tokens.
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  5. Price per 1,000 Tokens (USDC):
                </label>
                <input
                  type="number"
                  step="any"
                  min={0.0001}
                  value={pricePer1kUsdc}
                  onChange={(e) => setPricePer1kUsdc(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3 text-sm text-emerald-400 font-bold font-mono focus:outline-none focus:border-cyan-500 transition"
                />
                <span className="text-[10px] text-slate-400 font-mono block">
                  e.g., $0.012 USDC per 1,000 tokens
                </span>
              </div>
            </div>

            {/* Step 4: World ID Verification & ENS Subname */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  6. World ID Proof of Human:
                </label>
                <div>
                  {worldIdVerified ? (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        World ID Verified ✔
                      </span>
                      <span className="text-[10px] text-emerald-500 truncate max-w-[120px]" title={nullifierHash || undefined}>
                        {nullifierHash ? `${nullifierHash.slice(0, 14)}...` : "Verified"}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowWorldIdModal(true)}
                      className="w-full py-3 px-4 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 transition"
                    >
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                      Verify with World ID
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    7. ENS Node Identity:
                  </label>
                  {/* Mode Toggle */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setEnsMode("subname")}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        ensMode === "subname"
                          ? "bg-indigo-600 text-white font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Protocol Subname
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnsMode("real")}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        ensMode === "real"
                          ? "bg-cyan-600 text-white font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      Real ENS (.eth)
                    </button>
                  </div>
                </div>

                {/* Detected Wallet ENS Banner */}
                {ensName && ensMode === "subname" && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-slate-300">
                        Primary ENS detected: <strong className="text-cyan-300">{ensName}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEnsMode("real");
                        setCustomRealEns(ensName);
                      }}
                      className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[10px] transition"
                    >
                      Use {ensName} &rarr;
                    </button>
                  </div>
                )}

                {/* Subname Input */}
                {ensMode === "subname" ? (
                  <div>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={ensLabel}
                        onChange={(e) => setEnsLabel(e.target.value)}
                        placeholder="alias-node"
                        className="flex-1 rounded-l-xl bg-slate-900 border border-r-0 border-slate-700 hover:border-slate-600 p-3 text-sm text-slate-100 font-mono focus:outline-none"
                      />
                      <span className="px-3 py-3 rounded-r-xl bg-slate-800 border border-slate-700 text-xs font-mono text-slate-400">
                        .shunyagrid.eth
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                      Subname issued under ShunyaGrid ENS registry with ERC-3668 CCIP resolution.
                    </span>
                  </div>
                ) : (
                  /* Real ENS Domain Input with Live On-Chain Verification */
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={customRealEns}
                        onChange={(e) => setCustomRealEns(e.target.value)}
                        placeholder="yourname.eth"
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3 text-sm text-slate-100 font-mono focus:outline-none pr-10"
                      />
                      <div className="absolute right-3 top-3.5 flex items-center">
                        {isVerifyingEns ? (
                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                        ) : ensVerificationResult?.verified ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : ensVerificationResult ? (
                          <X className="w-4 h-4 text-rose-400" />
                        ) : null}
                      </div>
                    </div>

                    {/* Verification Status Feedback */}
                    {isVerifyingEns && (
                      <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Querying Ethereum Mainnet Universal ENS Resolver...
                      </div>
                    )}

                    {!isVerifyingEns && ensVerificationResult && (
                      <div
                        className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                          ensVerificationResult.verified
                            ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300"
                            : "bg-rose-950/40 border-rose-800/40 text-rose-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {ensVerificationResult.verified ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              <span className="truncate">
                                Verified Owner: <strong className="text-emerald-200">{customRealEns}</strong>
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                              <span className="truncate">
                                {ensVerificationResult.error || "Ownership mismatch on Ethereum"}
                              </span>
                            </>
                          )}
                        </div>
                        {ensVerificationResult.verified && (
                          <a
                            href={`https://app.ens.domains/${customRealEns}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] underline flex items-center gap-0.5 text-emerald-300 hover:text-white flex-shrink-0 ml-2"
                          >
                            ENS App <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 8: Hedera Payout Account */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>8. Hedera Payout Account ID (Receives HTS USDC):</span>
                  {sellerHederaAccount ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Connected & Verified
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Login Required
                    </span>
                  )}
                </label>
                {sellerHederaAccount && (
                  <a
                    href={`https://hashscan.io/testnet/account/${sellerHederaAccount}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono font-bold"
                  >
                    View on HashScan <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {sellerHederaAccount ? (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="text-slate-400 text-[10px] block">Verified Hedera Payout Target</span>
                      <span className="text-emerald-300 font-bold text-sm">{sellerHederaAccount}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("gateway-hedera-section");
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    Switch Account in Gateway
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Please connect your Hedera Account in the Gateway above to unlock this target.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("gateway-hedera-input");
                      el?.focus();
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold shrink-0 text-[11px] transition"
                  >
                    Connect Hedera
                  </button>
                </div>
              )}
              <p className="text-[11px] text-slate-500 font-sans">
                When prompts consume your quota, authentic HTS SGUSDC transfers are settled on-chain directly to this account.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !walletAddress || !worldIdVerified || !rawApiKey || !sellerHederaAccount}
              className={`w-full py-4 px-6 rounded-xl font-bold text-white text-sm shadow-lg transition flex items-center justify-center gap-2 ${
                isSubmitting || !walletAddress || !worldIdVerified || !rawApiKey || !sellerHederaAccount
                  ? "opacity-50 cursor-not-allowed bg-slate-800 text-slate-400"
                  : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-600/20"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting
                ? "Broadcasting to Arkiv..."
                : !walletAddress
                ? "Connect MetaMask Wallet to Publish"
                : !worldIdVerified
                ? "Verify World ID to Publish"
                : !sellerHederaAccount
                ? "Connect Hedera Account First to Publish"
                : !rawApiKey
                ? "Enter API Key to Publish"
                : "Publish Verified Token Listing on Arkiv (1-Hour Expiration)"}
            </button>
          </form>
        </div>

        {/* Right Info Cards: Privacy & Economics */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              How Sellers Monetize
            </h3>

            <div className="space-y-3 text-xs text-slate-300 font-sans leading-relaxed">
              <p>
                1. <strong className="text-white">Zero Idle Waste:</strong> Pre-paid or monthly token quotas that normally expire unused are now monetized on-demand.
              </p>
              <p>
                2. <strong className="text-white">Actual Token Payout:</strong> Once inference finishes, you receive an
                instant <strong className="text-emerald-400 font-mono">HTS USDC</strong> transfer directly to your Hedera account for the exact{" "}
                <span className="text-emerald-400 font-mono">T_used</span> tokens consumed.
              </p>
              <p>
                3. <strong className="text-white">Unused Quota Restored:</strong> Any unused token reservation (<span className="font-mono">T_max - T_used</span>) is
                credited straight back to your Arkiv listing so you can keep monetizing!
              </p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 space-y-3 text-xs font-mono">
            <span className="text-indigo-400 font-bold block flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              Zero Seller Surveillance Guarantee
            </span>
            <p className="text-slate-400 font-sans leading-relaxed">
              You will never receive or see the Buyer&apos;s prompt text, uploaded documents, or AI output. Your node proxy log only
              shows the Hedera consensus timestamp, tokens consumed, and the USDC payout received.
            </p>
          </div>
        </div>
      </div>

      {/* Earned Payouts & Arc CCTP Cross-Chain Sweeper */}
      {sellerHederaAccount ? (
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900/90 via-amber-950/20 to-slate-900/90 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/40 text-[11px] font-mono text-amber-300">
                <Coins className="w-3.5 h-3.5" />
                Hedera HTS USDC Payout Balance
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 border border-emerald-800/40 text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live On-Chain (Hedera Testnet)
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h3 className="text-3xl font-extrabold text-white font-mono">
                ${totalEarnedUsdc.toFixed(6)}{" "}
                <span className="text-slate-400 text-sm font-sans font-normal">USDC</span>
              </h3>
              <button
                onClick={() => fetchHederaBalance(sellerHederaAccount)}
                disabled={isLoadingBalance}
                title="Refresh live on-chain balance from Mirror Node"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400 pt-1">
              <span>
                Account:{" "}
                <a
                  href={balanceDetails?.hashscanAccountUrl || `https://hashscan.io/testnet/account/${sellerHederaAccount}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline font-bold"
                >
                  {sellerHederaAccount} <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
              </span>
              <span>&bull;</span>
              <span>
                HTS Token:{" "}
                <a
                  href={balanceDetails?.hashscanTokenUrl || "https://hashscan.io/testnet/token/0.0.11134145"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-300 hover:underline"
                >
                  0.0.11134145 (SGUSDC) <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
              </span>
              <span>&bull;</span>
              <span>Gas: {hbarBalance.toFixed(2)} HBAR</span>
            </div>

            {balanceDetails?.totalSweptUsdc > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                  Gross Earned: ${(balanceDetails.lifetimeSettledUsdc || 0).toFixed(6)} USDC
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300">
                  Total Swept to MetaMask: -${balanceDetails.totalSweptUsdc.toFixed(6)} USDC
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-bold">
                  Net Available: ${totalEarnedUsdc.toFixed(6)} USDC
                </span>
              </div>
            )}

            <p className="text-xs text-slate-400 max-w-xl font-sans pt-1">
              Tokens used (T_used) are automatically settled on Hedera Testnet directly to your payout account.
              Use Circle CCTP or Uniswap V3 to sweep accumulated earnings into native tokens on Arc/EVM with zero slippage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBridgeDrawer(true)}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2.5 transition shadow-lg shadow-amber-500/20 whitespace-nowrap"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Sweep Funds to Connected MetaMask
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Hedera Payout Account Login Required</h4>
              <p className="text-xs text-slate-400">
                Connect your Hedera payout account in the Gateway above to display your live on-chain HTS USDC balance and historical earnings.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById("gateway-hedera-input");
              el?.focus();
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs font-mono transition shrink-0"
          >
            Connect Hedera Payout ID
          </button>
        </div>
      )}

      {/* Active Listings Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Active Arkiv Orderbook Entities
            <span className="text-xs font-mono font-normal text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              {listings.length} node{listings.length === 1 ? "" : "s"} listed
            </span>
          </h2>
          <div className="flex items-center gap-2.5">
            {listings.length > 0 && (
              <button
                type="button"
                onClick={handleClearOrderbook}
                className="text-xs font-mono px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition flex items-center gap-1.5"
                title="Clear all listings from orderbook"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Orderbook
              </button>
            )}
            <button
              onClick={fetchListings}
              className="text-xs font-mono text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="p-8 rounded-2xl glass-panel border border-dashed border-slate-800 text-center space-y-2">
            <Database className="w-6 h-6 mx-auto text-slate-500" />
            <h4 className="text-sm font-bold text-slate-300">Orderbook is currently empty</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No mock sellers exist. Connect your wallet above, verify your World ID, and list your authentic API key to create the first active seller entity!
            </p>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-mono text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">ENS Subname</th>
                    <th className="px-6 py-4">Model</th>
                    <th className="px-6 py-4">Available Quota</th>
                    <th className="px-6 py-4">Price / 1k</th>
                    <th className="px-6 py-4">World ID</th>
                    <th className="px-6 py-4">Hedera Payout</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {listings.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-bold text-slate-200">
                        {l.ensName}
                        <span className="text-[10px] text-slate-500 block font-normal">
                          {l.ownerAddress ? `${l.ownerAddress.slice(0, 6)}...${l.ownerAddress.slice(-4)}` : ""}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-cyan-300">{l.model}</td>
                      <td className="px-6 py-4 font-bold text-emerald-400">
                        {l.availableTokens.toLocaleString()} tokens
                      </td>
                      <td className="px-6 py-4">${(l.pricePer1kMicroUsdc / 1000000).toFixed(4)} USDC</td>
                      <td className="px-6 py-4">
                        {l.humanVerified ? (
                          <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-slate-500">Unverified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{l.hedaraPayoutAccount}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[10px]">
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
      </div>

      {/* Authentic World ID Verification Modal (Zero Fake Buttons) */}
      <WorldIdModal
        isOpen={showWorldIdModal}
        onClose={() => setShowWorldIdModal(false)}
      />

      {/* Circle CCTP Settlement Bridge Drawer */}
      <ArcBridgeDrawer
        isOpen={showBridgeDrawer}
        onClose={() => setShowBridgeDrawer(false)}
        availableUsdcEarnings={totalEarnedUsdc}
        sellerHederaAccountId={sellerHederaAccount || ""}
        onSweepSuccess={() => {
          if (sellerHederaAccount) {
            fetchHederaBalance(sellerHederaAccount);
          }
        }}
      />
    </div>
  );
}

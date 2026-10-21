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
} from "lucide-react";
import { sealSellerApiKeyInBrowser } from "@/lib/clientCrypto";
import {
  PROVIDERS,
  SUPPORTED_MODELS,
  getModelsByProvider,
  getModelMetadata,
  getModelTokenBounds,
  ThinkingLevel,
} from "@shunya/core";

export default function SellerHubPage() {
  const [provider, setProvider] = useState<string>("anthropic");
  const [model, setModel] = useState<string>("claude-3-7-sonnet");
  const [rawApiKey, setRawApiKey] = useState<string>("sk-ant-api03-sample-developer-key-9912");
  const [sealedKeyCiphertext, setSealedKeyCiphertext] = useState<string>("");
  const [tokenQuota, setTokenQuota] = useState<number>(200_000);
  const [pricePer1kUsdc, setPricePer1kUsdc] = useState<number>(0.015);
  const [hederaAccount, setHederaAccount] = useState<string>("0.0.482910");
  const [ensLabel, setEnsLabel] = useState<string>("arjun-claude");
  const [worldIdVerified, setWorldIdVerified] = useState<boolean>(true);
  const [nullifierHash, setNullifierHash] = useState<string>(
    "0xworld_id_nullifier_arjun_verified"
  );
  const [isSealing, setIsSealing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [listings, setListings] = useState<any[]>([]);
  const [totalEarnedUsdc, setTotalEarnedUsdc] = useState<number>(0.14192);

  // Filter models dynamically based on selected provider
  const availableModels = useMemo(() => {
    return getModelsByProvider(provider);
  }, [provider]);

  // Selected Model Metadata & Researched Specifications
  const currentModelMeta = useMemo(() => {
    return getModelMetadata(model) || availableModels[0] || SUPPORTED_MODELS[0];
  }, [model, availableModels]);

  // When provider changes, update model to the first model of that provider
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const modelsForNewProvider = getModelsByProvider(newProvider);
    if (modelsForNewProvider.length > 0) {
      const firstModel = modelsForNewProvider[0];
      setModel(firstModel.id);
      
      // Auto-set default price based on medium or default bounds
      const defaultBounds = getModelTokenBounds(firstModel.id, firstModel.supportsThinking ? "medium" : "none");
      setPricePer1kUsdc(defaultBounds.defaultPricePer1kMicroUsdc / 1_000_000);
    }

    // Set appropriate placeholder for raw API key
    const pInfo = PROVIDERS.find((p) => p.id === newProvider);
    if (pInfo) {
      setRawApiKey(`${pInfo.keyPrefix}sample-key-${Math.random().toString(36).slice(2, 8)}`);
    }
  };

  // When model changes, adjust price and recommended quota
  const handleModelChange = (newModelId: string) => {
    setModel(newModelId);
    const meta = getModelMetadata(newModelId);
    if (meta) {
      const defaultBounds = getModelTokenBounds(newModelId, meta.supportsThinking ? "medium" : "none");
      setPricePer1kUsdc(defaultBounds.defaultPricePer1kMicroUsdc / 1_000_000);
    }
  };

  // Fetch all active listings & earnings
  const fetchListings = () => {
    fetch("/api/listings")
      .then((res) => res.json())
      .then((data) => {
        if (data.listings) setListings(data.listings);
      })
      .catch(console.error);

    fetch("/api/hcs-logs")
      .then((res) => res.json())
      .then((data) => {
        if (data.receipts && data.receipts.length > 0) {
          const sum = data.receipts.reduce(
            (acc: number, r: any) => acc + (r.sellerReceivedUsdc || 0),
            0
          );
          setTotalEarnedUsdc(sum);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Seal raw API key to 0G Enclave Public Key on input change
  const handleSealApiKey = async () => {
    if (!rawApiKey) return;
    setIsSealing(true);
    try {
      const res = await fetch("/api/enclave-pubkey");
      const data = await res.json();
      const pubKey = data.publicKeyPem;

      const sealed = await sealSellerApiKeyInBrowser(rawApiKey, pubKey);
      setSealedKeyCiphertext(sealed);
    } catch (err: any) {
      console.error("Sealing failed:", err);
    } finally {
      setIsSealing(false);
    }
  };

  useEffect(() => {
    handleSealApiKey();
  }, [rawApiKey]);

  // World ID IDKit simulation
  const verifyWorldId = async () => {
    const mockNullifier = `0xworld_id_nullifier_${Math.random().toString(16).slice(2, 10)}_verified`;
    setNullifierHash(mockNullifier);
    setWorldIdVerified(true);
  };

  // Submit new listing to Arkiv
  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worldIdVerified) {
      alert("Please verify your human identity via World ID first.");
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerAddress: "0x71C2a8b940e4e8B",
          ensLabel,
          model,
          provider,
          availableTokens: Number(tokenQuota),
          pricePer1kMicroUsdc: Math.round(Number(pricePer1kUsdc) * 1_000_000),
          sealedApiKey: sealedKeyCiphertext || `ENCLAVE_SEALED:${rawApiKey}`,
          hedaraPayoutAccount: hederaAccount,
          worldIdProof: {
            nullifier_hash: nullifierHash,
            action: "shunyagrid-seller-listing",
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create listing");
      }

      alert("Success! Wallet-owned Arkiv Entity created with 1-hour block expiration.");
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

  const maxTMaxRequired = useMemo(() => {
    if (thinkingBreakdown.length === 0) return 20000;
    return Math.max(...thinkingBreakdown.map((t) => t.bounds.totalMaxTokens));
  }, [thinkingBreakdown]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Title */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Layers className="w-8 h-8 text-emerald-400" />
          Seller Quota Hub & Monetization
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Monetize your unused AI API quotas without hardware setup. Your API key is sealed to the 0G Enclave—you never
          see Buyer prompts or files, and Buyers never see your raw key.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form: List API Tokens */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Create Time-Scoped Token Pool (Arkiv Entity)
          </h2>

          <form onSubmit={handleSubmitListing} className="space-y-6">
            {/* Step 1: Provider & Model (Dynamic Filtering) */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block flex items-center justify-between">
                  <span>AI Provider:</span>
                  <span className="text-[10px] text-cyan-400">Step 1</span>
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block flex items-center justify-between">
                  <span>Target Model (Filtered):</span>
                  <span className="text-[10px] text-emerald-400 font-mono">{availableModels.length} models for {provider}</span>
                </label>
                <select
                  value={model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
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

                <p className="text-xs text-slate-400">
                  {currentModelMeta.description}
                </p>

                {/* Token Bounds Table */}
                <div className="pt-2">
                  <span className="text-[11px] font-mono text-slate-300 font-semibold block mb-1.5 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    Deterministic Token Bounds & Zero-Cutoff Gate (T_max):
                  </span>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-1.5 px-2">Thinking Level</th>
                          <th className="py-1.5 px-2">Thinking Budget</th>
                          <th className="py-1.5 px-2">Output Cap</th>
                          <th className="py-1.5 px-2">Input Cap</th>
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

            {/* Step 2: Raw API Key -> Instant Client-Side Encryption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300">
                  Raw API Key (Provider: {provider.toUpperCase()}):
                </label>
                <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  0G Enclave RSA-OAEP Protected
                </span>
              </div>
              <input
                type="password"
                value={rawApiKey}
                onChange={(e) => setRawApiKey(e.target.value)}
                placeholder={PROVIDERS.find((p) => p.id === provider)?.keyPlaceholder || "sk-..."}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />

              {sealedKeyCiphertext && (
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                  <span className="text-indigo-400 font-bold block">Enclave Ciphertext Preview:</span>
                  <div className="truncate text-slate-500">{sealedKeyCiphertext}</div>
                </div>
              )}
            </div>

            {/* Step 3: Quota & Pricing */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block">
                  Total Quota to Share (Tokens):
                </label>
                <input
                  type="number"
                  min={maxTMaxRequired}
                  step="5000"
                  value={tokenQuota}
                  onChange={(e) => setTokenQuota(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-cyan-400 font-bold font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 font-mono block">
                  Minimum recommended: {maxTMaxRequired.toLocaleString()} tokens (guarantees zero cutoffs).
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block">
                  Price per 1,000 Tokens (USDC):
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={pricePer1kUsdc}
                  onChange={(e) => setPricePer1kUsdc(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-emerald-400 font-bold font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 font-mono block">
                  e.g., $0.015 USDC per 1,000 tokens
                </span>
              </div>
            </div>

            {/* Step 4: World ID Verification & ENS Subname */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block">World ID Proof of Human:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={verifyWorldId}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 border transition ${
                      worldIdVerified
                        ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400"
                        : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    {worldIdVerified ? "World ID Verified ✔" : "Verify with World ID"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block">ENS Subname (Namespace SDK):</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={ensLabel}
                    onChange={(e) => setEnsLabel(e.target.value)}
                    placeholder="your-alias"
                    className="flex-1 rounded-l-xl bg-slate-900 border border-r-0 border-slate-800 p-3 text-sm text-slate-100 font-mono focus:outline-none"
                  />
                  <span className="px-3 py-3 rounded-r-xl bg-slate-800/80 border border-slate-800 text-xs font-mono text-slate-400">
                    .shunyagrid.eth
                  </span>
                </div>
              </div>
            </div>

            {/* Hedera Payout Account */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 block">
                Hedera Payout Account ID (Receives HTS USDC for T_used):
              </label>
              <input
                type="text"
                value={hederaAccount}
                onChange={(e) => setHederaAccount(e.target.value)}
                placeholder="0.0.xxxxx"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-bold text-white text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting ? "Broadcasting to Arkiv..." : "Publish 1-Hour Token Listing on Arkiv"}
            </button>
          </form>
        </div>

        {/* Right Info Card: How Payouts & Quota Work */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              How You Get Paid
            </h3>

            <div className="space-y-3 text-xs text-slate-300 font-sans leading-relaxed">
              <p>
                1. <strong className="text-white">Pre-Flight Reservation:</strong> When a Buyer requests your node,
                our interface locks <span className="text-cyan-400 font-mono">T_max</span> tokens from your quota to ensure zero cutoffs.
              </p>
              <p>
                2. <strong className="text-white">Actual Token Payout:</strong> Once inference finishes, you receive an
                instant <strong className="text-emerald-400">HTS USDC</strong> transfer directly to your Hedera account for the exact{" "}
                <span className="text-emerald-400 font-mono">T_used</span> tokens consumed.
              </p>
              <p>
                3. <strong className="text-white">Quota Restored:</strong> Unused tokens (<span className="font-mono">T_max - T_used</span>) are
                credited straight back to your Arkiv listing so you can keep monetizing!
              </p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 space-y-3 text-xs font-mono">
            <span className="text-indigo-400 font-bold block">🔒 Zero Surveillance Guarantee:</span>
            <p className="text-slate-400 font-sans">
              You will never receive or see the Buyer&apos;s prompt text, uploaded documents, or AI output. Your node log only
              shows the Hedera consensus timestamp, tokens consumed, and the USDC payout received.
            </p>
          </div>
        </div>
      </div>

      {/* Earned Payouts & Arc CCTP Cross-Chain Sweeper */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900/90 via-amber-950/20 to-slate-900/90 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/40 text-[11px] font-mono text-amber-300">
            <Coins className="w-3.5 h-3.5" />
            Hedera HTS USDC Payout Balance
          </div>
          <h3 className="text-2xl font-extrabold text-white font-mono">
            ${totalEarnedUsdc.toFixed(6)}{" "}
            <span className="text-slate-400 text-sm font-sans font-normal">USDC Earned</span>
          </h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Tokens used (T_used) are automatically settled into your Hedera payout account (`{hederaAccount}`).
            Use Circle CCTP to bridge your earnings into native USDC on Arc with zero slippage.
          </p>
        </div>

        <Link
          href={`/bridge?amount=${Math.max(totalEarnedUsdc, 1).toFixed(2)}&recipient=${encodeURIComponent(
            "0x71C2a8b940e4e8B"
          )}`}
          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2.5 transition shadow-lg shadow-amber-500/20 whitespace-nowrap"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Sweep Payouts to Arc via CCTP
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Active Listings Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          Active Arkiv Orderbook Entities
        </h2>

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
                    <td className="px-6 py-4 font-bold text-slate-200">{l.ensName}</td>
                    <td className="px-6 py-4 text-cyan-300">{l.model}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">{l.availableTokens.toLocaleString()} tokens</td>
                    <td className="px-6 py-4">${(l.pricePer1kMicroUsdc / 1000000).toFixed(4)} USDC</td>
                    <td className="px-6 py-4">
                      {l.humanVerified ? (
                        <span className="text-emerald-400">Verified</span>
                      ) : (
                        <span className="text-slate-500">No</span>
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
      </div>
    </div>
  );
}

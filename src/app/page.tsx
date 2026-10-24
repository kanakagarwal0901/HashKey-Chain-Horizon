"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Cpu,
  ArrowRight,
  Database,
  Coins,
  CheckCircle2,
  Lock,
  Zap,
  Globe,
  Wallet,
  LogOut,
  ExternalLink,
  HelpCircle,
  FileText,
  Search,
  Check,
  XCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import LoginGateway from "@/components/LoginGateway";
import HowItWorksModal from "@/components/HowItWorksModal";

export default function HomePage() {
  const {
    walletAddress,
    worldIdVerified,
    nullifierHash,
    isAuthenticated,
    logout,
  } = useAuth();

  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<"buyer" | "seller">("buyer");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"buyer" | "seller" | "technology">("buyer");

  useEffect(() => {
    fetch("/api/listings")
      .then((res) => res.json())
      .then((data) => {
        if (data.listings) setActiveListings(data.listings);
      })
      .catch((err) => console.error("Error loading listings:", err));
  }, []);

  const openGuide = (tab: "buyer" | "seller" | "technology") => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const filteredListings = activeListings.filter((item) => {
    if (modelFilter === "all") return true;
    return item.model?.toLowerCase().includes(modelFilter.toLowerCase());
  });

  return (
    <div className="space-y-16 sm:space-y-24 pb-24 text-slate-100">
      {/* Hero Section */}
      <section className="relative pt-6 sm:pt-10 pb-8 text-center max-w-5xl mx-auto px-4 sm:px-6">
        {/* Network Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Decentralized AI Compute • Zero Prompt Surveillance</span>
        </div>

        {/* Crisp Solid Heading (No generic gradient text tell) */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15] max-w-4xl mx-auto">
          Private AI Inference with Zero Mid-Reasoning Cutoffs
        </h1>

        <p className="mt-5 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
          Run frontier reasoning models like Claude 3.7 Sonnet and o3-mini without prompt logging, quota exhaustion, or credit cards.
          Or monetize your unused monthly API limits for instant USDC.
        </p>

        {/* Action Hub & Role Selector */}
        <div className="mt-8 max-w-3xl mx-auto">
          {/* Dual Role Selector Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 mb-6 shadow-lg">
            <button
              onClick={() => setUserRole("buyer")}
              className={`px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                userRole === "buyer"
                  ? "bg-cyan-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Cpu className="w-4 h-4" />
              I want to use AI (Buyer)
            </button>
            <button
              onClick={() => setUserRole("seller")}
              className={`px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                userRole === "seller"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Coins className="w-4 h-4" />
              I want to earn USDC (Seller)
            </button>
          </div>

          {/* Interactive Role Card */}
          {userRole === "buyer" ? (
            <div className="text-left rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider block">
                    Buyer Experience
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">
                    Frontier AI Reasoning with Complete Data Blindness
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openGuide("buyer")}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 transition flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                    How It Works
                  </button>
                  <Link
                    href="/buyer"
                    className="px-5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md"
                  >
                    Launch Studio
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* 3 Steps for Buyer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-md bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div className="font-semibold text-sm text-slate-200">Select Model & Depth</div>
                  <div className="text-xs text-slate-400 leading-normal">
                    Pick Claude 3.7 Sonnet or o3-mini and set low, medium, or high thinking depth.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-md bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div className="font-semibold text-sm text-slate-200">Sealed In Browser</div>
                  <div className="text-xs text-slate-400 leading-normal">
                    Your code, prompts, and attachments are encrypted locally. The seller never sees them.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-md bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div className="font-semibold text-sm text-slate-200">Zero Cutoff Guarantee</div>
                  <div className="text-xs text-slate-400 leading-normal">
                    Token ceiling is reserved upfront. Your reasoning trace never terminates mid-sentence.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-left rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider block">
                    Seller Experience
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">
                    Turn Spare Monthly API Quotas into Pure USDC
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openGuide("seller")}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 transition flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                    How It Works
                  </button>
                  <Link
                    href="/seller"
                    className="px-5 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md"
                  >
                    Open Seller Hub
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* 3 Steps for Seller */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div className="font-semibold text-sm text-slate-200">List Your Idle Quota</div>
                  <div className="text-xs text-slate-400 leading-normal">
                    Pick your model and set the maximum token volume you want to sell.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div className="font-semibold text-sm text-slate-200">Keys Sealed in Enclave</div>
                  <div className="text-xs text-slate-400 leading-normal">
                    Your key is encrypted in your browser. It only lives inside protected hardware RAM.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div className="font-semibold text-sm text-slate-200">Instant USDC & Sweep</div>
                  <div className="text-xs text-slate-400 leading-normal">
                    USDC arrives in your Hedera account on every prompt. Sweep to MetaMask anytime in 1 click.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Authenticated Dashboard Bar OR Login Gateway */}
        <div className="mt-8 max-w-2xl mx-auto">
          {isAuthenticated ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 text-left flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-mono font-bold text-xs">
                  {walletAddress ? walletAddress.slice(2, 4).toUpperCase() : "SG"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white">
                      {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}` : "Connected"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      World ID Verified
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Session active • Ready for zero-cutoff inference
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 text-xs font-mono font-semibold flex items-center gap-1 transition"
                >
                  <LogOut className="w-3 h-3" />
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <LoginGateway targetService="general" />
          )}
        </div>

        {/* Four Real-Time Invariant Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mt-10">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
            <span className="text-xs text-slate-400 block font-mono">Cutoff Failure Rate</span>
            <span className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono">0.00%</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Enforced via T_max ceiling</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
            <span className="text-xs text-slate-400 block font-mono">Seller Prompt Access</span>
            <span className="text-xl sm:text-2xl font-bold text-indigo-400 font-mono">Zero Visibility</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Sealed 0G Enclave RAM</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
            <span className="text-xs text-slate-400 block font-mono">Micro-Settlement</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">Hedera x402</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Native HTS USDC Payouts</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
            <span className="text-xs text-slate-400 block font-mono">Orderbook Engine</span>
            <span className="text-xl sm:text-2xl font-bold text-amber-400 font-mono">Arkiv Entities</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">1-Hour Block Auto-Expiry</span>
          </div>
        </div>
      </section>

      {/* Honest Side-by-Side Comparison */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Why Ordinary Proxies Fail for Frontier AI
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Reasoning models spend thousands of tokens just thinking. Here is how ShunyaGrid eliminates mid-sentence failures.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Traditional Web2 / AI Proxies */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-red-900/30 space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <XCircle className="w-4 h-4" />
              <span>Standard AI API Resellers</span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold font-mono">✕</span>
                <span><strong>Mid-generation cutoffs:</strong> Reasoning context explodes past limits, aborting halfway through generation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold font-mono">✕</span>
                <span><strong>No privacy:</strong> Sellers or intermediate proxies log your raw prompts, proprietary code, and attachments.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold font-mono">✕</span>
                <span><strong>Sybil attacks:</strong> Malicious actors flood networks with fake quota accounts or bot nodes.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold font-mono">✕</span>
                <span><strong>Credit card lock-in:</strong> Requires monthly recurring commitments or centralized credit balances.</span>
              </li>
            </ul>
          </div>

          {/* ShunyaGrid Guarantee */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/40 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>The ShunyaGrid Invariant Guarantee</span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-200">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Deterministic Token Gates:</strong> Calculates exact maximum tokens (T_max) upfront and locks seller quota atomically.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>0G Hardware Enclave Blindness:</strong> Prompts encrypted in browser with RSA-OAEP + AES-256-GCM. Sellers see zero data.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>World ID Proof-of-Personhood:</strong> Sybil-resistant cryptographic verification guarantees real human operators.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Instant Micro-USDC:</strong> Pay only for exact tokens consumed. Sellers sweep funds straight to MetaMask.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Live Orderbook / Arkiv Entities */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Live Arkiv Model Orderbook
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Verified nodes with real-time available quota. Prompts execute peer-to-peer with enclave confidentiality.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/seller"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 border border-slate-700"
            >
              + List Idle Quota
            </Link>
            <Link
              href="/buyer"
              className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              Open Studio
            </Link>
          </div>
        </div>

        {/* Model Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <span className="text-xs text-slate-400 font-mono mr-1">Filter:</span>
          {["all", "claude-3-7", "o3-mini", "deepseek", "gpt-4o"].map((filter) => (
            <button
              key={filter}
              onClick={() => setModelFilter(filter)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                modelFilter === filter
                  ? "bg-slate-700 text-white font-bold border border-slate-600"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {filter === "all" ? "All Models" : filter}
            </button>
          ))}
        </div>

        {/* Listings Table */}
        <div className="rounded-2xl overflow-hidden bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Seller Node</th>
                  <th className="px-5 py-3.5">Model</th>
                  <th className="px-5 py-3.5">Available Quota</th>
                  <th className="px-5 py-3.5">Price / 1k Tokens</th>
                  <th className="px-5 py-3.5">Personhood</th>
                  <th className="px-5 py-3.5">Hedera Payout</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-sans">
                      No active listings matching &quot;{modelFilter}&quot;.
                      <Link href="/seller" className="text-cyan-400 ml-2 hover:underline">
                        Create the first listing
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-semibold text-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          <a
                            href={
                              listing.ensName?.endsWith(".eth") && !listing.ensName?.endsWith(".shunyagrid.eth")
                                ? `https://app.ens.domains/${listing.ensName}`
                                : `/api/ens/ccip-read?subname=${listing.ensName}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-cyan-400 transition flex items-center gap-1 truncate max-w-[150px]"
                          >
                            <span>{listing.ensName}</span>
                            {listing.ensName?.endsWith(".eth") && !listing.ensName?.endsWith(".shunyagrid.eth") ? (
                              <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-1 py-0.2 rounded font-mono">
                                ENS
                              </span>
                            ) : (
                              <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-800/60 px-1 py-0.2 rounded font-mono">
                                SUB
                              </span>
                            )}
                          </a>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-200">
                          {listing.model}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-cyan-400">
                        {listing.availableTokens?.toLocaleString()} tokens
                      </td>
                      <td className="px-5 py-3.5 text-emerald-400 font-bold">
                        ${((listing.pricePer1kMicroUsdc || 0) / 1_000_000).toFixed(4)} USDC
                      </td>
                      <td className="px-5 py-3.5">
                        {listing.humanVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            World ID Verified
                          </span>
                        ) : (
                          <span className="text-slate-400">Unverified</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                        {listing.hedaraPayoutAccount}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/buyer?model=${listing.model}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Run Prompt</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Interactive Guide Modal */}
      <HowItWorksModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTab={modalTab}
      />
    </div>
  );
}

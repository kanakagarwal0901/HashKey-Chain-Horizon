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
  ExternalLink,
  HelpCircle,
  XCircle,
  Check,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import LoginGateway from "@/components/LoginGateway";
import HowItWorksModal from "@/components/HowItWorksModal";
import SpatialCard from "@/components/SpatialCard";
import AntigravityStagger from "@/components/AntigravityStagger";

export default function HomePage() {
  const {
    walletAddress,
    isAuthenticated,
    logout,
  } = useAuth();

  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<"buyer" | "seller">("buyer");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"buyer" | "seller" | "technology" | "hashkey">("buyer");

  useEffect(() => {
    fetch("/api/listings")
      .then((res) => res.json())
      .then((data) => {
        if (data.listings) setActiveListings(data.listings);
      })
      .catch((err) => console.error("Error loading listings:", err));
  }, []);

  const openGuide = (tab: "buyer" | "seller" | "technology" | "hashkey") => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const filteredListings = activeListings.filter((item) => {
    if (modelFilter === "all") return true;
    return item.model?.toLowerCase().includes(modelFilter.toLowerCase());
  });

  return (
    <div className="space-y-36 sm:space-y-48 pb-48 text-zinc-900 dark:text-zinc-100">
      {/* Hero Section */}
      <section className="pt-24 sm:pt-40 pb-16 text-center max-w-5xl mx-auto px-4 sm:px-6 antigravity-glow-hero scroll-mt-24">

        {/* Declarative Apple / Nike Display Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-950 dark:text-white leading-[1.12] max-w-4xl mx-auto mb-8">
          Confidential AI inference. Zero cutoffs.
        </h1>

        <p className="text-lg sm:text-2xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
          Run frontier reasoning models with hardware-grade data blindness.
          Your prompts remain sealed in memory. Guaranteed token headroom prevents mid-stream cutoffs, with 100% automated refund on error.
        </p>

        {/* Action Hub & Segmented Role Selector */}
        <div className="mt-16 max-w-3xl mx-auto">
          {/* Segmented Control */}
          <div className="inline-flex p-1.5 rounded-full liquid-glass-pill mb-10">
            <button
              onClick={() => setUserRole("buyer")}
              className={`px-7 py-3 rounded-full text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                userRole === "buyer"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Use Frontier AI (Buyer)</span>
            </button>
            <button
              onClick={() => setUserRole("seller")}
              className={`px-7 py-3 rounded-full text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                userRole === "seller"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Monetize Quota (Seller)</span>
            </button>
          </div>

          {/* Role Focused Overview Card with Spatial Depth */}
          {userRole === "buyer" ? (
            <SpatialCard maxTilt={2} className="text-left p-8 sm:p-12 space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block">
                    Buyer Execution Rail
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white mt-1.5 tracking-tight">
                    Frontier reasoning with complete data blindness
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openGuide("buyer")}
                    className="px-4 py-2 rounded-full border border-black/10 dark:border-white/15 bg-black/[0.04] dark:bg-zinc-900 hover:bg-black/[0.08] dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    How It Works
                  </button>
                  <Link
                    href="/buyer"
                    className="btn-primary-apple px-6 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition"
                  >
                    Launch Studio
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* 3 Pillars for Buyer */}
              <AntigravityStagger className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                <div className="p-6 sm:p-7 rounded-2xl liquid-glass-interactive space-y-3">
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">Model Selection</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Choose Claude 3.7 Sonnet, o3-mini, or Gemini 2.0 with calibrated thinking budgets.
                  </div>
                </div>

                <div className="p-6 sm:p-7 rounded-2xl liquid-glass-interactive space-y-3">
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">Client-Side RSA Sealing</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Prompts and files are encrypted with AES-256-GCM in local browser RAM before transmission.
                  </div>
                </div>

                <div className="p-6 sm:p-7 rounded-2xl liquid-glass-interactive space-y-3">
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">Zero-Cutoff Execution</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Token limits are mathematically bounded. Stream outputs with atomic seller settlement; remaining balance powers protocol routing.
                  </div>
                </div>
              </AntigravityStagger>
            </SpatialCard>
          ) : (
            <SpatialCard maxTilt={2} className="text-left p-8 sm:p-12 space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block">
                    Seller Provider Rail
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white mt-1.5 tracking-tight">
                    Turn unused monthly API limits into instant USDC
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openGuide("seller")}
                    className="px-4 py-2 rounded-full border border-black/10 dark:border-white/15 bg-black/[0.04] dark:bg-zinc-900 hover:bg-black/[0.08] dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    How It Works
                  </button>
                  <Link
                    href="/seller"
                    className="btn-primary-apple px-6 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition"
                  >
                    Seller Hub
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* 3 Pillars for Seller */}
              <AntigravityStagger className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                <div className="p-6 sm:p-7 rounded-2xl liquid-glass-interactive space-y-3">
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">Publish Quota Entity</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Set your rate per 1,000 tokens and specify your maximum available volume on Arkiv.
                  </div>
                </div>

                <div className="p-6 sm:p-7 rounded-2xl liquid-glass-interactive space-y-3">
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">Hardware Key Protection</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Your upstream API keys are sealed inside trusted 0G execution enclaves. Never stored in plain text.
                  </div>
                </div>

                <div className="p-6 sm:p-7 rounded-2xl liquid-glass-interactive space-y-3">
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">Instant Micro-Payouts</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Earn native HSK automatically on HashKey Chain as queries resolve. Sweep directly to any token on any EVM chain anytime.
                  </div>
                </div>
              </AntigravityStagger>
            </SpatialCard>
          )}
        </div>

        {/* Authenticated Dashboard Bar OR Login Gateway */}
        <div className="mt-16 max-w-2xl mx-auto">
          {isAuthenticated ? (
            <div className="p-6 sm:p-7 rounded-3xl liquid-glass text-left flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-xs">
                  {walletAddress ? walletAddress.slice(2, 4).toUpperCase() : "SG"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white tabular-data">
                      {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}` : "Connected"}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20 dark:border-emerald-800/40 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                      World ID Verified
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Session active &bull; Ready for confidential inference
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={logout}
                  className="px-3.5 py-1.5 rounded-full bg-black/[0.05] dark:bg-zinc-900 hover:bg-black/[0.1] dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition"
                >
                  <LogOut className="w-3.5 h-3.5 inline mr-1" />
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <LoginGateway targetService="general" />
          )}
        </div>

        {/* Precision Telemetry Specifications (Spatial Depth Cards) */}
        <AntigravityStagger className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 max-w-4xl mx-auto mt-20 sm:mt-24 text-left">
          <SpatialCard maxTilt={3} className="p-6 sm:p-7 space-y-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Cutoff Failure Rate</span>
            <span className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight mt-1 block tabular-data">
              0.00%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500 block pt-1">Guaranteed via T_max ceiling</span>
          </SpatialCard>

          <SpatialCard maxTilt={3} className="p-6 sm:p-7 space-y-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Seller Visibility</span>
            <span className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight mt-1 block">
              Zero Access
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500 block pt-1">0G Enclave RAM isolation</span>
          </SpatialCard>

          <SpatialCard maxTilt={3} className="p-6 sm:p-7 space-y-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Settlement Rail</span>
            <span className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight mt-1 block">
              HashKey HSP
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500 block pt-1">Native HTS USDC transfers</span>
          </SpatialCard>

          <SpatialCard maxTilt={3} className="p-6 sm:p-7 space-y-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Orderbook Engine</span>
            <span className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight mt-1 block">
              Arkiv Time-Scope
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500 block pt-1">Atomic quota reservation</span>
          </SpatialCard>
        </AntigravityStagger>
      </section>

      {/* Honest Side-by-Side Architectural Comparison */}
      <section id="architecture-comparison" className="max-w-5xl mx-auto px-4 sm:px-6 scroll-mt-28">
        <div className="text-center space-y-4 mb-14 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-950 dark:text-white tracking-tight">
            Engineered against proxy failure modes
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Reasoning models expend thousands of tokens thinking. Here is how ShunyaGrid eliminates unexpected drops.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Traditional Web2 / AI Proxies */}
          <SpatialCard maxTilt={2} className="p-8 sm:p-12 space-y-6">
            <div className="flex items-center gap-2.5 text-zinc-500 dark:text-zinc-400 font-semibold text-sm">
              <XCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <span>Standard AI API Resellers</span>
            </div>
            <ul className="space-y-4 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-zinc-400 dark:text-zinc-600 font-bold shrink-0">&times;</span>
                <span><strong>Mid-stream cutoffs:</strong> Reasoning context expands past quota, abruptly aborting generation.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-400 dark:text-zinc-600 font-bold shrink-0">&times;</span>
                <span><strong>Surveillance vulnerability:</strong> Resellers and proxies log prompts, code, and customer records.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-400 dark:text-zinc-600 font-bold shrink-0">&times;</span>
                <span><strong>Bot accounts & Sybils:</strong> Fake quota accounts and unverified nodes populate the marketplace.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-400 dark:text-zinc-600 font-bold shrink-0">&times;</span>
                <span><strong>Recurring commitments:</strong> Monthly minimum commitments and non-refundable credit balances.</span>
              </li>
            </ul>
          </SpatialCard>

          {/* ShunyaGrid Guarantee */}
          <SpatialCard maxTilt={2} className="p-8 sm:p-12 space-y-6 border-emerald-500/30 dark:border-white/20">
            <div className="flex items-center gap-2.5 text-zinc-950 dark:text-white font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>The ShunyaGrid Invariant Guarantee</span>
            </div>
            <ul className="space-y-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Deterministic token bounds:</strong> Upper limits (T_max) calculated upfront and locked atomically.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Hardware enclave isolation:</strong> Client-side RSA-OAEP encryption prevents node inspection.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>World ID proof-of-personhood:</strong> ZK-SNARK verification ensures authentic human node operators.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Deterministic settlement:</strong> Sellers earn for actual tokens consumed, remaining balance is retained as protocol commission, and failed queries receive 100% automated refunds.</span>
              </li>
            </ul>
          </SpatialCard>
        </div>
      </section>

      {/* Live Orderbook / Arkiv Entities */}
      <section id="orderbook" className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 scroll-mt-28">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-zinc-900 dark:text-white" />
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
                Live Model Orderbook
              </h2>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm mt-1">
              Active verified nodes with real-time quota. Peer-to-peer confidential inference with instant settlement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/seller"
              className="btn-secondary-apple px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              + List Quota
            </Link>
            <Link
              href="/buyer"
              className="btn-primary-apple px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Cpu className="w-3.5 h-3.5" />
              Open Studio
            </Link>
          </div>
        </div>

        {/* Model Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mr-1">Filter:</span>
          {["all", "claude-3-7", "o3-mini", "gemini-2.0", "gpt-4o"].map((filter) => (
            <button
              key={filter}
              onClick={() => setModelFilter(filter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                modelFilter === filter
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold"
                  : "bg-black/[0.04] dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-black/[0.06] dark:border-white/[0.08]"
              }`}
            >
              {filter === "all" ? "All Models" : filter}
            </button>
          ))}
        </div>

        {/* Precision Listings Table (Marked with data-ui for table styling) */}
        <div className="rounded-3xl overflow-hidden liquid-glass" data-ui="table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-ui="orderbook-table">
              <thead className="bg-black/[0.02] dark:bg-black/80 text-zinc-600 dark:text-zinc-400 text-[11px] font-semibold border-b border-black/[0.06] dark:border-white/[0.08]">
                <tr>
                  <th className="px-7 py-5">Seller Node</th>
                  <th className="px-7 py-5">Model</th>
                  <th className="px-7 py-5">Available Quota</th>
                  <th className="px-7 py-5">Rate / 1k Tokens</th>
                  <th className="px-7 py-5">Proof of Personhood</th>
                  <th className="px-7 py-5">Seller EVM Address</th>
                  <th className="px-7 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-16 text-center text-zinc-500 dark:text-zinc-400">
                      No active listings found for &quot;{modelFilter}&quot;.
                      <Link href="/seller" className="text-zinc-900 dark:text-white font-medium ml-2 hover:underline">
                        Create the first node listing
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
                      <td className="px-7 py-5 font-semibold text-zinc-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0 pulse-ring-emerald" />
                          <a
                            href={
                              listing.ensName?.endsWith(".eth") && !listing.ensName?.endsWith(".shunyagrid.eth")
                                ? `https://app.ens.domains/${listing.ensName}`
                                : `/api/ens/ccip-read?subname=${listing.ensName}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline transition flex items-center gap-1.5 truncate max-w-[170px]"
                          >
                            <span>{listing.ensName}</span>
                            {listing.ensName?.endsWith(".eth") && !listing.ensName?.endsWith(".shunyagrid.eth") ? (
                              <span className="text-[10px] bg-black/[0.06] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                                ENS
                              </span>
                            ) : (
                              <span className="text-[10px] bg-black/[0.06] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                                SUB
                              </span>
                            )}
                          </a>
                        </div>
                      </td>
                      <td className="px-7 py-5">
                        <span className="px-3 py-1 rounded-full bg-black/[0.05] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
                          {listing.model}
                        </span>
                      </td>
                      <td className="px-7 py-5 font-semibold text-zinc-900 dark:text-white tabular-data">
                        {listing.availableTokens?.toLocaleString()} tokens
                      </td>
                      <td className="px-7 py-5 font-semibold text-zinc-700 dark:text-zinc-200 tabular-data">
                        ${((listing.pricePer1kMicroUsdc || 0) / 1_000_000).toFixed(4)} USDC
                      </td>
                      <td className="px-7 py-5">
                        {listing.humanVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20 dark:border-emerald-800/40 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            World ID Verified
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">Unverified</span>
                        )}
                      </td>
                      <td className="px-7 py-5 text-zinc-500 dark:text-zinc-400 tabular-data text-xs">
                        {listing.hedaraPayoutAccount}
                      </td>
                      <td className="px-7 py-5 text-right whitespace-nowrap">
                        <Link
                          href={`/buyer?model=${listing.model}`}
                          className="btn-primary-apple inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Prompt</span>
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

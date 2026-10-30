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

function formatModelDisplayName(rawNameOrId?: string): string {
  if (!rawNameOrId) return "";
  return rawNameOrId
    .replace(/\s*\((Anthropic|OpenAI|Google|Groq|Groq LPU)\)/gi, "")
    .replace(/^claude-3-7-sonnet.*/i, "Claude 3.7 Sonnet")
    .replace(/^claude-3-5-sonnet.*/i, "Claude 3.5 Sonnet")
    .replace(/^claude-3-5-haiku.*/i, "Claude 3.5 Haiku")
    .replace(/^o3-mini.*/i, "o3-mini Reasoning")
    .replace(/^o1.*/i, "o1 Deep Reasoning")
    .replace(/^gpt-4o-mini.*/i, "GPT-4o Mini")
    .replace(/^gpt-4o.*/i, "GPT-4o Omnimodal")
    .replace(/^gemini-2\.0-flash-thinking.*/i, "Gemini 2.0 Flash Thinking")
    .replace(/^gemini-2\.0-flash.*/i, "Gemini 2.0 Flash")
    .replace(/^gemini-2\.0-pro.*/i, "Gemini 2.0 Pro Experimental")
    .replace(/^gemini-1\.5-pro.*/i, "Gemini 1.5 Pro")
    .replace(/^deepseek-r1-distill-llama-70b.*/i, "DeepSeek R1 (70B)")
    .replace(/^llama-3\.3-70b-versatile.*/i, "Llama 3.3 70B Versatile")
    .trim();
}

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
  const [modalTab, setModalTab] = useState<"buyer" | "seller" | "technology">("buyer");

  useEffect(() => {
    fetch(`/api/listings?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
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
    <div className="space-y-36 sm:space-y-48 pb-48 text-zinc-900 dark:text-zinc-100">
      {/* Hero Section */}
      <section className="pt-20 sm:pt-36 pb-16 text-center max-w-5xl mx-auto px-4 sm:px-6 antigravity-glow-hero scroll-mt-24">

        {/* Live HashKey Horizon Testnet Telemetry Pill */}
        <div className="inline-flex items-center gap-2 sm:gap-2.5 px-4 py-2 rounded-full liquid-glass-pill mb-8 border border-black/10 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-300 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-ring-emerald shrink-0" />
          <span className="font-semibold text-zinc-950 dark:text-white">HashKey Horizon Testnet</span>
          <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline">•</span>
          <span className="font-mono text-zinc-600 dark:text-zinc-400 hidden sm:inline">Block #35,100,370+</span>
          <span className="text-zinc-400 dark:text-zinc-600">•</span>
          <span className="text-zinc-600 dark:text-zinc-400">October 31, 2026</span>
          <span className="text-zinc-400 dark:text-zinc-600 hidden md:inline">•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium hidden md:inline">Zero-Cutoff Confidential Inference</span>
        </div>

        {/* Declarative Apple / Nike Display Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-950 dark:text-white leading-[1.12] max-w-4xl mx-auto mb-8">
          Confidential AI inference. Zero cutoffs.
        </h1>

        <p className="text-lg sm:text-2xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
          Run the world&apos;s most capable AI models with complete privacy and zero monthly commitments.
          Your prompts are encrypted in your browser and guaranteed never to cut off midway.
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
              <span>Use AI (Pay-As-You-Go)</span>
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
              <span>Sell Unused API Quota</span>
            </button>
          </div>

          {/* Role Focused Overview Card with Spatial Depth */}
          {userRole === "buyer" ? (
            <SpatialCard maxTilt={2} className="text-left p-8 sm:p-12 space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block">
                    For AI Users & Developers
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white mt-1.5 tracking-tight">
                    Use the Best AI Models with Complete Privacy
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
                    Choose from top models like Claude 3.7 Sonnet, o3-mini, and Gemini 2.0 with flexible thinking depth.
                  </div>
                </div>

                <div className="p-6 sm:p-7 rounded-2xl liquid-glass-interactive space-y-3">
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">100% Private & Encrypted</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Your questions and files are encrypted directly in your browser before leaving your computer. Nobody else can read them.
                  </div>
                </div>

                <div className="p-6 sm:p-7 rounded-2xl liquid-glass-interactive space-y-3">
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">Zero-Cutoff Execution</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Capacity is reserved before your query starts, so your answer never halts mid-sentence. You only pay for what you actually use.
                  </div>
                </div>
              </AntigravityStagger>
            </SpatialCard>
          ) : (
            <SpatialCard maxTilt={2} className="text-left p-8 sm:p-12 space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block">
                    For API Key Owners & Sellers
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white mt-1.5 tracking-tight">
                    Turn Unused Monthly API Limits into Passive Income
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
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">List Your Extra Quota</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Set your own price per 1,000 tokens and specify how many tokens you want to make available.
                  </div>
                </div>

                <div className="p-6 sm:p-7 rounded-2xl liquid-glass-interactive space-y-3">
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">Bank-Grade Key Security</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Your API keys are encrypted immediately and processed inside a secure hardware chip. Never stored in plain text or shared.
                  </div>
                </div>

                <div className="p-6 sm:p-7 rounded-2xl liquid-glass-interactive space-y-3">
                  <div className="font-semibold text-base text-zinc-900 dark:text-white">Instant Automatic Payouts</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Get paid automatically into your crypto wallet for every token consumed. Withdraw your earnings anytime to any major token.
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
                      Human Verified
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Session active • Ready for confidential inference
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
            <span className="text-xs text-zinc-500 dark:text-zinc-500 block pt-1">Guaranteed full response</span>
          </SpatialCard>

          <SpatialCard maxTilt={3} className="p-6 sm:p-7 space-y-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Data Privacy</span>
            <span className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight mt-1 block">
              100% Private
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500 block pt-1">Sellers never see your prompts</span>
          </SpatialCard>

          <SpatialCard maxTilt={3} className="p-6 sm:p-7 space-y-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Payout Speed</span>
            <span className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight mt-1 block">
              Instant
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500 block pt-1">Automatic per-token payments</span>
          </SpatialCard>

          <SpatialCard maxTilt={3} className="p-6 sm:p-7 space-y-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Capacity Tracking</span>
            <span className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight mt-1 block">
              Real-Time
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500 block pt-1">Verified live token reserves</span>
          </SpatialCard>
        </AntigravityStagger>
      </section>

      {/* Honest Side-by-Side Architectural Comparison */}
      <section id="architecture-comparison" className="max-w-5xl mx-auto px-4 sm:px-6 scroll-mt-28">
        <div className="text-center space-y-4 mb-14 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-950 dark:text-white tracking-tight">
            Why Choose ShunyaGrid Over Regular AI Proxies?
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Traditional AI resellers log your data, cut off responses mid-thought, or lock you into monthly plans. ShunyaGrid fixes this.
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
                <span className="text-zinc-400 dark:text-zinc-600 font-bold shrink-0">×</span>
                <span><strong>Mid-stream cutoffs:</strong> Reasoning context expands past quota, abruptly aborting generation.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-400 dark:text-zinc-600 font-bold shrink-0">×</span>
                <span><strong>Surveillance vulnerability:</strong> Resellers and proxies log prompts, code, and customer records.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-400 dark:text-zinc-600 font-bold shrink-0">×</span>
                <span><strong>Bot accounts & Sybils:</strong> Fake quota accounts and unverified nodes populate the marketplace.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-400 dark:text-zinc-600 font-bold shrink-0">×</span>
                <span><strong>Recurring commitments:</strong> Monthly minimum commitments and non-refundable credit balances.</span>
              </li>
            </ul>
          </SpatialCard>

          {/* ShunyaGrid Guarantee */}
          <SpatialCard maxTilt={2} className="p-8 sm:p-12 space-y-6 border-emerald-500/30 dark:border-white/20">
            <div className="flex items-center gap-2.5 text-zinc-950 dark:text-white font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>The ShunyaGrid Guarantee</span>
            </div>
            <ul className="space-y-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Guaranteed full answers:</strong> Token capacity is checked upfront, so your generation never gets cut off.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Complete prompt privacy:</strong> Your questions and documents are encrypted in your browser, unreadable to anyone else.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Verified real providers:</strong> Anti-bot checks ensure you are connected only to genuine, authentic providers.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Fair pay-as-you-go:</strong> You only pay for the tokens you actually use, with 100% automated refunds if anything fails.</span>
              </li>
            </ul>
          </SpatialCard>
        </div>
      </section>

      {/* Live Orderbook Entities */}
      <section id="orderbook" className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 scroll-mt-28">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-zinc-900 dark:text-white" />
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
                Live AI Marketplace
              </h2>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm mt-2.5 leading-relaxed">
              Browse active AI providers with verified token capacity. Use any model with complete privacy and instant settlement.
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
          {[
            { id: "all", label: "All Models" },
            { id: "claude-3-7", label: "Claude 3.7 Sonnet" },
            { id: "o3-mini", label: "o3-mini Reasoning" },
            { id: "gemini-2.0", label: "Gemini 2.0" },
            { id: "deepseek", label: "DeepSeek R1" },
            { id: "gpt-4o", label: "GPT-4o Omnimodal" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setModelFilter(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                modelFilter === item.id
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold"
                  : "bg-black/[0.04] dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-black/[0.06] dark:border-white/[0.08]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Precision Listings Table (Marked with data-ui for table styling) */}
        <div className="rounded-3xl overflow-hidden liquid-glass" data-ui="table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]" data-ui="orderbook-table">
              <thead className="bg-black/[0.02] dark:bg-black/80 text-zinc-600 dark:text-zinc-400 text-[11px] font-semibold border-b border-black/[0.06] dark:border-white/[0.08]">
                <tr>
                  <th className="px-7 py-5 whitespace-nowrap min-w-[220px]">Seller</th>
                  <th className="px-7 py-5 whitespace-nowrap min-w-[200px]">AI Model</th>
                  <th className="px-7 py-5 whitespace-nowrap">Available Capacity</th>
                  <th className="px-7 py-5 whitespace-nowrap">Price / 1k Tokens</th>
                  <th className="px-7 py-5 whitespace-nowrap">Human Check</th>
                  <th className="px-7 py-5 whitespace-nowrap">Payout Address</th>
                  <th className="px-7 py-5 text-right whitespace-nowrap">Action</th>
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
                      <td className="px-7 py-5 font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
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
                            className="hover:underline transition inline-flex items-center gap-2 whitespace-nowrap"
                            title={listing.ensName}
                          >
                            <span className="font-semibold text-zinc-950 dark:text-white">{listing.ensName}</span>
                            {listing.ensName?.endsWith(".eth") && !listing.ensName?.endsWith(".shunyagrid.eth") ? (
                              <span className="text-[10px] bg-black/[0.06] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium shrink-0">
                                ENS
                              </span>
                            ) : (
                              <span className="text-[10px] bg-black/[0.06] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium shrink-0">
                                SUB
                              </span>
                            )}
                          </a>
                        </div>
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/[0.04] dark:bg-zinc-900 border border-black/[0.08] dark:border-white/10 text-xs shadow-sm whitespace-nowrap">
                          <Cpu className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {formatModelDisplayName(listing.model)}
                          </span>
                        </div>
                      </td>
                      <td className="px-7 py-5 font-semibold text-zinc-900 dark:text-white tabular-data whitespace-nowrap">
                        {listing.availableTokens?.toLocaleString()} tokens
                      </td>
                      <td className="px-7 py-5 font-semibold text-zinc-700 dark:text-zinc-200 tabular-data whitespace-nowrap">
                        ${((listing.pricePer1kMicroUsdc || 0) / 1_000_000).toFixed(4)} USDC
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap">
                        {listing.humanVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20 dark:border-emerald-800/40 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Human Verified
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">Unverified</span>
                        )}
                      </td>
                      <td className="px-7 py-5 text-zinc-500 dark:text-zinc-400 tabular-data text-xs whitespace-nowrap">
                        {listing.payoutAddress || listing.ownerAddress || "—"}
                      </td>
                      <td className="px-7 py-5 text-right whitespace-nowrap">
                        <Link
                          href={`/buyer?model=${listing.model}`}
                          className="btn-primary-apple inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Use Model</span>
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

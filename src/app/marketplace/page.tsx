"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Cpu,
  ArrowRight,
  Database,
  Filter,
  Shield,
  Coins,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import SpatialCard from "@/components/SpatialCard";
import AntigravityStagger from "@/components/AntigravityStagger";
import ShunyaLogo from "@/components/ShunyaLogo";

function formatModelDisplayName(rawNameOrId?: string): string {
  if (!rawNameOrId) return "";
  return rawNameOrId
    .replace(/\s*\((Anthropic|OpenAI|Google|Groq|Groq LPU|xAI)\)/gi, "")
    .replace(/^claude-opus-4.*/i, "Claude Opus 4")
    .replace(/^claude-3-7-sonnet.*/i, "Claude 3.7 Sonnet")
    .replace(/^claude-3-5-sonnet.*/i, "Claude 3.5 Sonnet")
    .replace(/^claude-3-5-haiku.*/i, "Claude 3.5 Haiku")
    .replace(/^o3-mini.*/i, "o3-mini Reasoning")
    .replace(/^o3(?!\-).*/i, "o3 Reasoning Flagship")
    .replace(/^o1.*/i, "o1 Deep Reasoning")
    .replace(/^gpt-4\.5.*/i, "GPT-4.5 Knowledge Flagship")
    .replace(/^gpt-4o-mini.*/i, "GPT-4o Mini")
    .replace(/^gpt-4o.*/i, "GPT-4o Omnimodal")
    .replace(/^gemini-2\.0-flash-thinking.*/i, "Gemini 2.0 Flash Thinking")
    .replace(/^gemini-2\.0-flash.*/i, "Gemini 2.0 Flash")
    .replace(/^gemini-2\.0-pro.*/i, "Gemini 2.0 Pro Experimental")
    .replace(/^gemini-1\.5-pro.*/i, "Gemini 1.5 Pro")
    .replace(/^deepseek-r1-distill-llama-70b.*/i, "DeepSeek R1 (70B)")
    .replace(/^deepseek-r1(?!\-distill).*/i, "DeepSeek R1 (671B Full MoE)")
    .replace(/^deepseek-v3.*/i, "DeepSeek V3 (671B MoE)")
    .replace(/^llama-3\.1-405b.*/i, "Llama 3.1 405B Reasoning")
    .replace(/^llama-3\.3-70b-versatile.*/i, "Llama 3.3 70B Versatile")
    .replace(/^grok-3.*/i, "Grok 3 (Big Brain)")
    .replace(/^grok-2.*/i, "Grok 2 Vision")
    .trim();
}

export default function MarketplacePage() {
  const [pools, setPools] = useState<any[]>([]);
  const [rawListings, setRawListings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [expandedPools, setExpandedPools] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedPools((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchDiscovery = async (showLoadingState: boolean = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const [discRes, listRes] = await Promise.all([
        fetch(`/api/arc-discovery?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }),
        fetch(`/api/listings?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }),
      ]);

      const discData = await discRes.json();
      if (discData.pools) {
        setPools(discData.pools);
      }

      const listData = await listRes.json();
      if (listData.listings && Array.isArray(listData.listings)) {
        setRawListings(listData.listings);
      }
    } catch (err) {
      console.error("Failed to load discovery pools:", err);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscovery();
    const interval = setInterval(() => {
      fetchDiscovery(false);
    }, 5000);

    const onFocus = () => fetchDiscovery(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const filteredPools = pools.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.displayName.toLowerCase().includes(term) ||
      p.modelId.toLowerCase().includes(term) ||
      p.provider.toLowerCase().includes(term) ||
      (p.activeSellers && p.activeSellers.some((s: any) => s.ensName?.toLowerCase().includes(term)));
    const matchesProvider = selectedProvider === "all" || p.provider === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  const totalActiveNodes = rawListings.filter((l) => l.status === "active").length ||
    pools.reduce((acc, p) => acc + (p.availablePoolsCount || 0), 0);

  const totalVerifiedHumans = rawListings.filter((l) => l.status === "active" && l.humanVerified).length ||
    pools.reduce((acc, p) => {
      const verifiedInPool = (p.activeSellers || []).filter((s: any) => s.humanVerified).length;
      return acc + verifiedInPool;
    }, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24 space-y-16 sm:space-y-24 text-zinc-900 dark:text-zinc-100">
      {/* Hero Header */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-14 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-900 text-zinc-300 border border-white/10 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-zinc-300" />
                Live AI Marketplace
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Guaranteed Completion
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-ring-emerald" />
                Multi-Device On-Chain Synced
              </span>
            </div>
            <div className="space-y-3.5 sm:space-y-4">
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white flex items-center gap-3.5">
                <ShunyaLogo size={44} animated={true} />
                Explore Available AI Models
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
                Browse live AI models provided by verified sellers across all connected devices. Pick any model and start querying with complete privacy and zero monthly commitments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 self-start lg:self-center">
            <button
              onClick={() => fetchDiscovery(true)}
              disabled={loading}
              className="btn-secondary-apple px-5 py-2.5 rounded-full flex items-center gap-2 text-xs font-medium"
              title="Refresh orderbook pools"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-white" : "text-zinc-400"}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/seller"
              className="btn-secondary-apple px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ List Quota</span>
            </Link>
            <Link
              href="/buyer"
              className="btn-primary-apple px-6 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Launch Studio</span>
            </Link>
          </div>
        </div>

        {/* Live Orderbook Network Stats Bar */}
        <div data-ui="stats-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/[0.08] text-xs">
          <div className="p-4 sm:p-5 rounded-2xl liquid-glass-interactive">
            <span className="text-zinc-400 block text-[11px] uppercase tracking-wider font-medium">AI Models</span>
            <span className="text-white font-bold text-lg mt-0.5 block tabular-data">{pools.length} Tiers</span>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl liquid-glass-interactive">
            <span className="text-zinc-400 block text-[11px] uppercase tracking-wider font-medium">Active Nodes</span>
            <span className="text-emerald-400 font-bold text-lg mt-0.5 flex items-center gap-2 tabular-data">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block pulse-ring-emerald" />
              {totalActiveNodes} Online
            </span>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl liquid-glass-interactive">
            <span className="text-zinc-400 block text-[11px] uppercase tracking-wider font-medium">Verified Humans</span>
            <span className="text-white font-bold text-lg mt-0.5 block tabular-data">{totalVerifiedHumans} Verified</span>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl liquid-glass-interactive">
            <span className="text-zinc-400 block text-[11px] uppercase tracking-wider font-medium">Settlement Rail</span>
            <span className="text-emerald-400 font-bold text-lg mt-0.5 block">HashKey HSP (HSK / USDC)</span>
          </div>
        </div>
      </SpatialCard>

      {/* Filter and Search Bar */}
      <div className="liquid-glass p-5 sm:p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search model or provider (e.g. Claude, OpenAI, Gemini)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs">
            {[
              { id: "all", label: "All Providers" },
              { id: "anthropic", label: "Anthropic" },
              { id: "openai", label: "OpenAI" },
              { id: "gemini", label: "Google Gemini" },
              { id: "groq", label: "Groq LPU" },
              { id: "xai", label: "xAI (Grok)" },
            ].map((prov) => (
              <button
                key={prov.id}
                onClick={() => setSelectedProvider(prov.id)}
                className={`px-3 py-1.5 rounded-full transition font-medium ${
                  selectedProvider === prov.id
                    ? "bg-white text-black font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {prov.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-neutral-400 ml-auto sm:ml-2">
            Showing <strong className="text-white tabular-data">{filteredPools.length}</strong> pools (<span className="tabular-data">{totalActiveNodes}</span> nodes online)
          </span>
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400 space-y-3 apple-surface rounded-3xl border border-[var(--border-subtle)]">
          <Database className="w-8 h-8 mx-auto text-neutral-300 animate-spin" />
          <p className="text-xs">Querying decentralized orderbook entities...</p>
        </div>
      ) : filteredPools.length === 0 ? (
        <div className="p-12 text-center text-neutral-400 space-y-3 apple-surface rounded-3xl border border-[var(--border-subtle)]">
          <Filter className="w-8 h-8 mx-auto text-neutral-500" />
          <h3 className="text-base font-bold text-white">No Matching Token Pools Found</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Try adjusting your search query or provider filter. You can also publish new seller entities in the Seller Hub.
          </p>
        </div>
      ) : (
        <AntigravityStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPools.map((pool) => {
            const hasActiveSellers = pool.availablePoolsCount > 0;
            const isExpanded = Boolean(expandedPools[pool.catalogKey]);
            const displayedSellers = isExpanded
              ? pool.activeSellers
              : pool.activeSellers.slice(0, 3);

            return (
              <SpatialCard
                key={pool.catalogKey}
                maxTilt={2}
                className={`rounded-3xl border transition flex flex-col justify-between space-y-5 p-6 hover:-translate-y-1 ${
                  hasActiveSellers
                    ? "border-neutral-700 bg-[var(--surface-1)]"
                    : "border-[var(--border-subtle)] opacity-85"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        {pool.provider === "gemini"
                          ? "Google Gemini"
                          : pool.provider === "xai"
                          ? "xAI (Grok)"
                          : pool.provider === "groq"
                          ? "Groq LPU"
                          : pool.provider}
                      </span>
                      <h3 className="font-bold text-white text-base mt-0.5">{pool.displayName}</h3>
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full border shrink-0 ${
                        pool.thinkingLevel === "high"
                          ? "bg-neutral-900 text-white border-neutral-700"
                          : pool.thinkingLevel === "medium"
                          ? "bg-neutral-900 text-neutral-300 border-[var(--border-subtle)]"
                          : "bg-neutral-900 text-neutral-400 border-[var(--border-subtle)]"
                      }`}
                    >
                      Thinking: {pool.thinkingLevel}
                    </span>
                  </div>

                  {/* Token Bounds Spec */}
                  <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Min Required (T_min):</span>
                      <span className="text-neutral-200 tabular-data">{pool.tMin.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Input & File Cap:</span>
                      <span className="text-neutral-200 tabular-data">{pool.inputCap.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Thinking Budget:</span>
                      <span className="text-neutral-200 tabular-data">{pool.thinkingBudget.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex items-center justify-between text-white font-semibold pt-1.5 border-t border-[var(--border-subtle)]">
                      <span>Max Guaranteed (T_max):</span>
                      <span className="tabular-data">{pool.tMax.toLocaleString()} tokens</span>
                    </div>
                  </div>

                  {/* Upfront Price */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-neutral-400">Upfront Escrow Deposit:</span>
                    <span className="text-white font-semibold text-sm tabular-data">
                      ${(pool.upfrontBuyerChargeMicroUsdc / 1_000_000).toFixed(6)} USDC
                    </span>
                  </div>

                  {/* Active Seller Nodes Section */}
                  {hasActiveSellers ? (
                    <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-neutral-800 text-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block pulse-ring-emerald" />
                          <span className="tabular-data">{pool.availablePoolsCount}</span> Active Node{pool.availablePoolsCount === 1 ? "" : "s"} Online
                        </span>
                        <span className="text-[11px] text-neutral-300 font-medium tabular-data">
                          ${(pool.cheapestRatePer1kMicroUsdc / 1_000_000).toFixed(4)}/1k
                        </span>
                      </div>

                      {/* Listed Seller Node Badges */}
                      <div className="space-y-1.5 pt-1.5 border-t border-[var(--border-subtle)]">
                        {displayedSellers.map((seller: any, sIdx: number) => (
                          <div
                            key={sIdx}
                            className="flex items-center justify-between text-[11px] text-neutral-300 bg-neutral-900 px-2.5 py-1.5 rounded-xl border border-[var(--border-subtle)]"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-white font-medium truncate max-w-[130px]" title={seller.ensName}>
                                {seller.ensName}
                              </span>
                              {seller.humanVerified && (
                                <span className="text-[9px] text-white bg-neutral-800 px-1 py-0.2 rounded border border-neutral-700 flex items-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5 text-neutral-300" /> ID
                                </span>
                              )}
                            </div>
                            <span className="text-neutral-400 text-[10px] tabular-data shrink-0">
                              {seller.availableTokens.toLocaleString()} tok
                            </span>
                          </div>
                        ))}

                        {pool.activeSellers.length > 3 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleExpand(pool.catalogKey);
                            }}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 underline block text-right pt-0.5 tabular-data font-medium cursor-pointer w-full"
                          >
                            {isExpanded
                              ? "Show less ▲"
                              : `+${pool.activeSellers.length - 3} more verified nodes (View All) ▼`}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs flex items-center justify-between text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-neutral-600 inline-block" />
                        <span>0 active nodes online</span>
                      </div>
                      <Link href="/seller" className="text-white hover:underline text-[11px] font-semibold">
                        List Quota →
                      </Link>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <div className="text-xs text-neutral-400">
                    {hasActiveSellers ? (
                      <span className="text-emerald-400 font-medium">Ready to Prompt</span>
                    ) : (
                      <span className="text-neutral-500">Unfulfilled</span>
                    )}
                  </div>
                  <Link
                    href={`/buyer?model=${pool.modelId}&thinking=${pool.thinkingLevel}`}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                      hasActiveSellers
                        ? "btn-primary-apple"
                        : "btn-secondary-apple"
                    }`}
                  >
                    <span>Select Pool</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SpatialCard>
            );
          })}
        </AntigravityStagger>
      )}

      {/* Real-Time Live Orderbook Nodes Table Section */}
      <section className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-ring-emerald" />
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Live Decentralized Orderbook: All Active Seller Nodes
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
              Every seller listing registered across devices on HashKey Chain Horizon Testnet. Direct peer-to-peer discovery.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-white/10 tabular-data font-semibold text-emerald-400">
              {rawListings.filter((l) => l.status === "active").length} Active Listings
            </span>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden liquid-glass border border-white/10" data-ui="table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[800px]" data-ui="marketplace-orderbook-table">
              <thead className="bg-black/80 text-zinc-400 uppercase text-[11px] font-semibold border-b border-white/[0.08]">
                <tr>
                  <th className="py-4 px-6">Node / ENS Domain</th>
                  <th className="py-4 px-6">Model</th>
                  <th className="py-4 px-6">Available Quota</th>
                  <th className="py-4 px-6">Price / 1k</th>
                  <th className="py-4 px-6">Verification</th>
                  <th className="py-4 px-6">Payout Target</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {rawListings.filter((l) => l.status === "active").length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      No active listings found in decentralized orderbook.
                    </td>
                  </tr>
                ) : (
                  rawListings
                    .filter((l) => l.status === "active")
                    .map((listing) => (
                      <tr key={listing.id} className="hover:bg-white/[0.03] transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <span className="font-semibold text-white">{listing.ensName}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono block">
                            {listing.id}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-zinc-200 font-medium">
                            {formatModelDisplayName(listing.model)}
                          </span>
                          <span className="text-[10px] text-zinc-500 block uppercase">
                            {listing.provider}
                          </span>
                        </td>
                        <td className="py-4 px-6 tabular-data text-zinc-200 font-semibold">
                          {listing.availableTokens ? Number(listing.availableTokens).toLocaleString() : "0"} tok
                        </td>
                        <td className="py-4 px-6 tabular-data text-emerald-400 font-semibold">
                          ${((listing.pricePer1kMicroUsdc || 10000) / 1_000_000).toFixed(4)}/1k
                        </td>
                        <td className="py-4 px-6">
                          {listing.humanVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 text-[10px] font-medium">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Human Verified
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[10px]">Unverified</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-mono text-[11px] text-zinc-400 tabular-data">
                          {listing.payoutAddress || listing.ownerAddress
                            ? `${(listing.payoutAddress || listing.ownerAddress).slice(0, 6)}...${(listing.payoutAddress || listing.ownerAddress).slice(-4)}`
                            : "HashKey"}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/buyer?model=${listing.model}`}
                            className="btn-primary-apple px-4 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <span>Prompt Node</span>
                            <ArrowRight className="w-3 h-3" />
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

      {/* Arc Studio & Discovery Schema Footnote */}
      <div className="p-4 sm:p-5 rounded-2xl apple-surface border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-neutral-300 shrink-0" />
          <span>
            Discoverable by autonomous AI agents via{" "}
            <code className="text-white bg-neutral-900 px-2 py-0.5 rounded border border-[var(--border-subtle)] font-mono text-[11px]">GET /api/arc-discovery</code>
          </span>
        </div>
        <a
          href="/api/arc-discovery"
          target="_blank"
          rel="noreferrer"
          className="text-white hover:text-neutral-300 hover:underline flex items-center gap-1 font-medium"
        >
          View Discovery Schema <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Cpu,
  RefreshCw,
  Coins,
  ArrowRight,
  Database,
  Lock,
  Zap,
  Filter,
  Shield,
  Eye,
  Check,
} from "lucide-react";

export default function MarketplacePage() {
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [expandedPoolKey, setExpandedPoolKey] = useState<string | null>(null);

  const fetchDiscovery = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/arc-discovery");
      const data = await res.json();
      if (data.pools) {
        setPools(data.pools);
      }
    } catch (err) {
      console.error("Failed to load discovery pools:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscovery();
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

  const totalActiveNodes = pools.reduce((acc, p) => acc + (p.availablePoolsCount || 0), 0);
  const totalVerifiedHumans = pools.reduce((acc, p) => {
    const verifiedInPool = (p.activeSellers || []).filter((s: any) => s.humanVerified).length;
    return acc + verifiedInPool;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                Arkiv DB-Chain & Arc Studio Catalog
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Deterministic Zero-Cutoff Invariants (Q &ge; T_max)
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 inline-flex">
                <Layers className="w-7 h-7" />
              </span>
              AI API Token Pool Orderbook
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Explore live peer-to-peer AI token allocations registered as wallet-owned Arkiv entities. Each pool specifies verified thinking budgets and pre-flight T_max guarantees.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              onClick={fetchDiscovery}
              disabled={loading}
              className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-2 text-xs font-mono shadow-sm"
              title="Refresh orderbook pools"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/buyer"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs font-mono transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Cpu className="w-4 h-4" />
              <span>Launch Studio</span>
            </Link>
          </div>
        </div>

        {/* Live Orderbook Network Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Active Supported Pools</span>
            <span className="text-white font-bold text-base">{pools.length} Tiers</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Online Seller Nodes</span>
            <span className="text-emerald-400 font-bold text-base flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {totalActiveNodes} Online
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">World ID Verified Humans</span>
            <span className="text-cyan-400 font-bold text-base">{totalVerifiedHumans} Verified</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Settlement Asset</span>
            <span className="text-amber-300 font-bold text-base">Hedera HTS USDC</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800/90 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search model, provider, or seller ENS..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-inner font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            {[
              { id: "all", label: "All Providers" },
              { id: "gemini", label: "Google Gemini" },
              { id: "anthropic", label: "Anthropic" },
              { id: "openai", label: "OpenAI" },
              { id: "groq", label: "Groq LPU" },
            ].map((prov) => (
              <button
                key={prov.id}
                onClick={() => setSelectedProvider(prov.id)}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  selectedProvider === prov.id
                    ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-900/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {prov.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-slate-400 ml-auto sm:ml-2">
            Showing <strong className="text-white">{filteredPools.length}</strong> pools ({totalActiveNodes} online)
          </span>
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-3 animate-pulse glass-panel rounded-3xl border border-slate-800">
          <Database className="w-8 h-8 mx-auto text-indigo-400 animate-spin" />
          <p className="text-xs font-mono">Querying Arkiv decentralized orderbook entities...</p>
        </div>
      ) : filteredPools.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-3 glass-panel rounded-3xl border border-slate-800">
          <Filter className="w-8 h-8 mx-auto text-slate-500" />
          <h3 className="text-base font-bold text-white">No Matching Token Pools Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search query or provider filter. You can also publish new seller entities in the Seller Hub.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPools.map((pool) => {
            const hasActiveSellers = pool.availablePoolsCount > 0;
            const isExpanded = expandedPoolKey === pool.catalogKey;

            return (
              <div
                key={pool.catalogKey}
                className={`rounded-3xl glass-panel border transition flex flex-col justify-between shadow-xl space-y-5 p-6 ${
                  hasActiveSellers
                    ? "border-emerald-500/40 bg-gradient-to-b from-slate-900/90 to-emerald-950/10"
                    : "border-slate-800/90 hover:border-slate-700/80"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                        {pool.provider === "gemini" ? "Google Gemini" : pool.provider}
                      </span>
                      <h3 className="font-bold text-white text-base mt-0.5">{pool.displayName}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border shrink-0 ${
                        pool.thinkingLevel === "high"
                          ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                          : pool.thinkingLevel === "medium"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : pool.thinkingLevel === "low"
                          ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                          : "bg-slate-500/10 text-slate-300 border-slate-500/30"
                      }`}
                    >
                      Thinking: {pool.thinkingLevel}
                    </span>
                  </div>

                  {/* Token Bounds Spec */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono shadow-inner">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Min Required (T_min):</span>
                      <span className="text-slate-200">{pool.tMin.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Input & File Cap:</span>
                      <span className="text-slate-200">{pool.inputCap.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Thinking Budget:</span>
                      <span className="text-slate-200">{pool.thinkingBudget.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex items-center justify-between text-cyan-400 font-bold pt-1.5 border-t border-slate-800/80">
                      <span>Max Guaranteed (T_max):</span>
                      <span>{pool.tMax.toLocaleString()} tokens</span>
                    </div>
                  </div>

                  {/* Upfront Price */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-slate-400">Upfront Escrow Deposit:</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">
                      ${(pool.upfrontBuyerChargeMicroUsdc / 1_000_000).toFixed(6)} USDC
                    </span>
                  </div>

                  {/* Active Seller Nodes Section */}
                  {hasActiveSellers ? (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs font-mono space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          {pool.availablePoolsCount} Active Node{pool.availablePoolsCount === 1 ? "" : "s"} Online
                        </span>
                        <span className="text-[10px] text-emerald-300 font-bold">
                          ${(pool.cheapestRatePer1kMicroUsdc / 1_000_000).toFixed(4)}/1k
                        </span>
                      </div>

                      {/* Listed Seller Node Badges */}
                      <div className="space-y-1.5 pt-1.5 border-t border-emerald-900/50">
                        {pool.activeSellers.slice(0, 3).map((seller: any, sIdx: number) => (
                          <div
                            key={sIdx}
                            className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800/80"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-slate-200 font-bold truncate max-w-[130px]" title={seller.ensName}>
                                {seller.ensName}
                              </span>
                              {seller.humanVerified && (
                                <span className="text-[9px] text-cyan-400 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-800/50 flex items-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5" /> ID
                                </span>
                              )}
                            </div>
                            <span className="text-emerald-300 text-[10px] font-mono shrink-0">
                              {seller.availableTokens.toLocaleString()} tok
                            </span>
                          </div>
                        ))}
                        {pool.activeSellers.length > 3 && (
                          <span className="text-[10px] text-slate-400 block text-right pt-0.5">
                            +{pool.activeSellers.length - 3} more verified nodes
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/90 text-xs font-mono flex items-center justify-between text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                        <span>0 active nodes online</span>
                      </div>
                      <Link href="/seller" className="text-cyan-400 hover:underline text-[11px] font-bold">
                        List Quota &rarr;
                      </Link>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs text-slate-400 font-mono">
                    {hasActiveSellers ? (
                      <span className="text-emerald-400 font-bold">Ready to Prompt</span>
                    ) : (
                      <span className="text-slate-500">Unfulfilled</span>
                    )}
                  </div>
                  <Link
                    href={`/buyer?model=${pool.modelId}&thinking=${pool.thinkingLevel}`}
                    className={`px-4 py-2 rounded-xl text-xs font-medium text-white transition flex items-center gap-1.5 shadow-sm ${
                      hasActiveSellers
                        ? "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-bold shadow-emerald-950/50"
                        : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    <span>Select Pool</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-200" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Arc Studio & Discovery Schema Footnote */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shadow-md">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Discoverable by autonomous Arc Consumer Agents via{" "}
            <code className="text-cyan-400 font-mono text-[11px]">GET /api/arc-discovery</code>
          </span>
        </div>
        <a
          href={process.env.NEXT_PUBLIC_ARC_STUDIO_PROJECT_URL || "https://studio.arc.com/projects/shunyagrid-mumbai"}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-mono font-semibold"
        >
          Arc Studio Genesis Project <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

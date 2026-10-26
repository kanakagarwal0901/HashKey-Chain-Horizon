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
} from "lucide-react";

export default function MarketplacePage() {
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");

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
    const matchesSearch =
      p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.modelId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvider = selectedProvider === "all" || p.provider === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  const totalActiveNodes = pools.reduce((acc, p) => acc + (p.availablePoolsCount || 0), 0);

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
                Deterministic Zero-Cutoff Token Bounds
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
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800/90 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by model name or provider..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-inner font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            {["all", "anthropic", "openai", "groq"].map((prov) => (
              <button
                key={prov}
                onClick={() => setSelectedProvider(prov)}
                className={`px-3 py-1.5 rounded-lg capitalize transition font-medium ${
                  selectedProvider === prov
                    ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-900/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-slate-400 ml-auto sm:ml-2">
            Showing <strong className="text-white">{filteredPools.length}</strong> pools ({totalActiveNodes} nodes online)
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
          {filteredPools.map((pool) => (
            <div
              key={pool.catalogKey}
              className="rounded-3xl glass-panel border border-slate-800/90 p-6 hover:border-slate-700/80 transition flex flex-col justify-between shadow-xl space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                      {pool.provider}
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
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-xs text-slate-400 font-mono">
                  <span className="text-white font-bold">{pool.availablePoolsCount}</span> active sellers
                </div>
                <Link
                  href={`/buyer?model=${pool.modelId}&thinking=${pool.thinkingLevel}`}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>Select Pool</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Arc Studio & Discovery Schema Footnote */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shadow-md">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Discoverable by autonomous Arc Consumer Agents via <code className="text-cyan-400 font-mono text-[11px]">GET /api/arc-discovery</code></span>
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

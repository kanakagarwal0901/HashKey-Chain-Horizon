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
} from "lucide-react";
import { MODEL_TOKEN_CATALOG } from "@/lib/tokenBoundsCatalog";

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

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Arkiv DB-Chain & Arc Studio
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Zero-Cutoff Guaranteed
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              AI API Token Pool Orderbook
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live peer-to-peer token allocations registered as wallet-owned Arkiv entities with deterministic thinking bounds
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDiscovery}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-2 text-xs font-mono"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/buyer"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Cpu className="w-4 h-4" /> Go to Buyer Studio
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by model name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            {["all", "anthropic", "openai", "groq"].map((prov) => (
              <button
                key={prov}
                onClick={() => setSelectedProvider(prov)}
                className={`px-3 py-1.5 rounded-lg capitalize transition ${
                  selectedProvider === prov
                    ? "bg-indigo-600 text-white font-semibold shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {prov}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPools.map((pool) => (
            <div
              key={pool.catalogKey}
              className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {pool.provider}
                    </span>
                    <h3 className="font-bold text-white text-base mt-0.5">{pool.displayName}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
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
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs font-mono">
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
                  <div className="flex items-center justify-between text-indigo-400 font-bold pt-1 border-t border-slate-800/60">
                    <span>Max Guaranteed (T_max):</span>
                    <span>{pool.tMax.toLocaleString()} tokens</span>
                  </div>
                </div>

                {/* Upfront Price */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Upfront Buyer Charge:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    ${(pool.upfrontBuyerChargeMicroUsdc / 1_000_000).toFixed(6)} USDC
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  <span className="text-white font-bold">{pool.availablePoolsCount}</span> active sellers
                </div>
                <Link
                  href={`/buyer?model=${pool.modelId}&thinking=${pool.thinkingLevel}`}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition flex items-center gap-1.5"
                >
                  Select Pool <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Arc Studio & Discovery Schema Footnote */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Discoverable by autonomous Arc Consumer Agents via <code>GET /api/arc-discovery</code></span>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_ARC_STUDIO_PROJECT_URL || "https://studio.arc.com/projects/shunyagrid-mumbai"}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:underline flex items-center gap-1 font-mono"
          >
            Arc Studio Genesis Project <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Activity, ChevronDown, ChevronUp, Lock, Globe, Server, CheckCircle2 } from "lucide-react";
import { anonRpcRouter, AnonRpcTelemetryEntry } from "@/lib/anonRpcClient";

export default function AnonRpcStatusBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<AnonRpcTelemetryEntry[]>([]);
  const [stats, setStats] = useState({ anonymizedCount: 0, directCount: 0, initialized: false });

  useEffect(() => {
    const unsubscribe = anonRpcRouter.subscribeTelemetry((entries) => {
      setTelemetry(entries);
      setStats(anonRpcRouter.getWorkerState());
    });
    return () => unsubscribe();
  }, []);

  const total = stats.anonymizedCount + stats.directCount;
  const anonymizedPercentage = total > 0 ? Math.round((stats.anonymizedCount / total) * 100) : 100;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium border bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50 transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)]"
        title="EF Anon-RPC Sandboxed Transport Status"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">Anon-RPC:</span>
        <span className="font-semibold text-white">{anonymizedPercentage}% Stripped</span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl bg-slate-900/95 border border-slate-700 p-4 shadow-2xl backdrop-blur-xl z-50 text-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-white">Anon-RPC Worker Sandbox</h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              v0.3.3 EF CROPS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="text-slate-400 text-[11px]">User Queries Masked</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                {stats.anonymizedCount} <span className="text-xs font-normal text-slate-400">calls</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="text-slate-400 text-[11px]">Direct Public Reads</div>
              <div className="text-lg font-bold text-sky-400 font-mono mt-0.5">
                {stats.directCount} <span className="text-xs font-normal text-slate-400">headers</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between">
            <span className="font-medium text-slate-300">Live Traffic Routing Log</span>
            <span className="text-[10px] font-mono">Stripping IP & Headers</span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
            {telemetry.length === 0 ? (
              <div className="text-slate-500 py-3 text-center text-xs">
                No outbound RPC calls yet. Browse models or check balances to trigger Anon-RPC.
              </div>
            ) : (
              telemetry.map((t) => (
                <div
                  key={t.id}
                  className="p-2 rounded bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-semibold text-white">{t.method}</span>
                    <span>{t.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {t.routedVia === "ANON_RPC_SANDBOX_WORKER" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Lock className="w-2.5 h-2.5" /> Anon Sandbox
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sky-400">
                        <Globe className="w-2.5 h-2.5" /> Direct Header
                      </span>
                    )}
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">{t.durationMs}ms</span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1 truncate">{t.reason}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Isolation: <span className="text-emerald-400">Sandboxed IFrame</span></span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Zero IP Leakage
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

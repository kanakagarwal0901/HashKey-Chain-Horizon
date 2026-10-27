"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, Lock, Globe } from "lucide-react";
import { anonRpcRouter, AnonRpcTelemetryEntry } from "@/lib/anonRpcClient";

export default function AnonRpcStatusBadge({
  placement = "bottom",
}: {
  placement?: "top" | "bottom";
}) {
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium liquid-glass-pill text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition"
        title="EF Anon-RPC Sandboxed Transport Status"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block pulse-ring-emerald" />
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline">EF Anon-RPC:</span>
        <span className="font-semibold text-zinc-900 dark:text-white tabular-data">{anonymizedPercentage}% Stripped</span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div
          data-ui="dropdown-menu"
          className={`absolute ${
            placement === "top" ? "bottom-full mb-3" : "top-full mt-2"
          } left-0 sm:left-auto sm:right-0 w-80 sm:w-96 rounded-2xl liquid-glass p-4 z-50 text-zinc-900 dark:text-zinc-200`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-semibold text-zinc-950 dark:text-white">Anon-RPC Worker Sandbox</h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-neutral-900 text-zinc-700 dark:text-neutral-300 border border-black/[0.06] dark:border-[var(--border-subtle)]">
              v0.3.3 EF CROPS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-3 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="text-neutral-400 text-[11px]">User Queries Masked</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5 tabular-data">
                {stats.anonymizedCount} <span className="text-xs font-normal text-neutral-400">calls</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="text-neutral-400 text-[11px]">Direct Public Reads</div>
              <div className="text-lg font-bold text-white mt-0.5 tabular-data">
                {stats.directCount} <span className="text-xs font-normal text-neutral-400">headers</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 mb-2 flex items-center justify-between">
            <span className="font-medium text-neutral-300">Live Traffic Routing Log</span>
            <span className="text-[10px]">Stripping IP & Headers</span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 text-[11px]">
            {telemetry.length === 0 ? (
              <div className="text-neutral-500 py-3 text-center text-xs">
                No outbound RPC calls yet. Browse models or check balances to trigger Anon-RPC.
              </div>
            ) : (
              telemetry.map((t) => (
                <div
                  key={t.id}
                  className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]"
                >
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                    <span className="font-semibold text-white">{t.method}</span>
                    <span className="tabular-data">{t.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {t.routedVia === "ANON_RPC_SANDBOX_WORKER" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Lock className="w-2.5 h-2.5" /> Anon Sandbox
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-neutral-300">
                        <Globe className="w-2.5 h-2.5" /> Direct Header
                      </span>
                    )}
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400 tabular-data">{t.durationMs}ms</span>
                  </div>
                  <div className="text-[9px] text-neutral-500 mt-1 truncate">{t.reason}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] text-[10px] text-neutral-400 flex items-center justify-between">
            <span>Isolation: <span className="text-emerald-400 font-medium">Sandboxed Worker</span></span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3" /> Zero IP Leakage
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Terminal, ShieldCheck, Activity, Cpu, Globe, Database } from "lucide-react";
import { playHoverSound, playClickSound } from "@/utils/griflanAudio";

export default function GriflanTelemetryHUD() {
  const [blockHeight, setBlockHeight] = useState(35100412);
  const [activeTab, setActiveTab] = useState<"telemetry" | "attestation" | "nodes">("telemetry");
  const [uptimeSeconds, setUptimeSeconds] = useState(148290);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setBlockHeight((b) => b + 1);
      setUptimeSeconds((u) => u + 1);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 select-none font-mono">
      <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#07080b]/90 backdrop-blur-md overflow-hidden">
        {/* Terminal Header Bar */}
        <div className="border-b border-black/10 dark:border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-4 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              SHUNYAGRID TELEMETRY // HORIZON L2 KERNEL
            </span>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => {
                setActiveTab("telemetry");
                playClickSound();
              }}
              className={`px-3 py-1 rounded transition ${
                activeTab === "telemetry"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              [ LIVE KERNEL ]
            </button>
            <button
              onClick={() => {
                setActiveTab("attestation");
                playClickSound();
              }}
              className={`px-3 py-1 rounded transition ${
                activeTab === "attestation"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              [ TEE PROOFS ]
            </button>
            <button
              onClick={() => {
                setActiveTab("nodes");
                playClickSound();
              }}
              className={`px-3 py-1 rounded transition ${
                activeTab === "nodes"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              [ RUNNING NODES ]
            </button>
          </div>
        </div>

        {/* Tab 1: Live Kernel Telemetry */}
        {activeTab === "telemetry" && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="space-y-1.5 p-3 rounded border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
              <div className="text-zinc-400 dark:text-zinc-500 uppercase text-[10px]">
                L2 Block Height
              </div>
              <div className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <span>#{mounted ? formatNumber(blockHeight) : "35,100,412"}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                100% In-Sync (HashKey L2)
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
              <div className="text-zinc-400 dark:text-zinc-500 uppercase text-[10px]">
                Base Gas Price
              </div>
              <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                0.00012 HSK
              </div>
              <div className="text-[10px] text-zinc-500">Avg Settlement ~ 1.2s</div>
            </div>

            <div className="space-y-1.5 p-3 rounded border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
              <div className="text-zinc-400 dark:text-zinc-500 uppercase text-[10px]">
                Enclave Cluster Uptime
              </div>
              <div className="text-lg font-bold text-zinc-950 dark:text-white">
                {mounted ? formatUptime(uptimeSeconds) : "1d 17h 11m 30s"}
              </div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400">
                99.992% Attested Uptime
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
              <div className="text-zinc-400 dark:text-zinc-500 uppercase text-[10px]">
                Total Escrowed Volume
              </div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                1,420.50 HSK
              </div>
              <div className="text-[10px] text-zinc-500">0 Mid-Stream Cutoffs</div>
            </div>
          </div>
        )}

        {/* Tab 2: TEE Attestation Proofs */}
        {activeTab === "attestation" && (
          <div className="p-6 space-y-3 text-xs">
            <div className="p-3 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>ROOT ATTESTATION CERTIFICATE #SNP-2026-HASHKEY-VERIFIED</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider">HARDWARE SIGNED</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3 rounded border border-black/5 dark:border-white/5 space-y-1">
                <div className="text-zinc-400 text-[10px] uppercase">Measurement Hash (PCR0)</div>
                <div className="font-mono text-[11px] text-zinc-900 dark:text-zinc-100 break-all">
                  0x9c4f7b2a1e8d3c50981b2a47e90c812d4589f1a23b4c5d6e7f8a9b0c1d2e3f4a
                </div>
              </div>

              <div className="p-3 rounded border border-black/5 dark:border-white/5 space-y-1">
                <div className="text-zinc-400 text-[10px] uppercase">Enclave Public Key (RSA-OAEP-4096)</div>
                <div className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 break-all">
                  0x4a7e90c812d4589f1a23b4c5d6e7f8a9b0c1d2e3f4a9c4f7b2a1e8d3c50981b2
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Running Nodes */}
        {activeTab === "nodes" && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {[
              {
                region: "Hong Kong (HK-01)",
                model: "Claude 3.7 Sonnet (TEE)",
                latency: "14ms",
                status: "ONLINE",
              },
              {
                region: "Tokyo (TY-02)",
                model: "DeepSeek R1 Zero (TEE)",
                latency: "28ms",
                status: "ONLINE",
              },
              {
                region: "Singapore (SG-01)",
                model: "o3-mini Reasoning (TEE)",
                latency: "34ms",
                status: "ONLINE",
              },
              {
                region: "Frankfurt (DE-01)",
                model: "Gemini 2.0 Flash (TEE)",
                latency: "82ms",
                status: "ONLINE",
              },
            ].map((node, i) => (
              <div
                key={i}
                onMouseEnter={() => playHoverSound()}
                className="p-3 rounded border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-white">{node.region}</span>
                  <span className="text-[10px] text-emerald-500 font-semibold">{node.status}</span>
                </div>
                <div className="text-zinc-500 text-[11px]">{node.model}</div>
                <div className="text-[10px] text-cyan-600 dark:text-cyan-400">
                  Network Latency: {node.latency}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Monospace Bottom Ticker */}
        <div className="border-t border-black/10 dark:border-white/10 px-4 py-2 bg-black/[0.03] dark:bg-white/[0.03] text-[10px] text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span>COORDINATES: 31.2304° N, 121.4737° E</span>
            <span>•</span>
            <span>HORIZON KERNEL: V2.4-ACTIVE</span>
            <span>•</span>
            <span>CCIP-READ: ENABLED</span>
          </div>
          <div>POWERED BY HASHKEY CHAIN HORIZON L2</div>
        </div>
      </div>
    </div>
  );
}

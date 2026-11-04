"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Zap,
  Cpu,
  Coins,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Terminal,
} from "lucide-react";
import { playHoverSound, playClickSound } from "@/utils/griflanAudio";

interface Pillar {
  id: string;
  category: string;
  title: string;
  headline: string;
  metric: string;
  metricLabel: string;
  description: string;
  features: string[];
  link: string;
  linkText: string;
  badgeColor: string;
}

const PILLARS: Pillar[] = [
  {
    id: "01",
    category: "CONFIDENTIAL HARDWARE",
    title: "TEE Enclaves",
    headline: "AMD SEV-SNP Blind Execution",
    metric: "0.00%",
    metricLabel: "Host Memory Exposure",
    description:
      "All inference requests and proprietary model weights execute strictly within cryptographic hardware-isolated enclaves. Hypervisors and GPU providers have zero read access.",
    features: [
      "Hardware-enforced RSA-OAEP payload sealing",
      "Cryptographic PCR0 attestation verification",
      "Zero telemetry leakage or prompt persistence",
    ],
    link: "/buyer",
    linkText: "Launch Secure Session",
    badgeColor: "emerald",
  },
  {
    id: "02",
    category: "PAYMENT PROTOCOL",
    title: "HashKey HSP",
    headline: "Autonomous Agent Settlement",
    metric: "12ms",
    metricLabel: "Micropayment Finality",
    description:
      "Direct agent-to-agent streaming settlement rail on HashKey Horizon L2 (Chain ID 133). Eliminates centralized SaaS billing, credit card friction, and API key management.",
    features: [
      "Sub-second streaming token payments",
      "Native HSK settlement escrow",
      "ERC-4337 and smart account compatibility",
    ],
    link: "/marketplace",
    linkText: "Inspect Orderbook",
    badgeColor: "cyan",
  },
  {
    id: "03",
    category: "CONSENSUS GUARANTEE",
    title: "Zero-Cutoff (T_max)",
    headline: "Deterministic Token Bounds",
    metric: "100%",
    metricLabel: "Reasoning Completion Rate",
    description:
      "Prevents reasoning models from terminating mid-generation due to out-of-gas states. On-chain contracts escrow mathematical upper bounds before execution starts.",
    features: [
      "Solves mid-stream thinking token aborts",
      "Deterministic quadratic cost bounds",
      "Automatic gas-refund sweepers on early finish",
    ],
    link: "/buyer",
    linkText: "Execute Reasoning Model",
    badgeColor: "purple",
  },
  {
    id: "04",
    category: "INTELLIGENCE ROUTING",
    title: "Frontier Matrix",
    headline: "Verifiable Model Orchestration",
    metric: "4 Clusters",
    metricLabel: "Frontier Model Families",
    description:
      "High-throughput verified routing across Claude 3.7 Sonnet, DeepSeek R1 Zero, OpenAI o3-mini Reasoning, and Gemini 2.0 Flash with live proof receipts.",
    features: [
      "Claude 3.7 Sonnet extended thinking",
      "DeepSeek R1 Zero unconstrained reasoning",
      "Gemini 2.0 Flash Thinking multimodal pipeline",
    ],
    link: "/marketplace",
    linkText: "Browse Model Matrix",
    badgeColor: "pink",
  },
  {
    id: "05",
    category: "SYBIL RESISTANCE",
    title: "World ID & ENS",
    headline: "Zero-Knowledge Human Proofs",
    metric: "1-Human-1-Node",
    metricLabel: "ZK Nullifier Allocation",
    description:
      "Zero-knowledge Iris nullifiers ensure anti-sybil fairness for compute allocation without compromising user identity, paired with decentralized CCIP-read ENS name lookup.",
    features: [
      "On-chain nullifier verification registry",
      "Human-readable .eth compute identities",
      "Decentralized offscreen Anon-RPC routing",
    ],
    link: "/buyer",
    linkText: "Verify Identity",
    badgeColor: "amber",
  },
  {
    id: "06",
    category: "LIQUIDITY CLEARING",
    title: "Universal Sweeper",
    headline: "Instant Batch Settlement",
    metric: "0.0s",
    metricLabel: "Lockup Period",
    description:
      "Automated liquidity sweeps release escrowed HSK earnings directly to compute provider non-custodial wallets immediately upon cryptographic enclave signature verification.",
    features: [
      "Single-click batch claim across 100+ tasks",
      "Uniswap V3 automated token swaps",
      "Non-custodial zero-trust provider accounts",
    ],
    link: "/payout",
    linkText: "Open Payout Console",
    badgeColor: "emerald",
  },
];

export default function GriflanPerspectiveFloor() {
  const [activePillar, setActivePillar] = useState<string>("01");

  return (
    <section className="relative w-full py-28 overflow-hidden select-none">
      {/* 3D Perspective Plane Background */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
        style={{ perspective: "1000px" }}
      >
        <div
          className="w-[200vw] h-[160vh] absolute -bottom-[40vh] opacity-35 dark:opacity-40"
          style={{
            transform: "rotateX(62deg) scale(1.4)",
            transformOrigin: "center 70%",
            backgroundImage: `
              linear-gradient(to right, rgba(16, 185, 129, 0.25) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(6, 182, 212, 0.25) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.6) 55%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.6) 55%, transparent 80%)",
          }}
        />

        {/* Horizon Glow Line */}
        <div
          className="absolute top-[28%] w-full h-[2px] opacity-70"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.8) 25%, rgba(6, 182, 212, 0.9) 50%, rgba(139, 92, 246, 0.8) 75%, transparent 100%)",
            filter: "blur(1px)",
          }}
        />
        <div
          className="absolute top-[28%] w-[60%] h-[80px] -translate-y-1/2 opacity-30 dark:opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(6, 182, 212, 0.5) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 80%)",
            filter: "blur(20px)",
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section HUD Header */}
        <div className="border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-6 sm:p-8 mb-12 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>SPECIFICATION // ARCHITECTURE DECK</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-950 dark:text-white uppercase">
                Six Architectural <span className="italic font-serif font-normal bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-cyan-400 to-purple-500">Pillars</span>
              </h2>
            </div>
            <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400 space-y-1 text-right hidden sm:block">
              <div>HASHKEY HORIZON L2 • CHAIN ID 133</div>
              <div>TEE PROTOCOL KERNEL: V2.4-RELEASE</div>
              <div>ENCLAVE STATUS: 100% BLIND</div>
            </div>
          </div>
        </div>

        {/* 6 Pillars Precision Grid (Griflan segmented layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10">
          {PILLARS.map((pillar) => {
            const isActive = activePillar === pillar.id;

            return (
              <div
                key={pillar.id}
                onMouseEnter={() => {
                  setActivePillar(pillar.id);
                  playHoverSound();
                }}
                className="relative group p-6 sm:p-8 transition-all duration-300 flex flex-col justify-between bg-white dark:bg-[#09090c]/90 hover:bg-zinc-50 dark:hover:bg-[#111218]/95"
              >
                {/* Active Indicator Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-[2px] transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 opacity-100"
                      : "opacity-0 group-hover:opacity-60"
                  }`}
                />

                <div className="space-y-4">
                  {/* Top HUD Row */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      [{pillar.id} // {pillar.category}]
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${
                        pillar.badgeColor === "emerald"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : pillar.badgeColor === "cyan"
                          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                          : pillar.badgeColor === "purple"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                          : pillar.badgeColor === "pink"
                          ? "bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      LIVE
                    </span>
                  </div>

                  {/* Headline */}
                  <div>
                    <h3 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                      {pillar.title}
                    </h3>
                    <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                      {pillar.headline}
                    </div>
                  </div>

                  {/* Metric Display */}
                  <div className="py-3 px-4 rounded border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-zinc-950 dark:text-white">
                      {pillar.metric}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      {pillar.metricLabel}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {pillar.description}
                  </p>

                  {/* Feature Bullets */}
                  <ul className="space-y-1.5 pt-2">
                    {pillar.features.map((feat, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400"
                      >
                        <span className="text-emerald-500 shrink-0">✦</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom Action Link */}
                <div className="pt-6 mt-6 border-t border-black/5 dark:border-white/5">
                  <Link
                    href={pillar.link}
                    onClick={() => playClickSound()}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-950 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition group/btn"
                  >
                    <span>{pillar.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

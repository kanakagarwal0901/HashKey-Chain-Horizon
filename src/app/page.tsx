"use client";

import Link from "next/link";
import {
  Shield,
  Lock,
  Cpu,
  ArrowRight,
  Database,
  Coins,
  CheckCircle2,
  FileText,
  UserCheck,
  Zap,
  Globe,
  Terminal,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [activeListings, setActiveListings] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/listings")
      .then((res) => res.json())
      .then((data) => {
        if (data.listings) setActiveListings(data.listings);
      })
      .catch((err) => console.error("Error loading listings:", err));
  }, []);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[200px] bg-cyan-500/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
          {/* Hackathon Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-xs font-mono text-indigo-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            ETHGlobal Mumbai 2026 • 7 Track Architecture • $64,500+ Prize Pool
          </div>

          {/* Headline */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              The Blind, Zero-Cutoff{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
                AI API Token Exchange
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
              Trade unused OpenAI, Anthropic, and Gemini API quotas peer-to-peer. Enforcing deterministic thinking-level
              token bounds to eliminate mid-way generation cutoffs, and total seller blindness with sealed enclave execution.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/buyer"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 font-semibold text-white shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition transform hover:-translate-y-0.5"
            >
              <Cpu className="w-5 h-5" />
              Launch Buyer Studio
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/seller"
              className="px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold flex items-center gap-2 transition transform hover:-translate-y-0.5"
            >
              <Coins className="w-5 h-5 text-emerald-400" />
              Sell Idle API Tokens
            </Link>
            <Link
              href="/audit"
              className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 font-semibold flex items-center gap-2 transition"
            >
              <Lock className="w-5 h-5 text-indigo-400" />
              Judge Split Audit View
            </Link>
          </div>

          {/* Live Invariant Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8">
            <div className="glass-panel p-4 rounded-xl text-left border-l-2 border-l-cyan-500">
              <span className="text-xs text-slate-400 block font-mono">Cutoff Failure Rate</span>
              <span className="text-2xl font-bold text-cyan-400 font-mono">0.00%</span>
              <span className="text-[11px] text-slate-400 block mt-1">Guaranteed by T_max</span>
            </div>
            <div className="glass-panel p-4 rounded-xl text-left border-l-2 border-l-indigo-500">
              <span className="text-xs text-slate-400 block font-mono">Seller Surveillance</span>
              <span className="text-2xl font-bold text-indigo-400 font-mono">Zero Visibility</span>
              <span className="text-11px text-slate-400 block mt-1">Sealed Enclave RAM</span>
            </div>
            <div className="glass-panel p-4 rounded-xl text-left border-l-2 border-l-emerald-500">
              <span className="text-xs text-slate-400 block font-mono">Buyer Upfront Settlement</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">Hedera x402</span>
              <span className="text-[11px] text-slate-400 block mt-1">HTS USDC (Zero Solidity)</span>
            </div>
            <div className="glass-panel p-4 rounded-xl text-left border-l-2 border-l-amber-500">
              <span className="text-xs text-slate-400 block font-mono">Orderbook Engine</span>
              <span className="text-2xl font-bold text-amber-400 font-mono">Arkiv Entities</span>
              <span className="text-[11px] text-slate-400 block mt-1">1-Hour Block Expiry</span>
            </div>
          </div>
        </div>
      </section>

      {/* The 3 Core Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Three Breakthrough Core Pillars</h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Why ordinary API proxies fail for frontier reasoning models, and how ShunyaGrid solves it with math & cryptography.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800 hover:border-indigo-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">1. Total Seller Blindness</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Buyers attach any file (PDFs, code, CSVs, images) and text prompts. The browser seals everything with
              ephemeral AES-256-GCM wrapped to the 0G Enclave Public Key.
            </p>
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-indigo-300 space-y-1">
              <div>✔ Seller never sees prompt text</div>
              <div>✔ Seller never sees attached files</div>
              <div>✔ Seller never sees AI output</div>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800 hover:border-cyan-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">2. Deterministic Thinking Token Gates</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Reasoning models (o3-mini, Claude 3.7) consume thousands of hidden thinking tokens. We enforce deterministic
              token bounds (<span className="text-cyan-400 font-mono">T_max</span>) pre-flight to guarantee zero mid-generation cutoffs.
            </p>
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-cyan-300 space-y-1">
              <div>✔ Invariant: Q_available ≥ T_max</div>
              <div>✔ Atomic lock before inference</div>
              <div>✔ Hard-capped upstream limits</div>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800 hover:border-emerald-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">3. Max-Upfront Charge & Commission</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Buyer pays upfront for <span className="font-mono text-emerald-400">T_max</span> via Hedera x402. Seller receives payout
              strictly for actual tokens used (<span className="font-mono text-emerald-400">T_used</span>), and ShunyaGrid retains the spread as commission.
            </p>
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-emerald-300 space-y-1">
              <div>✔ Buyer Charged: (T_max / 1k) * Rate</div>
              <div>✔ Seller Paid: (T_used / 1k) * Rate</div>
              <div>✔ App Commission: (T_max - T_used)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Orderbook / Arkiv Entities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-cyan-400" />
              Live Arkiv Token Orderbook
            </h2>
            <p className="text-slate-400 text-sm">
              Decentralized database entities querying human-verified sellers with zero external indexers.
            </p>
          </div>
          <Link
            href="/seller"
            className="px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-sm font-semibold text-white transition flex items-center gap-2"
          >
            + Create New Listing
          </Link>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs text-slate-400 font-mono uppercase border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Seller ENS Node</th>
                  <th className="px-6 py-4">Model & Provider</th>
                  <th className="px-6 py-4">Available Quota</th>
                  <th className="px-6 py-4">Rate (per 1k tokens)</th>
                  <th className="px-6 py-4">Human Verification</th>
                  <th className="px-6 py-4">Hedera Payout</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {activeListings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-semibold text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {listing.ensName}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                        {listing.model}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-cyan-400">
                      {listing.availableTokens.toLocaleString()} tokens
                    </td>
                    <td className="px-6 py-4 text-emerald-400">
                      ${(listing.pricePer1kMicroUsdc / 1_000_000).toFixed(4)} USDC
                    </td>
                    <td className="px-6 py-4">
                      {listing.humanVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                          <CheckCircle2 className="w-3 h-3" />
                          World ID Verified
                        </span>
                      ) : (
                        <span className="text-slate-400">Unverified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{listing.hedaraPayoutAccount}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/buyer?model=${listing.model}`}
                        className="px-3 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium transition"
                      >
                        Prompt Now
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Sponsor Tracks Matrix */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">7-Track Sponsor Architecture Matrix</h2>
          <p className="text-slate-400 text-sm">
            Architected specifically for ETHGlobal Mumbai 2026 across 7 tracks with 100% technical compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-indigo-400 font-bold block">1. Ethereum Foundation ($15k)</span>
            <p className="text-slate-300 font-sans">
              Anon-RPC browser harness proxy masking Buyer IP. Full CROPS privacy adherence (zero trackers, local keys).
            </p>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-cyan-400 font-bold block">2. Hedera ($15k)</span>
            <p className="text-slate-300 font-sans">
              HTTP 402 (x402) paywall with HTS USDC settlement and tamper-evident HCS topic audit logging (Zero Solidity).
            </p>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-emerald-400 font-bold block">3. Arkiv ($15k)</span>
            <p className="text-slate-300 font-sans">
              Time-scoped Web3 database entities: 1-hour Seller listings and 10-minute temporary encrypted file blobs.
            </p>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-amber-400 font-bold block">4. 0G ($15k)</span>
            <p className="text-slate-300 font-sans">
              0G Compute Sealed TEE Enclave holding keys + 0G Storage for encrypted attachments &gt;128 KiB + OpenClaw Agent.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

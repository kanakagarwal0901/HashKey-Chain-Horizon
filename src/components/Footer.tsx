"use client";

import Link from "next/link";
import { ArrowUpRight, Shield, Lock, CheckCircle2, Globe, Cpu, Layers, Database, Coins } from "lucide-react";
import AnonRpcStatusBadge from "@/components/AnonRpcStatusBadge";

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.06] dark:border-white/[0.08] bg-transparent mt-24 text-zinc-600 dark:text-zinc-400">
      {/* Upper Multi-Column Precision Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Column 1 & 2: Brand Thesis & Network Telemetry */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-sm tracking-tighter">
                SG
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-zinc-950 dark:text-white block leading-tight">
                  ShunyaGrid
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                  Zero-Cutoff Confidential AI Exchange
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-sm leading-relaxed">
              Decentralized marketplace for frontier reasoning models. Solves mid-stream cutoffs via deterministic token bounds while guaranteeing total data blindness with 0G enclaves and RSA-OAEP sealing.
            </p>

            {/* Real-Time Security & Privacy Telemetry Badge */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <AnonRpcStatusBadge placement="top" />
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-pill text-[11px] text-zinc-700 dark:text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 pulse-ring-emerald" />
                <span>Hedera Testnet 296 &bull; Sepolia 11155111</span>
              </div>
            </div>
          </div>

          {/* Column 3: Protocol Rails */}
          <div className="space-y-3.5 text-xs">
            <h4 className="font-semibold text-zinc-950 dark:text-white text-xs">
              Protocol Rails
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/buyer" className="hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Buyer Studio</span>
                </Link>
              </li>
              <li>
                <Link href="/seller" className="hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Seller Hub</span>
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Model Orderbook</span>
                </Link>
              </li>
              <li>
                <Link href="/payout" className="hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Seller Payout</span>
                </Link>
              </li>
              <li>
                <Link href="/bridge" className="hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Cross-Chain Bridge</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Cryptographic Invariants */}
          <div className="space-y-3.5 text-xs">
            <h4 className="font-semibold text-zinc-950 dark:text-white text-xs">
              Security Standards
            </h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Zero-Cutoff Bound (T_max)</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>EF CROPS Confidentiality</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Client RSA-OAEP Sealing</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>World ID ZK Verification</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Arkiv DB-Chain Scoping</span>
              </li>
            </ul>
          </div>

          {/* Column 5: Ecosystem & Open Source */}
          <div className="space-y-3.5 text-xs">
            <h4 className="font-semibold text-zinc-950 dark:text-white text-xs">
              Ecosystem
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1"
                >
                  <span>GitHub Repository</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://portal.hedera.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1"
                >
                  <span>Hedera HTS Explorer</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://sepolia.etherscan.io"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1"
                >
                  <span>Sepolia Etherscan</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://world.org"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1"
                >
                  <span>World ID Protocol</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://circle.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1"
                >
                  <span>Circle CCTP Protocol</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sub-Footer Legal & Attribution Bar */}
      <div className="border-t border-black/[0.06] dark:border-white/[0.06] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span>&copy; 2026 ShunyaGrid Protocol. Released under MIT Open Source License.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Non-custodial confidential AI inference network.</span>
            <span className="text-zinc-400 dark:text-zinc-600">&bull;</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

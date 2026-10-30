"use client";

import Link from "next/link";
import { ArrowUpRight, Shield, Lock, CheckCircle2, Globe, Cpu, Layers, Database, Coins } from "lucide-react";
import AnonRpcStatusBadge from "@/components/AnonRpcStatusBadge";
import ShunyaLogo from "@/components/ShunyaLogo";

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.06] dark:border-white/[0.08] bg-transparent mt-24 text-zinc-600 dark:text-zinc-400">
      {/* Upper Multi-Column Precision Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Column 1 & 2: Brand Thesis & Network Telemetry */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center">
              <ShunyaLogo size={42} showWordmark={true} badgeText="HORIZON 133" />
            </div>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-sm leading-relaxed">
              Decentralized marketplace for frontier reasoning models. Solves mid-stream cutoffs via deterministic token bounds while guaranteeing total data blindness with confidential hardware enclaves and RSA-OAEP sealing.
            </p>

            {/* Real-Time Security & Privacy Telemetry Badge */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <AnonRpcStatusBadge placement="top" />
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-pill text-[11px] text-zinc-700 dark:text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 pulse-ring-emerald" />
                <span>HashKey Horizon 133 (HSP) • Block #35,100,370+ • Oct 31, 2026</span>
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
                <span>ZK Proof of Human</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Decentralized Orderbook Scoping</span>
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
                  href="https://testnet-explorer.hskchain.net/address/0x26291175Fa0Ea3C8583fEdEB56805eA68289b105"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                >
                  <span>Orderbook Contract (0x2629)</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                >
                  <span>HashKey Explorer (HSP)</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://hashkey-merchant.github.io/en/#/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1"
                >
                  <span>HashKey Merchant / HSP Docs</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://hashfans.io/dev-onepager"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1"
                >
                  <span>HashFans Dev Portal</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://docs.hashkeychain.net/docs/Build-on-HashKey-Chain/Token-Contracts"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1"
                >
                  <span>HashKey Chain Docs</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/kanakagarwal0901/HashKey-Chain-Horizon"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-950 dark:hover:text-white transition inline-flex items-center gap-1"
                >
                  <span>GitHub Repository</span>
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
            <span>&copy; October 31, 2026 ShunyaGrid Protocol. Released under MIT Open Source License.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Non-custodial confidential AI inference network.</span>
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

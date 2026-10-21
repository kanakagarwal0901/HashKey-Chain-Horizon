import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Shield, Lock, Cpu, Database, Network, ArrowRightLeft, Layers, Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "ShunyaGrid | The Blind, Zero-Cutoff AI API Token Exchange",
  description:
    "Privacy-first, peer-to-peer marketplace for unused AI API tokens with deterministic thinking-level token bounds and total seller blindness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {/* EF Anon-RPC Sandboxed Harness (Hidden Iframe for anonymous JSON-RPC) */}
        <iframe
          src="/anon-rpc/sandbox.html"
          className="hidden"
          title="EF Anon-RPC Sandbox"
          aria-hidden="true"
        />

        {/* Global Navigation Bar */}
        <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-[#07090e]/85 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-[#0d111a] rounded-[11px] flex items-center justify-center group-hover:bg-opacity-80 transition">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300">
                  Shunya<span className="text-cyan-400">Grid</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  Zero-Cutoff Token Exchange
                </span>
              </div>
            </Link>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
              <Link
                href="/buyer"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
              >
                <Cpu className="w-4 h-4 text-cyan-400" />
                Buyer Studio
              </Link>
              <Link
                href="/seller"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                Seller Hub
              </Link>
              <Link
                href="/audit"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-indigo-400" />
                Judge Audit View
              </Link>
              <Link
                href="/bridge"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                Arc CCTP Bridge
              </Link>
            </nav>

            {/* Active Protocol Network Badges & Connected Wallet */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2 text-xs font-mono">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Hedera x402
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                  <Database className="w-3 h-3 text-cyan-400" />
                  Arkiv Entities
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  0G Enclave
                </span>
              </div>

              {/* Wallet Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-mono">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-slate-300">0.0.482910</span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-400 font-semibold">$150.00 USDC</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Global Footer with CROPS & Sponsor Compliance */}
        <footer className="border-t border-slate-800/80 bg-[#0a0d14] py-8 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-200">ShunyaGrid Protocol</span>
              <span>•</span>
              <span>ETHGlobal Mumbai 2026</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono">CROPS Privacy Compliant</span>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <Link href="/buyer" className="hover:text-cyan-300 transition">
                Buyer Studio
              </Link>
              <Link href="/seller" className="hover:text-emerald-300 transition">
                Seller Pool
              </Link>
              <Link href="/audit" className="hover:text-indigo-300 transition">
                Judge Audit
              </Link>
              <Link href="/bridge" className="hover:text-amber-300 transition">
                Circle CCTP
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="text-slate-300 hover:text-white transition flex items-center gap-1"
              >
                <Terminal className="w-3.5 h-3.5" />
                MIT Open Source
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Shield,
  CheckCircle2,
  ExternalLink,
  Coins,
  Layers,
  ArrowRight,
  Database,
  Lock,
  Zap,
  Globe,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ArcBridgePage() {
  const { walletAddress } = useAuth();
  const [destinationChain, setDestinationChain] = useState<string>("arc");
  const [amountUsdc, setAmountUsdc] = useState<number>(50);
  const [recipientAddress, setRecipientAddress] = useState<string>("0x8fDE3F07fFF6432fF22FB805f34011785e0C8444");
  const [isBridging, setIsBridging] = useState<boolean>(false);
  const [bridgeHistory, setBridgeHistory] = useState<any[]>([]);

  useEffect(() => {
    if (walletAddress) {
      setRecipientAddress(walletAddress);
    }
  }, [walletAddress]);

  const fetchHistory = () => {
    fetch("/api/bridge/cctp")
      .then((res) => res.json())
      .then((data) => {
        if (data.history) setBridgeHistory(data.history);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchHistory();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const amountParam = params.get("amount");
      const recipientParam = params.get("recipient");
      if (amountParam && !isNaN(parseFloat(amountParam))) {
        setAmountUsdc(parseFloat(amountParam));
      }
      if (recipientParam) {
        setRecipientAddress(recipientParam);
      }
    }
  }, []);

  const handleBridge = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBridging(true);

    try {
      const res = await fetch("/api/bridge/cctp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationChain,
          amountUsdc,
          recipientAddress,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bridge failed");
      }

      alert(`Successfully initiated Circle CCTP bridge to ${destinationChain.toUpperCase()}!`);
      fetchHistory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                Cross-Chain Transfer Protocol (Circle CCTP)
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                1:1 Native USDC Burn & Mint (Zero Slippage)
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 inline-flex">
                <ArrowRightLeft className="w-7 h-7" />
              </span>
              Arc & Circle CCTP Payout Bridge Kit
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Bridge your earned Hedera HTS USDC micropayments into native USDC on Arc, Arbitrum, Base, Optimism, or Ethereum Mainnet with cryptographic attestation.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <Link
              href="/seller"
              className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium shadow-sm"
            >
              <Coins className="w-4 h-4 text-emerald-400" />
              Seller Earnings Hub
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Bridge Widget Form */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/90 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              Initiate Cross-Chain Payout Sweep
            </h2>
            <span className="text-xs font-mono text-amber-300 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800/50">
              Direct Attestation
            </span>
          </div>

          <form onSubmit={handleBridge} className="space-y-6">
            {/* Source & Destination */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Source Chain & Token:
                </label>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold">Hedera HTS SGUSDC</span>
                  </div>
                  <span className="text-[11px] text-cyan-400">Token ID: 0.0.11134145</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Destination Chain:
                </label>
                <div className="relative">
                  <select
                    value={destinationChain}
                    onChange={(e) => setDestinationChain(e.target.value)}
                    className="w-full rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3.5 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 transition appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="arc">Arc Chain (Circle Native)</option>
                    <option value="arbitrum">Arbitrum One</option>
                    <option value="base">Base (Coinbase L2)</option>
                    <option value="optimism">Optimism Mainnet</option>
                    <option value="ethereum">Ethereum L1</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Amount & Recipient */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Amount to Sweep (USDC):
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amountUsdc}
                  onChange={(e) => setAmountUsdc(Number(e.target.value))}
                  className="w-full rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3.5 text-sm text-emerald-400 font-bold font-mono focus:outline-none focus:border-amber-500 transition shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Destination Recipient Address (EVM):
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-3.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500 transition shadow-inner"
                />
              </div>
            </div>

            {/* CCTP Protocol Guarantee */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-amber-900/40 text-xs font-mono space-y-2 shadow-inner">
              <span className="text-amber-400 font-bold flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Circle CCTP Burn & Mint Mechanism:
              </span>
              <p className="text-slate-400 font-sans leading-relaxed">
                Native USDC is burned on source and re-minted 1:1 on destination via Circle&apos;s decentralized attestation service. No wrapped synthetic tokens, bridge hacks, or liquidity pool slippage.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isBridging || amountUsdc <= 0}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 font-bold text-white text-sm shadow-xl shadow-amber-600/20 transition flex items-center justify-center gap-2.5 transform active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {isBridging ? "Attesting with Circle CCTP..." : `Sweep $${amountUsdc.toFixed(2)} USDC to ${destinationChain.toUpperCase()}`}
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/90 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Arc Studio Integration
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              ShunyaGrid was initialized inside <strong>Arc Studio</strong> (<code className="text-cyan-400 font-mono text-[11px]">studio.arc.com</code>)
              and exposes token listings via the Arc Marketplace Discovery API at <code className="text-amber-400 font-mono text-[11px]">/api/arc-discovery</code>.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
              Project URL: studio.arc.com/project/shunyagrid-mumbai-2026
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 space-y-3 text-xs font-mono shadow-xl">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Direct Settlement Security
            </span>
            <p className="text-slate-400 font-sans leading-relaxed">
              Every payout sweep transaction is verified by Hedera Mirror Nodes and signed cryptographically by the operator.
            </p>
          </div>
        </div>
      </div>

      {/* Bridge History Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-amber-400" />
          Circle CCTP Cross-Chain Attestation Ledger
        </h2>

        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Bridge ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Route</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">CCTP Attestation Status</th>
                  <th className="px-6 py-4">Destination Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bridgeHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No bridge records yet. Initiate your first cross-chain sweep above!
                    </td>
                  </tr>
                ) : (
                  bridgeHistory.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-bold text-amber-400">{b.id}</td>
                      <td className="px-6 py-4 text-slate-300">{b.timestamp}</td>
                      <td className="px-6 py-4 text-slate-200 uppercase font-semibold">
                        Hedera <ArrowRight className="w-3 h-3 inline text-slate-500" /> {b.destinationChain}
                      </td>
                      <td className="px-6 py-4 text-emerald-400 font-bold">${b.amountUsdc.toFixed(2)} USDC</td>
                      <td className="px-6 py-4 text-slate-400 font-mono">{b.recipientAddress}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/40 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 truncate max-w-[150px] font-mono">{b.txHash}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft, Shield, CheckCircle2, ExternalLink, Coins, Layers, ArrowRight } from "lucide-react";

export default function ArcBridgePage() {
  const [destinationChain, setDestinationChain] = useState<string>("arc");
  const [amountUsdc, setAmountUsdc] = useState<number>(50);
  const [recipientAddress, setRecipientAddress] = useState<string>("0x71C2a8b940e4e8B");
  const [isBridging, setIsBridging] = useState<boolean>(false);
  const [bridgeHistory, setBridgeHistory] = useState<any[]>([]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Title */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <ArrowRightLeft className="w-8 h-8 text-amber-400" />
          Arc & Circle CCTP Payout Bridge Kit
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Sweep and bridge your earned Hedera HTS USDC earnings into native USDC on Arc, Arbitrum, Base, Optimism, and
          Ethereum using Circle&apos;s Cross-Chain Transfer Protocol (CCTP).
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Bridge Widget Form */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            Initiate Cross-Chain Payout Sweep
          </h2>

          <form onSubmit={handleBridge} className="space-y-6">
            {/* Source & Destination */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block">Source Chain & Token:</label>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-slate-200 flex items-center justify-between">
                  <span>Hedera HTS USDC</span>
                  <span className="text-[11px] text-cyan-400">Token ID: 0.0.429272</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block">Destination Chain:</label>
                <select
                  value={destinationChain}
                  onChange={(e) => setDestinationChain(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="arc">Arc Chain (Circle Native)</option>
                  <option value="arbitrum">Arbitrum One</option>
                  <option value="base">Base (Coinbase L2)</option>
                  <option value="optimism">Optimism Mainnet</option>
                  <option value="ethereum">Ethereum L1</option>
                </select>
              </div>
            </div>

            {/* Amount & Recipient */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block">Amount to Sweep (USDC):</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amountUsdc}
                  onChange={(e) => setAmountUsdc(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-emerald-400 font-bold font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block">Destination Recipient Address (EVM):</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* CCTP Protocol Guarantee */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-900/40 text-xs font-mono space-y-2">
              <span className="text-amber-400 font-bold block flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                Circle CCTP Burn & Mint Mechanism:
              </span>
              <p className="text-slate-400 font-sans leading-relaxed">
                Native USDC is burned on source and re-minted 1:1 on destination via Circle attestation service. No
                wrapped synthetic risk or slippage.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isBridging}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 font-bold text-white text-sm shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {isBridging ? "Attesting with Circle CCTP..." : `Sweep $${amountUsdc.toFixed(2)} USDC to ${destinationChain.toUpperCase()}`}
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Arc Studio Integration
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              ShunyaGrid was initialized inside <strong>Arc Studio</strong> (<code className="text-cyan-400 font-mono text-[11px]">studio.arc.com</code>)
              and exposes token listings via the Arc Marketplace Discovery API at <code className="text-amber-400 font-mono text-[11px]">/api/arc/discovery</code>.
            </p>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
              Project URL: studio.arc.com/project/shunyagrid-mumbai-2026
            </div>
          </div>
        </div>
      </div>

      {/* Bridge History Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-amber-400" />
          Circle CCTP Cross-Chain Attestation Ledger
        </h2>

        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
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
                {bridgeHistory.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-bold text-amber-400">{b.id}</td>
                    <td className="px-6 py-4 text-slate-300">{b.timestamp}</td>
                    <td className="px-6 py-4 text-slate-200 uppercase font-semibold">
                      Hedera <ArrowRight className="w-3 h-3 inline text-slate-500" /> {b.destinationChain}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">${b.amountUsdc.toFixed(2)} USDC</td>
                    <td className="px-6 py-4 text-slate-400">{b.recipientAddress}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" />
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 truncate max-w-[150px]">{b.txHash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

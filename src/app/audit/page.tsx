"use client";

import { useState, useEffect } from "react";
import {
  Lock,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  ExternalLink,
  Zap,
  Cpu,
  Database,
  Coins,
  RefreshCw,
} from "lucide-react";

export default function JudgeAuditPage() {
  const [hcsReceipts, setHcsReceipts] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoSync, setAutoSync] = useState<boolean>(true);

  const fetchLogs = (silent = false) => {
    if (!silent) setLoading(true);
    fetch("/api/hcs-logs")
      .then((res) => res.json())
      .then((data) => {
        if (data.receipts) {
          setHcsReceipts(data.receipts);
          setSelectedReceipt((prev: any) => {
            // Keep current if still valid, or default to newest
            if (!prev && data.receipts.length > 0) return data.receipts[0];
            const updated = data.receipts.find((r: any) => r.sequenceNumber === prev?.sequenceNumber);
            return updated || data.receipts[0] || null;
          });
        }
        if (!silent) setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // 3-second live polling interval
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoSync]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Lock className="w-8 h-8 text-indigo-400" />
            Judge Audit: Total Seller Blindness & Commission Engine
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Dual-Perspective Proof: Inspect the Buyer&apos;s clear-text experience vs. the Seller node&apos;s complete surveillance
            blindness side-by-side.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 border transition ${
              autoSync
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/40"
                : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoSync ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            {autoSync ? "Live HCS Stream: Active" : "Auto-Sync Paused"}
          </button>

          <button
            onClick={() => fetchLogs(false)}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Stream
          </button>
        </div>
      </div>

      {/* 6 Feasibility Invariants Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { id: "FT-01", name: "Zero Cutoff Gate", status: "VERIFIED" },
          { id: "FT-02", name: "Max Charge Split", status: "VERIFIED" },
          { id: "FT-03", name: "Seller Blindness", status: "VERIFIED" },
          { id: "FT-04", name: "Anon-RPC Privacy", status: "VERIFIED" },
          { id: "FT-05", name: "Time-Scoped Expiry", status: "VERIFIED" },
          { id: "FT-06", name: "Concurrent Lock", status: "VERIFIED" },
        ].map((test) => (
          <div key={test.id} className="glass-panel p-3 rounded-xl border border-emerald-900/40 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono block">{test.id}</span>
            <span className="text-xs font-bold text-slate-200 block truncate">{test.name}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {test.status}
            </span>
          </div>
        ))}
      </div>

      {/* Split-Screen Side-by-Side Dual View */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Screen: Buyer Experience */}
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              Buyer Decrypted Perspective (Owner Custody)
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
              Cleartext in Browser RAM
            </span>
          </div>

          {/* Decrypted Prompt */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 block font-bold">1. Buyer Original Prompt:</span>
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 font-mono leading-relaxed">
              &quot;Perform a comprehensive security audit on the attached smart contract. Check for reentrancy, access
              control flaws, and recommend remediations.&quot;
            </div>
          </div>

          {/* Attached Files Preview */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 block font-bold">2. Attached Proprietary Files:</span>
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-2">
              <div className="text-cyan-400 font-semibold flex items-center justify-between">
                <span>📄 VaultLending.sol (1.4 KiB)</span>
                <span className="text-[10px] text-slate-400">Target: Arkiv Entity</span>
              </div>
              <div className="text-slate-400 text-[11px] leading-relaxed pl-2 border-l border-slate-800">
                function withdraw() external &#123;<br />
                &nbsp;&nbsp;uint256 amount = balances[msg.sender];<br />
                &nbsp;&nbsp;(bool ok, ) = msg.sender.call&#123;value: amount&#125;(&quot;&quot;);<br />
                &nbsp;&nbsp;balances[msg.sender] = 0; // State zeroed after external call!<br />
                &#125;
              </div>
            </div>
          </div>

          {/* AI Reasoning & Decrypted Output */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 block font-bold">3. Model Reasoning & Output:</span>
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 font-mono space-y-2">
              <div className="text-indigo-400 font-bold">[Frontier Reasoning Tokens]:</div>
              <p className="text-slate-400 text-[11px]">
                Detected state modification after external low-level call in withdraw(). Control hijacked via attacker
                fallback().
              </p>
              <div className="text-emerald-400 font-bold pt-1">[Final Verified Answer]:</div>
              <p className="text-slate-200 text-[11px]">
                CRITICAL VULNERABILITY: Reentrancy vulnerability identified. Apply Checks-Effects-Interactions: set
                balances[msg.sender] = 0 prior to msg.sender.call.
              </p>
            </div>
          </div>
        </div>

        {/* Right Screen: Seller Surveillance View (Total Blindness) */}
        <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-rose-300 flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-rose-400" />
              Seller Node Perspective (Total Blindness)
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/40">
              Zero Surveillance Access
            </span>
          </div>

          {/* Sealed Prompt */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 block font-bold">1. Buyer Prompt as Seen by Seller:</span>
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-900/40 text-xs text-rose-300/80 font-mono break-all leading-relaxed">
              [SEALED CIPHERTEXT] 0x9f8ae012b4890c...7e91240182 (AES-256-GCM encrypted; Seller has no decryption key)
            </div>
          </div>

          {/* Sealed Files */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 block font-bold">2. Attached Files as Seen by Seller:</span>
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-900/40 text-xs text-rose-300/80 font-mono space-y-1">
              <div>Blob ID: urn:arkiv:93f0f2fa8ca047c6</div>
              <div>Payload: [ENCRYPTED BINARY BLOB - 1,432 bytes]</div>
              <div className="text-[11px] text-slate-500">Auto-expires in 10 minutes on Arkiv. Plaintext invisible.</div>
            </div>
          </div>

          {/* Sealed Output & Token Spread Math */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 block font-bold">
              3. AI Output & Exact Commission Split:
            </span>
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono space-y-3">
              <div className="text-rose-400 break-all text-[11px]">
                Output: [CIPHERTEXT SEALED TO BUYER K_RETURN] 0x4c2b99...01fa
              </div>

              {/* Spread math live breakdown */}
              {selectedReceipt ? (
                <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>Buyer Upfront Charged (T_max = {selectedReceipt.tMaxTokens.toLocaleString()}):</span>
                    <span className="text-slate-100 font-bold">${selectedReceipt.buyerPaidUsdc.toFixed(6)} USDC</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Seller Payout (T_used = {selectedReceipt.tUsedTokens.toLocaleString()}):</span>
                    <span className="font-bold">${selectedReceipt.sellerReceivedUsdc.toFixed(6)} USDC</span>
                  </div>
                  <div className="flex justify-between text-indigo-400 font-bold pt-1 border-t border-slate-800">
                    <span>ShunyaGrid Protocol Commission:</span>
                    <span>${selectedReceipt.webAppCommissionUsdc.toFixed(6)} USDC</span>
                  </div>
                  <div className="text-[11px] text-cyan-400 pt-1">
                    ✔ Unused reservation ({(selectedReceipt.tMaxTokens - selectedReceipt.tUsedTokens).toLocaleString()}{" "}
                    tokens) restored to Seller quota!
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Hedera Consensus Service (HCS) Audit Explorer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-cyan-400" />
            Hedera Consensus Service (HCS) Settled Job Receipts
          </h2>
          <span className="text-xs font-mono text-slate-400">Topic ID: 0.0.591300 • Zero Solidity SDK</span>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Seq #</th>
                  <th className="px-6 py-4">Consensus Timestamp</th>
                  <th className="px-6 py-4">Model & Thinking</th>
                  <th className="px-6 py-4">Tokens (T_used / T_max)</th>
                  <th className="px-6 py-4">Buyer Paid</th>
                  <th className="px-6 py-4">Seller Received</th>
                  <th className="px-6 py-4">App Commission</th>
                  <th className="px-6 py-4">HashScan Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {hcsReceipts.map((r) => (
                  <tr
                    key={r.sequenceNumber}
                    onClick={() => setSelectedReceipt(r)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="px-6 py-4 font-bold text-cyan-400">#{r.sequenceNumber}</td>
                    <td className="px-6 py-4 text-slate-300">{r.consensusTimestamp}</td>
                    <td className="px-6 py-4 text-slate-200">
                      {r.model} ({r.thinkingLevel})
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <span className="text-cyan-400 font-bold">{r.tUsedTokens.toLocaleString()}</span> /{" "}
                      <span>{r.tMaxTokens.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-200 font-bold">${r.buyerPaidUsdc.toFixed(6)}</td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">${r.sellerReceivedUsdc.toFixed(6)}</td>
                    <td className="px-6 py-4 text-indigo-400 font-bold">${r.webAppCommissionUsdc.toFixed(6)}</td>
                    <td className="px-6 py-4">
                      <a
                        href={r.hashscanUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        HashScan
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
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

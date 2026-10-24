"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Cpu,
  Coins,
  Lock,
  Zap,
  CheckCircle2,
  ArrowRight,
  X,
  FileText,
  UserCheck,
  RefreshCw,
  Wallet,
} from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "buyer" | "seller" | "technology";
}

export default function HowItWorksModal({
  isOpen,
  onClose,
  initialTab = "buyer",
}: HowItWorksModalProps) {
  const [activeTab, setActiveTab] = useState<"buyer" | "seller" | "technology">(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0d111a] border border-slate-700 p-6 sm:p-8 shadow-2xl text-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close guide"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="space-y-1.5 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Platform Guide
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            How ShunyaGrid Works
          </h2>
          <p className="text-sm text-slate-400">
            A peer-to-peer exchange where buyers run private AI reasoning prompts and sellers monetize spare API quotas.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 my-6">
          <button
            onClick={() => setActiveTab("buyer")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === "buyer"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-300" />
            For Buyers (Use AI)
          </button>
          <button
            onClick={() => setActiveTab("seller")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === "seller"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Coins className="w-4 h-4 text-emerald-400" />
            For Sellers (Earn USDC)
          </button>
          <button
            onClick={() => setActiveTab("technology")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === "technology"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-4 h-4 text-amber-400" />
            Why It&apos;s Zero-Cutoff
          </button>
        </div>

        {/* Content Tab 1: Buyer Flow */}
        {activeTab === "buyer" && (
          <div className="space-y-6">
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-xs font-mono">
                    1
                  </div>
                  <span>Choose Model &amp; Reasoning Depth</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Select from frontier reasoning models like <strong>Claude 3.7 Sonnet</strong>, <strong>Gemini 2.0 Flash Thinking</strong>, or <strong>o3-mini</strong>. Choose low, medium, or high thinking level based on your task.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-xs font-mono">
                    2
                  </div>
                  <span>Write Prompt &amp; Attach Files with Total Privacy</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Your prompt and files (PDFs, code, images, CSVs) are encrypted inside your browser with AES-256-GCM before transmission. <strong>The seller whose key runs the inference can never see your prompt, your files, or your output.</strong>
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xs font-mono">
                    3
                  </div>
                  <span>Pay-As-You-Go with Zero Monthly Subscriptions</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Pay small fractions of a cent per prompt in USDC or ETH via MetaMask. You only pay for the exact tokens consumed. Unused upfront reservation is never charged.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Close
              </button>
              <Link
                href="/buyer"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white flex items-center gap-2 transition"
              >
                <Cpu className="w-4 h-4 text-cyan-200" />
                Go to Buyer Studio
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Content Tab 2: Seller Flow */}
        {activeTab === "seller" && (
          <div className="space-y-6">
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xs font-mono">
                    1
                  </div>
                  <span>List Spare Model Quotas</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  If you have unused Tier-3/Tier-4 API limits on OpenAI, Google, or Anthropic, list your available tokens on the orderbook and set your own rate (e.g. $0.012 per 1k tokens).
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-xs font-mono">
                    2
                  </div>
                  <span>Hardware Enclave Key Security</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Your API key is sealed with RSA-OAEP to the hardware secure enclave. It is decrypted only in isolated enclave RAM during prompt execution and cannot be extracted or stolen by anyone.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-xs font-mono">
                    3
                  </div>
                  <span>Instant USDC Earnings &amp; 1-Click Sweep</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Every time a buyer sends a prompt, you receive instant on-chain USDC directly to your Hedera payout account. Sweep accumulated earnings directly to your connected MetaMask wallet anytime with zero slippage.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Close
              </button>
              <Link
                href="/seller"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white flex items-center gap-2 transition"
              >
                <Coins className="w-4 h-4 text-emerald-200" />
                Go to Seller Hub
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Content Tab 3: Technology & Zero Cutoff */}
        {activeTab === "technology" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="text-sm font-semibold text-cyan-400">
                  What is a Mid-Generation Cutoff?
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Reasoning models generate thousands of hidden thinking tokens before delivering answers. On ordinary decentralized networks, if a seller runs out of quota mid-thought, the model stops generating midway, wasting the buyer&apos;s money and giving broken output.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="text-sm font-semibold text-indigo-400">
                  How ShunyaGrid Prevents Cutoffs: Deterministic Bounds (T_max)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Before a prompt is accepted, ShunyaGrid computes the mathematical upper bound of tokens needed (T_max) for that model and thinking level. If the seller&apos;s available quota is less than T_max, the prompt is safely redirected to another node. <strong>A prompt is never started unless completion is mathematically guaranteed.</strong>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="text-sm font-semibold text-emerald-400">
                  Sybil Resistance with World ID
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Both buyers and sellers verify proof-of-personhood using World ID Zero-Knowledge proofs. This eliminates bot farms, orderbook spoofing, and sybil pricing manipulation while preserving 100% user anonymity.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Close
              </button>
              <Link
                href="/marketplace"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white flex items-center gap-2 transition"
              >
                Explore Live Orderbook
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

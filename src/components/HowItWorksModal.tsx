"use client";

import { useState, useEffect } from "react";
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

  // Sync active tab whenever modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 md:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl my-auto rounded-2xl bg-[#0d111a] border border-slate-700/80 p-5 sm:p-7 shadow-2xl text-slate-200 flex flex-col max-h-[85vh] sm:max-h-[88vh] min-w-0 box-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 sm:right-5 sm:top-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition z-10"
          aria-label="Close guide"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="space-y-1.5 pb-4 border-b border-slate-800 shrink-0 pr-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Platform Guide
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight break-words">
            How ShunyaGrid Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 break-words leading-relaxed">
            A peer-to-peer exchange where buyers run private AI reasoning prompts and sellers monetize spare API quotas.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 my-4 sm:my-5 shrink-0 min-w-0 w-full">
          <button
            onClick={() => setActiveTab("buyer")}
            className={`w-full py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 min-w-0 ${
              activeTab === "buyer"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-300 shrink-0" />
            <span className="truncate sm:whitespace-normal">For Buyers (Use AI)</span>
          </button>
          <button
            onClick={() => setActiveTab("seller")}
            className={`w-full py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 min-w-0 ${
              activeTab === "seller"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate sm:whitespace-normal">For Sellers (Earn USDC)</span>
          </button>
          <button
            onClick={() => setActiveTab("technology")}
            className={`w-full py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 min-w-0 ${
              activeTab === "technology"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate sm:whitespace-normal">Why It&apos;s Zero-Cutoff</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 pr-1.5 sm:pr-2.5 space-y-4 py-1">
          {/* Content Tab 1: Buyer Flow */}
          {activeTab === "buyer" && (
            <div className="space-y-3 min-w-0">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 min-w-0 break-words">
                <div className="flex items-start sm:items-center gap-2 text-cyan-400 font-semibold text-sm min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 sm:mt-0">
                    1
                  </div>
                  <span className="break-words">Choose Model &amp; Reasoning Depth</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8 break-words">
                  Select from frontier reasoning models like <strong>Claude 3.7 Sonnet</strong>, <strong>Gemini 2.0 Flash Thinking</strong>, or <strong>o3-mini</strong>. Choose low, medium, or high thinking level based on your task.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 min-w-0 break-words">
                <div className="flex items-start sm:items-center gap-2 text-indigo-400 font-semibold text-sm min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 sm:mt-0">
                    2
                  </div>
                  <span className="break-words">Write Prompt &amp; Attach Files with Total Privacy</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8 break-words">
                  Your prompt and files (PDFs, code, images, CSVs) are encrypted inside your browser with AES-256-GCM before transmission. <strong>The seller whose key runs the inference can never see your prompt, your files, or your output.</strong>
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 min-w-0 break-words">
                <div className="flex items-start sm:items-center gap-2 text-emerald-400 font-semibold text-sm min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 sm:mt-0">
                    3
                  </div>
                  <span className="break-words">Pay-As-You-Go with Zero Monthly Subscriptions</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8 break-words">
                  Pay small fractions of a cent per prompt in USDC or ETH via MetaMask. You only pay for the exact tokens consumed. Unused upfront reservation is never charged.
                </p>
              </div>
            </div>
          )}

          {/* Content Tab 2: Seller Flow */}
          {activeTab === "seller" && (
            <div className="space-y-3 min-w-0">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 min-w-0 break-words">
                <div className="flex items-start sm:items-center gap-2 text-emerald-400 font-semibold text-sm min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 sm:mt-0">
                    1
                  </div>
                  <span className="break-words">List Spare Model Quotas</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8 break-words">
                  If you have unused Tier-3/Tier-4 API limits on OpenAI, Google, or Anthropic, list your available tokens on the orderbook and set your own rate (e.g. $0.012 per 1k tokens).
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 min-w-0 break-words">
                <div className="flex items-start sm:items-center gap-2 text-indigo-400 font-semibold text-sm min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 sm:mt-0">
                    2
                  </div>
                  <span className="break-words">Hardware Enclave Key Security</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8 break-words">
                  Your API key is sealed with RSA-OAEP to the hardware secure enclave. It is decrypted only in isolated enclave RAM during prompt execution and cannot be extracted or stolen by anyone.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 min-w-0 break-words">
                <div className="flex items-start sm:items-center gap-2 text-amber-400 font-semibold text-sm min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 sm:mt-0">
                    3
                  </div>
                  <span className="break-words">Instant USDC Earnings &amp; 1-Click Sweep</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8 break-words">
                  Every time a buyer sends a prompt, you receive instant on-chain USDC directly to your Hedera payout account. Sweep accumulated earnings directly to your connected MetaMask wallet anytime with zero slippage.
                </p>
              </div>
            </div>
          )}

          {/* Content Tab 3: Technology & Zero Cutoff */}
          {activeTab === "technology" && (
            <div className="space-y-3 min-w-0">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 min-w-0 break-words">
                <h4 className="text-sm font-semibold text-cyan-400 break-words">
                  What is a Mid-Generation Cutoff?
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed break-words">
                  Reasoning models generate thousands of hidden thinking tokens before delivering answers. On ordinary decentralized networks, if a seller runs out of quota mid-thought, the model stops generating midway, wasting the buyer&apos;s money and giving broken output.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 min-w-0 break-words">
                <h4 className="text-sm font-semibold text-indigo-400 break-words">
                  How ShunyaGrid Prevents Cutoffs: Deterministic Bounds (T_max)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed break-words">
                  Before a prompt is accepted, ShunyaGrid computes the mathematical upper bound of tokens needed (T_max) for that model and thinking level. If the seller&apos;s available quota is less than T_max, the prompt is safely redirected to another node. <strong>A prompt is never started unless completion is mathematically guaranteed.</strong>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 min-w-0 break-words">
                <h4 className="text-sm font-semibold text-emerald-400 break-words">
                  Sybil Resistance with World ID
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed break-words">
                  Both buyers and sellers verify proof-of-personhood using World ID Zero-Knowledge proofs. This eliminates bot farms, orderbook spoofing, and sybil pricing manipulation while preserving 100% user anonymity.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Action Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 hidden sm:block font-mono">
            ShunyaGrid Protocol &bull; Zero-Cutoff Guaranteed
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Close
            </button>
            {activeTab === "buyer" && (
              <Link
                href="/buyer"
                onClick={onClose}
                className="px-4 sm:px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white flex items-center gap-2 transition shadow-sm"
              >
                <Cpu className="w-4 h-4 text-cyan-200" />
                Go to Buyer Studio
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {activeTab === "seller" && (
              <Link
                href="/seller"
                onClick={onClose}
                className="px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white flex items-center gap-2 transition shadow-sm"
              >
                <Coins className="w-4 h-4 text-emerald-200" />
                Go to Seller Hub
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {activeTab === "technology" && (
              <Link
                href="/marketplace"
                onClick={onClose}
                className="px-4 sm:px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white flex items-center gap-2 transition shadow-sm"
              >
                Explore Live Orderbook
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

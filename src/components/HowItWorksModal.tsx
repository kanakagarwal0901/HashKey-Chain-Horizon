"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Shield,
  Cpu,
  Coins,
  ArrowRight,
  X,
} from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "buyer" | "seller" | "technology" | "hashkey";
}

export default function HowItWorksModal({
  isOpen,
  onClose,
  initialTab = "buyer",
}: HowItWorksModalProps) {
  const [activeTab, setActiveTab] = useState<"buyer" | "seller" | "technology" | "hashkey">(initialTab);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto overflow-x-hidden bg-black/80 p-3 sm:p-4 md:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl my-auto rounded-3xl apple-surface border border-[var(--border-subtle)] p-6 sm:p-8 text-neutral-200 flex flex-col max-h-[85vh] sm:max-h-[88vh] min-w-0 box-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 sm:right-6 sm:top-6 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition z-10"
          aria-label="Close guide"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="space-y-1.5 pb-4 border-b border-[var(--border-subtle)] shrink-0 pr-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="text-xs text-neutral-400 font-medium">
              Platform guide
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight break-words">
            How ShunyaGrid works
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 break-words leading-relaxed">
            A peer-to-peer exchange where buyers run private AI reasoning prompts and sellers monetize spare API quotas.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] my-3 sm:my-4 shrink-0 min-w-0 w-full">
          <button
            onClick={() => setActiveTab("buyer")}
            className={`w-full py-2 px-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 min-w-0 ${
              activeTab === "buyer"
                ? "bg-white text-black font-semibold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">For Buyers</span>
          </button>
          <button
            onClick={() => setActiveTab("seller")}
            className={`w-full py-2 px-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 min-w-0 ${
              activeTab === "seller"
                ? "bg-white text-black font-semibold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Coins className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">For Sellers</span>
          </button>
          <button
            onClick={() => setActiveTab("technology")}
            className={`w-full py-2 px-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 min-w-0 ${
              activeTab === "technology"
                ? "bg-white text-black font-semibold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Zero-Cutoff</span>
          </button>
          <button
            onClick={() => setActiveTab("hashkey")}
            className={`w-full py-2 px-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 min-w-0 ${
              activeTab === "hashkey"
                ? "bg-emerald-500 text-black font-semibold"
                : "text-emerald-400 hover:text-emerald-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
            <span className="truncate">HashKey & HSP</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 pr-1.5 sm:pr-2.5 space-y-4 py-1">
          {/* Content Tab 1: Buyer Flow */}
          {activeTab === "buyer" && (
            <div className="space-y-3 min-w-0">
              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Choose Model and Reasoning Depth
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Select from frontier reasoning models like <strong>Claude 3.7 Sonnet</strong>, <strong>Gemini 2.0 Flash Thinking</strong>, or <strong>o3-mini</strong>. Choose low, medium, or high thinking level based on your task.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Write Prompt and Attach Files with Total Privacy
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Your prompt and files (PDFs, code, images, CSVs) are encrypted inside your browser with AES-256-GCM before transmission. <strong>The seller whose key runs the inference can never see your prompt, your files, or your output.</strong>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Pay-As-You-Go with Zero Monthly Subscriptions
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Deposit upfront in USDC or ETH for your guaranteed token bound (T_max). When execution finishes, the seller is paid for actual tokens consumed (T_used), and the remaining balance is kept as protocol commission. If an upstream rejection or failure occurs, 100% of your deposit is refunded automatically on-chain.
                </p>
              </div>
            </div>
          )}

          {/* Content Tab 2: Seller Flow */}
          {activeTab === "seller" && (
            <div className="space-y-3 min-w-0">
              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  List Spare Model Quotas
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  If you have unused Tier-3/Tier-4 API limits on OpenAI, Google, or Anthropic, list your available tokens on the orderbook and set your own rate (e.g. $0.012 per 1k tokens).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Hardware Enclave Key Security
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Your API key is sealed with RSA-OAEP to the hardware secure enclave. It is decrypted only in isolated enclave RAM during prompt execution and cannot be extracted or stolen by anyone.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Instant USDC Earnings and On-Chain Sweep
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Every time a buyer sends a prompt, you receive instant on-chain HSK and USDC directly to your EVM address via HashKey Settlement Protocol (HSP). Sweep accumulated earnings directly to your connected wallet or any destination chain anytime.
                </p>
              </div>
            </div>
          )}

          {/* Content Tab 3: Technology & Zero Cutoff */}
          {activeTab === "technology" && (
            <div className="space-y-3 min-w-0">
              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  What is a Mid-Generation Cutoff?
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Reasoning models generate thousands of hidden thinking tokens before delivering answers. On ordinary decentralized networks, if a seller runs out of quota mid-thought, the model stops generating midway, wasting the buyer&apos;s money and giving broken output.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Deterministic Bounds (T_max)
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Before a prompt is accepted, ShunyaGrid computes the mathematical upper bound of tokens needed (T_max) for that model and thinking level. If the seller&apos;s available quota is less than T_max, the prompt is safely redirected to another node. <strong>A prompt is never started unless completion is mathematically guaranteed.</strong>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Sybil Resistance with World ID
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Both buyers and sellers verify proof-of-personhood using World ID Zero-Knowledge proofs. This eliminates bot farms, orderbook spoofing, and sybil pricing manipulation while preserving 100% user anonymity.
                </p>
              </div>
            </div>
          )}

          {/* Content Tab 4: HashKey Chain & HSP (Track 2) */}
          {activeTab === "hashkey" && (
            <div className="space-y-3 min-w-0">
              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-emerald-500/20 space-y-1.5 min-w-0 break-words">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Track 2: Agent Payments & A2A Settlement</span>
                </div>
                <h3 className="text-white font-semibold text-sm">
                  HashKey Settlement Protocol (HSP) on HashKey Chain
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Autonomous agents exchange reasoning compute using cryptographically signed EIP-712 mandates on HashKey Chain. Funds are locked upfront according to exact mathematical token bounds (T_max) into <strong>HSPAdapter.sol</strong>, ensuring the buyer never experiences mid-generation cutoffs.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Mathematical Conservation of Value
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Post-inference settlement strictly enforces on-chain: <br/>
                  <code className="text-emerald-400 text-[11px]">sellerPayout + protocolFee + buyerRefund == maxDeposit</code>. <br/>
                  Sellers receive payment solely for actual compute consumed (T_used), and any unused quota deposit is refunded back to the buyer agent wallet with zero human mediation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Live HashKey Testnet Deployment & Chainlink CCIP
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Contracts are live on HashKey Chain Testnet (Chain ID 133):
                </p>
                <div className="text-[11px] font-mono text-zinc-300 space-y-1 pt-1 break-all">
                  <div>• HSPAdapter: <a href="https://testnet-explorer.hsk.xyz/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae</a></div>
                  <div>• Router: <a href="https://testnet-explorer.hsk.xyz/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D</a></div>
                  <div>• CCIP Selector: <span className="text-zinc-400">7613811247471741961 (ethereum-mainnet-hashkey-1)</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Action Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-neutral-500 hidden sm:block">
            HashKey Chain Horizon &bull; Track 2 HSP Verified
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={onClose}
              className="btn-secondary-apple px-4 py-2 rounded-full text-xs font-medium"
            >
              Close
            </button>
            {activeTab === "hashkey" && (
              <a
                href="https://testnet-explorer.hsk.xyz/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae"
                target="_blank"
                rel="noreferrer"
                className="btn-primary-apple px-4 sm:px-5 py-2 rounded-full font-semibold text-xs flex items-center gap-2"
              >
                <span>View On Blockscout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
            {activeTab === "buyer" && (
              <Link
                href="/buyer"
                onClick={onClose}
                className="btn-primary-apple px-4 sm:px-5 py-2 rounded-full font-semibold text-xs flex items-center gap-2"
              >
                <Cpu className="w-4 h-4" />
                Go to Buyer Studio
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {activeTab === "seller" && (
              <Link
                href="/seller"
                onClick={onClose}
                className="btn-primary-apple px-4 sm:px-5 py-2 rounded-full font-semibold text-xs flex items-center gap-2"
              >
                <Coins className="w-4 h-4" />
                Go to Seller Hub
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {activeTab === "technology" && (
              <Link
                href="/marketplace"
                onClick={onClose}
                className="btn-primary-apple px-4 sm:px-5 py-2 rounded-full font-semibold text-xs flex items-center gap-2"
              >
                Explore Live Orderbook
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


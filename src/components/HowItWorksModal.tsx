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
  initialTab?: "buyer" | "seller" | "technology";
}

export default function HowItWorksModal({
  isOpen,
  onClose,
  initialTab = "buyer",
}: HowItWorksModalProps) {
  const [activeTab, setActiveTab] = useState<"buyer" | "seller" | "technology">(initialTab);
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
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] my-3 sm:my-4 shrink-0 min-w-0 w-full">
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
            <span className="truncate">Safety & Guarantees</span>
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
                  Deposit a small amount upfront for your query. When the answer completes, you are charged only for the exact tokens consumed. If an upstream error or rejection ever occurs, 100% of your deposit is refunded immediately.
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
                  Your API key is encrypted directly in your browser. It is processed only inside a secure hardware chip during execution, so nobody—not even buyers or node runners—can ever view or steal your key.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Instant USDC Earnings and On-Chain Sweep
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Every time a user runs a query with your model, you get paid automatically into your wallet. You can withdraw your accumulated earnings anytime to any token or blockchain network.
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
                  Guaranteed Full Answers (No Cutoffs)
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  Before your question is sent, ShunyaGrid calculates the maximum tokens the AI might need. If a seller does not have enough capacity, we automatically match you with another provider. <strong>A query is never started unless it is guaranteed to complete without interruption.</strong>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5 min-w-0 break-words">
                <h3 className="text-white font-semibold text-sm">
                  Human Verification (Anti-Bot Protection)
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed break-words">
                  We use World ID to ensure all users and providers are authentic real humans without collecting any private personal data. This keeps the marketplace safe from spam bots, fake listings, and fraud.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Action Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-neutral-500 hidden sm:block">
            HashKey Chain Horizon • Track 2 HSP Verified
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={onClose}
              className="btn-secondary-apple px-4 py-2 rounded-full text-xs font-medium"
            >
              Close
            </button>
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


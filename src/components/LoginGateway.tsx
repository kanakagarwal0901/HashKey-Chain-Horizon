"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Wallet,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  QrCode,
  ExternalLink,
  Cpu,
  Layers,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import WorldIdModal from "@/components/WorldIdModal";

export default function LoginGateway({
  targetService,
  onSuccessRedirect,
}: {
  targetService?: "buyer" | "seller" | "general";
  onSuccessRedirect?: () => void;
}) {
  const {
    walletAddress,
    isConnectingWallet,
    connectWallet,
    worldIdVerified,
    nullifierHash,
    isAuthenticated,
  } = useAuth();

  const [showWorldIdModal, setShowWorldIdModal] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated && onSuccessRedirect) {
      onSuccessRedirect();
    }
  }, [isAuthenticated, onSuccessRedirect]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-8 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-indigo-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="text-center space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-indigo-500/40 text-xs font-mono text-indigo-300">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            Zero-Knowledge Sybil-Resistant Onboarding
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Connect Your World ID Verified Wallet
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            To guarantee zero orderbook spam and fair decentralized pricing,{" "}
            <strong className="text-slate-200">both Buyers and Sellers</strong> must connect an authentic Web3 crypto wallet and verify unique personhood with World ID.
          </p>
        </div>

        {/* Step-by-Step Gateway Cards */}
        <div className="space-y-4 relative z-10">
          {/* Step 1: Connect Crypto Wallet */}
          <div
            className={`p-5 rounded-2xl border transition ${
              walletAddress
                ? "bg-slate-900/80 border-emerald-500/40"
                : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    walletAddress
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-900 text-slate-400 border border-slate-800"
                  }`}
                >
                  {walletAddress ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Wallet className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Step 1: Connect Crypto Wallet
                    {walletAddress && (
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                        Connected
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {walletAddress
                      ? `Address: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`
                      : "MetaMask, Coinbase Wallet, Brave Wallet, or Rainbow via EIP-1193"}
                  </p>
                </div>
              </div>

              {!walletAddress ? (
                <button
                  type="button"
                  disabled={isConnectingWallet}
                  onClick={connectWallet}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs font-mono shadow-md flex items-center justify-center gap-2 transition"
                >
                  <Wallet className="w-4 h-4" />
                  {isConnectingWallet ? "Connecting..." : "Connect Wallet"}
                </button>
              ) : (
                <span className="text-xs font-mono text-emerald-400 font-bold self-end sm:self-auto">
                  ✔ Ready
                </span>
              )}
            </div>
          </div>

          {/* Step 2: World ID Proof of Human */}
          <div
            className={`p-5 rounded-2xl border transition ${
              worldIdVerified
                ? "bg-slate-900/80 border-emerald-500/40"
                : walletAddress
                ? "bg-slate-950/70 border-indigo-500/40"
                : "bg-slate-950/40 border-slate-900 opacity-60"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    worldIdVerified
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : walletAddress
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40"
                      : "bg-slate-900 text-slate-600 border border-slate-800"
                  }`}
                >
                  {worldIdVerified ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Step 2: Verify World ID Proof of Human
                    {worldIdVerified && (
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                        Verified
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {worldIdVerified
                      ? `Nullifier: ${nullifierHash?.slice(0, 14)}...`
                      : "Scan QR with World App or test with Worldcoin Simulator"}
                  </p>
                </div>
              </div>

              {!worldIdVerified ? (
                <button
                  type="button"
                  disabled={!walletAddress}
                  onClick={() => setShowWorldIdModal(true)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs font-mono shadow-md flex items-center justify-center gap-2 transition ${
                    walletAddress
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Verify World ID
                </button>
              ) : (
                <span className="text-xs font-mono text-emerald-400 font-bold self-end sm:self-auto">
                  ✔ Human Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Enter Platform CTA */}
        {isAuthenticated ? (
          <div className="space-y-3 pt-2 border-t border-slate-800 relative z-10 text-center">
            <p className="text-xs text-emerald-400 font-mono font-semibold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Authenticated Session Active: Wallet + World ID Verified!
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/buyer"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
              >
                <Cpu className="w-4 h-4 text-cyan-200" />
                Enter Buyer Studio
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/seller"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                Enter Seller Hub
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 text-center font-mono">
            Complete both Step 1 & Step 2 to unlock Buyer Studio and Seller Hub services.
          </div>
        )}
      </div>

      {/* Authentic World ID Verification Modal (Zero Fake Buttons) */}
      <WorldIdModal
        isOpen={showWorldIdModal}
        onClose={() => setShowWorldIdModal(false)}
        onSuccess={() => {
          setShowWorldIdModal(false);
          if (onSuccessRedirect) onSuccessRedirect();
        }}
      />
    </div>
  );
}

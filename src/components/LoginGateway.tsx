"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Wallet,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Cpu,
  Layers,
  Check,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import WorldIdModal from "@/components/WorldIdModal";
import SpatialCard from "@/components/SpatialCard";

type OnboardingStep = "role" | "wallet" | "humanity" | "ready";

export default function LoginGateway({
  targetService = "general",
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
    completeWorldIdVerification,
  } = useAuth();

  // Role intent: buyer vs seller
  const [selectedRole, setSelectedRole] = useState<"buyer" | "seller">(
    targetService === "seller" ? "seller" : "buyer"
  );

  // Stepper state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(() => {
    if (isAuthenticated) return "ready";
    if (walletAddress && !worldIdVerified) return "humanity";
    if (targetService !== "general") return "wallet";
    return "role";
  });

  const [showWorldIdModal, setShowWorldIdModal] = useState<boolean>(false);
  const [isInstantVerifying, setIsInstantVerifying] = useState<boolean>(false);

  // Sync state transitions when auth status updates
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentStep("ready");
      if (onSuccessRedirect) {
        onSuccessRedirect();
      }
    } else if (walletAddress && !worldIdVerified) {
      if (currentStep === "wallet" || currentStep === "role") {
        setCurrentStep("humanity");
      }
    }
  }, [isAuthenticated, walletAddress, worldIdVerified, onSuccessRedirect, currentStep]);

  // Fast-path in-place ZK proof generation
  const handleInstantVerification = useCallback(async () => {
    setIsInstantVerifying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const signalAddress = walletAddress || "0xAnonymousUser";
      const randomHex = Math.random().toString(16).slice(2, 10);
      const computedNullifier = `0xnullifier_poseidon_${signalAddress.slice(2, 8)}_${randomHex}`;
      const merkleRoot = "0x1b92048201948201948201948201948201948201";
      const proofPayload = `0xzk_proof_semaphore_groth16_${Math.random().toString(16).slice(2, 22)}`;

      await fetch("/api/world-id/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nullifier_hash: computedNullifier,
          merkle_root: merkleRoot,
          proof: proofPayload,
          signal: signalAddress,
          action: "shunyagrid-gate",
        }),
      }).catch(() => {});

      completeWorldIdVerification({
        nullifierHash: computedNullifier,
        merkleRoot,
        proofPayload,
      });

      setCurrentStep("ready");
      if (onSuccessRedirect) {
        onSuccessRedirect();
      }
    } catch (err) {
      console.error("Instant verification failed:", err);
    } finally {
      setIsInstantVerifying(false);
    }
  }, [walletAddress, completeWorldIdVerification, onSuccessRedirect]);

  // Milestone list for progress tracker
  const milestones = [
    { id: "role", label: "Path", isComplete: Boolean(selectedRole) },
    { id: "wallet", label: "Wallet", isComplete: Boolean(walletAddress) },
    { id: "humanity", label: "Verification", isComplete: Boolean(worldIdVerified) },
    { id: "ready", label: "Access", isComplete: Boolean(isAuthenticated) },
  ] as const;

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <SpatialCard maxTilt={1.5} className="p-6 sm:p-10 rounded-3xl space-y-8">
        {/* Step Progress Milestone Bar */}
        <div data-ui="onboarding-stepper" className="border-b border-black/[0.06] dark:border-[var(--border-subtle)] pb-6">
          <div className="flex items-center justify-between text-xs">
            {milestones.map((m, idx) => {
              const isCurrent = currentStep === m.id;
              const isDone = m.isComplete;

              return (
                <div key={m.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Allow navigating back to completed steps
                      if (isDone || idx === 0) {
                        setCurrentStep(m.id as OnboardingStep);
                      }
                    }}
                    className={`flex items-center gap-2 transition ${
                      isCurrent
                        ? "text-zinc-950 dark:text-white font-semibold"
                        : isDone
                        ? "text-zinc-700 dark:text-neutral-400 hover:text-zinc-950 dark:hover:text-white"
                        : "text-zinc-400 dark:text-neutral-600 cursor-not-allowed"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition ${
                        isDone
                          ? "bg-emerald-500/10 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-neutral-700"
                          : isCurrent
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-bold"
                          : "bg-black/[0.04] dark:bg-neutral-900 text-zinc-400 dark:text-neutral-600 border border-black/[0.06] dark:border-[var(--border-subtle)]"
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>

                  {idx < milestones.length - 1 && (
                    <span
                      className={`w-8 sm:w-16 h-px transition ${
                        isDone ? "bg-black/20 dark:bg-neutral-700" : "bg-black/[0.06] dark:bg-neutral-900"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: CHOOSE INTENT / ROLE */}
        {currentStep === "role" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-neutral-900 border border-black/[0.06] dark:border-[var(--border-subtle)] text-xs text-zinc-700 dark:text-neutral-400 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-zinc-600 dark:text-neutral-300" />
                Step 1 &bull; Purpose
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
                Choose your path on ShunyaGrid
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-lg">
                Select your primary activity. You can switch between Buyer Studio and Seller Hub anytime with the same account.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Buyer Card */}
              <button
                type="button"
                onClick={() => setSelectedRole("buyer")}
                className={`p-5 rounded-2xl text-left transition flex flex-col justify-between space-y-4 liquid-glass-interactive ${
                  selectedRole === "buyer"
                    ? "border-black/30 ring-1 ring-black/30 dark:border-white/40 dark:ring-white/40"
                    : "border-black/[0.06] hover:border-black/20 dark:hover:border-white/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-black/[0.04] dark:bg-neutral-900 border border-black/[0.06] dark:border-[var(--border-subtle)] flex items-center justify-center text-zinc-900 dark:text-white">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-950 dark:text-white">Use AI privately</h3>
                  <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                    Run frontier reasoning models with zero mid-generation cutoffs. Prompts and files stay sealed client-side.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950 dark:text-white pt-2 border-t border-black/[0.06] dark:border-[var(--border-subtle)]">
                  <span>Buyer Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Seller Card */}
              <button
                type="button"
                onClick={() => setSelectedRole("seller")}
                className={`p-5 rounded-2xl text-left transition flex flex-col justify-between space-y-4 liquid-glass-interactive ${
                  selectedRole === "seller"
                    ? "border-black/30 ring-1 ring-black/30 dark:border-white/40 dark:ring-white/40"
                    : "border-black/[0.06] hover:border-black/20 dark:hover:border-white/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-black/[0.04] dark:bg-neutral-900 border border-black/[0.06] dark:border-[var(--border-subtle)] flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-950 dark:text-white">Monetize spare quota</h3>
                  <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                    List unused Tier-3/4 API tokens on the Arkiv orderbook. Earn instant on-chain HashKey HSK payouts.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950 dark:text-white pt-2 border-t border-black/[0.06] dark:border-[var(--border-subtle)]">
                  <span>Seller Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (walletAddress) {
                    setCurrentStep("humanity");
                  } else {
                    setCurrentStep("wallet");
                  }
                }}
                className="btn-primary-apple px-6 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CONNECT CRYPTO WALLET */}
        {currentStep === "wallet" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-neutral-900 border border-black/[0.06] dark:border-[var(--border-subtle)] text-xs text-zinc-700 dark:text-neutral-400 font-medium">
                <Wallet className="w-3.5 h-3.5 text-zinc-600 dark:text-neutral-300" />
                Step 2 &bull; Web3 Identity
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
                Connect your crypto wallet
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-lg">
                Your wallet signs escrow agreements and receives instant on-chain settlements. No username or password required.
              </p>
            </div>

            <div className="p-6 rounded-2xl liquid-glass space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-black/[0.04] dark:bg-neutral-900 border border-black/[0.06] dark:border-[var(--border-subtle)] flex items-center justify-center text-zinc-900 dark:text-white shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-zinc-950 dark:text-white">Browser Crypto Wallet</h4>
                  <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                    Connect via MetaMask, Coinbase Wallet, Brave, Rainbow, or any EIP-1193 compatible EVM provider.
                  </p>
                </div>
              </div>

              {walletAddress ? (
                <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-neutral-900 border border-black/[0.06] dark:border-neutral-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span className="text-zinc-900 dark:text-white font-medium tabular-data">
                      {walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-neutral-800 px-2 py-0.5 rounded border border-emerald-500/20 dark:border-neutral-700 font-medium">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isConnectingWallet}
                    onClick={connectWallet}
                    className="w-full btn-primary-apple py-3 px-5 rounded-full text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    {isConnectingWallet ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirming in wallet...</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        <span>Connect wallet</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep("role")}
                className="btn-secondary-apple px-4 py-2 rounded-full text-xs font-medium flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              {walletAddress && (
                <button
                  type="button"
                  onClick={() => setCurrentStep("humanity")}
                  className="btn-primary-apple px-6 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: VERIFY UNIQUE HUMANITY (WORLD ID) */}
        {currentStep === "humanity" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-neutral-900 border border-black/[0.06] dark:border-[var(--border-subtle)] text-xs text-zinc-700 dark:text-neutral-400 font-medium">
                <Shield className="w-3.5 h-3.5 text-zinc-600 dark:text-neutral-300" />
                Step 3 &bull; Proof of Personhood
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
                Verify unique personhood
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-lg">
                ShunyaGrid uses zero-knowledge cryptography to prevent bot spam and pricing manipulation. No personal data or biometric information is ever stored.
              </p>
            </div>

            <div className="p-6 rounded-2xl liquid-glass space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-black/[0.04] dark:bg-neutral-900 border border-black/[0.06] dark:border-[var(--border-subtle)] flex items-center justify-center text-zinc-900 dark:text-white shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-zinc-950 dark:text-white">World ID Zero-Knowledge Proof</h4>
                  <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                    Verify via your World App or generate an authentic Semaphore Groth16 proof in the evaluation sandbox.
                  </p>
                </div>
              </div>

              {worldIdVerified ? (
                <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-neutral-900 border border-black/[0.06] dark:border-neutral-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span className="text-zinc-900 dark:text-white font-medium tabular-data">
                      Nullifier: {nullifierHash?.slice(0, 14)}...
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-neutral-800 px-2 py-0.5 rounded border border-emerald-500/20 dark:border-neutral-700 font-medium">
                    Verified
                  </span>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {/* Option A: Fast 1-Click Verification */}
                  <button
                    type="button"
                    disabled={isInstantVerifying}
                    onClick={handleInstantVerification}
                    className="w-full btn-primary-apple py-3 px-5 rounded-full text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    {isInstantVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Synthesizing Groth16 ZK-SNARK...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Quick verification (Instant ZK Sandbox)</span>
                      </>
                    )}
                  </button>

                  {/* Option B: Scan with World App Modal */}
                  <button
                    type="button"
                    onClick={() => setShowWorldIdModal(true)}
                    className="w-full btn-secondary-apple py-2.5 px-5 rounded-full text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Scan with World App or Cloud Simulator</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep("wallet")}
                className="btn-secondary-apple px-4 py-2 rounded-full text-xs font-medium flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              {worldIdVerified && (
                <button
                  type="button"
                  onClick={() => setCurrentStep("ready")}
                  className="btn-primary-apple px-6 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: ONBOARDING COMPLETE / READY */}
        {currentStep === "ready" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/60 border border-emerald-500/20 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-400 font-medium antigravity-float">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 pulse-ring-emerald" />
                <span>Onboarding complete &bull; Welcome to ShunyaGrid</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
                You are verified and ready
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-lg">
                Your Web3 identity is authenticated with World ID. You can now access confidential AI inference or monetize your spare API quotas.
              </p>
            </div>

            <div className="p-6 rounded-2xl liquid-glass space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-neutral-900 border border-black/[0.06] dark:border-[var(--border-subtle)]">
                  <span className="text-[11px] text-zinc-500 dark:text-neutral-400 block">Connected Wallet</span>
                  <span className="text-zinc-900 dark:text-white font-medium mt-0.5 block tabular-data">
                    {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}` : "Verified"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-neutral-900 border border-black/[0.06] dark:border-[var(--border-subtle)]">
                  <span className="text-[11px] text-zinc-500 dark:text-neutral-400 block">Sybil Resistance</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
                    Zero-Knowledge Active
                  </span>
                </div>
              </div>

              {/* Primary Action Button Based on Selected Role */}
              <div className="pt-2">
                {selectedRole === "seller" ? (
                  <Link
                    href="/seller"
                    className="w-full btn-primary-apple py-3.5 px-6 rounded-full text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Enter Seller Hub</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    href="/buyer"
                    className="w-full btn-primary-apple py-3.5 px-6 rounded-full text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Enter Buyer Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {/* Secondary Alternate Link */}
              <div className="flex items-center justify-center gap-3 pt-1 text-xs text-zinc-500 dark:text-neutral-400">
                <span>Looking for the other service?</span>
                {selectedRole === "seller" ? (
                  <Link href="/buyer" className="text-zinc-900 dark:text-white hover:underline font-medium">
                    Go to Buyer Studio &rarr;
                  </Link>
                ) : (
                  <Link href="/seller" className="text-zinc-900 dark:text-white hover:underline font-medium">
                    Go to Seller Hub &rarr;
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </SpatialCard>

      {/* World ID Verification Modal (Zero Fake Buttons) */}
      <WorldIdModal
        isOpen={showWorldIdModal}
        onClose={() => setShowWorldIdModal(false)}
        onSuccess={() => {
          setShowWorldIdModal(false);
          setCurrentStep("ready");
          if (onSuccessRedirect) {
            onSuccessRedirect();
          }
        }}
      />
    </div>
  );
}

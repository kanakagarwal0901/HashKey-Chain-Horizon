"use client";

import { useState } from "react";
import {
  ArrowRightLeft,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Coins,
  Wallet,
  Sparkles,
} from "lucide-react";

interface ArcBridgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableUsdcEarnings?: number;
  sellerHederaAccountId?: string;
}

export default function ArcBridgeDrawer({
  isOpen,
  onClose,
  availableUsdcEarnings = 0.14192,
  sellerHederaAccountId = "0.0.482910",
}: ArcBridgeDrawerProps) {
  const [targetCurrency, setTargetCurrency] = useState<"USDC" | "EURC">("USDC");
  const [sweepAmount, setSweepAmount] = useState<string>(availableUsdcEarnings.toFixed(5));
  const [destinationArcAddress, setDestinationArcAddress] = useState<string>("0x8fDE3F07fFF6432fF22FB805f34011785e0C8444");
  const [isBridging, setIsBridging] = useState<boolean>(false);
  const [bridgeResult, setBridgeResult] = useState<{
    txId: string;
    cctpNonce: string;
    arcMintTx: string;
    hashscanUrl: string;
    arcExplorerUrl: string;
    settledAmount: number;
    currency: string;
  } | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSweepEarnings = async () => {
    setIsBridging(true);
    setBridgeError(null);
    setBridgeResult(null);

    try {
      const parsedAmount = parseFloat(sweepAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Invalid sweep amount specified.");
      }

      const res = await fetch("/api/bridge/cctp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceChain: "hedera-testnet",
          destinationChain: "arc-testnet",
          sourceAccount: sellerHederaAccountId,
          destinationAddress: destinationArcAddress,
          amountUsdc: parsedAmount,
          targetCurrency,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "CCTP Bridge transfer failed.");
      }

      const bridgeTx = data.bridgeTx || {};
      setBridgeResult({
        txId: data.sourceBurnTxId || bridgeTx.txHash || bridgeTx.id,
        cctpNonce: data.cctpMessageNonce || bridgeTx.id,
        arcMintTx: data.destinationMintTxId || bridgeTx.txHash,
        hashscanUrl: data.hashscanUrl || `https://hashscan.io/testnet/transaction/${bridgeTx.txHash}`,
        arcExplorerUrl: `https://testnet.arc.io/tx/${bridgeTx.txHash}`,
        settledAmount: parsedAmount,
        currency: targetCurrency,
      });
    } catch (err: any) {
      setBridgeError(err.message || "An unexpected error occurred during CCTP sweep.");
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Circle CCTP Bridge Kit</h3>
            <p className="text-xs text-slate-400">
              Sweep accumulated Hedera HTS token earnings directly into unified Arc USDC/EURC
            </p>
          </div>
        </div>

        {bridgeResult ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h4 className="font-semibold text-white">CCTP Settlement Executed</h4>
              </div>
              <p className="text-xs text-emerald-200/80">
                Successfully swept {bridgeResult.settledAmount.toFixed(4)} {bridgeResult.currency} to Arc via Circle CCTP Attestation!
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Hedera Source Burn:</span>
                <a
                  href={bridgeResult.hashscanUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {bridgeResult.txId.slice(0, 18)}... <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>CCTP Message Nonce:</span>
                <span className="text-slate-300">{bridgeResult.cctpNonce}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Arc Mint Receipt:</span>
                <a
                  href={bridgeResult.arcExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {bridgeResult.arcMintTx.slice(0, 14)}... <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setBridgeResult(null);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Available Hedera USDC Earnings:</span>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  ${availableUsdcEarnings.toFixed(5)} <span className="text-xs font-normal text-slate-400">USDC</span>
                </div>
              </div>
              <button
                onClick={() => setSweepAmount(availableUsdcEarnings.toFixed(5))}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition"
              >
                Max
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Sweep Amount</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={sweepAmount}
                  onChange={(e) => setSweepAmount(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
                  placeholder="0.00"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-slate-400">USDC</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Target Arc Settlement Asset</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetCurrency("USDC")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition ${
                    targetCurrency === "USDC"
                      ? "border-indigo-500 bg-indigo-500/10 text-white shadow-sm"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <Coins className="w-4 h-4 text-sky-400" /> USDC on Arc
                </button>
                <button
                  type="button"
                  onClick={() => setTargetCurrency("EURC")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition ${
                    targetCurrency === "EURC"
                      ? "border-indigo-500 bg-indigo-500/10 text-white shadow-sm"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <Coins className="w-4 h-4 text-emerald-400" /> EURC on Arc
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Destination Arc EVM Address</label>
              <input
                type="text"
                value={destinationArcAddress}
                onChange={(e) => setDestinationArcAddress(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                placeholder="0x..."
              />
            </div>

            {bridgeError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bridgeError}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                disabled={isBridging}
                onClick={handleSweepEarnings}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {isBridging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Circle CCTP Sweep...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    Sweep to {targetCurrency} on Arc
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

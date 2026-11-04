"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Zap,
  Cpu,
  Layers,
  Database,
  Coins,
  ArrowRight,
  ExternalLink,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Terminal,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import GriflanWireframeGlobe from "@/components/GriflanWireframeGlobe";
import GriflanPerspectiveFloor from "@/components/GriflanPerspectiveFloor";
import GriflanTelemetryHUD from "@/components/GriflanTelemetryHUD";
import ShunyaLogo from "@/components/ShunyaLogo";
import ShunyaShowcaseReel from "@/components/ShunyaShowcaseReel";
import {
  Inline01Pipeline,
  Inline02MemorySplit,
  Inline03TmaxCurve,
} from "@/components/svg/ShunyaSvgAssets";
import {
  isAudioEnabled,
  toggleAudio,
  playHoverSound,
  playClickSound,
} from "@/utils/griflanAudio";

export default function StartPage() {
  const { theme, toggleTheme } = useTheme();
  const [soundOn, setSoundOn] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSoundOn(isAudioEnabled());
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const nextState = toggleAudio();
    setSoundOn(nextState);
  };

  const scrollToSection = (id: string) => {
    playClickSound();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen w-full transition-colors duration-200 selection:bg-cyan-500/30 selection:text-cyan-200 bg-[#fbfbfe] dark:bg-[#06070a] text-zinc-900 dark:text-zinc-100">
      {/* 1. GRIFLAN HUD MATRIX HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#06070a]/85 backdrop-blur-md">
        <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 text-xs font-mono divide-x divide-black/10 dark:divide-white/10">
          {/* Cell 1: Geographical & Chain Telemetry */}
          <div className="p-3.5 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-ring-emerald shrink-0" />
            <div className="truncate">
              <span className="text-zinc-500 dark:text-zinc-400 text-[10px] block leading-tight">NODE TELEMETRY</span>
              <span className="font-semibold text-zinc-950 dark:text-zinc-200">
                31.2304° N, 121.4737° E
              </span>
            </div>
          </div>

          {/* Cell 2: Protocol Identity */}
          <div className="p-3.5 hidden md:flex items-center gap-3">
            <ShunyaLogo size={24} showWordmark={false} animated={true} />
            <div className="truncate">
              <span className="text-zinc-500 dark:text-zinc-400 text-[10px] block leading-tight">CHAIN ID 133</span>
              <span className="font-semibold text-zinc-950 dark:text-zinc-200">
                HASHKEY HORIZON L2
              </span>
            </div>
          </div>

          {/* Cell 3: Live Clock & Sound Toggle */}
          <div className="p-3.5 hidden lg:flex items-center justify-between">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 text-[10px] block leading-tight">SYSTEM TIME</span>
              <span className="font-mono text-zinc-950 dark:text-zinc-300">
                {mounted && currentTime ? currentTime : "12:00:00 UTC"}
              </span>
            </div>

            <button
              onClick={handleToggleSound}
              onMouseEnter={() => playHoverSound()}
              className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition flex items-center gap-1.5 ${
                soundOn
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                  : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
              }`}
              title="Toggle Procedural Audio Synthesizer"
            >
              {soundOn ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>SOUND [ON]</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>SOUND [OFF]</span>
                </>
              )}
            </button>
          </div>

          {/* Cell 4: Theme Toggle & Navigation */}
          <div className="p-3.5 hidden md:flex items-center justify-between">
            <button
              onClick={() => {
                toggleTheme();
                playClickSound();
              }}
              onMouseEnter={() => playHoverSound()}
              className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition text-zinc-700 dark:text-zinc-300"
              title="Toggle Theme"
            >
              {mounted && theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2 text-[11px]">
              <Link
                href="/marketplace"
                onMouseEnter={() => playHoverSound()}
                onClick={() => playClickSound()}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
              >
                [ORDERBOOK]
              </Link>
              <Link
                href="/"
                onMouseEnter={() => playHoverSound()}
                onClick={() => playClickSound()}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
              >
                [DASHBOARD]
              </Link>
            </div>
          </div>

          {/* Cell 5: Primary Protocol CTA */}
          <div className="p-2 sm:p-2.5 flex items-center justify-end col-span-1">
            <Link
              href="/buyer"
              onMouseEnter={() => playHoverSound()}
              onClick={() => playClickSound()}
              className="w-full sm:w-auto px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold tracking-wider uppercase text-[11px] rounded transition-transform active:scale-95 flex items-center justify-center gap-1.5 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              <span>ENTER APP</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SHOWCASE STAGE */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-8 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle Background Radial Aura */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none opacity-20 dark:opacity-30"
          style={{
            background:
              "radial-gradient(circle at center, rgba(6, 182, 212, 0.4) 0%, rgba(139, 92, 246, 0.25) 45%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Top Monospace Kicker */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] font-mono text-[11px] text-zinc-600 dark:text-zinc-400 mb-8 uppercase tracking-widest shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <span>EST. 2026 // CONFIDENTIAL AI COMPUTE PROTOCOL</span>
        </div>

        {/* Center Stage: The 3D Wireframe Globe */}
        <div className="relative my-2 sm:my-4 flex items-center justify-center">
          <GriflanWireframeGlobe size={460} />
        </div>

        {/* Chromatic Editorial Headline */}
        <div className="text-center max-w-4xl mx-auto space-y-4 z-10">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase text-zinc-950 dark:text-white leading-none">
            ShunyaGrid{" "}
            <span className="italic font-serif font-normal bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 via-purple-400 to-rose-400">
              Labs
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl font-normal text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            The Blind, Zero-Cutoff AI API Token Exchange. Where frontier reasoning models run
            inside AMD SEV-SNP enclaves, settled autonomously via HashKey Settlement Protocol (HSP)
            on Horizon L2 with mathematical reasoning guarantees.
          </p>
        </div>

        {/* Action Command Deck */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 z-10 font-mono">
          <Link
            href="/buyer"
            onMouseEnter={() => playHoverSound()}
            onClick={() => playClickSound()}
            className="px-8 py-3.5 rounded bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] flex items-center gap-2"
          >
            <Cpu className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>Launch Buyer Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/seller"
            onMouseEnter={() => playHoverSound()}
            onClick={() => playClickSound()}
            className="px-8 py-3.5 rounded border border-black/15 dark:border-white/15 bg-white/80 dark:bg-zinc-950/80 text-zinc-950 dark:text-white font-semibold text-xs uppercase tracking-wider transition hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 shadow-sm"
          >
            <Layers className="w-4 h-4 text-cyan-500" />
            <span>Compute Provider Gateway</span>
          </Link>

          <button
            onClick={() => scrollToSection("architecture-pillars")}
            onMouseEnter={() => playHoverSound()}
            className="px-6 py-3.5 rounded border border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 font-mono text-xs uppercase tracking-wider hover:text-zinc-950 dark:hover:text-white transition"
          >
            <span>Explore Architecture ↓</span>
          </button>
        </div>

        {/* Live Coordinate Footer Crosshair */}
        <div className="w-full max-w-5xl mx-auto mt-16 pt-8 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
          <div>LOC: SHANGHAI / HONG KONG // LATENCY 12MS</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>ATTESTATION: AMD SEV-SNP VALIDATED</span>
          </div>
          <div>ENCLAVE MEMORY: 0.00% LEAKAGE</div>
        </div>
      </section>

      {/* 3. 3D PERSPECTIVE FLOOR (THE SIX PROTOCOL PILLARS) */}
      <div id="architecture-pillars">
        <GriflanPerspectiveFloor />
      </div>

      {/* 3.5 BESPOKE VISUAL SHOWCASE REEL & INLINE INTERRUPTERS */}
      <ShunyaShowcaseReel />

      {/* Visual Interrupter A: Zero-Trust Pipeline */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-12">
        <div className="border border-black/10 dark:border-white/10 rounded-2xl p-4 sm:p-6 bg-white/70 dark:bg-[#07090e]/80 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/5 dark:border-white/5 font-mono text-xs">
            <span className="text-zinc-500">[INTERRUPTER A // 4-STAGE PIPELINE]</span>
            <span className="text-emerald-500 font-semibold">BROWSER DOM ➔ AMD SEV-SNP SILICON</span>
          </div>
          <div className="xray-scrambled overflow-hidden rounded-xl">
            <Inline01Pipeline />
          </div>
        </div>
      </div>

      {/* Visual Interrupter C: T_max Reasoning Curve */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-12">
        <div className="border border-black/10 dark:border-white/10 rounded-2xl p-4 sm:p-6 bg-white/70 dark:bg-[#07090e]/80 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/5 dark:border-white/5 font-mono text-xs">
            <span className="text-zinc-500">[INTERRUPTER C // DETERMINISTIC ESCROW BOUND]</span>
            <span className="text-amber-500 font-semibold">T_MAX LOCKED ➔ 100% REASONING GUARANTEE</span>
          </div>
          <div className="xray-scrambled overflow-hidden rounded-xl">
            <Inline03TmaxCurve />
          </div>
        </div>
      </div>

      {/* 4. LIVE TELEMETRY TERMINAL MATRIX */}
      <GriflanTelemetryHUD />

      {/* 5. ARCHITECTURAL SEGMENTED FOOTER */}
      <footer className="w-full border-t border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#06070a]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs font-mono">
            {/* Col 1: Monogram & Philosophy */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-zinc-950 dark:text-white text-sm">
                <ShunyaLogo size={24} showWordmark={true} />
                <span className="text-zinc-400 font-normal">/ LABS</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-[11px]">
                Cryptographic zero-knowledge inference exchange built on HashKey Horizon L2.
                Verifiable computation without trusting host hypervisors.
              </p>
            </div>

            {/* Col 2: Navigation Surfaces */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">
                APPLICATION SURFACES
              </div>
              <ul className="space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <li>
                  <Link
                    href="/buyer"
                    onMouseEnter={() => playHoverSound()}
                    className="hover:text-cyan-500 transition"
                  >
                    → Buyer Studio (Inference Client)
                  </Link>
                </li>
                <li>
                  <Link
                    href="/seller"
                    onMouseEnter={() => playHoverSound()}
                    className="hover:text-cyan-500 transition"
                  >
                    → Seller Hub (Node Provider)
                  </Link>
                </li>
                <li>
                  <Link
                    href="/marketplace"
                    onMouseEnter={() => playHoverSound()}
                    className="hover:text-cyan-500 transition"
                  >
                    → Orderbook & Matrix
                  </Link>
                </li>
                <li>
                  <Link
                    href="/payout"
                    onMouseEnter={() => playHoverSound()}
                    className="hover:text-cyan-500 transition"
                  >
                    → Universal Sweeper & Payout
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Protocol Infrastructure */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">
                INFRASTRUCTURE SPEC
              </div>
              <div className="space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                <div>Settlement: HashKey Horizon (133)</div>
                <div>Standard: HSP Streaming Rails</div>
                <div>Enclave: AMD SEV-SNP (PCR0)</div>
                <div>Proof: World ID Iris Nullifier</div>
                <div>Resolver: CCIP-Read Offscreen Anon-RPC</div>
              </div>
            </div>

            {/* Col 4: Operations & Telemetry */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">OPERATIONS</div>
              <div className="space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>ALL ENCLAVES HEALTHY</span>
                </div>
                <div>Build: #35100412-STAGING</div>
                <div>License: MIT Open Research</div>
                <div className="pt-2">
                  <Link
                    href="/"
                    onMouseEnter={() => playHoverSound()}
                    className="text-cyan-600 dark:text-cyan-400 underline underline-offset-4"
                  >
                    Return to Standard Dashboard →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between text-[10px] font-mono text-zinc-400">
            <div>© 2026 SHUNYAGRID LABS. ALL RIGHTS RESERVED.</div>
            <div>INSPIRED BY GRIFLAN LABS // AWWWARDS EXCELLENCE</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

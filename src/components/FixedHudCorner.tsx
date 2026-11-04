"use client";

import React from "react";
import Link from "next/link";
import { ShunyaLogoLockup } from "@/components/svg/ShunyaSvgAssets";
import { useXray } from "@/context/XrayContext";
import { playClickSound, playHoverSound } from "@/utils/griflanAudio";
import { Eye, EyeOff } from "lucide-react";

export default function FixedHudCorner() {
  const { hostXrayMode, toggleHostXrayMode } = useXray();

  const handleScrollTop = (e: React.MouseEvent) => {
    e.preventDefault();
    playClickSound();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed top-3 left-4 z-40 hidden lg:flex items-center gap-2 select-none">
      <button
        onClick={handleScrollTop}
        onMouseEnter={() => playHoverSound()}
        className="px-2.5 py-1 rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-md hover:border-amber-500/40 transition shadow-sm group"
        title="Reset / Scroll to Hero Top"
      >
        <ShunyaLogoLockup height={28} showBadges={false} />
      </button>

      {/* Host X-Ray Toggle Button */}
      <button
        onClick={() => {
          toggleHostXrayMode();
          playClickSound();
        }}
        onMouseEnter={() => playHoverSound()}
        className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold tracking-wider uppercase transition flex items-center gap-1.5 backdrop-blur-md shadow-sm ${
          hostXrayMode
            ? "bg-rose-500/20 border-rose-500/60 text-rose-600 dark:text-rose-400 animate-pulse"
            : "bg-white/70 dark:bg-black/70 border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
        }`}
        title="Toggle Host Memory X-Ray Inspection Mode"
      >
        {hostXrayMode ? (
          <>
            <EyeOff className="w-3 h-3 text-rose-500" />
            <span>X-RAY: [ON]</span>
          </>
        ) : (
          <>
            <Eye className="w-3 h-3 text-emerald-500" />
            <span>X-RAY: [OFF]</span>
          </>
        )}
      </button>
    </div>
  );
}

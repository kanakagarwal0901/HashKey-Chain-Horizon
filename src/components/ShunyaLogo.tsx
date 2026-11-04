"use client";

import React from "react";
import { ShunyaLogoMark } from "@/components/svg/ShunyaSvgAssets";

export interface ShunyaLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero" | number;
  showWordmark?: boolean;
  animated?: boolean;
  className?: string;
  badgeText?: string;
  pulseEmerald?: boolean;
  monochrome?: boolean;
}

export default function ShunyaLogo({
  size = "md",
  showWordmark = false,
  animated = true,
  className = "",
  badgeText,
  pulseEmerald = false,
  monochrome = false,
}: ShunyaLogoProps) {
  // Determine pixel size based on size variant or numeric value
  const pixelSize =
    typeof size === "number"
      ? size
      : {
          xs: 20,
          sm: 28,
          md: 36,
          lg: 48,
          xl: 64,
          hero: 96,
        }[size] || 36;

  return (
    <div
      className={`inline-flex items-center gap-3 select-none group/logo ${className}`}
      role="img"
      aria-label="ShunyaGrid • Zero-Cutoff Confidential AI Exchange"
    >
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform duration-300 ease-out group-hover/logo:scale-105"
        style={{ width: pixelSize, height: pixelSize }}
      >
        <ShunyaLogoMark
          size={pixelSize}
          animated={animated}
          pulseEmerald={pulseEmerald}
          monochrome={monochrome}
        />
      </div>

      {/* Brand Wordmark & Telemetry Sub-labels */}
      {showWordmark && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base sm:text-lg tracking-wider text-zinc-950 dark:text-white leading-tight font-sans">
              SHUNYAGRID
            </span>
            {badgeText && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                {badgeText}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            <span className="text-amber-500 font-semibold">SEV-SNP</span>
            <span>•</span>
            <span className="text-cyan-500 font-semibold">CHAIN 133</span>
            <span>•</span>
            <span className="text-emerald-500 font-semibold">0% LEAKAGE</span>
          </div>
        </div>
      )}
    </div>
  );
}

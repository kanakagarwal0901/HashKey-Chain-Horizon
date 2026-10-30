"use client";

import React from "react";

export interface ShunyaLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero" | number;
  showWordmark?: boolean;
  animated?: boolean;
  className?: string;
  badgeText?: string;
  variant?: "monolith" | "minimal";
}

export default function ShunyaLogo({
  size = "md",
  showWordmark = false,
  animated = true,
  className = "",
  badgeText,
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
        <svg
          viewBox="0 0 100 100"
          width={pixelSize}
          height={pixelSize}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible"
        >
          <title>ShunyaGrid Protocol Monolith</title>
          <desc>
            Sculptural mathematical Zero and S-Cipher Monolith with central confidential TEE singularity.
          </desc>

          <defs>
            {/* Primary Quantum Teal-to-Emerald Gradient */}
            <linearGradient id="sg-zenith-beam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F2FE" />
              <stop offset="60%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Deep Foundation Facet Gradient */}
            <linearGradient id="sg-nadir-vault" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="40%" stopColor="#059669" />
              <stop offset="100%" stopColor="#022C22" />
            </linearGradient>

            {/* Central TEE Singularity Plasma */}
            <radialGradient id="sg-singularity-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#00F2FE" stopOpacity="0.95" />
              <stop offset="75%" stopColor="#10B981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>

            {/* Specular Caustic Reflection (Taste-Skill One Signature Move) */}
            <linearGradient id="sg-caustic-glint" x1="-100%" y1="0%" x2="200%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#00F2FE" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>

            {/* Atmospheric Core Blur */}
            <filter id="sg-core-flare" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Scoped CSS Animations: Tactile, Physical, High-Taste */}
          <style>{`
            @keyframes sg-glint-pass {
              0% { transform: translateX(-120%); }
              50%, 100% { transform: translateX(120%); }
            }
            @keyframes sg-singularity-pulse {
              0%, 100% { transform: scale(0.94); opacity: 0.85; }
              50% { transform: scale(1.1); opacity: 1; }
            }
            @keyframes sg-subtle-drift {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-1.5px); }
            }

            .sg-anim-glint {
              ${animated ? "animation: sg-glint-pass 5s ease-in-out infinite;" : ""}
            }
            .group-hover\\/logo .sg-anim-glint {
              animation-duration: 2.5s;
            }

            .sg-anim-core {
              transform-origin: 50px 50px;
              ${animated ? "animation: sg-singularity-pulse 3.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;" : ""}
            }

            .sg-anim-float {
              ${animated ? "animation: sg-subtle-drift 4s ease-in-out infinite;" : ""}
            }

            @media (prefers-reduced-motion: reduce) {
              .sg-anim-glint,
              .sg-anim-core,
              .sg-anim-float {
                animation: none !important;
              }
            }
          `}</style>

          {/* LAYER 0: Substrate Grounding Bevel */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="24"
            className="fill-zinc-100/90 dark:fill-[#0A0D14] stroke-black/[0.08] dark:stroke-white/[0.12] transition-colors"
            strokeWidth="1"
          />

          {/* Subtle Precision Grid Alignment Guides */}
          <path
            d="M 50 10 L 50 16 M 50 84 L 50 90 M 10 50 L 16 50 M 84 50 L 90 50"
            stroke="currentColor"
            strokeWidth="1"
            className="text-zinc-300 dark:text-zinc-700 opacity-40"
          />

          {/* LAYER 1: The Shunya Architectural Monolith */}
          <g className="sg-anim-float">
            {/* Upper Interlocking Shell (S-0 Arc: The Cryptographic Zenith) */}
            <path
              d="M 28 48 C 28 32 38 18 54 18 C 72 18 82 30 82 46 C 82 54 77 60 70 63 L 58 51 C 61 48 64 45 64 42 C 64 34 58 29 52 29 C 43 29 39 36 39 44 C 39 48 42 52 48 55 L 40 63 C 32 58 28 53 28 48 Z"
              fill="url(#sg-zenith-beam)"
              className="dark:opacity-100 opacity-95 transition-opacity"
            />

            {/* Lower Interlocking Shell (S-0 Arc: The HashKey Settlement Nadir) */}
            <path
              d="M 72 52 C 72 68 62 82 46 82 C 28 82 18 70 18 54 C 18 46 23 40 30 37 L 42 49 C 39 52 36 55 36 58 C 36 66 42 71 48 71 C 57 71 61 64 61 56 C 61 52 58 48 52 45 L 60 37 C 68 42 72 47 72 52 Z"
              fill="url(#sg-nadir-vault)"
              className="dark:opacity-100 opacity-95 transition-opacity"
            />

            {/* Specular Light-Sweep Shimmer Over Monolith */}
            <g clipPath="url(#sg-monolith-clip)">
              <rect
                x="-100"
                y="0"
                width="300"
                height="100"
                fill="url(#sg-caustic-glint)"
                className="sg-anim-glint pointer-events-none"
              />
            </g>

            {/* Clip path definition for the specular shimmer */}
            <clipPath id="sg-monolith-clip">
              <path d="M 28 48 C 28 32 38 18 54 18 C 72 18 82 30 82 46 C 82 54 77 60 70 63 L 58 51 C 61 48 64 45 64 42 C 64 34 58 29 52 29 C 43 29 39 36 39 44 C 39 48 42 52 48 55 L 40 63 C 32 58 28 53 28 48 Z M 72 52 C 72 68 62 82 46 82 C 28 82 18 70 18 54 C 18 46 23 40 30 37 L 42 49 C 39 52 36 55 36 58 C 36 66 42 71 48 71 C 57 71 61 64 61 56 C 61 52 58 48 52 45 L 60 37 C 68 42 72 47 72 52 Z" />
            </clipPath>

            {/* LAYER 2: Central Suspended TEE Singularity (The Shunya Void Core) */}
            <g className="sg-anim-core">
              {/* Outer Core Aura */}
              <circle
                cx="50"
                cy="50"
                r="10"
                fill="url(#sg-singularity-glow)"
                filter="url(#sg-core-flare)"
                className="opacity-70 dark:opacity-90"
              />

              {/* Silicon Crystalline Die (The Hardware Enclave) */}
              <polygon
                points="50,44 56,50 50,56 44,50"
                fill="url(#sg-zenith-beam)"
                stroke="#FFFFFF"
                strokeWidth="0.8"
                className="drop-shadow-[0_0_6px_rgba(0,242,254,0.8)]"
              />

              {/* Absolute Center Photon */}
              <circle cx="50" cy="50" r="1.5" fill="#FFFFFF" />
            </g>
          </g>
        </svg>
      </div>

      {/* Swiss Neo-Grotesk Wordmark (Taste-Skill Strict Layout) */}
      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-950 dark:text-white leading-tight font-sans">
              Shunya<span className="text-emerald-500 dark:text-emerald-400">Grid</span>
            </span>
            {badgeText && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {badgeText}
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-normal tracking-normal text-zinc-500 dark:text-zinc-400">
            Confidential AI Exchange
          </span>
        </div>
      )}
    </div>
  );
}

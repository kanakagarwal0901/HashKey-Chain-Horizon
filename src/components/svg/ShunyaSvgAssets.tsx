"use client";

import React from "react";

// ==========================================
// 1. LOGO SYSTEM ASSETS
// ==========================================

export interface SvgProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
  width?: number | string;
  height?: number | string;
}

export interface ShunyaLogoMarkProps extends SvgProps {
  animated?: boolean;
  pulseEmerald?: boolean;
  monochrome?: boolean;
  opacity?: number;
}

/**
 * Asset 01: ShunyaLogoMark.svg
 * Icon Mark — Used for Favicon, Preloader, Input Bar & Watermarks
 * Fuses ancient mathematical zero (Shunya) with AMD SEV-SNP silicon architecture
 */
export function ShunyaLogoMark({
  size = 48,
  className = "",
  animated = false,
  pulseEmerald = false,
  monochrome = false,
  opacity = 1,
  ...props
}: ShunyaLogoMarkProps) {
  const goldColor = monochrome ? "currentColor" : "url(#shunyaGold)";
  const emeraldColor = monochrome ? "currentColor" : "url(#cipherEmerald)";
  const cyanColor = monochrome ? "currentColor" : "#06B6D4";
  const pinColor = monochrome ? "currentColor" : "#EAB308";
  const apertureStroke = monochrome ? "currentColor" : "#F3F4F6";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      className={`transition-all duration-300 ${pulseEmerald ? "animate-pulse" : ""} ${className}`}
      style={{ opacity, ...props.style }}
      {...props}
    >
      <defs>
        <linearGradient id="shunyaGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#A16207" />
        </linearGradient>
        <linearGradient id="cipherEmerald" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <filter id="enclaveGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Silicon Die Pins (8 Hardware Attestation Pins) */}
      <g
        stroke={pinColor}
        strokeWidth="2.5"
        strokeLinecap="square"
        opacity="0.85"
        className={animated ? "origin-center animate-[spin_12s_linear_infinite]" : ""}
      >
        <line x1="42" y1="6" x2="42" y2="16" />
        <line x1="78" y1="6" x2="78" y2="16" />
        <line x1="42" y1="104" x2="42" y2="114" />
        <line x1="78" y1="104" x2="78" y2="114" />
        <line x1="6" y1="42" x2="16" y2="42" />
        <line x1="6" y1="78" x2="16" y2="78" />
        <line x1="104" y1="42" x2="114" y2="42" />
        <line x1="104" y1="78" x2="114" y2="78" />
      </g>

      {/* Octagonal AMD SEV-SNP Enclave Housing */}
      <polygon
        points="36,16 84,16 104,36 104,84 84,104 36,104 16,84 16,36"
        fill="#060709"
        stroke={goldColor}
        strokeWidth="3"
      />

      {/* Inner Hardware Isolation Perimeter (Dashed TEE Boundary) */}
      <polygon
        points="40,23 80,23 97,40 97,80 80,97 40,97 23,80 23,40"
        fill="none"
        stroke={pinColor}
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0.5"
      />

      {/* The Shunya (Zero) Geometric Aperture */}
      <rect
        x="38"
        y="31"
        width="44"
        height="58"
        rx="22"
        fill="#0B0F17"
        stroke={apertureStroke}
        strokeWidth="6"
      />

      {/* RSA-OAEP Diagonal Cipher Laser Slash */}
      <line
        x1="28"
        y1="88"
        x2="92"
        y2="32"
        stroke={emeraldColor}
        strokeWidth="4.5"
        strokeLinecap="round"
        filter="url(#enclaveGlow)"
      />

      {/* Central Horizon L2 (Chain ID 133) Pulse Core */}
      <circle cx="60" cy="60" r="6" fill={cyanColor} filter="url(#enclaveGlow)">
        {animated && (
          <>
            <animate attributeName="r" values="4.5;7;4.5" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2.4s" repeatCount="indefinite" />
          </>
        )}
      </circle>

      {/* Corner Silicon Alignment Micro-Crosses */}
      <path
        d="M26,38 H30 M28,36 V40 M90,38 H94 M92,36 V40 M26,82 H30 M28,80 V84 M90,82 H94 M92,80 V84"
        stroke={pinColor}
        strokeWidth="1.2"
        opacity="0.7"
      />
    </svg>
  );
}

export interface ShunyaLogoLockupProps extends SvgProps {
  height?: number | string;
  showBadges?: boolean;
}

/**
 * Asset 02: ShunyaLogoLockup.svg
 * Horizontal Brand Lockup — Use for Top-Left HUD & Header/Footer
 */
export function ShunyaLogoLockup({
  height = 36,
  className = "",
  showBadges = true,
  ...props
}: ShunyaLogoLockupProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 80"
      height={height}
      fill="none"
      className={`transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Embedded Icon Mark Scaled Left */}
      <g transform="translate(4, 4) scale(0.6)">
        <g stroke="#EAB308" strokeWidth="2.5" strokeLinecap="square">
          <line x1="42" y1="6" x2="42" y2="16" />
          <line x1="78" y1="6" x2="78" y2="16" />
          <line x1="42" y1="104" x2="42" y2="114" />
          <line x1="78" y1="104" x2="78" y2="114" />
          <line x1="6" y1="42" x2="16" y2="42" />
          <line x1="6" y1="78" x2="16" y2="78" />
          <line x1="104" y1="42" x2="114" y2="42" />
          <line x1="104" y1="78" x2="114" y2="78" />
        </g>
        <polygon
          points="36,16 84,16 104,36 104,84 84,104 36,104 16,84 16,36"
          fill="#060709"
          stroke="#EAB308"
          strokeWidth="3.5"
        />
        <rect
          x="38"
          y="31"
          width="44"
          height="58"
          rx="22"
          fill="#0B0F17"
          stroke="#F3F4F6"
          strokeWidth="6.5"
        />
        <line
          x1="28"
          y1="88"
          x2="92"
          y2="32"
          stroke="#10B981"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="60" cy="60" r="6" fill="#06B6D4" />
      </g>

      {/* Brand Wordmark: SHUNYAGRID */}
      <text
        x="88"
        y="43"
        fill="currentColor"
        className="text-zinc-950 dark:text-zinc-100"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Space Grotesk', 'Syne', sans-serif"
        fontSize="28"
        fontWeight="800"
        letterSpacing="3.5"
      >
        SHUNYAGRID
      </text>

      {/* Monospace Telemetry Sub-Labels */}
      {showBadges && (
        <>
          <rect
            x="88"
            y="52"
            width="68"
            height="16"
            rx="2"
            fill="#EAB308"
            fillOpacity="0.15"
            stroke="#EAB308"
            strokeWidth="0.8"
          />
          <text
            x="95"
            y="63"
            fill="#EAB308"
            fontFamily="'JetBrains Mono', ui-monospace, monospace"
            fontSize="9.5"
            fontWeight="700"
            letterSpacing="1.2"
          >
            SEV-SNP
          </text>

          <rect
            x="162"
            y="52"
            width="96"
            height="16"
            rx="2"
            fill="#06B6D4"
            fillOpacity="0.15"
            stroke="#06B6D4"
            strokeWidth="0.8"
          />
          <text
            x="169"
            y="63"
            fill="#06B6D4"
            fontFamily="'JetBrains Mono', ui-monospace, monospace"
            fontSize="9.5"
            fontWeight="700"
            letterSpacing="1.2"
          >
            CHAIN ID 133
          </text>

          <rect
            x="264"
            y="52"
            width="84"
            height="16"
            rx="2"
            fill="#10B981"
            fillOpacity="0.15"
            stroke="#10B981"
            strokeWidth="0.8"
          />
          <text
            x="271"
            y="63"
            fill="#10B981"
            fontFamily="'JetBrains Mono', ui-monospace, monospace"
            fontSize="9.5"
            fontWeight="700"
            letterSpacing="1.2"
          >
            0% LEAKAGE
          </text>
        </>
      )}
    </svg>
  );
}

// ==========================================
// 2. YUUSUKE.WORK SHOWCASE PICTURE CARDS (1 to 6)
// ==========================================

/**
 * Picture Card 01 SVG: Card01_SevSnpBlackBox.svg
 * Title: SEV-SNP BLACK BOX — CHAIN 133
 * Concept: Hostile red server probes striking golden AMD SEV-SNP enclave perimeter and shattering
 */
export function Card01SevSnp({ className = "", ...props }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 500"
      width="100%"
      height="100%"
      fill="none"
      className={`w-full h-auto select-none ${className}`}
      {...props}
    >
      <rect width="800" height="500" fill="#060709" rx="8" />

      {/* Subtle Cyber Brutalist Grid */}
      <g stroke="#1E293B" strokeWidth="0.7" opacity="0.45">
        <line x1="0" y1="100" x2="800" y2="100" />
        <line x1="0" y1="250" x2="800" y2="250" />
        <line x1="0" y1="400" x2="800" y2="400" />
        <line x1="160" y1="0" x2="160" y2="500" />
        <line x1="400" y1="0" x2="400" y2="500" />
        <line x1="640" y1="0" x2="640" y2="500" />
      </g>

      {/* Outer Hostile "Rusted Cloud GPU Host" Perimeter (Oxide Red) */}
      <rect
        x="40"
        y="40"
        width="720"
        height="420"
        rx="6"
        fill="none"
        stroke="#DC2626"
        strokeWidth="1.5"
        strokeDasharray="8 6"
        opacity="0.6"
      />
      <text
        x="58"
        y="68"
        fill="#DC2626"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        letterSpacing="1.5"
      >
        UNTRUSTED CLOUD GPU HOST ENVIRONMENT // ROOT SNOOPING ACTIVE
      </text>

      {/* Hostile Red Laser Inspection Probes Shattering on Enclave Wall */}
      <g stroke="#DC2626" strokeWidth="2.5">
        <line x1="60" y1="170" x2="235" y2="210" strokeDasharray="6 4">
          <animate
            attributeName="stroke-dashoffset"
            from="20"
            to="0"
            dur="1s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="60" y1="330" x2="235" y2="290" strokeDasharray="6 4">
          <animate
            attributeName="stroke-dashoffset"
            from="20"
            to="0"
            dur="1s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="740" y1="250" x2="565" y2="250" strokeDasharray="6 4">
          <animate
            attributeName="stroke-dashoffset"
            from="20"
            to="0"
            dur="1s"
            repeatCount="indefinite"
          />
        </line>
      </g>

      {/* Shatter Impact Sparks & Denied Labels */}
      <circle cx="240" cy="210" r="8" fill="#DC2626" opacity="0.8" />
      <circle cx="240" cy="290" r="8" fill="#DC2626" opacity="0.8" />
      <circle cx="560" cy="250" r="8" fill="#DC2626" opacity="0.8" />
      <text
        x="65"
        y="155"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        PROBE: HYPERVISOR_DUMP() ➔ BLOCKED [0x00]
      </text>
      <text
        x="65"
        y="355"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        PROBE: COLD_BOOT_SCAN() ➔ CIPHERTEXT ONLY
      </text>
      <text
        x="575"
        y="235"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        ROOT ADMIN: 0% VISIBILITY
      </text>

      {/* Central Hardware-Isolated AMD SEV-SNP Golden Silicon Enclave */}
      <g transform="translate(240, 115)">
        {/* Gold Silicon Pins */}
        <g stroke="#EAB308" strokeWidth="3">
          <line x1="40" y1="-12" x2="40" y2="0" />
          <line x1="100" y1="-12" x2="100" y2="0" />
          <line x1="160" y1="-12" x2="160" y2="0" />
          <line x1="220" y1="-12" x2="220" y2="0" />
          <line x1="280" y1="-12" x2="280" y2="0" />
          <line x1="40" y1="270" x2="40" y2="282" />
          <line x1="100" y1="270" x2="100" y2="282" />
          <line x1="160" y1="270" x2="160" y2="282" />
          <line x1="220" y1="270" x2="220" y2="282" />
          <line x1="280" y1="270" x2="280" y2="282" />
        </g>

        {/* Armored Enclave Box */}
        <rect
          x="0"
          y="0"
          width="320"
          height="270"
          rx="10"
          fill="#0B0F19"
          stroke="#EAB308"
          strokeWidth="3.5"
        />
        <rect
          x="12"
          y="12"
          width="296"
          height="246"
          rx="6"
          fill="#060709"
          stroke="#EAB308"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.7"
        />

        {/* Enclave Header Stamp */}
        <rect x="24" y="24" width="272" height="28" rx="4" fill="#EAB308" fillOpacity="0.12" />
        <text
          x="36"
          y="42"
          fill="#EAB308"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="11"
          fontWeight="700"
        >
          AMD SEV-SNP TEE ENCLAVE [ATTESTED]
        </text>

        {/* Untouched White/Cyan Neural Inference Core */}
        <g stroke="#06B6D4" strokeWidth="2" opacity="0.9">
          <line x1="70" y1="135" x2="155" y2="95" />
          <line x1="70" y1="135" x2="155" y2="175" />
          <line x1="155" y1="95" x2="250" y2="135" />
          <line x1="155" y1="175" x2="250" y2="135" />
          <line x1="70" y1="135" x2="250" y2="135" stroke="#F3F4F6" strokeWidth="2.5" />
        </g>
        <circle cx="70" cy="135" r="9" fill="#10B981" />
        <circle cx="155" cy="95" r="8" fill="#06B6D4" />
        <circle cx="155" cy="175" r="8" fill="#06B6D4" />
        <circle cx="250" cy="135" r="11" fill="#F3F4F6">
          <animate attributeName="r" values="9;13;9" dur="2s" repeatCount="indefinite" />
        </circle>

        <text
          x="48"
          y="220"
          fill="#F3F4F6"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="11"
        >
          AES-128 HARDWARE MEMORY ENCRYPTION
        </text>
        <text
          x="68"
          y="240"
          fill="#10B981"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="11"
          fontWeight="700"
        >
          DATA BLINDNESS: 100.00% GUARANTEED
        </text>
      </g>
    </svg>
  );
}

/**
 * Picture Card 02 SVG: Card02_RsaOaepPrism.svg
 * Title: RSA-OAEP PRISM — 2048-BIT
 * Concept: An optical browser prism refracting plaintext prompt into emerald RSA-OAEP ciphertext
 */
export function Card02RsaPrism({ className = "", ...props }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 500"
      width="100%"
      height="100%"
      fill="none"
      className={`w-full h-auto select-none ${className}`}
      {...props}
    >
      <rect width="800" height="500" fill="#060709" rx="8" />

      {/* Left Zone: Client Browser DOM (Plaintext Input) */}
      <rect
        x="35"
        y="70"
        width="240"
        height="360"
        rx="6"
        fill="#0B0F17"
        stroke="#334155"
        strokeWidth="1.5"
      />
      <text
        x="55"
        y="102"
        fill="#94A3B8"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
      >
        LOCAL BROWSER DOM (CLIENT)
      </text>
      <rect
        x="55"
        y="185"
        width="200"
        height="90"
        rx="4"
        fill="#111827"
        stroke="#F3F4F6"
        strokeWidth="1.2"
      />
      <text
        x="68"
        y="215"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
      >
        &quot;Audit zero-day exploit
      </text>
      <text
        x="68"
        y="235"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
      >
        in Vault.sol before
      </text>
      <text
        x="68"
        y="255"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
      >
        mainnet deploy...&quot;
      </text>

      {/* Plaintext White Beam Entering Prism */}
      <line x1="255" y1="230" x2="365" y2="250" stroke="#F3F4F6" strokeWidth="5" />

      {/* Center: Crystalline Optical RSA-OAEP Browser Prism */}
      <polygon
        points="400,95 310,365 490,365"
        fill="#10B981"
        fillOpacity="0.12"
        stroke="#10B981"
        strokeWidth="3"
      />
      <polygon
        points="400,130 335,345 465,345"
        fill="none"
        stroke="#EAB308"
        strokeWidth="1.2"
        strokeDasharray="4 4"
      />
      <text
        x="332"
        y="395"
        fill="#EAB308"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
        fontWeight="700"
      >
        RSA-OAEP 2048-BIT PRISM
      </text>
      <text
        x="315"
        y="415"
        fill="#94A3B8"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        WebCrypto API • SHA-256 OAEP Padding
      </text>

      {/* Right Zone: Refracted Emerald Ciphertext Streams Exiting Toward Network */}
      <g stroke="#10B981" strokeWidth="2.5">
        <line x1="435" y1="205" x2="755" y2="135" strokeDasharray="10 5">
          <animate
            attributeName="stroke-dashoffset"
            from="30"
            to="0"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="450" y1="250" x2="755" y2="250" strokeWidth="3.5" strokeDasharray="12 4">
          <animate
            attributeName="stroke-dashoffset"
            from="32"
            to="0"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="465" y1="295" x2="755" y2="365" strokeDasharray="10 5">
          <animate
            attributeName="stroke-dashoffset"
            from="30"
            to="0"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </line>
      </g>

      {/* Floating Encrypted Hexadecimal Blocks on the Right */}
      <rect
        x="525"
        y="105"
        width="225"
        height="44"
        rx="4"
        fill="#06281E"
        stroke="#10B981"
        strokeWidth="1.5"
      />
      <text
        x="538"
        y="132"
        fill="#34D399"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
        fontWeight="700"
      >
        0x8F9AC411...E7B2 [SEALED]
      </text>

      <rect
        x="525"
        y="228"
        width="225"
        height="44"
        rx="4"
        fill="#06281E"
        stroke="#10B981"
        strokeWidth="1.5"
      />
      <text
        x="538"
        y="255"
        fill="#34D399"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
        fontWeight="700"
      >
        0x3D09F18A...99C0 [SEALED]
      </text>

      <rect
        x="525"
        y="345"
        width="225"
        height="44"
        rx="4"
        fill="#06281E"
        stroke="#10B981"
        strokeWidth="1.5"
      />
      <text
        x="538"
        y="372"
        fill="#34D399"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
        fontWeight="700"
      >
        0xC17E440B...12FA [SEALED]
      </text>

      <text
        x="515"
        y="78"
        fill="#10B981"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
      >
        NETWORK TRANSIT (0% PLAINTEXT PACKETS)
      </text>
    </svg>
  );
}

/**
 * Picture Card 03 SVG: Card03_TmaxSanctuary.svg
 * Title: T_MAX SANCTUARY — DETERMINISTIC
 * Concept: Legacy out-of-gas cutoff guillotine blade vs golden ShunyaGrid T_max sanctuary
 */
export function Card03TmaxSanctuary({ className = "", ...props }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 500"
      width="100%"
      height="100%"
      fill="none"
      className={`w-full h-auto select-none ${className}`}
      {...props}
    >
      <rect width="800" height="500" fill="#060709" rx="8" />

      {/* TOP ZONE: Legacy AI Compute (Red Mid-Thought Cutoff Failure) */}
      <rect
        x="40"
        y="35"
        width="720"
        height="175"
        rx="6"
        fill="#140708"
        stroke="#7F1D1D"
        strokeWidth="1.5"
      />
      <text
        x="60"
        y="65"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        LEGACY METERED AI: UNPREDICTABLE &lt;think&gt; EXPANSION FAILURE
      </text>

      {/* Legacy Reasoning Chain Severed at x=470 */}
      <g stroke="#EF4444" strokeWidth="2.5">
        <line x1="80" y1="130" x2="190" y2="130" />
        <line x1="190" y1="130" x2="310" y2="105" />
        <line x1="190" y1="130" x2="310" y2="155" />
        <line x1="310" y1="105" x2="450" y2="130" />
        <line x1="310" y1="155" x2="450" y2="130" />
      </g>
      <circle cx="80" cy="130" r="7" fill="#EF4444" />
      <circle cx="190" cy="130" r="7" fill="#EF4444" />
      <circle cx="310" cy="105" r="7" fill="#EF4444" />
      <circle cx="310" cy="155" r="7" fill="#EF4444" />

      {/* The Guillotine Cutoff Blade */}
      <line
        x1="470"
        y1="45"
        x2="470"
        y2="195"
        stroke="#DC2626"
        strokeWidth="4"
        strokeDasharray="6 3"
      />
      <rect
        x="488"
        y="102"
        width="245"
        height="52"
        rx="4"
        fill="#450A0A"
        stroke="#DC2626"
        strokeWidth="1.5"
      />
      <text
        x="502"
        y="125"
        fill="#FCA5A5"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        ERR_OUT_OF_GAS_MID_THOUGHT
      </text>
      <text
        x="502"
        y="143"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        Reasoning aborted at token 8,192
      </text>

      {/* BOTTOM ZONE: ShunyaGrid Deterministic T_max Sanctuary (Gold & Cyan) */}
      <rect
        x="40"
        y="235"
        width="720"
        height="230"
        rx="8"
        fill="#0B111E"
        stroke="#EAB308"
        strokeWidth="2.5"
      />
      <rect x="52" y="247" width="696" height="32" rx="4" fill="#EAB308" fillOpacity="0.15" />
      <text
        x="68"
        y="268"
        fill="#EAB308"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
        fontWeight="700"
      >
        SHUNYAGRID T_MAX CEILING LOCKED ON-CHAIN (CLAUDE 3.7 • DEEPSEEK R1 • o3-MINI)
      </text>

      {/* Complete Unbroken Neural Reasoning Tree Inside Golden Sanctuary */}
      <g stroke="#06B6D4" strokeWidth="2.5">
        <line x1="80" y1="360" x2="180" y2="320" />
        <line x1="80" y1="360" x2="180" y2="400" />
        <line x1="180" y1="320" x2="310" y2="300" />
        <line x1="180" y1="320" x2="310" y2="360" />
        <line x1="180" y1="400" x2="310" y2="360" />
        <line x1="180" y1="400" x2="310" y2="420" />
        <line x1="310" y1="300" x2="460" y2="330" />
        <line x1="310" y1="360" x2="460" y2="330" />
        <line x1="310" y1="360" x2="460" y2="390" />
        <line x1="310" y1="420" x2="460" y2="390" />
        <line x1="460" y1="330" x2="620" y2="360" stroke="#EAB308" strokeWidth="3.5" />
        <line x1="460" y1="390" x2="620" y2="360" stroke="#EAB308" strokeWidth="3.5" />
      </g>

      {/* Reasoning Nodes */}
      <circle cx="80" cy="360" r="8" fill="#10B981" />
      <circle cx="180" cy="320" r="7" fill="#06B6D4" />
      <circle cx="180" cy="400" r="7" fill="#06B6D4" />
      <circle cx="310" cy="300" r="7" fill="#06B6D4" />
      <circle cx="310" cy="360" r="8" fill="#F3F4F6" />
      <circle cx="310" cy="420" r="7" fill="#06B6D4" />
      <circle cx="460" cy="330" r="8" fill="#EAB308" />
      <circle cx="460" cy="390" r="8" fill="#EAB308" />

      {/* Final Sovereign Conclusion Node */}
      <circle cx="620" cy="360" r="14" fill="#10B981" stroke="#F3F4F6" strokeWidth="3">
        <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite" />
      </circle>
      <text
        x="648"
        y="355"
        fill="#10B981"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        THOUGHT
      </text>
      <text
        x="648"
        y="372"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        COMPLETE
      </text>
      <text
        x="68"
        y="448"
        fill="#94A3B8"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        MATHEMATICAL GUARANTEE: Escrow(T_max) &gt;= Actual(&lt;think&gt; + Output) ➔ 0% Truncation
      </text>
    </svg>
  );
}

/**
 * Picture Card 04 SVG: Card04_HspStreamPulse.svg
 * Title: HSP STREAM PULSE — Δt < 1.0s
 * Concept: Autonomous Agent-to-Agent micropayment streaming on HashKey Chain Horizon L2 (133)
 */
export function Card04HspPulse({ className = "", ...props }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 500"
      width="100%"
      height="100%"
      fill="none"
      className={`w-full h-auto select-none ${className}`}
      {...props}
    >
      <rect width="800" height="500" fill="#060709" rx="8" />

      {/* Top Header Banner */}
      <text
        x="50"
        y="55"
        fill="#06B6D4"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
        fontWeight="700"
        letterSpacing="1.5"
      >
        HASHKEY SETTLEMENT PROTOCOL (HSP) // HORIZON L2 (CHAIN ID 133)
      </text>

      {/* Left Node: Requesting Autonomous AI Agent */}
      <g transform="translate(50, 145)">
        <rect
          x="0"
          y="0"
          width="180"
          height="210"
          rx="8"
          fill="#0B0F19"
          stroke="#F3F4F6"
          strokeWidth="2"
        />
        <circle cx="90" cy="85" r="36" fill="#111827" stroke="#06B6D4" strokeWidth="2.5" />
        <circle cx="90" cy="85" r="12" fill="#06B6D4" />
        <text
          x="28"
          y="155"
          fill="#F3F4F6"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="12"
          fontWeight="700"
        >
          CALLER AGENT
        </text>
        <text
          x="22"
          y="178"
          fill="#10B981"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="10"
        >
          NO API KEY • NO CARD
        </text>
      </g>

      {/* Right Node: SEV-SNP Enclave Compute Provider Agent */}
      <g transform="translate(570, 145)">
        <rect
          x="0"
          y="0"
          width="180"
          height="210"
          rx="8"
          fill="#0B0F19"
          stroke="#EAB308"
          strokeWidth="2.5"
        />
        <polygon
          points="90,45 128,68 128,108 90,130 52,108 52,68"
          fill="#111827"
          stroke="#EAB308"
          strokeWidth="2.5"
        />
        <circle cx="90" cy="88" r="12" fill="#EAB308" />
        <text
          x="24"
          y="155"
          fill="#EAB308"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="12"
          fontWeight="700"
        >
          ENCLAVE NODE
        </text>
        <text
          x="25"
          y="178"
          fill="#94A3B8"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="10"
        >
          AMD SEV-SNP VERIFIED
        </text>
      </g>

      {/* Upper Stream: Forward Gold T_max Ceiling Escrow Lock */}
      <path
        d="M230,205 C340,155 460,155 570,205"
        stroke="#EAB308"
        strokeWidth="4"
        strokeDasharray="10 6"
        fill="none"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="32"
          to="0"
          dur="0.9s"
          repeatCount="indefinite"
        />
      </path>
      <rect
        x="285"
        y="128"
        width="230"
        height="32"
        rx="4"
        fill="#1F1605"
        stroke="#EAB308"
        strokeWidth="1.2"
      />
      <text
        x="298"
        y="148"
        fill="#EAB308"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        1. LOCK T_MAX CEILING ➔
      </text>

      {/* Lower Stream: Reverse Cyan (T_max - T_actual) Instant Refund */}
      <path
        d="M570,295 C460,345 340,345 230,295"
        stroke="#06B6D4"
        strokeWidth="4"
        strokeDasharray="10 6"
        fill="none"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="32"
          dur="0.7s"
          repeatCount="indefinite"
        />
      </path>
      <rect
        x="255"
        y="340"
        width="290"
        height="36"
        rx="4"
        fill="#04242C"
        stroke="#06B6D4"
        strokeWidth="1.5"
      />
      <text
        x="268"
        y="362"
        fill="#22D3EE"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        ⬅ 2. REFUND (T_max − T_actual) IN 0.4s
      </text>

      {/* Center Telemetry Readout */}
      <text
        x="290"
        y="255"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="14"
        fontWeight="700"
      >
        HSP SETTLEMENT: Δt &lt; 1.0s
      </text>
    </svg>
  );
}

/**
 * Picture Card 05 SVG: Card05_SybilAperture.svg
 * Title: SYBIL APERTURE — WORLD ID
 * Concept: Biometric zero-knowledge World ID Iris Aperture blocking red sybil bots
 */
export function Card05SybilAperture({ className = "", ...props }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 500"
      width="100%"
      height="100%"
      fill="none"
      className={`w-full h-auto select-none ${className}`}
      {...props}
    >
      <rect width="800" height="500" fill="#060709" rx="8" />

      {/* Left Perimeter: Red Sybil Bot Swarm Deflected by ZK Barrier */}
      <text
        x="45"
        y="65"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        SYBIL BOTNET SWARM (GPU HOARDERS)
      </text>
      <g stroke="#DC2626" strokeWidth="1.8" fill="#1F0709">
        <polygon points="85,140 115,125 115,155" />
        <polygon points="140,190 170,175 170,205" />
        <polygon points="75,250 105,235 105,265" />
        <polygon points="135,310 165,295 165,325" />
        <polygon points="90,375 120,360 120,390" />
      </g>
      <g stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4 4">
        <line x1="170" y1="190" x2="265" y2="215" />
        <line x1="105" y1="250" x2="265" y2="250" />
        <line x1="165" y1="310" x2="265" y2="285" />
      </g>
      <text
        x="155"
        y="425"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        ✖ REJECTED: NO ZK PERSONHOOD PROOF
      </text>

      {/* Center: World ID Zero-Knowledge Iris Aperture Gate */}
      <g transform="translate(400, 250)">
        <circle cx="0" cy="0" r="135" fill="#081410" stroke="#10B981" strokeWidth="3" />
        <circle
          cx="0"
          cy="0"
          r="105"
          fill="none"
          stroke="#EAB308"
          strokeWidth="1.5"
          strokeDasharray="8 6"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="18s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="0" cy="0" r="68" fill="#060709" stroke="#10B981" strokeWidth="2.5" />

        {/* Iris Blades */}
        <line x1="-95" y1="-45" x2="-45" y2="-15" stroke="#10B981" strokeWidth="2" />
        <line x1="95" y1="-45" x2="45" y2="-15" stroke="#10B981" strokeWidth="2" />
        <line x1="-95" y1="45" x2="-45" y2="15" stroke="#10B981" strokeWidth="2" />
        <line x1="95" y1="45" x2="45" y2="15" stroke="#10B981" strokeWidth="2" />
        <circle cx="0" cy="0" r="24" fill="#10B981" fillOpacity="0.25" stroke="#34D399" strokeWidth="3" />
        <text
          x="-82"
          y="165"
          fill="#10B981"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="12"
          fontWeight="700"
        >
          WORLD ID ZK APERTURE
        </text>
      </g>

      {/* Right Zone: Verified Sovereign Agent Granted Fair Enclave GPU Allocation */}
      <line x1="425" y1="250" x2="665" y2="250" stroke="#10B981" strokeWidth="4" />
      <circle cx="695" cy="250" r="32" fill="#06281E" stroke="#10B981" strokeWidth="3" />
      <text
        x="673"
        y="254"
        fill="#34D399"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        1 HUMAN
      </text>
      <text
        x="545"
        y="195"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        ✓ FAIR GPU ALLOCATION GRANTED
      </text>
      <text
        x="545"
        y="325"
        fill="#94A3B8"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        0 KYC • 0 Emails • Pure ZK Nullifier
      </text>
    </svg>
  );
}

/**
 * Picture Card 06 SVG: Card06_SovereignZero.svg
 * Title: SOVEREIGN ZERO — NO API KEYS
 * Concept: Shattered credit cards and disintegrating centralized API keys beneath golden Shunya [0] seal
 */
export function Card06SovereignZero({ className = "", ...props }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 500"
      width="100%"
      height="100%"
      fill="none"
      className={`w-full h-auto select-none ${className}`}
      {...props}
    >
      <rect width="800" height="500" fill="#060709" rx="8" />

      {/* Left Broken Relic: Shattered Legacy Credit Card */}
      <g transform="translate(65, 290) rotate(-12)">
        <rect
          x="0"
          y="0"
          width="210"
          height="125"
          rx="8"
          fill="#18181B"
          stroke="#DC2626"
          strokeWidth="1.8"
          strokeDasharray="10 4"
        />
        <line x1="0" y1="55" x2="210" y2="75" stroke="#DC2626" strokeWidth="3" />
        <text
          x="18"
          y="38"
          fill="#EF4444"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="11"
        >
          LEGACY BILLING CARD
        </text>
        <text
          x="18"
          y="102"
          fill="#7F1D1D"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="11"
        >
          4000 •••• •••• OBSOLETE
        </text>
      </g>

      {/* Right Broken Relic: Burning Centralized API Key */}
      <g transform="translate(515, 275) rotate(9)">
        <rect
          x="0"
          y="0"
          width="225"
          height="125"
          rx="8"
          fill="#18181B"
          stroke="#DC2626"
          strokeWidth="1.8"
          strokeDasharray="10 4"
        />
        <line x1="15" y1="62" x2="210" y2="62" stroke="#EF4444" strokeWidth="2.5" />
        <text
          x="20"
          y="42"
          fill="#EF4444"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="11"
        >
          CENTRALIZED API KEY
        </text>
        <text
          x="20"
          y="66"
          fill="#FCA5A5"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="12"
        >
          sk-live-99a8f...REVOKED
        </text>
        <text
          x="20"
          y="100"
          fill="#7F1D1D"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize="10"
        >
          SINGLE POINT OF FAILURE
        </text>
      </g>

      {/* Center Sovereign Monument: The Luminous Shunya [0] Seal */}
      <g transform="translate(400, 195)">
        <polygon
          points="-85,-110 85,-110 125,-60 125,60 85,110 -85,110 -125,60 -125,-60"
          fill="#0B0F19"
          stroke="#EAB308"
          strokeWidth="3.5"
        />
        <rect
          x="-42"
          y="-62"
          width="84"
          height="124"
          rx="42"
          fill="#060709"
          stroke="#F3F4F6"
          strokeWidth="10"
        />
        <line
          x1="-65"
          y1="55"
          x2="65"
          y2="-55"
          stroke="#10B981"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="0" cy="0" r="10" fill="#06B6D4" />
      </g>

      <text
        x="205"
        y="365"
        fill="#EAB308"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="14"
        fontWeight="700"
        letterSpacing="2"
      >
        PURE CRYPTOGRAPHIC COMPUTE ACCESS
      </text>
      <text
        x="195"
        y="465"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
      >
        0 CREDIT CARDS • 0 SUBSCRIPTIONS • 0 API KEYS • 100% SHUNYA
      </text>
    </svg>
  );
}

// ==========================================
// 3. INLINE VISUAL INTERRUPTERS (Between Text Paragraphs)
// ==========================================

/**
 * Inline Interrupter A: Inline01_ZeroTrustPipeline.svg
 * ViewBox: 0 0 960 220
 * Where to place: Immediately between Hero introduction and Technical Architecture breakdown
 */
export function Inline01Pipeline({ className = "", ...props }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 960 220"
      width="100%"
      height="100%"
      fill="none"
      className={`w-full h-auto select-none ${className}`}
      {...props}
    >
      <rect
        width="960"
        height="220"
        rx="8"
        fill="#080B11"
        stroke="#1E293B"
        strokeWidth="1.5"
      />

      {/* Step 1: Browser DOM */}
      <rect
        x="30"
        y="45"
        width="190"
        height="130"
        rx="6"
        fill="#0F172A"
        stroke="#F3F4F6"
        strokeWidth="1.5"
      />
      <text
        x="48"
        y="78"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        01. BROWSER DOM
      </text>
      <text
        x="48"
        y="105"
        fill="#94A3B8"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        Plaintext Prompt
      </text>
      <text
        x="48"
        y="145"
        fill="#10B981"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        + RSA-OAEP 2048 Seal
      </text>
      <line
        x1="220"
        y1="110"
        x2="275"
        y2="110"
        stroke="#10B981"
        strokeWidth="3"
        strokeDasharray="6 4"
      />

      {/* Step 2: Horizon L2 Escrow */}
      <rect
        x="275"
        y="45"
        width="190"
        height="130"
        rx="6"
        fill="#0F172A"
        stroke="#06B6D4"
        strokeWidth="1.5"
      />
      <text
        x="293"
        y="78"
        fill="#06B6D4"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        02. HORIZON L2 (133)
      </text>
      <text
        x="293"
        y="105"
        fill="#94A3B8"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        T_max Ceiling Locked
      </text>
      <text
        x="293"
        y="145"
        fill="#06B6D4"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        + World ID Verified
      </text>
      <line
        x1="465"
        y1="110"
        x2="520"
        y2="110"
        stroke="#06B6D4"
        strokeWidth="3"
        strokeDasharray="6 4"
      />

      {/* Step 3: Untrusted Host Relay */}
      <rect
        x="520"
        y="45"
        width="190"
        height="130"
        rx="6"
        fill="#18090A"
        stroke="#DC2626"
        strokeWidth="1.5"
        strokeDasharray="5 3"
      />
      <text
        x="538"
        y="78"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        03. GPU CLOUD HOST
      </text>
      <text
        x="538"
        y="105"
        fill="#FCA5A5"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        Sees: 0x8F9A... Only
      </text>
      <text
        x="538"
        y="145"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        Host Visibility: 0.0%
      </text>
      <line x1="710" y1="110" x2="755" y2="110" stroke="#EAB308" strokeWidth="3" />

      {/* Step 4: AMD SEV-SNP TEE */}
      <rect
        x="755"
        y="45"
        width="175"
        height="130"
        rx="6"
        fill="#141105"
        stroke="#EAB308"
        strokeWidth="2"
      />
      <text
        x="770"
        y="78"
        fill="#EAB308"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        04. SEV-SNP ENCLAVE
      </text>
      <text
        x="770"
        y="105"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        Hardware Decryption
      </text>
      <text
        x="770"
        y="145"
        fill="#10B981"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        Unbroken Reasoning
      </text>
    </svg>
  );
}

/**
 * Inline Interrupter B: Inline02_HostMemoryXraySplit.svg
 * ViewBox: 0 0 960 200
 * Where to place: Between paragraphs comparing "Rusted Cloud GPU Hosts" vs "ShunyaGrid Hardware Isolation"
 */
export function Inline02MemorySplit({ className = "", ...props }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 960 200"
      width="100%"
      height="100%"
      fill="none"
      className={`w-full h-auto select-none ${className}`}
      {...props}
    >
      <rect
        width="960"
        height="200"
        rx="8"
        fill="#060709"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Left Side: Inside the SEV-SNP Enclave */}
      <rect
        x="20"
        y="20"
        width="445"
        height="160"
        rx="6"
        fill="#0B131E"
        stroke="#10B981"
        strokeWidth="1.5"
      />
      <text
        x="40"
        y="52"
        fill="#10B981"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        INSIDE AMD SEV-SNP ENCLAVE (YOUR PRIVATE SESSION)
      </text>
      <text
        x="40"
        y="90"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
      >
        &lt;think&gt; Evaluating proprietary MEV strategy
      </text>
      <text
        x="40"
        y="115"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
      >
        across liquidity pools... Optimal path found. &lt;/think&gt;
      </text>
      <text
        x="40"
        y="152"
        fill="#06B6D4"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        STATUS: HARDWARE ATTESTED • AES-128 LOCKED
      </text>

      {/* Right Side: What the Physical GPU Server Owner Sees */}
      <rect
        x="495"
        y="20"
        width="445"
        height="160"
        rx="6"
        fill="#160708"
        stroke="#DC2626"
        strokeWidth="1.5"
      />
      <text
        x="515"
        y="52"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        PHYSICAL GPU HOST RAM DUMP (SNOOPING ADMIN VIEW)
      </text>
      <text
        x="515"
        y="90"
        fill="#FCA5A5"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
      >
        0x7F9A 0x00C1 0x44E2 0x99B0 0x11D8 0x883F 0xE20A
      </text>
      <text
        x="515"
        y="115"
        fill="#FCA5A5"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
      >
        0x0000 0x55A1 0xF91C 0x38D4 0x77E0 0xC009 0x2B44
      </text>
      <text
        x="515"
        y="152"
        fill="#EF4444"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="10"
      >
        PLAINTEXT LEAKAGE: 0 BYTES (100% SHUNYA)
      </text>
    </svg>
  );
}

/**
 * Inline Interrupter C: Inline03_TmaxEscrowCurve.svg
 * ViewBox: 0 0 960 220
 * Where to place: Inside T_max mathematical proof section between formula and HSP paragraph
 */
export function Inline03TmaxCurve({ className = "", ...props }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 960 220"
      width="100%"
      height="100%"
      fill="none"
      className={`w-full h-auto select-none ${className}`}
      {...props}
    >
      <rect
        width="960"
        height="220"
        rx="8"
        fill="#080B11"
        stroke="#EAB308"
        strokeWidth="1.5"
      />

      {/* Top Ceiling Line (T_max) */}
      <line
        x1="60"
        y1="45"
        x2="900"
        y2="45"
        stroke="#EAB308"
        strokeWidth="2.5"
        strokeDasharray="8 4"
      />
      <text
        x="65"
        y="34"
        fill="#EAB308"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        LOCKED ON-CHAIN CEILING: T_max = 16,384 TOKENS (ZERO CUTOFF GUARANTEE)
      </text>

      {/* Shaded Cyan Refund Area (T_max - T_actual) */}
      <polygon
        points="580,45 880,45 880,175 580,115"
        fill="#06B6D4"
        fillOpacity="0.15"
      />
      <text
        x="615"
        y="88"
        fill="#22D3EE"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="12"
        fontWeight="700"
      >
        INSTANT HSP REFUND ZONE
      </text>
      <text
        x="615"
        y="108"
        fill="#06B6D4"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
      >
        Refund = (T_max − T_actual) × P_token
      </text>

      {/* Reasoning Token Consumption Curve */}
      <path
        d="M60,180 Q240,170 360,95 T580,115"
        stroke="#10B981"
        strokeWidth="4"
        fill="none"
      />
      <circle
        cx="580"
        cy="115"
        r="7"
        fill="#F3F4F6"
        stroke="#10B981"
        strokeWidth="3"
      />
      <text
        x="345"
        y="80"
        fill="#10B981"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
        fontWeight="700"
      >
        DeepSeek R1 / Claude 3.7 &lt;think&gt; Spike
      </text>
      <text
        x="455"
        y="145"
        fill="#F3F4F6"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="11"
      >
        T_actual = 9,410 Tokens Completed
      </text>
    </svg>
  );
}

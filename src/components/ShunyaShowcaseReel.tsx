"use client";

import React from "react";
import Link from "next/link";
import {
  Card01SevSnp,
  Card02RsaPrism,
  Card03TmaxSanctuary,
  Card04HspPulse,
  Card05SybilAperture,
  Card06SovereignZero,
  ShunyaLogoMark,
} from "@/components/svg/ShunyaSvgAssets";
import { playHoverSound, playClickSound } from "@/utils/griflanAudio";
import { ArrowRight, ShieldCheck } from "lucide-react";

interface ShowcaseItem {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  component: React.ComponentType<{ className?: string }>;
  tag: string;
  tagColor: string;
  link: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: "card-01",
    number: "01",
    title: "SEV-SNP Black Box",
    subtitle: "Hardware-Enforced Memory Shield",
    description:
      "Hostile cloud root hypervisors and GPU providers suffer 0% visibility. All prompt tokens decrypt exclusively inside AMD SEV-SNP hardware enclaves.",
    component: Card01SevSnp,
    tag: "AMD SEV-SNP • CHAIN 133",
    tagColor: "border-amber-500/30 text-amber-500 bg-amber-500/10",
    link: "/buyer",
  },
  {
    id: "card-02",
    number: "02",
    title: "RSA-OAEP Prism",
    subtitle: "Browser-Side Cryptographic Refraction",
    description:
      "Your prompt is sealed in your local browser before transmission via WebCrypto 2048-bit RSA-OAEP. Network relays see only encrypted hexadecimal ciphertext.",
    component: Card02RsaPrism,
    tag: "RSA-OAEP-2048 • SHA-256",
    tagColor: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
    link: "/buyer",
  },
  {
    id: "card-03",
    number: "03",
    title: "T_max Sanctuary",
    subtitle: "Deterministic Reasoning Bounds",
    description:
      "Eliminates out-of-gas reasoning aborts in Claude 3.7 and DeepSeek R1. The on-chain contract escrows a deterministic token ceiling so your thought never cuts off.",
    component: Card03TmaxSanctuary,
    tag: "100% REASONING GUARANTEE",
    tagColor: "border-cyan-500/30 text-cyan-500 bg-cyan-500/10",
    link: "/buyer",
  },
  {
    id: "card-04",
    number: "04",
    title: "HSP Stream Pulse",
    subtitle: "Autonomous Agent-to-Agent Settlement",
    description:
      "Sub-second streaming micro-payments on HashKey Horizon L2 without credit cards or centralized API keys. Excess tokens automatically refund in 0.4s.",
    component: Card04HspPulse,
    tag: "HSP PROTOCOL • Δt < 1.0s",
    tagColor: "border-blue-500/30 text-blue-500 bg-blue-500/10",
    link: "/marketplace",
  },
  {
    id: "card-05",
    number: "05",
    title: "Sybil Aperture",
    subtitle: "World ID Iris Personhood Proof",
    description:
      "Zero-knowledge biometric Iris nullifiers stop botnet GPU hoarders on the perimeter while granting verified sovereign human agents fair inference allocations.",
    component: Card05SybilAperture,
    tag: "WORLD ID • ZK NULLIFIER",
    tagColor: "border-purple-500/30 text-purple-500 bg-purple-500/10",
    link: "/buyer",
  },
  {
    id: "card-06",
    number: "06",
    title: "Sovereign Zero",
    subtitle: "Zero Subscriptions, Zero API Keys",
    description:
      "Shatters fragile credit cards and revoked centralized API keys beneath a pure cryptographic Shunya (0) seal. Pure peer-to-peer compute exchange.",
    component: Card06SovereignZero,
    tag: "0% PLAINTEXT • 100% SHUNYA",
    tagColor: "border-rose-500/30 text-rose-500 bg-rose-500/10",
    link: "/payout",
  },
];

export default function ShunyaShowcaseReel() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 select-none">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 font-mono text-[11px] text-amber-500 uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>VISUAL SHOWCASE REEL // ZERO-TRUST SILICON BRUTALISM</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white uppercase">
          Zero Trust.{" "}
          <span className="italic font-serif font-normal bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400">
            Unbroken Thought.
          </span>
        </h2>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Six bespoke cryptographic architectures powering confidential inference, autonomous
          settlement, and zero-cutoff execution on HashKey Horizon L2.
        </p>
      </div>

      {/* 6 Showcase Picture Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {SHOWCASE_ITEMS.map((item) => {
          const SvgComponent = item.component;

          return (
            <div
              key={item.id}
              onMouseEnter={() => playHoverSound()}
              className="group relative flex flex-col justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#07090e]/90 p-5 sm:p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-[0_20px_40px_-15px_rgba(234,179,8,0.15)] overflow-hidden"
            >
              {/* Top Watermark (Monochrome 15% Opacity ShunyaLogoMark) */}
              <div
                className="absolute top-4 right-4 z-20 pointer-events-none transition-opacity duration-300 group-hover:opacity-40"
                title="Cryptographic Authenticity Seal"
              >
                <ShunyaLogoMark
                  size={24}
                  monochrome={true}
                  opacity={0.15}
                  className="text-zinc-900 dark:text-white"
                />
              </div>

              {/* Artwork Viewport (with X-Ray reactivity) */}
              <div className="relative w-full rounded-xl overflow-hidden border border-black/5 dark:border-white/5 bg-black/40 mb-5 xray-scrambled transition-all duration-300">
                <SvgComponent className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]" />
              </div>

              {/* Card Meta & Typography */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-zinc-400">
                    [{item.number} // PROTOCOL]
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${item.tagColor}`}
                  >
                    {item.tag}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight">
                    {item.title}
                  </h3>
                  <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                    {item.subtitle}
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Bottom Action Link */}
              <div className="pt-4 mt-4 border-t border-black/5 dark:border-white/5">
                <Link
                  href={item.link}
                  onClick={() => playClickSound()}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-950 dark:text-white hover:text-amber-500 transition group/link"
                >
                  <span>Launch Module</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

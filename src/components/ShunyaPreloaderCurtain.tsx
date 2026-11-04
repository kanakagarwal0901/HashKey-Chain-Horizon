"use client";

import React, { useState, useEffect } from "react";
import { ShunyaLogoMark } from "@/components/svg/ShunyaSvgAssets";
import { playClickSound, playPulseSound } from "@/utils/griflanAudio";

export default function ShunyaPreloaderCurtain() {
  const [percent, setPercent] = useState(0);
  const [complete, setComplete] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default true for SSR
  const [splitting, setSplitting] = useState(false);

  useEffect(() => {
    // Check session storage
    const seen = sessionStorage.getItem("shunya_preloader_seen");
    if (!seen) {
      setDismissed(false);
      let count = 0;
      const interval = setInterval(() => {
        count += Math.floor(Math.random() * 8) + 4;
        if (count >= 100) {
          count = 100;
          setPercent(100);
          setComplete(true);
          clearInterval(interval);
        } else {
          setPercent(count);
        }
      }, 40);

      return () => clearInterval(interval);
    }
  }, []);

  const handleOpen = () => {
    if (!complete && percent < 90) return;
    playClickSound();
    playPulseSound();
    setSplitting(true);
    setTimeout(() => {
      setDismissed(true);
      sessionStorage.setItem("shunya_preloader_seen", "true");
    }, 800);
  };

  if (dismissed) return null;

  return (
    <div
      onClick={handleOpen}
      className={`fixed inset-0 z-[100] flex items-center justify-center cursor-pointer select-none overflow-hidden transition-opacity duration-700 ${
        splitting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Left Curtain Half */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1/2 bg-[#060709] border-r border-amber-500/20 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          splitting ? "-translate-x-full" : "translate-x-0"
        }`}
      />

      {/* Right Curtain Half */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-1/2 bg-[#060709] border-l border-amber-500/20 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          splitting ? "translate-x-full" : "translate-x-0"
        }`}
      />

      {/* Center Gate UI */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center p-8 transition-transform duration-500 ${
          splitting ? "scale-90 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Animated ShunyaLogoMark (96px x 96px) */}
        <div className="relative mb-6 drop-shadow-[0_0_35px_rgba(234,179,8,0.35)]">
          <ShunyaLogoMark size={96} animated={true} />
        </div>

        {/* Counter Display */}
        <div className="font-mono text-center space-y-2">
          <div className="text-3xl sm:text-4xl font-black tracking-widest text-white">
            {percent.toString().padStart(3, "0")}%
          </div>
          <div className="text-xs tracking-widest text-amber-400 font-semibold uppercase">
            {complete ? "100% ENCLAVE ATTESTED" : "INITIALIZING SEV-SNP ISOLATION..."}
          </div>

          <div className="pt-4 text-[11px] text-zinc-400 flex items-center gap-2 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>{complete ? "CLICK TO ENTER PROTOCOL [0]" : "VERIFYING PCR0 HASH..."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

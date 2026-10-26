"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import AnonRpcStatusBadge from "@/components/AnonRpcStatusBadge";
import HowItWorksModal from "@/components/HowItWorksModal";
import {
  Shield,
  Cpu,
  Database,
  ArrowRightLeft,
  Layers,
  Wallet,
  UserCheck,
  LogOut,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  Activity,
  Globe,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const {
    walletAddress,
    worldIdVerified,
    nullifierHash,
    isAuthenticated,
    sellerHederaAccount,
    ensName,
    ensAvatar,
    connectWallet,
    logout,
  } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-[#07090e]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0d111a] rounded-[11px] flex items-center justify-center group-hover:bg-opacity-80 transition">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300">
              Shunya<span className="text-cyan-400">Grid</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              Zero-Cutoff Token Exchange
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setIsHowItWorksOpen(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-cyan-300 hover:text-white hover:bg-cyan-950/40 border border-cyan-800/40 transition flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            How It Works
          </button>
          <Link
            href="/buyer"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Buyer Studio</span>
            <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">Use AI</span>
          </Link>
          <Link
            href="/seller"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Seller Hub</span>
            <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">Earn USDC</span>
          </Link>
          <Link
            href="/marketplace"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
          >
            <Database className="w-4 h-4 text-purple-400" />
            <span>Orderbook</span>
          </Link>
        </nav>

        {/* Top-Right Profile & Authentication */}
        <div className="flex items-center gap-2 sm:gap-3">
          <AnonRpcStatusBadge />
          {isAuthenticated ? (
            /* Authenticated User Profile Pill with Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 transition text-xs font-mono"
              >
                {/* ENS Avatar or Gradient Avatar */}
                {ensAvatar ? (
                  <img
                    src={ensAvatar}
                    alt="ENS Avatar"
                    className="w-7 h-7 rounded-lg object-cover border border-cyan-500/50 shadow-sm"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm">
                    {ensName ? ensName.slice(0, 2).toUpperCase() : walletAddress ? walletAddress.slice(2, 4).toUpperCase() : "SG"}
                  </div>
                )}

                <div className="hidden sm:flex flex-col text-left">
                  <span className="font-bold text-white text-[11px] flex items-center gap-1">
                    {ensName ? (
                      <>
                        <span className="text-cyan-300">{ensName}</span>
                        <span className="text-[9px] bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 px-1 py-0.2 rounded">ENS</span>
                      </>
                    ) : walletAddress ? (
                      `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                    ) : (
                      ""
                    )}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <UserCheck className="w-2.5 h-2.5" />
                    World ID Verified
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {/* Profile Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 glass-panel p-4 rounded-2xl border border-slate-700 shadow-2xl space-y-3 z-50 bg-[#0d111a]/95">
                  <div className="border-b border-slate-800 pb-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Connected Profile
                      </span>
                      {ensName && (
                        <a
                          href={`https://app.ens.domains/${ensName}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3" />
                          View on ENS
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    {ensName && (
                      <div className="text-xs font-mono font-bold text-cyan-400 truncate pt-0.5">
                        {ensName}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-xs font-mono text-slate-300 truncate" title={walletAddress || ""}>
                        {walletAddress}
                      </span>
                      <button
                        onClick={copyAddress}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition flex-shrink-0"
                        title="Copy address"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* World ID Details */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>World ID Proof:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Verified Human
                      </span>
                    </div>
                    {nullifierHash && (
                      <div className="text-[10px] text-slate-500 truncate" title={nullifierHash}>
                        Nullifier: {nullifierHash.slice(0, 16)}...
                      </div>
                    )}
                  </div>

                  {/* Hedera Account (if connected by Seller) */}
                  {sellerHederaAccount && (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-[11px] font-mono space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Hedera Payout:</span>
                        <span className="text-amber-400 font-bold">{sellerHederaAccount}</span>
                      </div>
                    </div>
                  )}

                  {/* Protocol Links */}
                  <div className="space-y-1 pt-1 text-xs">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setIsHowItWorksOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 text-cyan-300 hover:text-white transition flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                        How It Works Guide
                      </span>
                    </button>
                    <Link
                      href="/buyer"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-3 py-2 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                        Buyer Studio
                      </span>
                    </Link>
                    <Link
                      href="/seller"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-3 py-2 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        Seller Hub
                      </span>
                    </Link>
                    <Link
                      href="/marketplace"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-3 py-2 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-purple-400" />
                        Orderbook
                      </span>
                    </Link>
                    <Link
                      href="/bridge"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-3 py-2 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                        Arc CCTP Bridge
                      </span>
                    </Link>
                  </div>

                  {/* Log Out Button */}
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 font-mono text-xs font-bold flex items-center justify-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log Out / Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated State: Connect & Verify Button */
            <Link
              href="/"
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs font-mono shadow-md flex items-center gap-1.5 transition"
            >
              <UserCheck className="w-3.5 h-3.5 text-cyan-200" />
              <span>Connect</span>
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#07090e]/95 backdrop-blur-lg px-4 py-3 space-y-2 animate-in slide-in-from-top-2">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setIsHowItWorksOpen(true);
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg bg-cyan-950/30 text-cyan-300 border border-cyan-800/40 text-sm font-medium flex items-center gap-2.5"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            How It Works (60s Guide)
          </button>
          <Link
            href="/buyer"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Buyer Studio (Use AI)
            </span>
          </Link>
          <Link
            href="/seller"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Seller Hub (Earn USDC)
            </span>
          </Link>
          <Link
            href="/marketplace"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Orderbook (Live Listings)
            </span>
          </Link>
          <Link
            href="/bridge"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              Arc CCTP Bridge
            </span>
          </Link>
        </div>
      )}
    </header>

    {/* Interactive Onboarding Guide Modal */}
    <HowItWorksModal
      isOpen={isHowItWorksOpen}
      onClose={() => setIsHowItWorksOpen(false)}
    />
  </>
);
}

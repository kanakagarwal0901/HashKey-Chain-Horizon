"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HowItWorksModal from "@/components/HowItWorksModal";
import {
  Shield,
  Cpu,
  Database,
  Coins,
  Layers,
  LogOut,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  Globe,
  HelpCircle,
  Menu,
  X,
  UserCheck,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function Navbar() {
  const {
    walletAddress,
    isAuthenticated,
    sellerHederaAccount,
    ensName,
    ensAvatar,
    nullifierHash,
    logout,
  } = useAuth();

  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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

  const navItems = [
    { href: "/buyer", label: "Buyer Studio", icon: Cpu },
    { href: "/seller", label: "Seller Hub", icon: Layers },
    { href: "/marketplace", label: "Orderbook", icon: Database },
    { href: "/payout", label: "Seller Payout", icon: Coins },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 liquid-glass-navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center transition group-hover:scale-95">
              <span className="font-black text-sm tracking-tighter">SG</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-white leading-tight">
                ShunyaGrid
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal tracking-normal">
                Zero-Cutoff AI Exchange
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 liquid-glass-pill p-1 rounded-full">
            <button
              onClick={() => setIsHowItWorksOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
            >
              <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
              <span>How It Works</span>
            </button>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                    isActive
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold"
                      : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white dark:text-black" : "text-zinc-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Top-Right Profile, Theme Switcher & Authentication */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle visual theme"
              className="p-2 rounded-full liquid-glass-pill text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition flex items-center justify-center hover:scale-105"
              title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>

            {isAuthenticated ? (
              /* Authenticated User Profile Pill */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full liquid-glass-pill hover:border-white/25 transition text-xs"
                >
                  {ensAvatar ? (
                    <img
                      src={ensAvatar}
                      alt="ENS Avatar"
                      className="w-6 h-6 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center font-bold text-[10px]">
                      {ensName ? ensName.slice(0, 2).toUpperCase() : walletAddress ? walletAddress.slice(2, 4).toUpperCase() : "SG"}
                    </div>
                  )}

                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-semibold text-zinc-900 dark:text-white text-[12px] truncate max-w-[120px]">
                      {ensName || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "")}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 pulse-ring-emerald" />
                      Verified Human
                    </span>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 ml-0.5" />
                </button>

                {/* Profile Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl liquid-glass p-4 space-y-3 z-50 text-zinc-900 dark:text-zinc-100" data-ui="dropdown-menu">
                    <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block">
                          Connected Account
                        </span>
                        {ensName && (
                          <a
                            href={`https://app.ens.domains/${ensName}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            ENS
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      {ensName && (
                        <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate pt-0.5">
                          {ensName}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate tabular-data" title={walletAddress || ""}>
                          {walletAddress}
                        </span>
                        <button
                          onClick={copyAddress}
                          className="p-1 rounded hover:bg-black/[0.05] dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition flex-shrink-0"
                          title="Copy address"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* World ID Proof Details */}
                    <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-black/50 border border-black/[0.06] dark:border-white/[0.06] text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                        <span>World ID Status:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Verified Human
                        </span>
                      </div>
                      {nullifierHash && (
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate" title={nullifierHash}>
                          Nullifier: {nullifierHash.slice(0, 16)}...
                        </div>
                      )}
                    </div>

                    {/* Hedera Account (if connected by Seller) */}
                    {sellerHederaAccount && (
                      <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-black/50 border border-black/[0.06] dark:border-white/[0.06] text-xs space-y-1">
                        <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                          <span>Hedera Payout Account:</span>
                          <span className="text-zinc-900 dark:text-white font-semibold tabular-data">{sellerHederaAccount}</span>
                        </div>
                      </div>
                    )}

                    {/* Navigation Links inside Dropdown */}
                    <div className="space-y-1 pt-1 text-xs">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setDropdownOpen(false)}
                            className="px-3 py-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-2"
                          >
                            <Icon className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Log Out */}
                    <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                      <button
                        onClick={() => {
                          logout();
                          setDropdownOpen(false);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Unauthenticated: High-Contrast Nike/Apple Primary Action */
              <Link
                href="/buyer"
                className="btn-primary-apple px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <span>Launch Studio</span>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-zinc-800 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-black/[0.06] dark:border-white/[0.08] bg-white/95 dark:bg-black px-4 py-4 space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setIsHowItWorksOpen(true);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl bg-black/[0.04] dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-medium flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span>How It Works (Overview)</span>
            </button>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-zinc-900 text-xs font-medium flex items-center gap-2"
                >
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
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

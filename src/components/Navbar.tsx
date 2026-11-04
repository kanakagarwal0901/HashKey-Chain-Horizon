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
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import ShunyaLogo from "@/components/ShunyaLogo";

export default function Navbar() {
  const {
    walletAddress,
    isAuthenticated,
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

  // Dedicated full-bleed Griflan Labs start page has its own precision HUD matrix header
  if (pathname === "/start") {
    return null;
  }

  const navItems = [
    { href: "/start", label: "✦ Labs", icon: Sparkles },
    { href: "/buyer", label: "Buyer Studio", icon: Cpu },
    { href: "/seller", label: "Seller Hub", icon: Layers },
    { href: "/marketplace", label: "Marketplace", icon: Database },
    { href: "/payout", label: "Payouts", icon: Coins },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 liquid-glass-navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3.5">
            <Link href="/" className="flex items-center group">
              <ShunyaLogo size={36} showWordmark={true} />
            </Link>

            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full liquid-glass-pill text-[11px] text-zinc-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.06]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-ring-emerald" />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">HashKey 133</span>
              <span className="text-zinc-400 dark:text-zinc-600">•</span>
              <span className="font-mono text-zinc-500">#35.1M</span>
            </div>
          </div>

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
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full liquid-glass-pill text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition"
                >
                  {ensAvatar ? (
                    <img
                      src={ensAvatar}
                      alt="ENS Avatar"
                      className="w-5 h-5 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                      {walletAddress ? walletAddress.slice(2, 4) : "0x"}
                    </div>
                  )}

                  <span className="font-mono text-xs">
                    {ensName ||
                      (walletAddress
                        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                        : "Connected")}
                  </span>

                  {nullifierHash && (
                    <span
                      title="World ID Verified Human"
                      className="w-2 h-2 rounded-full bg-emerald-500 pulse-ring-emerald"
                    />
                  )}

                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
                </button>

                {/* Profile Details Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl liquid-glass-card shadow-2xl z-50 p-4 space-y-4 border border-black/10 dark:border-white/10 animate-in fade-in zoom-in-95 duration-150">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider">
                        Connected Identity
                      </div>
                      <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-between">
                        <span>{ensName || "Anonymous Node"}</span>
                        {nullifierHash && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                            <UserCheck className="w-3 h-3" />
                            World ID
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-mono text-[11px]">
                          {walletAddress
                            ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`
                            : ""}
                        </span>
                        <button
                          onClick={copyAddress}
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                          title="Copy address"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                        <span className="text-zinc-500">HashKey Horizon</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          133 Online
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <a
                        href={`https://testnet-explorer.hskchain.net/address/${walletAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] px-3 py-2 rounded-xl flex items-center justify-between transition"
                      >
                        <span>View on HashKey Explorer</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                      </a>

                      <button
                        onClick={() => {
                          logout();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-3 py-2 rounded-xl flex items-center justify-between transition"
                      >
                        <span>Disconnect</span>
                        <LogOut className="w-3.5 h-3.5" />
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

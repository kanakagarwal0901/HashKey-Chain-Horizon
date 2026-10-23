import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Terminal } from "lucide-react";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ShunyaGrid | The Blind, Zero-Cutoff AI API Token Exchange",
  description:
    "Privacy-first, peer-to-peer marketplace for unused AI API tokens with deterministic thinking-level token bounds and total seller blindness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200" suppressHydrationWarning>
        <AuthProvider>
          {/* EF Anon-RPC Sandboxed Harness (Hidden Iframe for anonymous JSON-RPC) */}
          <iframe
            src="/anon-rpc/sandbox.html"
            className="hidden"
            title="EF Anon-RPC Sandbox"
            aria-hidden="true"
          />

          {/* Global Interactive Client Navbar with Profile Pill & Dropdown */}
          <Navbar />

          {/* Main Content */}
          <main className="flex-1">{children}</main>

          {/* Global Footer with CROPS Privacy Compliance */}
          <footer className="border-t border-slate-800/80 bg-[#0a0d14] py-8 text-xs text-slate-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-200">ShunyaGrid Protocol</span>
                <span>&bull;</span>
                <span className="text-emerald-400 font-mono">CROPS Privacy Compliant</span>
              </div>

              <div className="flex items-center gap-4 text-slate-400">
                <Link href="/buyer" className="hover:text-cyan-300 transition">
                  Buyer Studio
                </Link>
                <Link href="/seller" className="hover:text-emerald-300 transition">
                  Seller Hub
                </Link>
                <Link href="/bridge" className="hover:text-amber-300 transition">
                  Circle CCTP
                </Link>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-300 hover:text-white transition flex items-center gap-1"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  MIT Open Source
                </a>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

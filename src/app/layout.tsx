import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Terminal, Shield, ArrowUpRight } from "lucide-react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "ShunyaGrid | Zero-Cutoff Confidential AI Exchange",
  description:
    "Privacy-first decentralized marketplace for frontier AI reasoning tokens. Mathematical zero-cutoff guarantees with total data blindness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('shunya_theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased selection:bg-zinc-200 selection:text-zinc-900 dark:selection:bg-zinc-800 dark:selection:text-white transition-colors duration-200" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {/* EF Anon-RPC Sandboxed Harness (Hidden Iframe for anonymous JSON-RPC) */}
            <iframe
              src="/anon-rpc/sandbox.html"
              className="hidden"
              title="EF Anon-RPC Sandbox"
              aria-hidden="true"
            />

            {/* Precision Navigation */}
            <Navbar />

            {/* Main Content */}
            <main className="flex-1">{children}</main>

            {/* Minimalist Apple/Nike Footer */}
            <footer className="border-t border-black/[0.06] dark:border-white/[0.08] bg-transparent py-12 text-sm text-zinc-500 dark:text-zinc-400">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-900 dark:text-white tracking-tight">ShunyaGrid</span>
                  <span className="text-zinc-400 dark:text-zinc-600">&bull;</span>
                  <span className="text-zinc-500 dark:text-zinc-400">EF CROPS Confidentiality Standard</span>
                </div>

                <div className="flex items-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
                  <Link href="/buyer" className="hover:text-zinc-900 dark:hover:text-white transition">
                    Buyer Studio
                  </Link>
                  <Link href="/seller" className="hover:text-zinc-900 dark:hover:text-white transition">
                    Seller Hub
                  </Link>
                  <Link href="/payout" className="hover:text-zinc-900 dark:hover:text-white transition">
                    Seller Payout
                  </Link>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-900 dark:hover:text-white transition inline-flex items-center gap-1"
                  >
                    <span>Open Source</span>
                    <ArrowUpRight className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                  </a>
                </div>
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

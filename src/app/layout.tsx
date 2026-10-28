import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiquidGlassFilters from "@/components/LiquidGlassFilters";

export const metadata: Metadata = {
  title: "ShunyaGrid • HashKey Chain Confidential AI & Agent Payments",
  description:
    "Autonomous agent payment and A2A settlement network powered by HashKey Settlement Protocol (HSP) and confidential hardware enclaves with mathematical zero-cutoff guarantees.",
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
            {/* Liquid Glass Optical SVG Caustic Filters */}
            <LiquidGlassFilters />

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

            {/* Professional Multi-Column Liquid Glass Footer */}
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import Link from "next/link";
import { AlertCircle, Home, Cpu, Layers, Database } from "lucide-react";
import SpatialCard from "@/components/SpatialCard";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 text-center py-24 text-zinc-900 dark:text-zinc-100">
      <SpatialCard maxTilt={2} className="max-w-2xl w-full p-10 sm:p-14 space-y-8">
        <div className="w-16 h-16 rounded-2xl bg-black/[0.04] dark:bg-zinc-900 border border-black/[0.06] dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mx-auto">
          <AlertCircle className="w-8 h-8 text-zinc-500 dark:text-zinc-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white tracking-tight">
            404 • Page Not Found
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto text-sm leading-relaxed">
            The requested ShunyaGrid route could not be found or has moved. Choose from one of the active protocol modules below:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left">
          <Link
            href="/"
            className="p-5 rounded-2xl liquid-glass-interactive border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1.5 transition"
          >
            <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-semibold text-sm">
              <Home className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              Home Overview
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Orderbook & network telemetry</span>
          </Link>

          <Link
            href="/buyer"
            className="p-5 rounded-2xl liquid-glass-interactive border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1.5 transition"
          >
            <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-semibold text-sm">
              <Cpu className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              Buyer Studio
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Blind inference & prompt execution</span>
          </Link>

          <Link
            href="/seller"
            className="p-5 rounded-2xl liquid-glass-interactive border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1.5 transition"
          >
            <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-semibold text-sm">
              <Layers className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              Seller Hub
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">API keys & idle quota monetization</span>
          </Link>

          <Link
            href="/marketplace"
            className="p-5 rounded-2xl liquid-glass-interactive border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1.5 transition"
          >
            <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-semibold text-sm">
              <Database className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              Orderbook
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Live time-scoped listings</span>
          </Link>
        </div>

        <div>
          <Link
            href="/"
            className="btn-primary-apple px-7 py-3 text-xs font-semibold inline-flex items-center gap-2 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </SpatialCard>
    </div>
  );
}

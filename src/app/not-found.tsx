import Link from "next/link";
import { AlertTriangle, Home, Cpu, Layers, Lock, ArrowRightLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-lg shadow-amber-500/10">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
        404 - Page Not Found
      </h1>
      <p className="text-slate-400 max-w-md mx-auto mb-8 text-sm">
        The requested ShunyaGrid route could not be found or has moved. Choose from one of the active protocol modules below:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mb-8">
        <Link
          href="/"
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 transition text-left flex flex-col gap-2 group"
        >
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <Home className="w-4 h-4" />
            Home
          </div>
          <span className="text-xs text-slate-400">Orderbook & overview</span>
        </Link>

        <Link
          href="/buyer"
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 transition text-left flex flex-col gap-2 group"
        >
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <Cpu className="w-4 h-4" />
            Buyer Studio
          </div>
          <span className="text-xs text-slate-400">Blind inference & prompt execution</span>
        </Link>

        <Link
          href="/seller"
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800 transition text-left flex flex-col gap-2 group"
        >
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Layers className="w-4 h-4" />
            Seller Hub
          </div>
          <span className="text-xs text-slate-400">API keys & idle quota pool</span>
        </Link>

        <Link
          href="/audit"
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800 transition text-left flex flex-col gap-2 group"
        >
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
            <Lock className="w-4 h-4" />
            Judge Audit
          </div>
          <span className="text-xs text-slate-400">HCS live settlement logs</span>
        </Link>
      </div>

      <Link
        href="/"
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

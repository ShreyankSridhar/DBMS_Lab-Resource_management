import Link from 'next/link';
import {
  Building2,
  Cpu,
  CalendarCheck,
  Shield,
  Database,
  ArrowRight,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/25">
              U
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block leading-none">
                UniLab Resources
              </span>
              <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">
                DBMS Level 3 Academic System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-bold text-slate-200 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
            >
              Access Portal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Enterprise Relational DBMS & Event-Sourced Document Audit
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            University Laboratory <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400">
              Resource Allocation System
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            A complete, production-grade DBMS Level 3 application with ACID transactional reservations,
            concurrency race-condition prevention, real-time derived inventory, SQL Views, Triggers,
            Stored Procedures, and MongoDB event audit aggregations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xl shadow-blue-600/30 transition-all flex items-center gap-2"
            >
              Enter University Portal <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/admin"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-amber-400" /> Administrative Console
            </Link>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Dual Database Paradigms</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              MySQL 8.0 handles normalized ACID transactions and strict locking. MongoDB captures flexible,
              event-sourced audit logs via a reliable transactional outbox processor.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Concurrency-Safe Allocation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prevents double bookings and race conditions on limited inventory with interval checks
              (existing_start &lt; end AND existing_end &gt; start) and row-level locking.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Advanced SQL Features</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Demonstrates MySQL Stored Procedures, Integrity Triggers, Views (view_lab_utilization, view_resource_availability),
              and explicit transactional rollback scripts.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>University Lab Resources Allocation System &bull; DBMS Academic Project</p>
      </footer>
    </div>
  );
}

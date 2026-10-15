'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldAlert, Sparkles, Database, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.user.role === 'ADMIN' || data.user.role === 'LAB_MANAGER') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password@123');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-2xl shadow-xl shadow-blue-500/20 mb-4">
          U
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">University Lab Resources</h2>
        <p className="mt-2 text-sm text-blue-200">Level 3 DBMS Academic Management System</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/20">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-900 hover:bg-blue-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Demo Personas (Pass: Password@123)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@university.edu')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
              >
                <span className="font-bold text-slate-900 block">Dr. Turing</span>
                <span className="text-[10px] text-amber-600 font-semibold block">ADMIN</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('student@university.edu')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
              >
                <span className="font-bold text-slate-900 block">Shreyank S</span>
                <span className="text-[10px] text-blue-600 font-semibold block">STUDENT</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('faculty@university.edu')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
              >
                <span className="font-bold text-slate-900 block">Prof. Feynman</span>
                <span className="text-[10px] text-emerald-600 font-semibold block">FACULTY</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('manager@university.edu')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
              >
                <span className="font-bold text-slate-900 block">Prof. Hopper</span>
                <span className="text-[10px] text-purple-600 font-semibold block">LAB MANAGER</span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-500" /> MySQL + MongoDB
            </span>
            <span>Argon2/Bcrypt + Jose JWT</span>
          </div>
        </div>
      </div>
    </div>
  );
}

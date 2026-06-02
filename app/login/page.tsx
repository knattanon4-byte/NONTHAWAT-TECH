'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { ShieldAlert, Terminal, Eye, EyeOff, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.session) {
        document.cookie = `hq_session_token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; SameSite=Lax; Secure`;
        router.push('/apps');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Access Denied: Invalid Security Credentials');
    } finally {
      // 🎯 ซ่อมจุดไทโปตรงนี้ให้กลับมาทำงานสมบูรณ์แล้วครับบอส
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-mono text-xs relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <GlassCard className="p-6 border border-slate-900 w-full max-w-sm space-y-6 transform-gpu backdrop-blur-md">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center mx-auto text-purple-400 animate-pulse">
            <Lock size={16} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wider">Nonthawat CEO control</h1>
            <p className="text-[10px] text-slate-500 mt-1">Identity Authorization Required</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 flex items-start gap-2 leading-relaxed">
            <ShieldAlert size={14} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-slate-400 text-[10px] uppercase tracking-wider block">Operator Email</label>
            <input
              type="email"
              required
              placeholder="operator@nonthawat.tech"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-purple-500/40 transition-colors"
            />
          </div>

          <div className="space-y-1.5 relative">
            <label className="text-slate-400 text-[10px] uppercase tracking-wider block">Access Key Override</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-slate-200 outline-none focus:border-purple-500/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 rounded-xl text-black font-semibold tracking-wide text-xs transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? 'AUTHENTICATING...' : 'INITIALIZE OVERRIDE LINK'}
          </button>
        </form>

        <div className="border-t border-slate-900 pt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <Terminal size={12} />
          <span>SECURE CORE TERMINAL GATEWAY V1.0</span>
        </div>
      </GlassCard>
    </div>
  );
}
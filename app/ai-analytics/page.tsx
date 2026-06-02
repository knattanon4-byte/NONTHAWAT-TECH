'use client';
import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Brain, Cpu, Sparkles, Terminal, Send, LineChart, Database, Activity } from 'lucide-react';

interface LogMessage {
  id: string;
  type: 'system' | 'ai' | 'user';
  text: string;
  timestamp: string;
}

export default function AiAnalyticsPage() {
  const [query, setQuery] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<LogMessage[]>([
    { id: '1', type: 'system', text: 'Matrix Neural Network Engine v2.0.26 initialized.', timestamp: '14:50:12' },
    { id: '2', type: 'ai', text: 'Standing by for deep-vector analysis commands, Commander.', timestamp: '14:50:13' }
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ฟังก์ชันจำลองการกดรันคำสั่งวิเคราะห์ระบบใน Console Terminal
  const handleExecuteCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userTime = new Date().toLocaleTimeString('th-TH');
    const newUserLog: LogMessage = {
      id: `u-${Date.now()}`,
      type: 'user',
      text: query,
      timestamp: userTime
    };

    setConsoleLogs(prev => [...prev, newUserLog]);
    setQuery('');
    setIsAnalyzing(true);

    // จำลอง AI ประมวลผลคลื่นความถี่ข้อมูล 1.5 วินาที
    setTimeout(() => {
      const aiTime = new Date().toLocaleTimeString('th-TH');
      let aiResponse = 'Command mapped successfully. Processing matrix vectors... No anomalies detected.';
      
      if (query.toLowerCase().includes('kpi') || query.toLowerCase().includes('sales')) {
        aiResponse = '🟢 [KPI Ledger Cluster] Target 7.5M projected success rate at 87.4% based on current velocity data.';
      } else if (query.toLowerCase().includes('game') || query.toLowerCase().includes('design')) {
        aiResponse = '🔮 [Design Vector] Character core balance metrics optimized. Diminishing returns threshold adjusted.';
      } else if (query.toLowerCase().includes('math') || query.toLowerCase().includes('clear')) {
        aiResponse = '🧠 [Rational Node] Numerical set matrices normalized. Floating points compiled under 0.002ms.';
      }

      const newAiLog: LogMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        text: aiResponse,
        timestamp: aiTime
      };

      setConsoleLogs(prev => [...prev, newAiLog]);
      setIsAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="space-y-8 transform-gpu max-w-5xl">
      {/* Header โซนเปิดเสาสัญญาณ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Brain className="text-cyan-400 animate-pulse" size={20} />
            Predictive Intelligence Matrix
          </h2>
          <p className="text-xs text-slate-400">Quantum neural vectors and algorithmic modeling running on local nodes.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-900 text-[11px] font-mono text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>ENGINE STATUS: STABLE (LOGGED IN)</span>
        </div>
      </div>

      {/* 🔮 โซนสถิติคาดการณ์ด้านบน (Top Forecasting Analytics) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5 border border-slate-800/40 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Neural Compute Load</span>
            <Cpu size={16} className="text-purple-400" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white font-mono">14.22 <span className="text-xs text-slate-500 font-normal">GFLOPS</span></p>
            <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full" style={{ width: '42%' }}></div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 border border-slate-800/40 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Accuracy Variance</span>
            <Sparkles size={16} className="text-cyan-400" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-cyan-400 font-mono">99.84%</p>
            <p className="text-[10px] text-slate-500 font-mono">Confidence bounds interval verified.</p>
          </div>
        </GlassCard>

        <GlassCard className="p-5 border border-slate-800/40 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Data Vectors Cached</span>
            <Database size={16} className="text-emerald-400" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white font-mono">1,024 <span className="text-xs text-slate-500 font-normal">Nodes</span></p>
            <p className="text-[10px] text-emerald-500 font-mono">Sync loop matching Local Storage history.</p>
          </div>
        </GlassCard>
      </div>

      {/* 📟 มอดูลหลัก: System Command Terminal Console */}
      <GlassCard className="border border-slate-800/60 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-purple-400" />
            <span className="text-sm font-medium text-white">Core Vector Terminal Emulator</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            <Activity size={12} className={isAnalyzing ? "animate-spin text-cyan-400" : ""} />
            {isAnalyzing ? 'COMPUTING DATA WAVEFORMS...' : 'TERMINAL IDLE'}
          </div>
        </div>

        {/* หน้าต่างกล่องข้อความ Log สีมืดสไตล์แฮกเกอร์ */}
        <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs space-y-2.5 shadow-inner">
          {consoleLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-600 text-[10px] pt-0.5 select-none">[{log.timestamp}]</span>
              {log.type === 'system' && <span className="text-amber-400/90 font-bold">[SYS]</span>}
              {log.type === 'ai' && <span className="text-cyan-400 font-bold">[AI]</span>}
              {log.type === 'user' && <span className="text-purple-400 font-bold">[CMD]</span>}
              <p className={log.type === 'user' ? "text-slate-300" : log.type === 'ai' ? "text-cyan-200/90" : "text-slate-500"}>
                {log.text}
              </p>
            </div>
          ))}
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-slate-600 animate-pulse">
              <span>[...]</span>
              <span>Matrix system analyzing vectors...</span>
            </div>
          )}
        </div>

        {/* ช่อง Input บัญชาการสั่งงาน */}
        <form onSubmit={handleExecuteCommand} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xs text-purple-500 select-none font-bold">&gt;</span>
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isAnalyzing}
              autoComplete="off"
              placeholder="Query system clusters... (e.g., 'Analyze KPI targets', 'Evaluate game design balance')"
              className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-8 pr-4 py-2.5 text-xs font-mono text-slate-200 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 disabled:opacity-50 transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={isAnalyzing || !query.trim()}
            className="px-4 bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-95 text-black font-semibold rounded-xl text-xs flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:scale-100"
          >
            <Send size={12} />
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
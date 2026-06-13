'use client';

import React, { useState } from 'react';

interface BugLog {
  id: string;
  timestamp: string;
  clientSystem: string;
  errorCode: string;
  errorMessage: string;
  aiSummary: string;
  severity: 'CRITICAL' | 'WARNING';
}

export default function AiAnalyticsPage() {
  // 📡 ข้อมูล Event เริ่มต้นสแตนด์บายบนแผงควบคุมตามภาพตัวอย่างของบอส
  const [logs, setLogs] = useState<BugLog[]>([
    {
      id: '1',
      timestamp: '14:42:10',
      clientSystem: 'N-SIGHT WEB APP',
      errorCode: '500_INTERNAL_SERVER',
      errorMessage: 'Database connection pool timeout in Supabase routing.',
      aiSummary: '🚨 [CRITICAL]: เกิดจากท่อเชื่อมต่อ Supabase ตึงมือเนื่องจากยอดเชื่อมต่อหนาแน่น วิธีแก้: ให้ทำการขยาย Connection Pool หลังบ้านหรือตั้งค่า Re-connect ยิงสัญญาณใหม่ครับ',
      severity: 'CRITICAL',
    },
    {
      id: '2',
      timestamp: '14:45:32',
      clientSystem: 'E-Commerce Client API',
      errorCode: '401_UNAUTHORIZED',
      errorMessage: 'Expired JWT Token passed to /api/checkout vector.',
      aiSummary: '⚠️ [WARNING]: บั๊กฝั่งผู้ใช้โทเค็นหมดอายุ ระบบทำการดีดออกอัตโนมัติ ไม่ต้องแก้ไขโครงสร้างหลักครับ',
      severity: 'WARNING',
    }
  ]);

  const [isSimulating, setIsSimulating] = useState(false);

  // 🛰️ ปุ่มวิเศษจำลองเหตุการณ์ยิงตรงไปหาหลังบ้าน /api/logs/analyze เพื่อดึง Gemini สรุปสดๆ
  const handleSimulateInboundBug = async () => {
    setIsSimulating(true);
    try {
      const response = await fetch('/api/logs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSystem: 'MYSTIC LOUNGE',
          errorCode: 'ERR_CONNECTION_TIMEOUT',
          errorMessage: 'Supabase real-time subscription lost due to high latency network link.'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const newLog: BugLog = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString('en-GB'),
          clientSystem: 'MYSTIC LOUNGE',
          errorCode: 'ERR_CONNECTION_TIMEOUT',
          errorMessage: 'Supabase real-time subscription lost due to high latency network link.',
          aiSummary: data.alertSummary,
          severity: 'CRITICAL'
        };
        setLogs(prev => [newLog, ...prev]);
      } else {
        alert(`🚨 หลังบ้านตอบสนองผิดพลาด: ${data.alertSummary}`);
      }
    } catch (error) {
      console.error("Simulation failed", error);
      alert("ไม่สามารถเชื่อมต่อท่อสัญญาณ API หลังบ้านได้ครับบอส");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="p-6 text-slate-100 min-h-screen bg-[#0b0f19] font-sans selection:bg-purple-500/30">
      
      {/* BRANDING HEADER */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-blue-400">NONTHAWAT.TECH <span className="text-xs text-slate-500 font-normal">CORE INTERFACE</span></h1>
          <h2 className="text-2xl font-bold tracking-wider text-slate-200 mt-2">Predictive Intelligence Matrix</h2>
          <p className="text-xs text-slate-400 mt-1">Quantum neural vectors and automated bug telemetry monitoring</p>
        </div>
        
        {/* 🧪 ปุ่มชมพู-ม่วงพรีเมียมขวาบน เคลียร์ไว้ให้กดเทสจำลองระบบหา Gemini ได้เสมอลื่นๆ */}
        <button
          onClick={handleSimulateInboundBug}
          disabled={isSimulating}
          className="md:self-end px-4 py-2.5 text-xs font-mono font-bold bg-purple-600 hover:bg-purple-500 rounded-lg border border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all active:scale-95 disabled:opacity-50"
        >
          {isSimulating ? '🛰️ ANALYZING INCIDENT...' : '🧪 SIMULATE INBOUND CLIENT BUG'}
        </button>
      </div>

      {/* TOP THREE TELEMETRY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800/60 shadow-md">
          <div className="text-[10px] text-slate-400 font-mono mb-1">NEURAL COMPUTE LOAD</div>
          <div className="text-xl font-bold font-mono text-purple-400">14.22 <span className="text-xs text-slate-500">GFLOPS</span></div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-purple-500 h-full w-[45%]" />
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800/60 shadow-md">
          <div className="text-[10px] text-slate-400 font-mono mb-1">AUTOMATED DIAGNOSTIC ACCURACY</div>
          <div className="text-xl font-bold font-mono text-emerald-400">99.84%</div>
          <p className="text-[10px] text-slate-500 font-mono mt-2">Confidence bounds interval verified</p>
        </div>
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800/60 shadow-md">
          <div className="text-[10px] text-slate-400 font-mono mb-1">LIVE TELEMETRY STREAM</div>
          <div className="text-xl font-bold font-mono text-blue-400">ACTIVE</div>
          <p className="text-[10px] text-emerald-400 font-mono mt-2 animate-pulse">● Listening on /api/logs/analyze</p>
        </div>
      </div>

      {/* MAIN INCIDENT FEED LOG */}
      <div className="rounded-xl border border-slate-800 bg-[#0d111c] overflow-hidden shadow-2xl">
        <div className="px-4 py-3 bg-[#111625] border-b border-slate-800 flex justify-between items-center">
          <span className="text-xs font-mono font-bold tracking-widest text-slate-300">📡 LIVE SYSTEM INCIDENT FEED</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">TOTAL: {logs.length} EVENTS</span>
        </div>

        <div className="p-4 space-y-4 max-h-[58vh] overflow-y-auto font-mono text-sm">
          {logs.map((log) => (
            <div 
              key={log.id} 
              className={`p-4 rounded-lg border transition-all ${
                log.severity === 'CRITICAL' 
                  ? 'bg-[#1c1216] border-red-900/60 hover:border-red-600/40' 
                  : 'bg-[#181613] border-amber-900/60 hover:border-amber-600/40'
              }`}
            >
              {/* LOG META HEADER */}
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2.5 text-xs">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    log.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {log.severity}
                  </span>
                  <span className="text-slate-200 font-bold">{log.clientSystem}</span>
                </div>
                <span className="text-slate-500">{log.timestamp}</span>
              </div>

              {/* ERROR METRICS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 text-xs bg-black/40 p-2.5 rounded border border-slate-900">
                <div><span className="text-slate-500">CODE:</span> <span className="text-slate-300 font-bold">{log.errorCode}</span></div>
                <div className="md:col-span-2"><span className="text-slate-500">RAW_MSG:</span> <span className="text-slate-400 block md:inline truncate">{log.errorMessage}</span></div>
              </div>

              {/* AI COGNITIVE SUMMARY */}
              <div className="text-xs bg-[#090d16] p-3 rounded border border-slate-800/80 leading-relaxed">
                <div className="text-[10px] text-blue-400 tracking-wider mb-1 uppercase font-bold">🤖 GEN-AI COGNITIVE TRANSLATION:</div>
                <p className="text-slate-200 whitespace-pre-wrap">{log.aiSummary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
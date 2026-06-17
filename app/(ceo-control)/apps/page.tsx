'use client';
import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { supabase } from '@/lib/supabase/client';
import { AppWindow, Code, Layers, Activity, Search, ShieldCheck, RefreshCw, Wifi, WifiOff, Terminal, Cpu, Trash2 } from 'lucide-react';

interface AppNode {
  id: string;
  name?: string;
  app_name?: string;
  appName?: string;
  tech_stack?: string;
  techStack?: string;
  category: 'WEB_APP' | 'GAME_ENGINE' | 'AI_MODULE' | 'API_SERVICE';
  status: 'PROTOTYPING' | 'DEVELOPMENT' | 'STABLE';
  updated_at?: string;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCloudLive, setIsCloudLive] = useState(true);

  // 📡 ฟังก์ชันโหลดข้อมูลโปรเจกต์จากตารางหลัก applications
  const fetchApps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('applications') // 🔄 เชื่อมต่อตารางหลักของมิติระบบเรียบร้อย
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // 🎯 แก้ไขตรงจุดนี้: แปลงผ่าน unknown เพื่อดับไฟแดงตัวตรวจไทป์ของ Vercel เรียบร้อยครับบอส!
        setApps(data as unknown as AppNode[]);
        setIsCloudLive(true);
        localStorage.setItem('matrix_core_apps_ledger', JSON.stringify(data));
      } else {
        loadLocalBackup();
      }
    } catch (err) {
      console.warn('⚡ Matrix Network Node: Applications cloud restricted. Triggering local VFS.');
      setIsCloudLive(false);
      loadLocalBackup();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalBackup = () => {
    const saved = localStorage.getItem('matrix_core_apps_ledger');
    if (saved) {
      setApps(JSON.parse(saved));
    } else {
      const defaultApps: AppNode[] = [
        { id: 'n-sight-web', name: 'N-SIGHT Web Platform', tech_stack: 'Next.js, Tailwind, TypeScript', category: 'WEB_APP', status: 'DEVELOPMENT' },
        { id: 'war-girl-core', name: 'Project War Girl Core', tech_stack: 'Unreal Engine 5, C++', category: 'GAME_ENGINE', status: 'PROTOTYPING' }
      ];
      setApps(defaultApps);
      localStorage.setItem('matrix_core_apps_ledger', JSON.stringify(defaultApps));
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // ลบข้อมูลโปรเจกต์ออกจากระบบ
  const handleDeleteApp = async (id: string) => {
    try {
      if (isCloudLive) {
        await supabase.from('applications').delete().eq('id', id);
        fetchApps();
      } else {
        const updated = apps.filter(app => app.id !== id);
        setApps(updated);
        localStorage.setItem('matrix_core_apps_ledger', JSON.stringify(updated));
      }
    } catch (err) {
      console.warn('Delete redirection failed.');
    }
  };

  // คำนวณสถิติระบบแบบเรียลไทม์
  const totalApps = apps.length;
  const stableCount = apps.filter(a => a.status === 'STABLE').length;
  const devCount = apps.filter(a => a.status === 'DEVELOPMENT').length;
  const protoCount = apps.filter(a => a.status === 'PROTOTYPING').length;

  const filteredApps = apps.filter(app => {
    const nameStr = app?.name || app?.app_name || app?.appName || '';
    const techStr = app?.tech_stack || app?.techStack || '';
    return nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
           techStr.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 transform-gpu max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <AppWindow className="text-purple-400" size={20} />
            Application Registry Ledger
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1 ${
              isCloudLive 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {isCloudLive ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isCloudLive ? 'SUPABASE ONLINE' : 'LOCAL SAFE MODE'}
            </span>
          </h2>
          <p className="text-xs text-slate-400">Monitor software deploy targets, architecture tech stacks, and environment states.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Search app vectors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 outline-none focus:border-purple-500/40 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 🛰️ แผงควบคุมระบบโทรมาตรอันใหม่ (System Telemetry & Connection Monitor) */}
        <div className="space-y-6">
          <GlassCard className="p-5 border border-slate-800/40 space-y-4">
            <div className="flex items-center gap-2 text-slate-200 text-xs font-mono uppercase tracking-wider border-b border-slate-900 pb-3">
              <Cpu size={14} className="text-purple-400" />
              <span>Core System Telemetry</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                <p className="text-[10px] text-slate-500 uppercase">Total Nodes</p>
                <p className="text-lg font-bold text-white mt-1">{totalApps}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                <p className="text-[10px] text-emerald-400 uppercase">Stable</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">{stableCount}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                <p className="text-[10px] text-cyan-400 uppercase">In Dev</p>
                <p className="text-lg font-bold text-cyan-400 mt-1">{devCount}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                <p className="text-[10px] text-amber-400 uppercase">Prototype</p>
                <p className="text-lg font-bold text-amber-400 mt-1">{protoCount}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 border border-slate-800/40 space-y-3">
            <div className="flex items-center gap-2 text-slate-200 text-xs font-mono uppercase tracking-wider border-b border-slate-900 pb-3">
              <Terminal size={14} className="text-cyan-400" />
              <span>External Node Link</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              External clusters can sync states automatically by targeting the registry endpoint payload:
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[10px] text-slate-400 overflow-x-auto select-all">
              <span className="text-purple-400">POST</span> /api/v1/apps/register<br/>
              Authorization: Bearer Token
            </div>
          </GlassCard>
        </div>

        {/* 📊 ตารางแสดงรายชื่อแอปพลิเคชันที่ดึงสัญญาณสดข้ามมิติจาก Supabase */}
        <div className="lg:col-span-2 space-y-4">
          <GlassCard className="p-4 border border-slate-800/60">
            {loading && apps.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-purple-400" />
                <span>SYNCHRONIZING SECURE APPLICATION LEDGER...</span>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-slate-500 italic">
                No active application streams registered in this cluster sector.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-950">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-900">
                      <th className="p-3">Application Identity</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {filteredApps.map((app) => {
                      const currentName = app.name || app.app_name || app.appName || 'Unknown App';
                      const currentTech = app.tech_stack || app.techStack || 'N/A';
                      
                      return (
                        <tr key={app.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 space-y-0.5">
                            <div className="font-sans font-medium text-white flex items-center gap-1.5">
                              <Code size={12} className="text-purple-400" />
                              {currentName}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span>Stack: {currentTech}</span>
                            </div>
                          </td>

                          <td className="p-3 text-slate-400 text-[11px] vertical-middle">
                            <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/60 text-[10px]">
                              {app.category}
                            </span>
                          </td>

                          <td className="p-3 text-center vertical-middle">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                              app.status === 'STABLE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : app.status === 'DEVELOPMENT'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {app.status}
                            </span>
                          </td>

                          <td className="p-3 text-center vertical-middle">
                            <button
                              onClick={() => handleDeleteApp(app.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          <div className="flex gap-3 justify-end text-[10px] font-mono text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className={isCloudLive ? "text-emerald-500" : "text-amber-500"} /> 
              {isCloudLive ? 'Supabase App Vector Stream OK' : 'Fault-Tolerant VFS Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
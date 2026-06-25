'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { supabase } from '@/lib/supabase/client';
import { 
  AppWindow, 
  Code, 
  Search, 
  ShieldCheck, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Terminal, 
  Cpu, 
  Trash2, 
  Radio, 
  ShieldAlert, 
  Building2, 
  Inbox,
  Layers
} from 'lucide-react';

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

interface SystemReport {
  id: string;
  client_system: string;
  issue_type: string;
  details: string;
  created_at: string;
}

export default function IntegratedApplicationsPage() {
  // 🎛️ ระบบแท็บควบคุมส่วนกลาง
  const [activeTab, setActiveTab] = useState<'registry' | 'telemetry'>('registry');

  // 📁 States ฝั่ง App Registry Ledger
  const [apps, setApps] = useState<AppNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingApps, setLoadingApps] = useState(true);
  const [isCloudLive, setIsCloudLive] = useState(true);

  // 🛰️ States ฝั่ง System Telemetry (รายงานปัญหาจากลูกค้า)
  const [reports, setReports] = useState<SystemReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [lastReportSync, setLastReportSync] = useState<string>('—');

  // 📡 1. ฟังก์ชันโหลดข้อมูลโปรเจกต์จากตารางหลัก applications
  const fetchApps = async () => {
    setLoadingApps(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data) {
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
      setLoadingApps(false);
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

  // 🛰️ 2. ท่อสตรีมดักจับรายงานปัญหาแบบ Realtime ลิงก์ตรงจากร้านอาหารเข้าฐานข้อมูล
  useEffect(() => {
    fetchApps();

    let telemetryActive = true;
    const fetchInitialReports = async () => {
      try {
        const { data, error } = await supabase
          .from('system_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (telemetryActive) setReports(data ?? []);
      } catch (err) {
        console.error('Failed to load telemetry logs:', err);
      } finally {
        if (telemetryActive) setLoadingReports(false);
      }
    };

    fetchInitialReports();

    const channel = supabase
      .channel('core-telemetry-stream-apps-page')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_reports' },
        (payload) => {
          if (!telemetryActive) return;
          console.log('New Telemetry Log Streamed:', payload);
          
          const newLog = payload.new as SystemReport;
          setReports((prev) => [newLog, ...prev]);
          setLastReportSync(new Date().toLocaleTimeString('en-GB'));
        }
      )
      .subscribe();

    return () => {
      telemetryActive = false;
      supabase.removeChannel(channel);
    };
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
    <div className="space-y-8 transform-gpu max-w-5xl text-slate-200">
      
      {/* 🌌 ส่วนหัวควบคุมฟีดระบบ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <AppWindow className="text-purple-400" size={20} />
            {activeTab === 'registry' ? 'Application Registry Ledger' : 'System Telemetry Feed'}
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1 ${
              isCloudLive 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {isCloudLive ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isCloudLive ? 'SUPABASE ONLINE' : 'LOCAL SAFE MODE'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeTab === 'registry' 
              ? 'Monitor software deploy targets, architecture tech stacks, and environment states.'
              : 'Decrypted real-time streaming of terminal bug vectors reported by runtime client nodes.'}
          </p>
        </div>

        {/* 🎛️ ปุ่มสลับมิติข้อมูลหน้าจอ (Tab Switcher) */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-900 self-start sm:self-center font-mono text-xs">
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'registry' 
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            🗂️ App Registry ({totalApps})
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'telemetry' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full bg-cyan-400 ${reports.length > 0 ? 'animate-pulse' : ''}`} />
            📡 Client Reports ({reports.length})
          </button>
        </div>
      </div>

      {/* 🎛️ Layout หลักแบ่ง 2 ฝั่งคอมโพเนนต์ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* 🛠️ แผงข้างซ้าย: แสดง Telemetry และสถิติตลอดเวลา */}
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
              <span>{activeTab === 'registry' ? 'External Node Link' : 'Telemetry Status'}</span>
            </div>
            {activeTab === 'registry' ? (
              <>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  External clusters can sync states automatically by targeting the registry endpoint payload:
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[10px] text-slate-400 overflow-x-auto select-all">
                  <span className="text-purple-400">POST</span> /api/v1/apps/register<br/>
                  Authorization: Bearer Token
                </div>
              </>
            ) : (
              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">Signal Stream:</span>
                  <span className="text-cyan-400 font-bold">ACTIVE</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">Live Logs Count:</span>
                  <span className="text-white font-bold">{reports.length} Logs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Sync:</span>
                  <span className="text-purple-400 font-bold">{lastReportSync}</span>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* 📊 แผงขวากลาง: แสดงผลเนื้อหาเปลี่ยนตามแท็บที่เลือก */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* 🗂️ หน้าจอที่ 1: แสดงตารางรายชื่อแอป (App Registry) */}
          {activeTab === 'registry' && (
            <>
              <div className="flex justify-end relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                <input
                  type="text"
                  placeholder="Filter vectors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 bg-slate-950 border border-slate-900 rounded-xl pl-8 pr-4 py-1.5 text-[11px] font-mono text-slate-200 outline-none focus:border-purple-500/40 transition-colors"
                />
              </div>

              <GlassCard className="p-4 border border-slate-800/60">
                {loadingApps && apps.length === 0 ? (
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
                                <div className="text-[10px] text-slate-500">
                                  <span>Stack: {currentTech}</span>
                                </div>
                              </td>
                              <td className="p-3 text-slate-400 text-[10px]">
                                <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/60">
                                  {app.category}
                                </span>
                              </td>
                              <td className="p-3 text-center">
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
                              <td className="p-3 text-center">
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
            </>
          )}

          {/* 📡 หน้าจอที่ 2: ฟีดสตรีมมิ่งสดรายงานปัญหาจากลูกค้า (Live Telemetry Logs) */}
          {activeTab === 'telemetry' && (
            <GlassCard className="p-4 border border-slate-800/60 space-y-4">
              {loadingReports && reports.length === 0 ? (
                <p className="text-xs font-mono text-slate-500 py-6 text-center animate-pulse">
                  Decrypting telemetry buffer packages...
                </p>
              ) : reports.length === 0 ? (
                <div className="border border-dashed border-slate-900 rounded-xl p-12 text-center">
                  <CheckCircle className="mx-auto text-emerald-400 mb-2" size={24} />
                  <p className="text-xs font-mono text-slate-400">All client terminals operating normally. Zero reports captured.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {reports.map((report) => (
                    <div 
                      key={report.id}
                      className="border border-slate-900 bg-black/20 rounded-xl p-4 space-y-2 hover:border-slate-800 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <ShieldAlert size={11} />
                          {report.issue_type}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(report.created_at).toLocaleString('th-TH')}
                        </span>
                      </div>
                      <p className="text-xs font-sans text-slate-300 leading-relaxed">{report.details}</p>
                      <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500 pt-1">
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Building2 size={11} /> Node: {report.client_system}
                        </span>
                        <span><Layers size={11} className="inline mr-1"/>ID: {report.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )}

          {/* ฟุตเตอร์แจ้งสถานะความปลอดภัยหลังบ้าน */}
          <div className="flex gap-3 justify-end text-[10px] font-mono text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className={isCloudLive ? "text-emerald-500" : "text-amber-500"} /> 
              {isCloudLive ? 'Matrix Vector Stream Synced' : 'Fault-Tolerant VFS Active'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
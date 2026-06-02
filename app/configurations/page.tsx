'use client';
import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Settings, ShieldAlert, Download, Upload, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function ConfigurationsPage() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(true);

  // 📥 ฟังก์ชันดูดข้อมูลทั้งหมดในเครื่องออกเป็นไฟล์ JSON (Export Backup)
  const handleExportBackup = () => {
    try {
      const backupData = {
        quotes: localStorage.getItem('matrix_core_quote_history'),
        customers: localStorage.getItem('matrix_core_customer_ledger'),
        apps: localStorage.getItem('matrix_core_apps_ledger'),
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MATRIX_CORE_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      triggerNotification('Core data ledger matrix exported successfully.', true);
    } catch (err) {
      triggerNotification('Failed to execute backup sequence.', false);
    }
  };

  // 📤 ฟังก์ชันอ่านไฟล์ JSON กลับเข้าความจำเบราว์เซอร์ (Import Backup)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        if (parsed.quotes) localStorage.setItem('matrix_core_quote_history', parsed.quotes);
        if (parsed.customers) localStorage.setItem('matrix_core_customer_ledger', parsed.customers);
        if (parsed.apps) localStorage.setItem('matrix_core_apps_ledger', parsed.apps);

        triggerNotification('System memory overwritten with backup matrix successfully. Reloading data...', true);
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        triggerNotification('Invalid database matrix structure. Operational aborted.', false);
      }
    };
    reader.readAsText(file);
  };

  // 🚨 ฟังก์ชันล้างไพ่ เคลียร์ข้อมูลทุกอย่างในเครื่องทิ้ง (Factory Reset)
  const handlePurgeAllCache = () => {
    if (confirm('CRITICAL WARNING: This action will completely wipe all local quotations, customers, and application registries. Proceed?')) {
      localStorage.removeItem('matrix_core_quote_history');
      localStorage.removeItem('matrix_core_customer_ledger');
      localStorage.removeItem('matrix_core_apps_ledger');
      
      triggerNotification('All cluster data purged. Resetting memory blocks...', true);
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const triggerNotification = (msg: string, success: boolean) => {
    setStatusMessage(msg);
    setIsSuccess(success);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-8 transform-gpu max-w-4xl">
      {/* ส่วนหัวระบบ */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="text-slate-400" size={20} />
          System Configurations
        </h2>
        <p className="text-xs text-slate-400">Control local memory allocations, export database structures, or execute cluster factory resets.</p>
      </div>

      {/* 🔔 ป้ายเตือนสถานะเมื่อทำงานสำเร็จ */}
      {statusMessage && (
        <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all ${
          isSuccess 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {isSuccess ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 📦 แผงจัดการข้อมูลสำรอง (Backup Ledger) */}
        <GlassCard className="p-6 space-y-4 border border-slate-800/40">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-white">Data Matrix Backup Control</h3>
            <p className="text-[11px] text-slate-400">Download or restore your local sandbox entries into a singular portable JSON data stream.</p>
          </div>

          <div className="pt-2 space-y-3 font-mono text-xs">
            {/* ปุ่มดาวน์โหลดข้อมูลเก็บไว้ */}
            <button
              onClick={handleExportBackup}
              className="w-full flex items-center justify-between p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-xl transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <Download size={14} className="text-cyan-400" />
                <span>Export Configuration Data (.json)</span>
              </div>
            </button>

            {/* ปุ่มอัปโหลดข้อมูลฟื้นคืนชีพ */}
            <label className="w-full flex items-center justify-between p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-xl transition-all cursor-pointer active:scale-[0.99]">
              <div className="flex items-center gap-2">
                <Upload size={14} className="text-purple-400" />
                <span>Import System Data Matrix</span>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </GlassCard>

        {/* 🚨 แผงเขตอันตราย (Danger Zone) */}
        <GlassCard className="p-6 space-y-4 border border-rose-500/10 bg-rose-950/5">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-rose-400 flex items-center gap-1.5">
              <ShieldAlert size={16} />
              Danger Zone Protocol
            </h3>
            <p className="text-[11px] text-slate-400">Irreversible operational actions. Performing these steps will permanently clear your environment memory.</p>
          </div>

          <div className="pt-2 font-mono text-xs">
            <button
              onClick={handlePurgeAllCache}
              className="w-full flex items-center justify-between p-3 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl transition-all"
            >
              <div className="flex items-center gap-2">
                <Trash2 size={14} />
                <span>Purge Local Cluster Cache</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold uppercase">Reset</span>
            </button>
          </div>
        </GlassCard>
      </div>

      {/* แผงบอกเวอร์ชันด้านล่างสุด */}
      <GlassCard className="p-4 flex items-center justify-between text-[10px] font-mono text-slate-500 border border-slate-900/40">
        <div className="flex items-center gap-1.5">
          <RefreshCw size={12} className="text-slate-600" />
          <span>Local Client Version: v2.0.26-STABLE</span>
        </div>
        <span>Architecture Node: Mac Core Virtual File System</span>
      </GlassCard>
    </div>
  );
}
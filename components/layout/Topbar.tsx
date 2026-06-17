'use client';
import React from 'react';
import { Search, Bell, Command, User } from 'lucide-react';
import { useDashboardStore } from '@/store/useDashboardStore';

export default function Topbar() {
  const { toggleCommandPalette } = useDashboardStore() as any;

  return (
    <header className="h-16 border-b border-slate-900 bg-slate-950/30 backdrop-blur-md px-6 flex items-center justify-between">
      <div 
        onClick={toggleCommandPalette}
        className="w-72 hidden md:flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/50 cursor-pointer hover:border-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Search size={14} />
          <span>Search system protocols...</span>
        </div>
        <kbd className="text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400 font-mono flex items-center gap-0.5">
          <Command size={10} />K
        </kbd>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <button className="relative p-2 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-cyan-400 transition-all">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,1)]" />
        </button>

        <div className="h-8 w-px bg-slate-800" />

        <div className="flex items-center gap-3 pl-2">
          <div className="w-8 h-8 rounded-full border border-cyan-500/40 bg-slate-900 flex items-center justify-center text-cyan-400">
            <User size={14} />
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-200">Cmdr. Ely S.</p>
            <p className="text-[9px] text-purple-400 font-mono">System Architect</p>
          </div>
        </div>
      </div>
    </header>
  );
}
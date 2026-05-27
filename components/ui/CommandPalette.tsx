'use client';
import React, { useEffect } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Cpu, Users, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CommandPalette() {
  const { isCommandPaletteOpen, toggleCommandPalette } = useDashboardStore();
  const router = useRouter();

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleDown);
    return () => window.removeEventListener('keydown', handleDown);
  }, [isCommandPaletteOpen, toggleCommandPalette]);

  const navigate = (path: string) => {
    router.push(path);
    toggleCommandPalette();
  };

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCommandPalette}
            className="fixed inset-0 bg-black/60 backdrop-blur-md" 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative z-10"
          >
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <Search className="text-cyan-400" size={18} />
              <input 
                autoFocus
                placeholder="Type a cosmic route identifier or utility..." 
                className="w-full bg-transparent border-0 outline-none text-slate-200 text-sm placeholder:text-slate-500"
              />
            </div>
            <div className="p-2 max-h-60 overflow-y-auto space-y-0.5">
              <p className="text-[10px] font-mono tracking-widest text-slate-500 px-3 py-2 uppercase">Navigations</p>
              <button onClick={() => navigate('/customers')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg text-left transition-colors">
                <Users size={16} className="text-purple-400" />
                <span>Jump to Customer Hub Matrix</span>
              </button>
              <button onClick={() => navigate('/apps')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg text-left transition-colors">
                <Cpu size={16} className="text-cyan-400" />
                <span>Access Node Application Repositories</span>
              </button>
              <button onClick={() => navigate('/quotation')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg text-left transition-colors">
                <FileText size={16} className="text-emerald-400" />
                <span>Generate Enterprise Quantum Quotation</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
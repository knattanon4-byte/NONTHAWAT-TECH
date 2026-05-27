'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Cpu, FileSpreadsheet, BrainCircuit, Settings, Menu, X } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Applications', href: '/apps', icon: Cpu },
  { name: 'Quotations', href: '/quotation', icon: FileSpreadsheet },
  { name: 'AI Analytics', href: '/ai-analytics', icon: BrainCircuit },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 lg:hidden"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            className="fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur-md p-6 flex flex-col justify-between transform-gpu lg:static lg:flex"
          >
            <div>
              <div className="flex items-center gap-3 mb-10 pl-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 via-purple-500 to-indigo-600 flex items-center justify-center font-bold text-black text-xs tracking-tighter shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                  N
                </div>
                <div>
                  {/* แก้ไขชื่อแบรนดิ้งระบบตรงนี้ */}
                  <h1 className="text-xs font-bold tracking-widest text-white uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    NONTHAWAT.TECH
                  </h1>
                  <p className="text-[9px] text-cyan-400/70 font-mono tracking-widest">CORE INTERFACE</p>
                </div>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} className="relative block group">
                      {isActive && (
                        <motion.div 
                          layoutId="activeNavGlow" 
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent rounded-xl border-l-2 border-cyan-400 shadow-[inset_10px_0_20px_rgba(34,211,238,0.02)] transform-gpu"
                        />
                      )}
                      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm transform-gpu ${
                        isActive ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-white/5'
                      }`}>
                        <item.icon size={18} className={isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'} />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-slate-900 pt-4">
              <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white transition-colors text-sm">
                <Settings size={18} />
                <span>System Configurations</span>
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
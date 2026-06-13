'use client';
import React from 'react';
// 🎯 1. นำเข้า Link และ usePathname ของ Next.js
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, AppWindow, FileSpreadsheet, BrainCircuit, Bell, Search } from 'lucide-react';

interface CeoLayoutProps {
  children: React.ReactNode;
}

// 🎯 2. ใส่ลิงก์ (href) ปลายทางให้แต่ละปุ่ม
const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Applications', href: '/apps', icon: AppWindow },
  { name: 'Quotations', href: '/quotation', icon: FileSpreadsheet },
  { name: 'AI Analytics', href: '/ai-analytics', icon: BrainCircuit }
];

export default function CeoLayout({ children }: CeoLayoutProps) {
  const pathname = usePathname(); // 🎯 3. ดึง URL ปัจจุบันมาตรวจสอบ

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] flex font-sans">
      {/* 🌌 Sidebar ฝั่งแผงควบคุมหลักสีน้ำเงินดำล้ำยุค */}
      <aside className="w-64 bg-[#0D1424] border-r border-[#1E293B] flex flex-col p-6 space-y-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
            N
          </div>
          <div>
            <h2 className="font-bold tracking-wider text-sm text-white">NONTHAWAT.TECH</h2>
            <p className="text-[9px] font-mono tracking-widest text-[#64748B]">CORE INTERFACE</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 text-xs">
          {navItems.map((item, idx) => {
            // 🎯 4. เช็กว่าลิงก์ปุ่มนี้ ตรงกับหน้าเว็บที่กำลังเปิดอยู่ไหม
            const isActive = pathname === item.href; 
            
            return (
              /* 🎯 5. เปลี่ยนจากปุ่มบอดๆ เป็นแท็ก <Link> */
              <Link
                key={idx}
                href={item.href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[#1E293B] text-blue-400 font-semibold border-l-4 border-blue-500' 
                    : 'text-[#94A3B8] hover:bg-[#1E293B]/50 hover:text-white'
                }`}
              >
                <item.icon size={16} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-[#1E293B] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center text-xs font-bold text-blue-400">N</div>
          <span className="text-[10px] font-mono text-[#64748B]">SYSTEM OPERATIONAL</span>
        </div>
      </aside>

      {/* 💻 Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Panel */}
        <header className="h-16 border-b border-[#1E293B] bg-[#0D1424]/50 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={14} />
            <input 
              type="text" 
              placeholder="Search system protocols..." 
              className="w-full bg-[#131B2E] border border-[#1E293B] rounded-xl pl-9 pr-4 py-1.5 text-xs outline-none focus:border-blue-500 transition-colors placeholder:text-[#475569]"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="relative p-1.5 text-[#94A3B8] hover:text-white">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
            </button>
            <div className="flex items-center gap-3 border-l border-[#1E293B] pl-6">
              <div className="text-right">
                <p className="text-xs font-bold text-white">Cmdr. Ely S.</p>
                <p className="text-[9px] text-[#64748B] font-mono">System Architect</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-0.5 animate-pulse">
                <div className="w-full h-full bg-[#0D1424] rounded-full flex items-center justify-center text-xs font-bold">ES</div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Panel */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
'use client';
import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from '../ui/CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();

  return (
    <div className="flex min-h-screen bg-[#02040a] text-slate-100 overflow-x-hidden antialiased">
      {/* Premium Stars/Background Layer Ambient Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/20 via-black to-black pointer-events-none z-0" />
      
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 z-10">
        <Topbar />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
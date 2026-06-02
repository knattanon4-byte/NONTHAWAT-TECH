'use client';
import React from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { Shield, Eye } from 'lucide-react';

export default function CustomerTable() {
  const { customers, searchQuery, membershipFilter, setSelectedCustomerId } = useDashboardStore();

  // ระบบกรองข้อมูล Real-time ตาม Keyword และสถานะตั๋วสมาชิก
  const filtered = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMember = membershipFilter === 'ALL' || c.membership_level === membershipFilter;
    return matchesSearch && matchesMember;
  });

  if (filtered.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl transform-gpu">
        <p className="text-sm font-mono text-slate-500">No telemetry matrix records matching vectors.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20 transform-gpu">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/40 text-[10px] font-mono tracking-widest text-slate-400 uppercase">
            <th className="p-4">Entity Identifier</th>
            <th className="p-4">Membership Authorization</th>
            <th className="p-4">Total Allocations</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900 text-sm text-slate-300">
          {filtered.map(c => (
            <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group duration-150">
              <td className="p-4">
                <div className="font-semibold text-slate-200">{c.name}</div>
                <div className="text-xs font-mono text-slate-500">{c.email}</div>
              </td>
              <td className="p-4">
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  c.membership_level === 'BLACK' 
                    ? 'border-purple-500/30 bg-purple-500/5 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.05)]' 
                    : 'border-rose-500/30 bg-rose-500/5 text-rose-400'
                }`}>
                  <Shield size={10} />
                  {c.membership_level}
                </span>
              </td>
              <td className="p-4 font-mono text-xs text-slate-400">{c.total_projects} clusters</td>
              <td className="p-4 text-right">
                <button 
                  onClick={() => setSelectedCustomerId(c.id)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all active:scale-95 transform-gpu"
                >
                  <Eye size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
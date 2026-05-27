'use client';
import React from 'react';
import MetricCard from '@/components/dashboard/MetricCard';
import OverviewAreaChart from '@/components/charts/OverviewAreaChart';
import { GlassCard } from '@/components/ui/GlassCard';
import { useDashboardStore } from '@/store/useDashboardStore';

export default function DashboardPage() {
  const { customers, applications } = useDashboardStore();
  
  const totalProjectsCount = customers.reduce((acc, curr) => acc + curr.total_projects, 0);
  const redMembersCount = customers.filter(c => c.membership_level === 'RED').length;
  const blackMembersCount = customers.filter(c => c.membership_level === 'BLACK').length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Telemetry Station Dashboard
        </h2>
        <p className="text-sm text-slate-400">Real-time status configurations & cluster computational overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Enterprise Entities" value={customers.length} change="+12.4%" isPositive={true} glow="cyan" />
        <MetricCard title="Active Cluster Units" value={totalProjectsCount} change="+4.1%" isPositive={true} />
        <MetricCard title="Sub-Orbit (Red) Cells" value={redMembersCount} change="-2.5%" isPositive={false} />
        <MetricCard title="Deep Matrix (Black) Node" value={blackMembersCount} change="+18.2%" isPositive={true} glow="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-mono tracking-wider uppercase text-slate-300">Operational Vector Ingress</h4>
            <span className="text-[10px] text-cyan-400 font-mono border border-cyan-500/20 px-2 py-0.5 rounded bg-cyan-500/5">LIVE STREAMING</span>
          </div>
          <OverviewAreaChart />
        </GlassCard>

        <GlassCard>
          <h4 className="text-sm font-mono tracking-wider uppercase text-slate-300 mb-6">Active Sync Repositories</h4>
          <div className="space-y-4">
            {applications.map(app => (
              <div key={app.id} className="p-3 border border-slate-800 bg-slate-950/40 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">{app.name}</p>
                  <p className="text-[10px] font-mono text-slate-500">{app.version}</p>
                </div>
                <span className={`w-2 h-2 rounded-full ${app.status === 'ACTIVE' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]' : 'bg-amber-500'}`} />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
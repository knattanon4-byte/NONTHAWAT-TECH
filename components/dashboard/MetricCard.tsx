'use client';
import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  glow?: 'cyan' | 'purple' | 'none';
}

export default function MetricCard({ title, value, change, isPositive, glow = 'none' }: MetricCardProps) {
  return (
    <GlassCard glowColor={glow} className="relative overflow-hidden group">
      <p className="text-xs font-mono tracking-wider text-slate-400 uppercase">{title}</p>
      <div className="flex items-baseline gap-4 mt-3">
        <h3 className="text-3xl font-bold tracking-tight text-white">{value}</h3>
        <span className={`flex items-center text-xs font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-500'}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </span>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
    </GlassCard>
  );
}
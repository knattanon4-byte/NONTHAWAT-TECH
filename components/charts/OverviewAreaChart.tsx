'use client';
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const data = [
  { name: 'Stardate 01', telemetry: 4000 },
  { name: 'Stardate 02', telemetry: 4500 },
  { name: 'Stardate 03', telemetry: 5100 },
  { name: 'Stardate 04', telemetry: 4900 },
  { name: 'Stardate 05', telemetry: 6200 },
  { name: 'Stardate 06', telemetry: 7800 },
];

export default function OverviewAreaChart() {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="cyanGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
          <YAxis stroke="#475569" fontSize={10} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
            labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
          />
          <Area type="monotone" dataKey="telemetry" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#cyanGlow)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
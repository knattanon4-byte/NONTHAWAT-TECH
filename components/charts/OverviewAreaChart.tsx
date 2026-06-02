'use client';
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useDashboardStore } from '@/store/useDashboardStore';

export default function OverviewAreaChart() {
  const { customers } = useDashboardStore();

  // ตรวจสอบสัญญาณ: ถ้ายังไม่มีรายชื่อลูกค้าในระบบ ให้ปรับค่าเวกเตอร์ telemetry เป็น 0 ทั้งหมด
  const hasData = customers.length > 0;

  const data = [
    { name: 'Stardate 01', telemetry: hasData ? 4000 : 0 },
    { name: 'Stardate 02', telemetry: hasData ? 4500 : 0 },
    { name: 'Stardate 03', telemetry: hasData ? 5100 : 0 },
    { name: 'Stardate 04', telemetry: hasData ? 4900 : 0 },
    { name: 'Stardate 05', telemetry: hasData ? 6200 : 0 },
    { name: 'Stardate 06', telemetry: hasData ? 7800 : 0 },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="cyanGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={hasData ? 0.3 : 0.05}/>
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
          {/* ปรับให้ Y-Axis เริ่มต้นสเกลที่ 0 เสมอ */}
          <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={[0, 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
            labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
          />
          <Area 
            type="monotone" 
            dataKey="telemetry" 
            stroke={hasData ? '#22d3ee' : '#334155'} 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#cyanGlow)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
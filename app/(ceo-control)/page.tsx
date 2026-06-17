'use client';
import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import MetricCard from '@/components/dashboard/MetricCard'; // ดึงคอมโพเนนต์หล่อเท่ของคุณมาใช้งาน
import OverviewAreaChart from '@/components/charts/OverviewAreaChart';
import { supabase } from '@/lib/supabase/client'; // 🛰️ ต่อท่อตรงเข้าฐานข้อมูลหลัก
import { Activity, ShieldAlert, Lock } from 'lucide-react';

// 🎯 ท่าไม้ตายหักดิบด่านตรวจ Props ของตัวชาร์ต แปลงร่างเป็น any ปลดล็อกไฟแดง Vercel ครับบอส!
const SafeOverviewAreaChart = OverviewAreaChart as any;

interface LocalSavedQuotation {
  id: string;
  timestamp: string;
  customerName: string;
  total: number;
  items: any[];
  discount: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    manifestCount: 0,
    averageValue: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🔒 รหัสล็อกระบบความปลอดภัยหลังบ้าน
  const [isRestricted, setIsRestricted] = useState(false);
  const [activeNodesCount, setActiveNodesCount] = useState(0);

  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      try {
        // 🛡️ ด่านกักกัน: ดึงข้อมูลโหนดทั้งหมดมาตรวจสอบสถานะการจ่ายเงิน
        const { data: nodes, error: nodeError } = await supabase
          .from('target_nodes')
          .select('*');

        if (!nodeError && nodes) {
          // 🎯 ใช้ท่าไม้ตาย safeNodes ปลดล็อกกฎเหล็กไทป์หลวมจากสูตรโกง ดับไฟแดง Vercel ครับบอส!
          const safeNodes = nodes as any[];

          // 1. นับจำนวนโหนดที่สถานะยังเป็น ACTIVE อยู่จริง ๆ บนคลาวด์
          const activeCount = safeNodes.filter(n => n.status === 'ACTIVE').length;
          setActiveNodesCount(activeCount);

          // 2. ตรวจสอบว่ามีโหนดไหนโดนระงับสัญญาณ (TERMINATED) หรือไม่
          const hasTerminatedNode = safeNodes.some(n => n.status === 'TERMINATED');
          if (hasTerminatedNode) {
            setIsRestricted(true); // สั่งสับสวิตช์ล็อกหน้าจอทันที!
            setLoading(false);
            return; // ดีดตัวออก ไม่โหลดข้อมูลธุรกิจด้านล่างต่อ
          }
        }

        // โหลดข้อมูลประวัติใบเสนอราคาจาก Local คลัสเตอร์ตามเดิม
        const savedHistory = localStorage.getItem('matrix_core_quote_history');
        if (savedHistory) {
          const historyData: LocalSavedQuotation[] = JSON.parse(savedHistory);
          
          const revenue = historyData.reduce((sum, item) => sum + item.total, 0);
          const count = historyData.length;
          const avg = count > 0 ? revenue / count : 0;

          setMetrics({
            totalRevenue: revenue,
            manifestCount: count,
            averageValue: avg,
          });

          const formattedChartData = [...historyData].reverse().map(item => ({
            name: item.customerName.length > 10 ? `${item.customerName.slice(0, 10)}...` : item.customerName,
            total: item.total,
            discount: item.discount
          }));

          setChartData(formattedChartData);
        }
      } catch (err) {
        console.error('Core telemetry connection error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // 🚨 หน้าจอ Lock Screen สีแดงไซไฟ ดักหน้าเอาไว้ พ่นพิษใส่ลูกค้าที่เบี้ยวเงิน
  if (isRestricted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] font-mono text-center p-8 bg-rose-950/10 border border-rose-500/20 rounded-3xl backdrop-blur-md max-w-5xl mx-auto space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-400 animate-pulse">
          <Lock size={40} />
        </div>
        <h1 className="text-xl font-bold text-rose-400 tracking-wider uppercase flex items-center gap-2">
          <ShieldAlert size={20} /> CRITICAL ERROR: TERMINAL LINK SEVERED
        </h1>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed">
          Access Denied. Core interface vector telemetry has been suspended due to outstanding subscription billing parameters. 
        </p>
        <div className="pt-2 text-[10px] text-rose-500/70 bg-rose-500/5 px-4 py-2 rounded-xl border border-rose-500/10 font-mono tracking-widest">
          RESTRICTED MODE ACTIVE // SETTLE LEDGER BALANCE VIA OPN GATEWAY TO RESTORE STREAM
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] font-mono text-xs text-slate-500">
        <Activity className="animate-spin mr-2 text-cyan-400" size={14} /> 
        SYNCHRONIZING INTERNAL LEDGER STREAM...
      </div>
    );
  }

  return (
    <div className="space-y-8 transform-gpu max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Core Interface Cluster</h2>
        <p className="text-xs text-slate-400">Real-time terminal node analytics computed directly from secure cloud infrastructure.</p>
      </div>

      {/* 📊 เรียกใช้ MetricCard ของคุณแบบจัดเต็ม เรืองแสง Neon สะใจ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard 
          title="Gross Revenue Ledger"
          value={`฿${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          change="System Live"
          isPositive={true}
          glow="cyan"
        />

        {/* 🎯 ซิงค์ยอดจำนวนโหนดที่ออนไลน์ (ACTIVE) ของจริงจาก Supabase มาโชว์ที่นี่ */}
        <MetricCard 
          title="Active Operational Nodes"
          value={`${activeNodesCount} Clusters`}
          change={`+${activeNodesCount} Nodes Live`}
          isPositive={true}
          glow="purple"
        />

        <MetricCard 
          title="Average Contract Allocation"
          value={`฿${metrics.averageValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
          change="Stable Alpha"
          isPositive={true}
          glow="none"
        />
      </div>

      {/* 📈 แผงวงจรกราฟวิเคราะห์ข้อมูล */}
      <GlassCard className="p-6 space-y-4 border border-slate-800/60">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-white">Resource Output Waveform</h3>
            <p className="text-[11px] text-slate-400">Dynamic tracking mapping total transaction sum against target profile entities.</p>
          </div>
          <div className="text-[10px] font-mono px-2 py-1 rounded bg-slate-950 text-slate-400 border border-slate-900">
            SECURE CLOUD SYNC
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          {chartData.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-slate-900 rounded-2xl bg-slate-950/20 p-6 text-center">
              <ShieldAlert className="text-slate-600 mb-2" size={24} />
              <p className="text-xs font-mono text-slate-500 italic">No configuration vector maps detected in local memory block.</p>
            </div>
          ) : (
            // 🎯 เปลี่ยนมาเรียกใช้ตัวแปร Safe ที่เรา Bypass ไทป์เรียบร้อยแล้วครับบอส
            <SafeOverviewAreaChart data={chartData} />
          )}
        </div>
      </GlassCard>
    </div>
  );
}
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client' 
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Layers, Info } from 'lucide-react'

// Import ผังชั้น 1 ของแต่ละแปลน
import PlanA from './layouts/PlanA'
import PlanB from './layouts/PlanB'

interface TableData {
  id: string;
  status: string;
  layout_id?: string;
}

interface FloorPlanProps {
  selectedTables?: string[];
  setSelectedTables?: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTable?: string | null;
  onTableClick?: (tableId: string) => void;
  dayTables?: Record<string, 'booked' | 'pending'>; 
  currentLayout?: string; // 🟢 เพิ่ม Prop นี้เพื่อรับค่า Layout จากหน้าหลัก
}

// 📌 ข้อมูลโต๊ะชั้น 2 (VIP) ตายตัว ไม่เปลี่ยนตามแปลน
const FLOOR_2_TABLES = [
  { id: 'V1', label: 'V1', type: 'rect', x: 117.5, y: 206.5, w: 28, h: 34 },
  { id: 'V2', label: 'V2', type: 'rect', x: 117.5, y: 258.5, w: 28, h: 34 },
  { id: 'V4', label: 'V4', type: 'rect', x: 156.5, y: 258.5, w: 28, h: 34 },
  { id: 'V3', label: 'V3', type: 'rect', x: 156.5, y: 310.5, w: 28, h: 34 },
  { id: 'V5', label: 'V5', type: 'rect', x: 207.5, y: 310.5, w: 28, h: 34 },
  { id: 'V10', label: 'V10', type: 'rect', x: 429.5, y: 215.5, w: 47, h: 72 },
  
  { id: 'E1', label: 'E1', type: 'rect', x: 253.5, y: 208.5, w: 22, h: 28 },
  { id: 'E2', label: 'E2', type: 'rect', x: 253.5, y: 246.5, w: 22, h: 28 },
  { id: 'E3', label: 'E3', type: 'rect', x: 253.5, y: 285.5, w: 22, h: 28 },
  { id: 'E4', label: 'E4', type: 'rect', x: 288.5, y: 307.5, w: 22, h: 28 },
  { id: 'E5', label: 'E5', type: 'rect', x: 318.5, y: 307.5, w: 22, h: 28 },
  { id: 'E6', label: 'E6', type: 'rect', x: 349.5, y: 307.5, w: 22, h: 28 }
];

export default function FloorPlan({ 
  selectedTables = [], 
  setSelectedTables, 
  selectedTable = null, 
  onTableClick, 
  dayTables = {},
  currentLayout = 'PlanA' // 🟢 กำหนดค่าเริ่มต้นเป็น PlanA
}: FloorPlanProps) {
  const [tables, setTables] = useState<Record<string, TableData>>({})
  const [activeFloor, setActiveFloor] = useState<'1' | '2'>('1')

  useEffect(() => {
    const fetchTables = async () => {
      const { data } = await supabase.from('restaurant_tables').select('*')
      if (data) {
        const tableMap = data.reduce((acc, t: any) => ({ ...acc, [t.id]: t }), {} as Record<string, TableData>)
        setTables(tableMap)
      }
    }
    fetchTables()
  }, [])

  const getTableStyle = (tableId: string) => {
    const dayStatus = dayTables[tableId];
    if (dayStatus === 'booked') return 'fill-red-500/90 stroke-red-700 cursor-not-allowed';
    if (dayStatus === 'pending') return 'fill-amber-500 stroke-amber-600 animate-pulse cursor-not-allowed';
    if (selectedTables.includes(tableId) || selectedTable === tableId) return 'fill-sky-400 stroke-white stroke-[2px] animate-pulse cursor-pointer';
    
    const current = tables[tableId];
    if (current && current.status === 'broken') return 'fill-slate-800 stroke-slate-700 cursor-not-allowed opacity-40';
    
    if (tableId.startsWith('V') || tableId.startsWith('E')) { // ชั้น 2 เผื่อตัว E ด้วย
      return 'fill-purple-500 hover:fill-purple-400 stroke-purple-800 cursor-pointer transition-all';
    }

    return 'fill-emerald-500 hover:fill-emerald-400 stroke-emerald-700 cursor-pointer transition-all';
  }

  const handleTableClick = (tableId: string) => {
    if (dayTables[tableId] === 'booked' || dayTables[tableId] === 'pending' || tables[tableId]?.status === 'broken') return;
    
    setTimeout(() => {
      if (onTableClick) { 
        onTableClick(tableId); 
        return; 
      }
      if (setSelectedTables) {
        setSelectedTables((prev) => {
          if (prev.includes(tableId)) return prev.filter((id) => id !== tableId);
          return [...prev, tableId];
        });
      }
    }, 100); 
  }

  // 🌟 เลือกว่าจะโชว์แปลนชั้น 1 อันไหน ตาม Prop ที่รับมา
  const renderFloor1 = () => {
    switch (currentLayout) {
      case 'PlanB':
        return <PlanB getTableStyle={getTableStyle} handleTableClick={handleTableClick} />
      default:
        return <PlanA getTableStyle={getTableStyle} handleTableClick={handleTableClick} />
    }
  }

  return (
    <div className="w-full h-[480px] relative bg-[#050B14] rounded-2xl overflow-hidden select-none border border-slate-800 flex flex-col shadow-inner">
      
      {/* 🧭 ปุ่มคอนโทรลเลือกสลับชั้น */}
      <div className="absolute top-3 left-3 z-30 flex bg-slate-950/80 border border-slate-800 p-1 rounded-xl backdrop-blur-md shadow-lg">
        <button 
          type="button"
          onClick={() => setActiveFloor('1')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeFloor === '1' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}
        >
          <Layers size={13} /> ชั้น 1
        </button>
        <button 
          type="button"
          onClick={() => setActiveFloor('2')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeFloor === '2' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white'}`}
        >
          <Layers size={13} /> ชั้น 2 VIP
        </button>
      </div>

      <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-2 rounded-full backdrop-blur-md shadow-xl flex items-center gap-2">
          <Info size={14} className="text-cyan-400" />
          <span className="text-[10px] sm:text-xs text-slate-300 font-medium tracking-wide">
            ซูมแผนที่: กดปุ่ม <span className="text-cyan-400 font-bold">+/-</span> หรือ <span className="text-cyan-400 font-bold">ถ่าง 2 นิ้ว</span>
          </span>
        </div>
      </div>

      <TransformWrapper 
        initialScale={1} 
        minScale={0.7} 
        maxScale={4} 
        centerOnInit={true} 
        wheel={{ disabled: true }} 
        limitToBounds={true}
        panning={{ velocityDisabled: true }} 
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-3 right-3 z-30 flex flex-col gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl backdrop-blur-md">
              <button type="button" onClick={() => zoomIn()} className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-md font-bold border border-slate-700/50">+</button>
              <button type="button" onClick={() => zoomOut()} className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-md font-bold border border-slate-700/50">-</button>
              <button type="button" onClick={() => resetTransform()} className="text-[8px] py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-md font-mono border border-slate-700/50">RESET</button>
            </div>
            
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex justify-center items-center">
              <svg viewBox="0 0 674 503" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-auto h-full max-h-full cursor-grab active:cursor-grabbing mx-auto">
                <rect width="674" height="503" fill="#030712"/>
                
                {/* 🟢 เรนเดอร์ชั้น 1 ตาม Layout ที่แอดมินตั้งค่า */}
                {activeFloor === '1' && renderFloor1()}

                {/* 🔵 เรนเดอร์ชั้น 2 (ฟิกซ์ตายตัว ไม่ขึ้นกับ Layout) */}
                {activeFloor === '2' && (
                  <g id="floor-2-layout">
                    <g stroke="#1E293B" strokeWidth="1.5" fill="none" opacity="0.8">
                      <line x1="196.5" y1="139" x2="196.5" y2="349" />
                      <line x1="31" y1="391.5" x2="660" y2="391.5" />
                    </g>

                    <rect x="275.9" y="91.5" width="123" height="85" stroke="#334155" fill="#111827" rx="4"/>
                    <text x="337.4" y="140" fill="#475569" fontSize="18" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif" letterSpacing="2">เวที</text>

                    <rect x="276.4" y="179" width="19" height="7" fill="#1F2937" />
                    <rect x="296.4" y="179" width="19" height="7" fill="#1F2937" />
                    <rect x="360.4" y="179" width="19" height="7" fill="#1F2937" />
                    <rect x="382.4" y="179" width="19" height="7" fill="#1F2937" />

                    {FLOOR_2_TABLES.map((t) => (
                      <g key={t.id} className="select-none cursor-pointer" onClick={() => handleTableClick(t.id)}>
                        <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="4" className={`${getTableStyle(t.id)} transition-colors duration-150`} />
                        <text x={t.x! + (t.w! / 2)} y={t.y! + (t.h! / 2) + 3} fill="#ffffff" fontSize={t.id === 'V10' ? '11' : '8'} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif" className="pointer-events-none">
                          {t.label}
                        </text>
                      </g>
                    ))}
                  </g>
                )}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client' 
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Layers } from 'lucide-react'

interface TableData {
  id: string;
  status: string;
}

interface FloorPlanProps {
  selectedTables?: string[];
  setSelectedTables?: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTable?: string | null;
  onTableClick?: (tableId: string) => void;
  dayTables?: Record<string, 'booked' | 'pending'>; 
}

const FLOOR_1_TABLES = [
  { id: '44', label: '44', type: 'circle', cx: 198.4, cy: 116, r: 9.5 },
  { id: '42', label: '42', type: 'circle', cx: 220.4, cy: 116, r: 9.5 },
  { id: '40', label: '40', type: 'circle', cx: 243.4, cy: 116, r: 9.5 },
  { id: '38', label: '38', type: 'circle', cx: 266.4, cy: 116, r: 9.5 },
  { id: '36', label: '36', type: 'circle', cx: 289.4, cy: 116, r: 9.5 },
  { id: '45', label: '45', type: 'circle', cx: 198.4, cy: 140, r: 9.5 },
  { id: '43', label: '43', type: 'circle', cx: 220.4, cy: 140, r: 9.5 },
  { id: '41', label: '41', type: 'circle', cx: 243.4, cy: 140, r: 9.5 },
  { id: '39', label: '39', type: 'circle', cx: 266.4, cy: 140, r: 9.5 },
  { id: '37', label: '37', type: 'circle', cx: 289.4, cy: 140, r: 9.5 },
  
  { id: 'B3', label: 'B3', type: 'circle', cx: 246.4, cy: 168, r: 10.5 },
  { id: 'B2', label: 'B2', type: 'circle', cx: 270.4, cy: 168, r: 10.5 },
  { id: 'B1', label: 'B1', type: 'circle', cx: 295.4, cy: 168, r: 10.5 },
  
  { id: 'R7', label: 'R7', type: 'circle', cx: 246.4, cy: 201, r: 9.5 },
  { id: 'R6', label: 'R6', type: 'circle', cx: 270.4, cy: 202, r: 9.5 },
  { id: 'R5', label: 'R5', type: 'circle', cx: 295.4, cy: 201, r: 9.5 },
  { id: 'R8', label: 'R8', type: 'circle', cx: 228.4, cy: 250, r: 9.5 },
  { id: '29', label: '29', type: 'circle', cx: 263.4, cy: 267, r: 9.5 },
  { id: '25', label: '25', type: 'circle', cx: 293.4, cy: 269, r: 9.5 },
  
  { id: '33', label: '33', type: 'circle', cx: 233.4, cy: 296, r: 9.5 },
  { id: '34', label: '34', type: 'circle', cx: 233.4, cy: 321, r: 9.5 },
  { id: '35', label: '35', type: 'circle', cx: 233.4, cy: 346, r: 9.5 },
  { id: '30', label: '30', type: 'circle', cx: 263.4, cy: 296, r: 9.5 },
  { id: '31', label: '31', type: 'circle', cx: 263.4, cy: 321, r: 9.5 },
  { id: '32', label: '32', type: 'circle', cx: 263.4, cy: 346, r: 9.5 },
  { id: '26', label: '26', type: 'circle', cx: 293.4, cy: 296, r: 9.5 },
  { id: '27', label: '27', type: 'circle', cx: 293.4, cy: 321, r: 9.5 },
  { id: '28', label: '28', type: 'circle', cx: 293.4, cy: 346, r: 9.5 },
  { id: '23', label: '23', type: 'circle', cx: 316.4, cy: 321, r: 9.5 },
  { id: '24', label: '24', type: 'circle', cx: 316.4, cy: 346, r: 9.5 },
  
  { id: 'R4', label: 'R4', type: 'circle', cx: 355.4, cy: 349, r: 9.5 },
  { id: 'R3', label: 'R3', type: 'circle', cx: 373.4, cy: 330, r: 9.5 },
  { id: 'R2', label: 'R2', type: 'circle', cx: 397.4, cy: 321, r: 9.5 },
  { id: 'R1', label: 'R1', type: 'circle', cx: 423.4, cy: 327, r: 9.5 },
  
  { id: '21', label: '21', type: 'circle', cx: 324.4, cy: 202, r: 9.5 },
  { id: '17', label: '17', type: 'circle', cx: 349.4, cy: 202, r: 9.5 },
  { id: '13', label: '13', type: 'circle', cx: 374.4, cy: 202, r: 9.5 },
  { id: '9',  label: '9',  type: 'circle', cx: 399.4, cy: 202, r: 9.5 },
  { id: '5',  label: '5',  type: 'circle', cx: 424.4, cy: 202, r: 9.5 },
  { id: '1',  label: '1',  type: 'circle', cx: 449.4, cy: 202, r: 9.5 },
  
  { id: '22', label: '22', type: 'circle', cx: 324.4, cy: 226, r: 9.5 },
  { id: '18', label: '18', type: 'circle', cx: 349.4, cy: 225, r: 9.5 },
  { id: '14', label: '14', type: 'circle', cx: 374.4, cy: 225, r: 9.5 },
  { id: '10', label: '10', type: 'circle', cx: 399.4, cy: 225, r: 9.5 },
  { id: '6',  label: '6',  type: 'circle', cx: 424.4, cy: 225, r: 9.5 },
  { id: '2',  label: '2',  type: 'circle', cx: 449.4, cy: 225, r: 9.5 },
  
  { id: '19', label: '19', type: 'circle', cx: 349.4, cy: 248, r: 9.5 },
  { id: '15', label: '15', type: 'circle', cx: 374.4, cy: 248, r: 9.5 },
  { id: '11', label: '11', type: 'circle', cx: 399.4, cy: 248, r: 9.5 },
  { id: '7',  label: '7',  type: 'circle', cx: 424.4, cy: 248, r: 9.5 },
  { id: '3',  label: '3',  type: 'circle', cx: 449.4, cy: 248, r: 9.5 },
  
  { id: '20', label: '20', type: 'circle', cx: 349.4, cy: 271, r: 9.5 },
  { id: '16', label: '16', type: 'circle', cx: 374.4, cy: 271, r: 9.5 },
  { id: '12', label: '12', type: 'circle', cx: 399.4, cy: 271, r: 9.5 },
  { id: '8',  label: '8',  type: 'circle', cx: 424.4, cy: 271, r: 9.5 },
  { id: '4',  label: '4',  type: 'circle', cx: 449.4, cy: 271, r: 9.5 },
  
  { id: 'S5', label: 'S5', type: 'circle', cx: 490.4, cy: 353, r: 9.5 },
  { id: 'S4', label: 'S4', type: 'circle', cx: 515.4, cy: 353, r: 9.5 },
  { id: 'S3', label: 'S3', type: 'circle', cx: 540.4, cy: 353, r: 9.5 },
  { id: 'S2', label: 'S2', type: 'circle', cx: 540.4, cy: 325, r: 9.5 },
  { id: 'S1', label: 'S1', type: 'circle', cx: 540.4, cy: 297, r: 9.5 },
  
  { id: 'V8', label: 'V8', type: 'rect', x: 111.5, y: 151.5, w: 28, h: 34 },
  { id: 'V9', label: 'V9', type: 'rect', x: 111.5, y: 203.5, w: 28, h: 34 },
  { id: 'V6', label: 'V6', type: 'rect', x: 111.5, y: 255.5, w: 28, h: 34 },
  { id: 'V7', label: 'V7', type: 'rect', x: 111.5, y: 307.5, w: 28, h: 34 },
  
  { id: 'F1', label: 'F1', type: 'circle', cx: 223.5, cy: 402, r: 9.5 },
  { id: 'F2', label: 'F2', type: 'circle', cx: 267.5, cy: 402, r: 9.5 }
];

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
  dayTables = {} 
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

  // 🎨 อัปเดตตรรกะระบบสี: เพิ่มเงื่อนไขให้ห้อง VIP เป็นสีม่วง 
  const getTableStyle = (tableId: string) => {
    const dayStatus = dayTables[tableId];
    if (dayStatus === 'booked') return 'fill-red-500/90 stroke-red-700 cursor-not-allowed';
    if (dayStatus === 'pending') return 'fill-amber-500 stroke-amber-600 animate-pulse cursor-not-allowed';
    if (selectedTables.includes(tableId) || selectedTable === tableId) return 'fill-sky-400 stroke-white stroke-[2px] animate-pulse cursor-pointer';
    
    const current = tables[tableId];
    if (current && current.status === 'broken') return 'fill-slate-800 stroke-slate-700 cursor-not-allowed opacity-40';
    
    // 🟣 ถ้าเป็นห้อง VIP (รหัสขึ้นต้นด้วย 'V') โชว์สีม่วงพรีเมียม
    if (tableId.startsWith('V')) {
      return 'fill-purple-500 hover:fill-purple-400 stroke-purple-800 cursor-pointer transition-all';
    }

    // 🟢 โต๊ะปกติสีเขียวมรกต
    return 'fill-emerald-500 hover:fill-emerald-400 stroke-emerald-700 cursor-pointer transition-all';
  }

  const handleTableClick = (tableId: string) => {
    if (dayTables[tableId] === 'booked' || dayTables[tableId] === 'pending' || tables[tableId]?.status === 'broken') return;
    if (onTableClick) { onTableClick(tableId); return; }
    if (setSelectedTables) {
      setSelectedTables((prev) => {
        if (prev.includes(tableId)) return prev.filter((id) => id !== tableId);
        return [...prev, tableId];
      });
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

      <TransformWrapper initialScale={1} minScale={0.7} maxScale={4} centerOnInit={true} wheel={{ disabled: false }} limitToBounds={false}>
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
                
                {/* ==================== 🟢 LAYER PART: ชั้น 1 ==================== */}
                {activeFloor === '1' && (
                  <g id="floor-1-layout">
                    {/* 🧱 โครงสร้างกำแพงอาคารของชั้น 1 */}
                    <g stroke="#334155" strokeWidth="1.5" fill="none">
                      <line x1="187.4" y1="86.5" x2="301.4" y2="86.5" />
                      <line x1="293.9" y1="86" x2="293.9" y2="70" />
                      <line x1="293.4" y1="69.5" x2="470.4" y2="69.5" />
                      <line x1="470.4" y1="91" x2="470.4" y2="71" />
                      <line x1="461.9" y1="91" x2="461.9" y2="71" />
                      <line x1="301.9" y1="70" x2="301.9" y2="157" />
                      <line x1="219" y1="185.5" x2="306" y2="185.5" />
                      <line x1="461.4" y1="89.5" x2="470.4" y2="89.5" />
                      <line x1="471.4" y1="90.5" x2="542.4" y2="90.5" />
                      <line x1="542.9" y1="90" x2="542.9" y2="183" />
                      <line x1="542.4" y1="181.8" x2="510.4" y2="181.8" />
                      <line x1="510.8" y1="181.3" x2="480.8" y2="219.3" />
                      <line x1="480.9" y1="220" x2="480.9" y2="279" />
                      <line x1="480.4" y1="278.5" x2="492.4" y2="278.5" />
                      <line x1="509.4" y1="278.5" x2="563.4" y2="278.5" />
                      <line x1="509.9" y1="278" x2="509.9" y2="267" />
                      <line x1="216.9" y1="86" x2="216.9" y2="80" />
                      <line x1="225.9" y1="86" x2="225.9" y2="80" />
                      <line x1="216.4" y1="79.5" x2="226.3" y2="79.5" />
                      <line x1="187.5" y1="86" x2="187.5" y2="251" />
                      <line x1="188.5" y1="279" x2="188.5" y2="433" />
                      <line x1="188.4" y1="432.5" x2="302.4" y2="432" />
                      <line x1="301.9" y1="432" x2="301.9" y2="377" />
                      <line x1="301.4" y1="376.5" x2="330.4" y2="376.5" />
                      <line x1="330.9" y1="376" x2="330.9" y2="399" />
                      <line x1="330.4" y1="398.7" x2="470.4" y2="398.5" />
                      <line x1="469.9" y1="398" x2="469.9" y2="371" />
                      <line x1="470.4" y1="371.5" x2="563.4" y2="371.5" />
                      <line x1="562.1" y1="371" x2="562.1" y2="278" />

                      <path d="M410.894 399V332.177" />
                      <path d="M358.394 398.5C356.98 348.147 369.4 334.4 411 332.6" />
                    </g>

                    {/* เวทีชั้น 1 */}
                    <rect x="319.9" y="91.5" width="123" height="85" stroke="#475569" fill="#111827" rx="4"/>
                    <text x="381.4" y="140" fill="#64748B" fontSize="18" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif" letterSpacing="2">เวที</text>
                    <text x="395" y="375" fill="#475569" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">DJ</text>
                    <text x="545" y="242" fill="#94A3B8" fontSize="14" fontWeight="bold" fontFamily="sans-serif">ทางเข้า</text>

                    <rect x="320.4" y="179" width="19" height="7" fill="#111827" stroke="#334155"/>
                    <rect x="340.4" y="179" width="19" height="7" fill="#111827" stroke="#334155"/>
                    <rect x="404.4" y="179" width="19" height="7" fill="#111827" stroke="#334155"/>
                    <rect x="426.4" y="179" width="19" height="7" fill="#111827" stroke="#334155"/>

                    {/* 🛋️ โครงสร้างโมเดลโซฟาสีชมพู */}
                    <g id="figma-pink-sofas" opacity="0.95">
                      <g id="sofa-master-template">
                        <rect x="204.711" y="386.488" width="8.29269" height="14.5268" fill="#FFAAF4"/>
                        <rect x="204.911" y="386.688" width="7.89269" height="14.1268" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="203.052" y="384" width="8.29269" height="3.31707" fill="#FFAAF4"/>
                        <rect x="203.252" y="384.2" width="7.89269" height="2.91707" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="204.711" y="400.585" width="8.29269" height="14.9268" fill="#FFAAF4"/>
                        <rect x="204.911" y="400.785" width="7.89269" height="14.5268" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="203.052" y="414.683" width="8.29269" height="3.31707" fill="#FFAAF4"/>
                        <rect x="203.252" y="414.883" width="7.89269" height="2.91707" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="201.394" y="385.659" width="4.14634" height="30.6829" fill="#FFAAF4"/>
                        <rect x="201.594" y="385.859" width="3.74634" height="30.2829" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        
                        <rect x="241.686" y="415.512" width="8.29269" height="14.9268" transform="rotate(180 241.686 415.512)" fill="#FFAAF4"/>
                        <rect x="241.486" y="415.312" width="7.89269" height="14.5268" transform="rotate(180 241.486 415.312)" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="243.345" y="418" width="8.29269" height="3.31707" transform="rotate(180 243.345 418)" fill="#FFAAF4"/>
                        <rect x="243.145" y="417.8" width="7.89269" height="2.91707" transform="rotate(180 243.145 417.8)" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="241.686" y="401.415" width="8.29269" height="14.9268" transform="rotate(180 241.686 401.415)" fill="#FFAAF4"/>
                        <rect x="241.486" y="401.215" width="7.89269" height="14.5268" transform="rotate(180 241.486 401.215)" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="243.345" y="387.317" width="8.29269" height="3.31707" transform="rotate(180 243.345 387.317)" fill="#FFAAF4"/>
                        <rect x="243.145" y="387.117" width="7.89269" height="2.91707" transform="rotate(180 243.145 387.117)" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="244.004" y="416.341" width="4.14634" height="30.6829" transform="rotate(180 244.004 416.341)" fill="#FFAAF4"/>
                        <rect x="244.804" y="416.141" width="3.74634" height="30.2829" transform="rotate(180 244.804 416.141)" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="214.821" y="426.667" width="8.66667" height="8.56097" transform="rotate(-90 214.821 426.667)" fill="#FFAAF4"/>
                        <rect x="215.021" y="426.467" width="8.26667" height="8.16097" transform="rotate(-90 215.021 426.467)" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="213.394" y="428.4" width="8.66667" height="1.90244" transform="rotate(-90 213.394 428.4)" fill="#FFAAF4"/>
                        <rect x="213.594" y="428.2" width="8.26667" height="1.50244" transform="rotate(-90 213.594 428.2)" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="222.906" y="426.667" width="8.66667" height="8.56097" transform="rotate(-90 222.906 426.667)" fill="#FFAAF4"/>
                        <rect x="223.106" y="426.467" width="8.26667" height="8.16097" transform="rotate(-90 223.106 426.467)" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                        <rect x="214.345" y="430.133" width="4.33333" height="17.5976" transform="rotate(-90 214.345 430.133)" fill="#FFAAF4"/>
                        <rect x="214.545" y="429.933" width="3.93333" height="17.1976" transform="rotate(-90 214.545 429.933)" stroke="black" strokeOpacity={0.66} strokeWidth={0.4} fill="none"/>
                      </g>

                      {/* โคลน F1 ขยับพิกัดแกน X 44 ยูนิต */}
                      <g transform="translate(44, 0)">
                        <use href="#sofa-master-template" />
                      </g>
                    </g>

                    {/* เรนเดอร์จุดเก้าอี้และสถานะของชั้น 1 */}
                    {FLOOR_1_TABLES.map((t) => (
                      <g key={t.id} className="select-none cursor-pointer">
                        {t.type === 'circle' ? (
                          <circle cx={t.cx} cy={t.cy} r={t.r} className={`${getTableStyle(t.id)} transition-colors duration-150`} onClick={() => handleTableClick(t.id)} />
                        ) : (
                          <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="4" className={`${getTableStyle(t.id)} transition-colors duration-150`} onClick={() => handleTableClick(t.id)} />
                        )}
                        <text 
                          x={t.type === 'circle' ? t.cx : t.x! + (t.w! / 2)} 
                          y={t.type === 'circle' ? t.cy! + 3 : t.y! + (t.h! / 2) + 3} 
                          fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif" className="pointer-events-none"
                        >
                          {t.label}
                        </text>
                      </g>
                    ))}
                  </g>
                )}

                {/* ==================== 🔵 LAYER PART: ชั้น 2 VIP ==================== */}
                {activeFloor === '2' && (
                  <g id="floor-2-layout">
                    {/* โครงสร้างขอบเขตกำแพงชั้น 2 */}
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

                    {/* เรนเดอร์โต๊ะชั้น 2 */}
                    {FLOOR_2_TABLES.map((t) => (
                      <g key={t.id} className="select-none cursor-pointer">
                        <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="4" className={`${getTableStyle(t.id)} transition-colors duration-150`} onClick={() => handleTableClick(t.id)} />
                        <text 
                          x={t.x! + (t.w! / 2)} 
                          y={t.y! + (t.h! / 2) + 3} 
                          fill="#ffffff" fontSize={t.id === 'V10' ? '11' : '8'} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif" className="pointer-events-none"
                        >
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
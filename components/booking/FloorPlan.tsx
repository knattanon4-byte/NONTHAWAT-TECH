'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client' 
// 📥ดึงระบบควบคุมการซูมและลากระดับโปรเข้ามาใช้งาน
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

interface TableData {
  id: string;
  status: string;
}

interface FloorPlanProps {
  selectedTable: string | null;
  setSelectedTable: (tableId: string | null) => void;
}

// คลังพิกัดเก้าอี้ทั้ง 62 ตัวของบอส (อยู่ครบถ้วนร้อยเปอร์เซ็นต์ครับ)
const RESTAURANT_TABLES = [
  { id: '44', label: '44', cx: 13, cy: 227 },
  { id: '42', label: '42', cx: 35, cy: 227 },
  { id: '40', label: '40', cx: 58, cy: 227 },
  { id: '38', label: '38', cx: 81, cy: 227 },
  { id: '36', label: '36', cx: 104, cy: 227 },
  { id: '45', label: '45', cx: 13, cy: 251 },
  { id: '43', label: '43', cx: 35, cy: 251 },
  { id: '41', label: '41', cx: 58, cy: 251 },
  { id: '39', label: '39', cx: 81, cy: 251 },
  { id: '37', label: '37', cx: 104, cy: 251 },
  { id: 'B3', label: 'B3', cx: 61, cy: 279 },
  { id: 'B2', label: 'B2', cx: 85, cy: 279 },
  { id: 'B1', label: 'B1', cx: 110, cy: 279 },
  { id: 'R7', label: 'R7', cx: 61, cy: 312 },
  { id: 'R6', label: 'R6', cx: 85, cy: 313 },
  { id: 'R5', label: 'R5', cx: 110, cy: 312 },
  { id: 'R8', label: 'R8', cx: 43, cy: 361 },
  { id: '29', label: '29', cx: 78, cy: 378 },
  { id: '25', label: '25', cx: 108, cy: 380 },
  { id: '33', label: '33', cx: 48, cy: 407 },
  { id: '34', label: '34', cx: 48, cy: 432 },
  { id: '35', label: '35', cx: 48, cy: 457 },
  { id: '30', label: '30', cx: 78, cy: 407 },
  { id: '31', label: '31', cx: 78, cy: 432 },
  { id: '32', label: '32', cx: 78, cy: 457 },
  { id: '26', label: '26', cx: 108, cy: 407 },
  { id: '27', label: '27', cx: 108, cy: 432 },
  { id: '28', label: '28', cx: 108, cy: 457 },
  { id: '23', label: '23', cx: 131, cy: 432 },
  { id: '24', label: '24', cx: 131, cy: 457 },
  { id: 'F1', label: 'F1', cx: 50, cy: 511 },
  { id: 'F2', label: 'F2', cx: 94, cy: 511 },
  { id: 'R4', label: 'R4', cx: 170, cy: 460 },
  { id: 'R3', label: 'R3', cx: 188, cy: 441 },
  { id: 'R2', label: 'R2', cx: 212, cy: 432 },
  { id: 'R1', label: 'R1', cx: 238, cy: 438 },
  { id: '21', label: '21', cx: 139, cy: 313 },
  { id: '17', label: '17', cx: 164, cy: 313 },
  { id: '13', label: '13', cx: 189, cy: 313 },
  { id: '9',  label: '9',  cx: 214, cy: 313 },
  { id: '5',  label: '5',  cx: 239, cy: 313 },
  { id: '1',  label: '1',  cx: 264, cy: 313 },
  { id: '22', label: '22', cx: 139, cy: 337 },
  { id: '18', label: '18', cx: 164, cy: 336 },
  { id: '14', label: '14', cx: 189, cy: 336 },
  { id: '10', label: '10', cx: 214, cy: 336 },
  { id: '6',  label: '6',  cx: 239, cy: 336 },
  { id: '2',  label: '2',  cx: 264, cy: 336 },
  { id: '19', label: '19', cx: 164, cy: 359 },
  { id: '15', label: '15', cx: 189, cy: 359 },
  { id: '11', label: '11', cx: 214, cy: 359 },
  { id: '7',  label: '7',  cx: 239, cy: 359 },
  { id: '3',  label: '3',  cx: 264, cy: 359 },
  { id: '20', label: '20', cx: 164, cy: 382 },
  { id: '16', label: '16', cx: 189, cy: 382 },
  { id: '12', label: '12', cx: 214, cy: 382 },
  { id: '8',  label: '8',  cx: 239, cy: 382 },
  { id: '4',  label: '4',  cx: 264, cy: 382 },
  { id: 'S5', label: 'S5', cx: 305, cy: 464 },
  { id: 'S4', label: 'S4', cx: 330, cy: 464 },
  { id: 'S3', label: 'S3', cx: 355, cy: 464 },
  { id: 'S2', label: 'S2', cx: 355, cy: 436 },
  { id: 'S1', label: 'S1', cx: 355, cy: 408 }
];

export default function FloorPlan({ selectedTable, setSelectedTable }: FloorPlanProps) {
  const [tables, setTables] = useState<Record<string, TableData>>({})

  useEffect(() => {
    const fetchTables = async () => {
      const { data } = await supabase.from('restaurant_tables').select('*')
      if (data) {
        const tableMap = data.reduce((acc, t: any) => ({ ...acc, [t.id]: t }), {} as Record<string, TableData>)
        setTables(tableMap)
      }
    }
    fetchTables()

    const channel = supabase
      .channel('table-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurant_tables' }, 
        (payload) => {
          const updated = payload.new as TableData
          setTables((prev) => ({ ...prev, [updated.id]: updated }))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const getTableStyle = (tableId: string) => {
    const current = tables[tableId]
    if (!current) return 'fill-slate-800 stroke-slate-700 stroke-[0.5px]' 
    if (selectedTable === tableId) return 'fill-sky-400 stroke-white stroke-[2px] animate-pulse cursor-pointer'

    switch (current.status) {
      case 'booked': return 'fill-red-500 stroke-red-700 cursor-not-allowed'
      case 'pending': return 'fill-amber-500 stroke-amber-600 animate-pulse'
      case 'available': return 'fill-emerald-500 hover:fill-emerald-400 stroke-emerald-700 cursor-pointer transition-all'
      default: return 'fill-slate-600 stroke-slate-500 cursor-not-allowed' 
    }
  }

  const handleTableClick = (tableId: string) => {
    if (tables[tableId]?.status === 'available') {
      setSelectedTable(tableId)
    }
  }

  return (
    // 🎯 ครอบคอนเทนเนอร์หลัก บังคับความสูงล็อกไว้ให้พอดีกรอบหน้าจอ
    <div className="w-full h-[360px] relative bg-slate-950 rounded-2xl overflow-hidden select-none border border-slate-800/80">
      
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={4}
        centerOnInit={true}
        wheel={{ disabled: false }} // เปิดให้ใช้ Scroll Wheel เมาส์เลื่อนซูมเข้าออกได้
        limitToBounds={false}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* 🟢 คลื่นคำสั่งลอยตัว: ชุดปุ่มกดซูมแบบสัมผัส เร่งมิติหล่อๆ มุมขวาบน */}
            <div className="absolute top-3 right-3 z-30 flex flex-col gap-1 bg-black/60 border border-slate-800 p-1 rounded-xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => zoomIn()}
                className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm border border-slate-700/40 transition-all active:scale-90"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => zoomOut()}
                className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm border border-slate-700/40 transition-all active:scale-90"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => resetTransform()}
                className="text-[8px] py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-md font-mono border border-slate-700/40 transition-all active:scale-90"
              >
                RESET
              </button>
            </div>

            {/* ข้อความบอกใบ้ไกด์ไลน์ลูกค้า */}
            <div className="absolute top-3 left-3 z-30 bg-black/50 px-2 py-0.5 rounded-full border border-slate-800/80 pointer-events-none">
              <p className="text-[9px] font-sans text-slate-400">💡 จีบนิ้วเพื่อซูม / ลากเพื่อเลื่อนดูโต๊ะ</p>
            </div>

            {/* 🟢 ตัวทรานส์ฟอร์ม Component ตัวคุมระเบียบการขยับและกวาดพิกัด */}
            <TransformComponent 
              wrapperClass="!w-full !h-full" 
              contentClass="!w-full !h-full flex justify-center items-center"
            >
              <svg 
                width="393" 
                height="852" 
                viewBox="0 0 393 852" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className="cursor-grab active:cursor-grabbing transition-shadow"
              >
                <g clipPath="url(#clip0_2002_2)">
                  <rect width="393" height="852" fill="#020617"/>
                  
                  {/* เส้นผนังร้านค้าและกำแพงกั้นโซน */}
                  <line x1="2" y1="197.5" x2="116" y2="197.5" stroke="#334155"/>
                  <line x1="108.5" y1="197" x2="108.5" y2="181" stroke="#334155"/>
                  <line x1="108" y1="180.5" x2="285" y2="180.5" stroke="#334155"/>
                  <line x1="285" y1="202.012" x2="285" y2="181.988" stroke="#334155"/>
                  <line x1="276.5" y1="202.012" x2="276.5" y2="181.988" stroke="#334155"/>
                  <line x1="116.5" y1="181" x2="116.5" y2="268" stroke="#334155"/>
                  <line x1="276" y1="200.5" x2="285" y2="200.5" stroke="#334155"/>
                  <line x1="286" y1="201.5" x2="357" y2="201.5" stroke="#334155"/>
                  <line x1="357.5" y1="201" x2="357.5" y2="294" stroke="#334155"/>
                  <line x1="357.01" y1="292.75" x2="324.998" y2="292.75" stroke="#334155"/>
                  <line x1="325.392" y1="292.31" x2="295.392" y2="330.31" stroke="#334155"/>
                  <line x1="295.5" y1="331" x2="295.5" y2="390" stroke="#334155"/>
                  <line x1="295" y1="389.5" x2="307" y2="389.5" stroke="#334155"/>
                  <line x1="324" y1="389.5" x2="378" y2="389.5" stroke="#334155"/>
                  <line x1="324.5" y1="389" x2="324.5" y2="378" stroke="#334155"/>
                  <line x1="31.5" y1="197" x2="31.5" y2="191" stroke="#334155"/>
                  <line x1="40.5" y1="197" x2="40.5" y2="191" stroke="#334155"/>
                  <line x1="31" y1="190.5" x2="41" y2="190.5" stroke="#334155"/>
                  <line x1="2.5" y1="197" x2="2.5" y2="543" stroke="#334155"/>

                  {/* เรนเดอร์เก้าอี้และตัวเลขระบุโต๊ะทั้งหมด */}
                  {RESTAURANT_TABLES.map((t) => (
                    <g key={t.id}>
                      <circle 
                        cx={t.cx} 
                        cy={t.cy} 
                        r="8.5" 
                        className={getTableStyle(t.id)} 
                        onClick={() => handleTableClick(t.id)} 
                      />
                      <text 
                        x={t.cx} 
                        y={t.cy + 3} 
                        fill="#ffffff" 
                        fontSize="8" 
                        fontWeight="bold" 
                        textAnchor="middle" 
                        fontFamily="sans-serif" 
                        className="pointer-events-none select-none"
                      >
                        {t.label}
                      </text>
                    </g>
                  ))}
                  
                  {/* ส่วนโซนเวทีหลัก */}
                  <rect x="134.5" y="202.5" width="123" height="85" stroke="#475569" fill="#1e293b"/>
                  <text x="196" y="252" fill="#e2e8f0" fontSize="24" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">เวที</text>
                  
                  {/* ซุ้มดีเจและแนวกำแพงด้านล่าง */}
                  <line x1="2.99777" y1="543.5" x2="117" y2="542.99" stroke="#334155"/>
                  <line x1="116.5" y1="543" x2="116.5" y2="488" stroke="#334155"/>
                  <line x1="116" y1="487.5" x2="145" y2="487.5" stroke="#334155"/>
                  <line x1="145.5" y1="487" x2="145.5" y2="510" stroke="#334155"/>
                  <line x1="144.997" y1="509.745" x2="284.999" y2="509.502" stroke="#334155"/>
                  <path d="M225.5 510V443.177" stroke="#334155"/>
                  <path d="M173 509.5C171.586 459.147 184.033 445.488 225.612 443.684" stroke="#334155"/>
                  <line x1="284.5" y1="509" x2="284.5" y2="482" stroke="#334155"/>
                  <line x1="285" y1="482.5" x2="378" y2="482.5" stroke="#334155"/>
                  <line x1="376.753" y1="482.001" x2="376.753" y2="388.997" stroke="#334155"/>
                  
                  <text x="196" y="482" fill="#94a3b8" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">DJ</text>

                  {/* ทางเข้าหน้าร้าน */}
                  <text x="330" y="370" fill="#e2e8f0" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">ทางเข้า</text>

                  {/* ลายเส้นโครงสร้างศิลปะโซฟาชุดสีชมพูของคุณพ่อ */}
                  <rect x="31.5171" y="497.688" width="7.89269" height="14.5268" stroke="#f472b6" strokeWidth="0.4" fill="#f472b6"/>
                  <rect x="29.6585" y="495" width="8.29269" height="3.31707" fill="#f472b6"/>
                  <rect x="31.3171" y="511.585" width="8.29269" height="14.9268" fill="#f472b6"/>
                  <rect x="29.6585" y="525.683" width="8.29269" height="3.31707" fill="#f472b6"/>
                  <rect x="28" y="496.659" width="4.14634" height="30.6829" fill="#f472b6"/>

                  <rect x="68.2927" y="526.512" width="8.29269" height="14.9268" transform="rotate(180 68.2927 526.512)" fill="#f472b6"/>
                  <rect x="69.9512" y="529" width="8.29269" height="3.31707" transform="rotate(180 69.9512 529)" fill="#f472b6"/>
                  <rect x="68.2927" y="512.415" width="8.29269" height="14.9268" transform="rotate(180 68.2927 512.415)" fill="#f472b6"/>
                  <rect x="69.9512" y="498.317" width="8.29269" height="3.31707" transform="rotate(180 69.9512 498.317)" fill="#f472b6"/>
                  <rect x="71.6098" y="527.341" width="4.14634" height="30.6829" transform="rotate(180 71.6098 527.341)" fill="#f472b6"/>

                  <rect x="41.4268" y="537.667" width="8.66667" height="8.56097" transform="rotate(-90 41.4268 537.667)" fill="#f472b6"/>
                  <rect x="40" y="539.4" width="8.66667" height="1.90244" transform="rotate(-90 40 539.4)" fill="#f472b6"/>
                  <rect x="49.5122" y="537.667" width="8.66667" height="8.56097" transform="rotate(-90 49.5122 537.667)" fill="#f472b6"/>
                  <rect x="57.5976" y="539.4" width="8.66667" height="1.90244" transform="rotate(-90 57.5976 539.4)" fill="#f472b6"/>
                  <rect x="40.9512" y="541.133" width="4.33333" height="17.5976" transform="rotate(-90 40.9512 541.133)" fill="#f472b6"/>

                  <rect x="75.5171" y="497.688" width="7.89269" height="14.5268" stroke="#f472b6" strokeWidth="0.4" fill="#f472b6"/>
                  <rect x="73.6585" y="495" width="8.29269" height="3.31707" fill="#f472b6"/>
                  <rect x="75.3171" y="511.585" width="8.29269" height="14.9268" fill="#f472b6"/>
                  <rect x="73.6585" y="525.683" width="8.29269" height="3.31707" fill="#f472b6"/>
                  <rect x="72" y="496.659" width="4.14634" height="30.6829" fill="#f472b6"/>

                  <rect x="112.293" y="526.512" width="8.29269" height="14.9268" transform="rotate(180 112.293 526.512)" fill="#f472b6"/>
                  <rect x="113.951" y="529" width="8.29269" height="3.31707" transform="rotate(180 113.951 529)" fill="#f472b6"/>
                  <rect x="112.293" y="512.415" width="8.29269" height="14.9268" transform="rotate(180 112.293 512.415)" fill="#f472b6"/>
                  <rect x="113.951" y="498.317" width="8.29269" height="3.31707" transform="rotate(180 113.951 498.317)" fill="#f472b6"/>
                  <rect x="115.61" y="527.341" width="4.14634" height="30.6829" transform="rotate(180 115.61 527.341)" fill="#f472b6"/>

                  <rect x="85.4268" y="537.667" width="8.66667" height="8.56097" transform="rotate(-90 85.4268 537.667)" fill="#f472b6"/>
                  <rect x="84" y="539.4" width="8.66667" height="1.90244" transform="rotate(-90 84 539.4)" fill="#f472b6"/>
                  <rect x="93.5122" y="537.667" width="8.66667" height="8.56097" transform="rotate(-90 93.5122 537.667)" fill="#f472b6"/>
                  <rect x="101.598" y="539.4" width="8.66667" height="1.90244" transform="rotate(-90 101.598 539.4)" fill="#f472b6"/>
                  <rect x="84.9512" y="541.133" width="4.33333" height="17.5976" transform="rotate(-90 84.9512 541.133)" fill="#f472b6"/>
                  
                  <rect x="135" y="290" width="19" height="7" fill="#141414"/>
                  <rect x="155" y="290" width="19" height="7" fill="#141414"/>
                  <rect x="219" y="290" width="19" height="7" fill="#141414"/>
                  <rect x="241" y="290" width="19" height="7" fill="#141414"/>
                </g>
                <defs>
                  <clipPath id="clip0_2002_2"><rect width="393" height="852" fill="white"/></clipPath>
                </defs>
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}
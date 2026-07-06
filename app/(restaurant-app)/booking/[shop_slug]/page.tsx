'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, Phone, User, Clock, CheckCircle2, Download, AlertTriangle, ChevronDown } from 'lucide-react';
// 📥 ดึงคอมโพเนนต์ผังร้านตัวเก่งของเราเข้ามาใช้งาน
import FloorPlan from '@/components/booking/FloorPlan';

interface BookingRecord {
  id: string;
  shop_id: string;
  booking_code: string;
  customer_name: string;
  phone: string;
  booking_date: string;
  booking_time: string;
  guests_count: number;
  table_number: string;
}

const THEME = {
  bg: '#121318',
  card: '#1F2029',
  border: '#2E303C',
  amber: '#FBBC05',
  mint: '#00F5D4',
  text: '#E0E0E0',
  muted: '#A0A0A0',
};

export default function BookingPage() {
  const params = useParams();
  const shopSlug = (params?.shop_slug as string) || 'default-shop';

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<BookingRecord | null>(null);

  const [isShopOpen, setIsShopOpen] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true); 
  const [shopExists, setShopExists] = useState(true);

  // Form States
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('18:00');
  const [guestsCount, setGuestsCount] = useState(2);
  
  // 🎯 ดึง State ตัวเลือกโต๊ะขึ้นมาคุมจากผังร้าน SVG
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const formattedShopName = useMemo(() => {
    if (shopSlug === 'default-shop') return 'LOVE RESTAURANT';
    return shopSlug
      .split('-')
      .map(word => word.toUpperCase())
      .join(' ');
  }, [shopSlug]);

  // 🛰️ เช็กสถานะร้านค้า (คงลอจิกและความปลอดภัยของบอสไว้ครบถ้วน)
  useEffect(() => {
    let active = true;

    const checkShopStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('shop_settings')
          .select('is_booking_open')
          .eq('shop_id', shopSlug)
          .single();
        
        if (error && error.code === 'PGRST116') {
          if (active) setShopExists(false);
          return;
        }

        if (error) throw error;

        if (active) {
          setIsShopOpen(data ? data.is_booking_open : true);
        }
      } catch (err) {
        console.error('Failed to check shop status:', err);
      } finally {
        if (active) setCheckingStatus(false);
      }
    };

    checkShopStatus();

    const liveChannel = supabase
      .channel(`customer-shop-status:${shopSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_settings', filter: `shop_id=eq.${shopSlug}` },
        (payload: any) => {
          if (active) {
            setIsShopOpen(payload.eventType === 'DELETE' ? true : payload.new.is_booking_open);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(liveChannel);
    };
  }, [shopSlug]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !bookingDate) return;

    if (!isShopOpen) {
      alert('ขออภัยครับขณะนี้ระบบรับคิวจองออนไลน์ปิดชั่วคราวแล้วครับ');
      return;
    }

    // 🎯 เช็กว่ากดเลือกโต๊ะจากผังร้านหรือยัง
    if (!selectedTable) {
      alert('กรุณาคลิกเลือกตำแหน่งโต๊ะอาหารบนผังร้านก่อนครับบอส');
      return;
    }

    setLoading(true);
    try {
      const randomCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

      const newBooking = {
        shop_id: shopSlug,
        booking_code: randomCode,
        customer_name: customerName,
        phone: phone,
        booking_date: bookingDate,
        booking_time: `${bookingTime}:00`,
        guests_count: guestsCount,
        table_number: selectedTable, // 🎯 ยิงไอดีโต๊ะเดี่ยวเข้า DB ตรงๆ
      };

      const { data, error } = await supabase
        .from('restaurant_bookings')
        .insert([newBooking])
        .select()
        .single();

      if (error) throw error;

      // 🔥 ล็อกสเตตัสโต๊ะหลังจองเสร็จให้เปลี่ยนเป็นสีแดง Real-time ทันที
      await supabase
        .from('restaurant_tables')
        .update({ status: 'booked' })
        .eq('id', selectedTable);

      if (data) {
        setSuccessData(data as unknown as BookingRecord);
        setStep('success');
      }

    } catch (err) {
      console.error(err);
      alert('ระบบเชื่อมโยงข้อมูลขัดข้อง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!successData) return;

    const canvas = document.createElement('canvas');
    canvas.width = 450; canvas.height = 700; 
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const thaiFont = "'Prompt', 'Thonburi', 'Arial', sans-serif";

    ctx.textAlign = 'center'; ctx.fillStyle = '#3D342E'; ctx.font = `bold 24px ${thaiFont}`; ctx.fillText(formattedShopName, 225, 60);
    ctx.fillStyle = '#64748B'; ctx.font = `14px ${thaiFont}`; ctx.fillText('ใบยืนยันการจองโต๊ะอาหาร', 225, 88); ctx.fillText('----------------------------------------------------', 225, 115);
    ctx.fillStyle = '#888888'; ctx.font = `13px ${thaiFont}`; ctx.fillText('BOOKING CODE', 225, 142);
    ctx.fillStyle = '#BC6C25'; ctx.font = `bold 36px ${thaiFont}`; ctx.fillText(successData.booking_code, 225, 185);
    ctx.fillStyle = '#64748B'; ctx.font = `14px ${thaiFont}`; ctx.fillText('----------------------------------------------------', 225, 218);

    ctx.textAlign = 'left'; ctx.fillStyle = '#3D342E'; ctx.font = `16px ${thaiFont}`;
    let currentY = 260; const spacing = 32;
    ctx.fillText(`ชื่อผู้จอง :   ${customerName}`, 50, currentY); currentY += spacing;
    ctx.fillText(`เบอร์ติดต่อ :  ${successData.phone}`, 50, currentY); currentY += spacing;
    ctx.fillText(`วันที่จอง :   ${successData.booking_date}`, 50, currentY); currentY += spacing;
    ctx.fillText(`เวลาเข้าโต๊ะ :  ${successData.booking_time.slice(0, 5)} น.`, 50, currentY); currentY += spacing;
    ctx.fillText(`จำนวนที่นั่ง :  ${successData.guests_count} ท่าน`, 50, currentY); currentY += spacing;

    ctx.textAlign = 'center'; ctx.fillStyle = '#64748B'; ctx.fillText('----------------------------------------------------', 225, currentY + 10);
    ctx.fillStyle = '#475569'; ctx.font = `bold 14px ${thaiFont}`; ctx.fillText('ASSIGNED STATION TABLE', 225, currentY + 42);
    ctx.fillStyle = '#606C38'; ctx.font = `bold 56px ${thaiFont}`; ctx.fillText(successData.table_number, 225, currentY + 102);
    ctx.fillStyle = '#64748B'; ctx.font = `14px ${thaiFont}`; ctx.fillText('----------------------------------------------------', 225, currentY + 135);
    ctx.fillStyle = '#94A3B8'; ctx.font = `12px ${thaiFont}`; ctx.fillText('กรุณาแสดงสลิปใบนี้แก่พนักงานต้อนรับเมื่อมาถึงร้าน', 225, currentY + 162); ctx.fillText('ขอบคุณที่ใช้บริการของเราครับ', 225, currentY + 185);

    const ticketImg = canvas.toDataURL('image/jpeg', 1.0);
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 125] });
    doc.addImage(ticketImg, 'JPEG', 0, 0, 80, 125);
    doc.save(`SLIP-${successData.booking_code}.pdf`);
  };

  if (!shopExists) { return notFound(); }

  return (
    <div className="min-h-screen w-full font-sans select-none flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300" style={{ backgroundColor: THEME.bg, color: THEME.text }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[140px] -top-32 -right-24" style={{ backgroundColor: `${THEME.mint}12` }} />
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[130px] -bottom-32 -left-24" style={{ backgroundColor: `${THEME.amber}12` }} />
      </div>

      <AnimatePresence mode="wait">
        {checkingStatus ? (
          <motion.div key="loader" className="text-xs font-mono tracking-widest text-emerald-400 animate-pulse">
            INITIALIZING SECURE PROTOCOL...
          </motion.div>
        ) : step === 'form' ? (
          <motion.div key="form-step" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="w-full max-w-lg z-10 flex justify-center">
            {/* ปรับ p-5 คุมระยะมือถือ และ w-full ขยายร่างเต็มสูบ */}
            <div className="p-5 sm:p-8 border space-y-6 shadow-2xl backdrop-blur-md rounded-3xl w-full max-w-md sm:max-w-lg" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
              <div className="text-center space-y-1.5">
                <span className="text-[10px] font-mono tracking-[0.3em] font-bold uppercase" style={{ color: THEME.amber }}>{formattedShopName}</span>
                <h1 className="text-2xl font-bold tracking-tight text-white">จองโต๊ะอาหารล่วงหน้า</h1>
                <p className="text-xs px-2" style={{ color: THEME.muted }}>เลือกตำแหน่งโต๊ะที่ชอบบนผังร้านและกรอกข้อมูลเพื่อล็อกคิวของคุณ</p>
              </div>

              {!isShopOpen ? (
                <div className="p-6 rounded-2xl border text-center space-y-4 bg-black/40 mt-4" style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}>
                  <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto animate-pulse"><AlertTriangle size={22} /></div>
                  <div>
                    <h3 className="text-sm font-bold text-white">ขออภัยครับ คิวจองออนไลน์ปิดชั่วคราว</h3>
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: THEME.muted }}>ขณะนี้ร้านมีผู้ใช้บริการหน้าร้านหนาแน่น ระบบรับคิวล่วงหน้าจึงปิดชั่วคราวครับ</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="space-y-4 text-xs w-full">
                  
                  {/* 🟢 มหาเวทย์ฟิวชั่นซูม: ปลดเงื่อนไขสกรอลหน้าต่างเก่าออก เพื่อให้ระบบซูม Pan-Pinch ในตัวลูกทำงานได้สมบูรณ์แบบไร้ปะทะ */}
                  <div className="space-y-1.5 w-full">
                    <label className="font-semibold flex items-center gap-1.5 text-gray-300 mb-2">
                      คลิกจิ้มเลือกตำแหน่งโต๊ะอาหารบนแผนผังร้าน (ถ่างนิ้วซูมและลากเลื่อนได้)
                    </label>
                    <div className="w-full rounded-2xl bg-black/30 p-1 border border-slate-800/60 box-sizing-border">
                      <FloorPlan selectedTable={selectedTable} setSelectedTable={setSelectedTable} />
                    </div>
                  </div>

                  <div className="space-y-1.5 w-full">
                    <label className="font-semibold flex items-center gap-1.5 text-gray-300"><User size={14} style={{ color: THEME.amber }} /> ชื่อผู้จอง / นามแฝง</label>
                    <input type="text" required placeholder="กรอกชื่อและนามสกุลของคุณ..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-black/20 border rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-400 transition-all text-xs block min-w-0" style={{ borderColor: THEME.border }} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div className="space-y-1.5 w-full">
                      <label className="font-semibold flex items-center gap-1.5 text-gray-300"><Phone size={14} style={{ color: THEME.amber }} /> เบอร์โทรศัพท์ติดต่อ</label>
                      <input type="tel" required placeholder="08X-XXX-XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-black/20 border rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-400 transition-all text-xs block min-w-0" style={{ borderColor: THEME.border }} />
                    </div>

                    <div className="space-y-1.5 w-full">
                      <label className="font-semibold flex items-center gap-1.5 text-gray-300"><Users size={14} style={{ color: THEME.amber }} /> จำนวนผู้ร่วมโต๊ะ</label>
                      <div className="relative flex items-center rounded-xl border bg-black/20 w-full" style={{ borderColor: THEME.border }}>
                        <select value={guestsCount} onChange={(e) => setGuestsCount(Number(e.target.value))} className="w-full cursor-pointer appearance-none bg-transparent px-4 py-2.5 text-white outline-none text-xs font-medium">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n} style={{ backgroundColor: THEME.card }}>{n} ท่าน</option>)}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div className="space-y-1.5 w-full min-w-0">
                      <label className="font-semibold flex items-center gap-1.5 text-gray-300">เลือกวันที่</label>
                      <input type="date" required min={new Date().toISOString().split('T')[0]} value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full bg-black/20 border rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-400 transition-all text-xs color-scheme-dark block min-w-0 box-sizing-border" style={{ borderColor: THEME.border }} />
                    </div>

                    <div className="space-y-1.5 w-full">
                      <label className="font-semibold flex items-center gap-1.5 text-gray-300">ระบุเวลาเข้าโต๊ะ</label>
                      <div className="relative flex items-center rounded-xl border bg-black/20 w-full" style={{ borderColor: THEME.border }}>
                        <select value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="w-full cursor-pointer appearance-none bg-transparent px-4 py-2.5 text-white outline-none text-xs font-medium">
                          {['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map(t => <option key={t} value={t} style={{ backgroundColor: THEME.card }}>{t} น.</option>)}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} />
                      </div>
                    </div>
                  </div>

                  {/* แสดงสถานะโต๊ะที่คลิกเลือกจริงจากแผนผัง */}
                  {selectedTable && (
                    <div className="p-3 rounded-xl border flex items-center justify-between font-mono text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-400 w-full">
                      <span className="flex items-center gap-1 font-bold"><CheckCircle2 size={12} /> STATUS: SELECTED NODE</span>
                      <span className="font-bold">คุณเลือก: โต๊ะ {selectedTable}</span>
                    </div>
                  )}

                  <button type="submit" disabled={loading || !selectedTable} className="w-full mt-4 py-3.5 text-sm font-bold tracking-wide rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-1.5 text-[#121318]" style={{ backgroundColor: THEME.amber, boxShadow: selectedTable ? `0 4px 20px ${THEME.amber}30` : 'none' }} >
                    {loading ? 'PROCESSING VECTOR...' : 'ยืนยันรหัสจองและจัดโต๊ะ'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="success-step" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-sm z-10" >
            <div className="p-8 border text-center space-y-6 shadow-2xl relative overflow-hidden rounded-3xl" style={{ backgroundColor: THEME.card, borderColor: THEME.border }} >
              <div className="absolute w-4 h-8 border border-l-0 rounded-r-full top-1/2 -left-0.5 -translate-y-1/2" style={{ backgroundColor: THEME.bg, borderColor: THEME.border }} />
              <div className="absolute w-4 h-8 border border-r-0 rounded-l-full top-1/2 -right-0.5 -translate-y-1/2" style={{ backgroundColor: THEME.bg, borderColor: THEME.border }} />

              <div className="space-y-2">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={24} /></div>
                <div>
                  <p className="text-[10px] font-mono tracking-widest uppercase font-bold text-emerald-400">RESERVATION SECURED</p>
                  <h2 className="text-xl font-bold text-white mt-0.5">ล็อกที่นั่งสำเร็จเรียบร้อย</h2>
                </div>
              </div>

              <div className="bg-black/40 border border-dashed rounded-2xl p-4 space-y-2.5 text-xs font-mono text-left" style={{ borderColor: THEME.border }}>
                <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span style={{ color: THEME.muted }}>BOOKING CODE</span>
                  <span className="font-bold" style={{ color: THEME.amber }}>{successData?.booking_code}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: THEME.muted }}>TABLE STATION</span>
                  <span className="font-bold text-white">{successData?.table_number}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: THEME.muted }}>DATE</span>
                  <span className="font-sans text-gray-200">{successData?.booking_date}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: THEME.muted }}>ARRIVAL TIME</span>
                  <span className="font-sans text-gray-200">{successData?.booking_time?.slice(0, 5)} น.</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: THEME.muted }}>GUESTS</span>
                  <span className="font-sans text-gray-200">{successData?.guests_count} ท่าน</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button onClick={handleDownloadPDF} className="w-full py-2.5 bg-emerald-500 text-[#121318] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all active:scale-95 hover:opacity-90"><Download size={14} /> ดาวน์โหลดใบเสร็จ PDF</button>
                <button onClick={() => { setStep('form'); setCustomerName(''); setPhone(''); setSelectedTable(null); }} className="w-full py-2 border bg-transparent hover:bg-white/5 rounded-xl text-xs transition-colors" style={{ borderColor: THEME.border, color: THEME.muted }}>ออกจากการจอง</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .color-scheme-dark { color-scheme: dark; }
        .box-sizing-border { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
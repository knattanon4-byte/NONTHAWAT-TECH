'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, Phone, User, Clock, CheckCircle2, Download, AlertTriangle, ChevronDown, QrCode, ArrowRight } from 'lucide-react';
import FloorPlan from '@/components/booking/FloorPlan';

// 🟢 ระบุหมายเลขพร้อมเพย์ของร้าน (เบอร์มือถือ หรือ เลขนิติบุคคล/เลขผู้เสียภาษี)
const SHOP_PROMPTPAY_ID = '0922657200'; 
// 🟢 กำหนดวันที่เริ่มเข้มงวดการตรวจคิว (จองตั้งแต่วันนี้เป็นต้นไปต้องผ่านสตาฟฟ์เฉพาะวันคอนเสิร์ต)
const ENFORCE_CHECK_DATE = '2026-07-10';

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
  status: 'booked' | 'pending' | 'confirmed';
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
  const [successData, setSuccessData] = useState<BookingRecord[] | null>(null);

  const [isShopOpen, setIsShopOpen] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true); 

  // Form States
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('18:00');
  const [guestsCount, setGuestsCount] = useState(1);
  
  // 🟢 State คุมการจิ้มเลือกโต๊ะ (เปลี่ยนเป็น Array เพื่อรองรับหลายโต๊ะ)
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [dayTables, setDayTables] = useState<Record<string, 'booked' | 'pending'>>({});
  const [currentEventPrice, setCurrentEventPrice] = useState(0);

  const formattedShopName = useMemo(() => {
    if (shopSlug === 'default-shop') return 'LOVE RESTAURANT';
    return shopSlug
      .split('-')
      .map(word => word.toUpperCase())
      .join(' ');
  }, [shopSlug]);

  // 🟢 ดึงข้อมูลคิวจองรายวัน (เพื่ออัปเดตสีโต๊ะในผัง)
  const fetchTodayBookings = useCallback(async (targetDate: string) => {
    if (!targetDate) return;
    try {
      const { data, error } = await supabase
        .from('restaurant_bookings')
        .select('table_number, status')
        .eq('shop_id', shopSlug)
        .eq('booking_date', targetDate)
        .neq('status', 'no_show');

      if (error) throw error;
      if (data) {
        const statusMap = data.reduce((acc, curr: any) => ({
          ...acc,
          [curr.table_number]: curr.status === 'pending' ? 'pending' : 'booked'
        }), {} as Record<string, 'booked' | 'pending'>);
        setDayTables(statusMap);
      }
    } catch (err) {
      console.error('Failed to fetch day bookings:', err);
    }
  }, [shopSlug]);

  // 🟢 ตรวจสอบสถานะร้านเปิด/ปิด และ Realtime Database
  useEffect(() => {
    let active = true;

    // เช็กสถานะร้านเปิดปิด
    const checkShopStatus = async () => {
      try {
        const { data, error } = await supabase.from('shop_settings').select('is_booking_open').eq('shop_id', shopSlug).single();
        if (error && error.code !== 'PGRST116') throw error;
        if (active) setIsShopOpen(data ? data.is_booking_open : true);
      } catch (err) {
        console.error('Failed to check shop status:', err);
      } finally {
        if (active) setCheckingStatus(false);
      }
    };
    checkShopStatus();

    // ฟังสถานะร้านเปิด/ปิดแบบ Realtime
    const shopChannel = supabase.channel(`customer-shop-status:${shopSlug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_settings', filter: `shop_id=eq.${shopSlug}` },
        (payload: any) => { if (active) setIsShopOpen(payload.eventType === 'DELETE' ? true : payload.new.is_booking_open); }
      ).subscribe();

    return () => {
      active = false;
      supabase.removeChannel(shopChannel);
    };
  }, [shopSlug]);

  // 🟢 ฟังสถานะโต๊ะแบบ Realtime (เมื่อมีการเปลี่ยนวันที่)
  useEffect(() => {
    if (!bookingDate) return;
    let active = true;
    fetchTodayBookings(bookingDate);

    const realtimeChannel = supabase.channel(`realtime-day-status:${shopSlug}:${bookingDate}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_bookings', filter: `shop_id=eq.${shopSlug}` },
        (payload: any) => {
          if (!active) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (payload.new.booking_date === bookingDate) {
              setDayTables(prev => {
                const nextState = { ...prev };
                if (payload.new.status === 'no_show') delete nextState[payload.new.table_number];
                else nextState[payload.new.table_number] = payload.new.status === 'pending' ? 'pending' : 'booked';
                return nextState;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            fetchTodayBookings(bookingDate); 
          }
        }
      ).subscribe();

    return () => {
      active = false;
      supabase.removeChannel(realtimeChannel);
    };
  }, [bookingDate, fetchTodayBookings, shopSlug]);

  // ล้างโต๊ะที่เลือกเมื่อเปลี่ยนวัน
  useEffect(() => {
    setSelectedTables([]);
    setGuestsCount(1);
  }, [bookingDate]);

  const maxAllowedGuests = Math.max(4, selectedTables.length * 4);

  // 🟢 ฟังก์ชันส่งข้อมูลจองเข้าระบบ (รองรับหลายโต๊ะ)
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !bookingDate) return;

    if (!isShopOpen) {
      alert('ขออภัยครับขณะนี้ระบบรับคิวจองออนไลน์ปิดชั่วคราวแล้วครับ');
      return;
    }

    if (selectedTables.length === 0) {
      alert('กรุณาคลิกเลือกตำแหน่งโต๊ะอาหารที่คุณชอบบนผังร้านก่อนครับ');
      return;
    }

    const isAnyTableUnavailable = selectedTables.some(t => dayTables[t] === 'booked' || dayTables[t] === 'pending');
    if (isAnyTableUnavailable) {
      alert('ขออภัยครับ มีบางโต๊ะที่คุณเลือกถูกจองไปแล้ว กรุณาเลือกใหม่อีกครั้งครับ');
      fetchTodayBookings(bookingDate);
      setSelectedTables([]);
      return;
    }

    setLoading(true);
    try {
      // เช็กราคาและประเภทอีเวนต์
      const { data: eventData } = await supabase.from('shop_events').select('event_type, price').eq('shop_id', shopSlug).eq('event_date', bookingDate).maybeSingle();

      const isConcertDay = eventData?.event_type === 'concert';
      const eventPricePerTable = eventData?.price || 0; 
      setCurrentEventPrice(eventPricePerTable);

      const statusToSet = (isConcertDay && bookingDate >= ENFORCE_CHECK_DATE) ? 'pending' : 'confirmed';
      const randomCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

      // เตรียมข้อมูลจองแบบ Array
      const newBookings = selectedTables.map(table => ({
        shop_id: shopSlug,
        booking_code: randomCode,
        customer_name: customerName,
        phone: phone,
        booking_date: bookingDate,
        booking_time: `${bookingTime}:00`,
        guests_count: guestsCount, 
        table_number: table,
        status: statusToSet,
      }));

      // บันทึกลงฐานข้อมูล
      const { data, error } = await supabase.from('restaurant_bookings').insert(newBookings).select();

      if (error) {
        if (error.code === '23505') { 
          alert('มีการซ้อนทับของคิวจอง กรุณาเลือกโต๊ะอื่นแทนนะครับ');
          fetchTodayBookings(bookingDate); 
          setSelectedTables([]);
          return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        setSuccessData(data as unknown as BookingRecord[]);
        
        // ยิงแจ้งเตือน LINE
        try {
          await fetch('/api/booking-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'NEW_BOOKING',
              bookingCode: randomCode,
              customerName: customerName,
              phone: phone,
              tableNumber: selectedTables.join(', '),
              date: bookingDate,
              time: `${bookingTime} น.`, 
              guests: guestsCount,
              status: statusToSet
            })
          });
        } catch (lineErr) {
          console.error('LINE notification webhook failed:', lineErr);
        }
        setStep('success');
      }

    } catch (err) {
      console.error(err);
      alert('ระบบเชื่อมโยงข้อมูลขัดข้อง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  // 🟢 ระบบสร้าง PDF รองรับหลายโต๊ะ
  const handleDownloadPDF = () => {
    if (!successData || successData.length === 0) return;
    const bookingInfo = successData[0]; 
    const allTables = successData.map(b => b.table_number).join(', ');

    const canvas = document.createElement('canvas');
    canvas.width = 450; canvas.height = 700; 
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const thaiFont = "'Prompt', 'Thonburi', 'Arial', sans-serif";

    ctx.textAlign = 'center'; ctx.fillStyle = '#3D342E'; ctx.font = `bold 24px ${thaiFont}`;
    ctx.fillText(formattedShopName, 225, 60);

    ctx.fillStyle = '#64748B'; ctx.font = `14px ${thaiFont}`;
    ctx.fillText(bookingInfo.status === 'pending' ? 'ใบยืนยันคิวรอชำระเงิน' : 'ใบยืนยันการจองโต๊ะอาหาร', 225, 88);
    ctx.fillText('----------------------------------------------------', 225, 115);

    ctx.fillStyle = '#888888'; ctx.font = `13px ${thaiFont}`; ctx.fillText('BOOKING CODE', 225, 142);
    ctx.fillStyle = '#BC6C25'; ctx.font = `bold 36px ${thaiFont}`; ctx.fillText(bookingInfo.booking_code, 225, 185);

    ctx.fillStyle = '#64748B'; ctx.font = `14px ${thaiFont}`;
    ctx.fillText('----------------------------------------------------', 225, 218);

    ctx.textAlign = 'left'; ctx.fillStyle = '#3D342E'; ctx.font = `16px ${thaiFont}`;
    let currentY = 260; const spacing = 32;
    
    ctx.fillText(`ชื่อผู้จอง :   ${bookingInfo.customer_name}`, 50, currentY); currentY += spacing;
    ctx.fillText(`เบอร์ติดต่อ :  ${bookingInfo.phone}`, 50, currentY); currentY += spacing;
    ctx.fillText(`วันที่จอง :   ${bookingInfo.booking_date}`, 50, currentY); currentY += spacing;
    ctx.fillText(`เวลาเข้าโต๊ะ :  ${bookingInfo.booking_time.slice(0, 5)} น.`, 50, currentY); currentY += spacing;
    ctx.fillText(`จำนวนที่นั่ง :  ${bookingInfo.guests_count} ท่าน (Max ${successData.length * 4})`, 50, currentY); currentY += spacing;

    ctx.textAlign = 'center'; ctx.fillStyle = '#64748B';
    ctx.fillText('----------------------------------------------------', 225, currentY + 10);
    ctx.fillStyle = '#475569'; ctx.font = `bold 14px ${thaiFont}`; ctx.fillText('ASSIGNED STATION TABLE', 225, currentY + 42);

    const tableFontSize = allTables.length > 5 ? 36 : 56;
    ctx.fillStyle = '#606C38'; ctx.font = `bold ${tableFontSize}px ${thaiFont}`;
    ctx.fillText(allTables, 225, currentY + 102);

    ctx.fillStyle = '#64748B'; ctx.font = `14px ${thaiFont}`;
    ctx.fillText('----------------------------------------------------', 225, currentY + 135);
    ctx.fillStyle = '#94A3B8'; ctx.font = `12px ${thaiFont}`;
    ctx.fillText('กรุณาแสดงสลิปใบนี้แก่พนักงานต้อนรับเมื่อมาถึงร้าน', 225, currentY + 162);
    ctx.fillText('ขอบคุณที่ใช้บริการของเราครับ', 225, currentY + 185);

    const ticketImg = canvas.toDataURL('image/jpeg', 1.0);
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 125] });
    doc.addImage(ticketImg, 'JPEG', 0, 0, 80, 125);
    doc.save(`SLIP-${bookingInfo.booking_code}.pdf`);
  };

  const isPendingPayment = successData?.[0]?.status === 'pending';
  const calculatedTotalAmount = currentEventPrice * (successData?.length || 1);

  return (
    <div className="min-h-screen w-full font-sans select-none flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300" style={{ backgroundColor: THEME.bg, color: THEME.text }} >
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
          <motion.div key="form-step" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="w-full max-w-lg z-10" >
            <div className="p-8 border space-y-6 shadow-2xl backdrop-blur-md rounded-3xl" style={{ backgroundColor: THEME.card, borderColor: THEME.border }} >
              <div className="text-center space-y-1.5">
                <span className="text-[10px] font-mono tracking-[0.3em] font-bold uppercase" style={{ color: THEME.amber }}>
                  {formattedShopName}
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white">จองโต๊ะอาหารล่วงหน้า</h1>
                <p className="text-xs" style={{ color: THEME.muted }}>กรอกข้อมูลเพื่อทำการล็อกสิทธิ์และตำแหน่งโต๊ะที่ดีที่สุดให้กับคุณ</p>
              </div>

              {!isShopOpen ? (
                <div className="p-6 rounded-2xl border text-center space-y-4 bg-black/40 mt-4" style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }} >
                  <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto animate-pulse">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">ขออภัยครับ คิวจองออนไลน์ปิดชั่วคราว</h3>
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: THEME.muted }}>
                      ขณะนี้ร้านมีผู้ใช้บริการหน้าร้านหนาแน่น หรือมีการจัดกิจกรรมปิดบาร์ภายใน <br />
                      ผู้จัดการจึงสั่งปิดระบบรับคิวล่วงหน้ากะทันหัน <br />
                      ลูกค้าสามารถโทรสอบถามคิวหลุดโดยตรงได้ที่ร้านครับ
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="space-y-4 text-xs">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold flex items-center gap-1.5 text-gray-300">
                        <Calendar size={14} style={{ color: THEME.amber }} /> 1. เลือกวันที่
                      </label>
                      <input type="date" required min={new Date().toISOString().split('T')[0]} value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full bg-black/20 border rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-400 transition-all text-xs color-scheme-dark" style={{ borderColor: THEME.border }} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold flex items-center gap-1.5 text-gray-300">
                        <Clock size={14} style={{ color: THEME.amber }} /> 2. ระบุเวลาเข้าโต๊ะ
                      </label>
                      <div className="relative flex items-center rounded-xl border bg-black/20" style={{ borderColor: THEME.border }}>
                        <select value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="w-full cursor-pointer appearance-none bg-transparent px-4 py-2.5 text-white outline-none text-xs font-medium" >
                          {['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map(t => (
                            <option key={t} value={t} style={{ backgroundColor: THEME.card }}>{t} น.</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold flex items-center gap-1.5 text-gray-300 mb-2">
                      3. คลิกเลือกตำแหน่งโต๊ะบนแผนผังร้าน <span className="text-emerald-400 text-[10px] ml-1">(เลือกได้หลายโต๊ะ)</span>
                    </label>
                    <div className="w-full max-h-[380px] overflow-y-auto rounded-2xl bg-black/30 p-2 border border-slate-800 relative">
                      {!bookingDate ? (
                        <div className="text-center p-8 space-y-2.5 animate-pulse min-h-[200px] flex flex-col justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/40 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto mb-1">
                            <AlertTriangle size={18} />
                          </div>
                          <p className="text-sm font-bold text-amber-500">กรุณาเลือก "วันที่" ด้านบนก่อนครับ</p>
                          <p className="text-xs max-w-xs mx-auto text-slate-400">ระบบจำเป็นต้องใช้วันที่ในการดึงข้อมูลสถานะโต๊ะว่าง</p>
                        </div>
                      ) : (
                        <FloorPlan selectedTables={selectedTables} setSelectedTables={setSelectedTables} dayTables={dayTables} />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="font-semibold flex items-center gap-1.5 text-gray-300">
                      <User size={14} style={{ color: THEME.amber }} /> ชื่อผู้จอง / นามแฝง
                    </label>
                    <input type="text" required disabled={!bookingDate} placeholder={bookingDate ? "กรอกชื่อและนามสกุลของคุณ..." : "เลือกวันที่ก่อน..."} value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-black/20 border rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-400 transition-all text-xs disabled:opacity-50" style={{ borderColor: THEME.border }} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold flex items-center gap-1.5 text-gray-300">
                        <Phone size={14} style={{ color: THEME.amber }} /> เบอร์โทรศัพท์ติดต่อ
                      </label>
                      <input type="tel" required disabled={!bookingDate} placeholder={bookingDate ? "08X-XXX-XXXX" : "เลือกวันที่ก่อน..."} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-black/20 border rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-400 transition-all text-xs disabled:opacity-50" style={{ borderColor: THEME.border }} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold flex items-center gap-1.5 text-gray-300">
                        <Users size={14} style={{ color: THEME.amber }} /> จำนวนผู้ร่วมโต๊ะ <span className="text-[10px] text-amber-500">(สูงสุด {maxAllowedGuests})</span>
                      </label>
                      <div className="relative flex items-center rounded-xl border bg-black/20" style={{ borderColor: THEME.border, opacity: bookingDate ? 1 : 0.5 }}>
                        <select disabled={!bookingDate || selectedTables.length === 0} value={guestsCount} onChange={(e) => setGuestsCount(Number(e.target.value))} className="w-full cursor-pointer appearance-none bg-transparent px-4 py-2.5 text-white outline-none text-xs font-medium disabled:cursor-not-allowed" >
                          {selectedTables.length === 0 ? (
                            <option value={1} style={{ backgroundColor: THEME.card }}>เลือกโต๊ะก่อน</option>
                          ) : (
                            Array.from({ length: maxAllowedGuests }, (_, i) => i + 1).map(n => (
                              <option key={n} value={n} style={{ backgroundColor: THEME.card }}>{n} ท่าน</option>
                            ))
                          )}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} />
                      </div>
                    </div>
                  </div>

                  {selectedTables.length > 0 && (
                    <div className="p-3 rounded-xl border flex items-center justify-between font-mono text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                      <span className="flex items-center gap-1 font-bold"><CheckCircle2 size={12} /> {selectedTables.length} NODES SELECTED</span>
                      <span className="font-bold">คุณเลือก: โต๊ะ {selectedTables.join(', ')}</span>
                    </div>
                  )}

                  <button type="submit" disabled={loading || selectedTables.length === 0 || !bookingDate} className="w-full mt-4 py-3.5 text-sm font-bold tracking-wide rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-1.5 text-[#121318]" style={{ backgroundColor: THEME.amber, boxShadow: selectedTables.length > 0 ? `0 4px 20px ${THEME.amber}30` : 'none' }} >
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
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${isPendingPayment ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                  {isPendingPayment ? <QrCode size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <div>
                  <p className={`text-[10px] font-mono tracking-widest uppercase font-bold ${isPendingPayment ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isPendingPayment ? 'PROMPTPAY SCAN ACTIVE' : 'RESERVATION SECURED'}
                  </p>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {isPendingPayment ? 'สแกนคิวอาร์โค้ดชำระเงิน' : 'ล็อกที่นั่งสำเร็จเรียบร้อย'}
                  </h2>
                </div>
              </div>

              {isPendingPayment && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center space-y-2 bg-white p-4 rounded-2xl mx-auto shadow-[0_0_30px_rgba(251,188,5,0.15)] border border-amber-500/40">
                  <div className="w-full flex items-center justify-between text-[10px] font-bold text-blue-900 font-sans tracking-wide px-0.5 pb-1 border-b border-gray-100">
                    <span>PROMPTPAY Dynamic QR</span>
                    <span className="text-blue-600">พร้อมเพย์</span>
                  </div>
                  <div className="w-40 h-40 bg-gray-50 flex items-center justify-center relative rounded-lg overflow-hidden mt-1 p-1">
                    <img src={`https://promptpay.io/${SHOP_PROMPTPAY_ID}/${calculatedTotalAmount}.png`} alt="PromptPay QR" className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                  <div className="text-center font-sans mt-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">Net Amount <span className="text-amber-500 ml-1">({successData?.length} โต๊ะ)</span></p>
                    <p className="text-xl font-extrabold text-slate-900 mt-1">{calculatedTotalAmount.toLocaleString()} <span className="text-xs font-semibold text-slate-600">บาท</span></p>
                  </div>
                </motion.div>
              )}

              <div className="bg-black/40 border border-dashed rounded-2xl p-4 space-y-2.5 text-xs font-mono text-left" style={{ borderColor: THEME.border }}>
                <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span style={{ color: THEME.muted }}>BOOKING CODE</span>
                  <span className="font-bold" style={{ color: THEME.amber }}>{successData?.[0]?.booking_code}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: THEME.muted }}>TABLE STATION</span>
                  <span className="font-bold text-white max-w-[120px] text-right break-words">{successData?.map(b => b.table_number).join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: THEME.muted }}>DATE</span>
                  <span className="font-sans text-gray-200">{successData?.[0]?.booking_date}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: THEME.muted }}>ARRIVAL TIME</span>
                  <span className="font-sans text-gray-200">{successData?.[0]?.booking_time?.slice(0, 5)} น.</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: THEME.muted }}>GUESTS</span>
                  <span className="font-sans text-gray-200">{successData?.[0]?.guests_count} ท่าน</span>
                </div>
              </div>

              {isPendingPayment && (
                <div className="p-3 text-left bg-black/20 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1.5 font-sans leading-relaxed">
                  <p className="text-gray-200 font-bold flex items-center gap-1">
                    <ArrowRight size={12} className="text-amber-500" /> คำแนะนำหลังโอนเงิน:
                  </p>
                  <p>1. เปิดแอปธนาคาร สแกนคิวอาร์โค้ดด้านบน</p>
                  <p>2. บันทึกสลิป และกดปุ่มดาวน์โหลดใบยืนยันคิวด้านล่าง</p>
                  <p className="text-amber-500 font-semibold">3. ส่งหลักฐานไปที่ LINE ร้าน เพื่อให้สตาฟฟ์เปิดคิวให้ครับ</p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button onClick={handleDownloadPDF} className="w-full py-2.5 bg-emerald-500 text-[#121318] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all active:scale-95 hover:opacity-90">
                  <Download size={14} /> ดาวน์โหลดใบเสร็จ PDF
                </button>
                <button onClick={() => { setStep('form'); setCustomerName(''); setPhone(''); setSelectedTables([]); fetchTodayBookings(bookingDate); }} className="w-full py-2 border bg-transparent hover:bg-white/5 rounded-xl text-xs transition-colors" style={{ borderColor: THEME.border, color: THEME.muted }}>
                  ออกจากการจอง
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .color-scheme-dark { color-scheme: dark; }
      `}</style>
    </div>
  );
}
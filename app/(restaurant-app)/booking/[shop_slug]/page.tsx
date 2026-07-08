'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { jsPDF as PDFInstance } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, Phone, User, Clock, CheckCircle2, Download, AlertTriangle, ChevronDown, Coins, QrCode, ArrowRight } from 'lucide-react';
import FloorPlan from '@/components/booking/FloorPlan';

// 🟢 [ตั้งค่าตรงนี้] ระบุหมายเลขพร้อมเพย์ของร้าน (เบอร์มือถือ หรือ เลขนิติบุคคล/เลขผู้เสียภาษี)
const SHOP_PROMPTPAY_ID = '08X-XXX-XXXX'; 

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
  bg: '#0A0A0E',
  card: '#16161E',
  border: '#2D2235',
  pink: '#FF1F88',
  gold: '#E5B842',
  purple: '#8A3FFC',
  text: '#F1F1F5',
  muted: '#9E9EAF',
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
  
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [dayTables, setDayTables] = useState<Record<string, 'booked' | 'pending'>>({});
  
  // เก็บค่าบัตรต่อหัวเพื่อส่งไปคำนวณหน้าจ่ายเงินของลูกค้า
  const [currentEventPrice, setCurrentEventPrice] = useState(0);

  const formattedShopName = 'ร้าน เรๅ สาขาศรีนครินทร์';

  // เช็กสถานะเปิด/ปิดร้าน
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
        if (active) setIsShopOpen(data ? data.is_booking_open : true);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setCheckingStatus(false);
      }
    };
    checkShopStatus();
  }, [shopSlug]);

  // ดึงข้อมูลคิวจองรายวัน
  const fetchTodayBookings = useCallback(async (targetDate: string) => {
    if (!targetDate) return;
    try {
      const { data, error } = await supabase
        .from('restaurant_bookings')
        .select('table_number, status')
        .eq('shop_id', shopSlug)
        .eq('booking_date', targetDate);

      if (error) throw error;
      if (data) {
        const statusMap = data.reduce((acc, curr: any) => ({
          ...acc,
          [curr.table_number]: curr.status || 'booked'
        }), {} as Record<string, 'booked' | 'pending'>);
        setDayTables(statusMap);
      }
    } catch (err) {
      console.error('Failed to fetch day bookings:', err);
    }
  }, [shopSlug]);

  // รับฟังเสียงสดแบบ Real-time ดักฟังความเคลื่อนไหวผังโต๊ะ
  useEffect(() => {
    if (!bookingDate) return;
    let active = true;

    fetchTodayBookings(bookingDate);

    const realtimeChannel = supabase
      .channel(`realtime-day-status:${shopSlug}:${bookingDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_bookings', filter: `shop_id=eq.${shopSlug}` },
        (payload: any) => {
          if (!active) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (payload.new.booking_date === bookingDate) {
              setDayTables(prev => ({
                ...prev,
                [payload.new.table_number]: payload.new.status || 'booked'
              }));
            }
          }
          else if (payload.eventType === 'DELETE') {
            fetchTodayBookings(bookingDate); 
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(realtimeChannel);
    };
  }, [bookingDate, fetchTodayBookings, shopSlug]);

  useEffect(() => {
    setSelectedTable(null);
  }, [bookingDate]);

  // ฟังก์ชันส่งจองโต๊ะเข้าระบบ
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !bookingDate || !selectedTable) return;

    if (!isShopOpen) {
      alert('ขออภัยครับขณะนี้ระบบรับคิวจองออนไลน์ปิดชั่วคราวแล้วครับ');
      return;
    }

    if (dayTables[selectedTable] === 'booked' || dayTables[selectedTable] === 'pending') {
      alert('ขออภัยครับ โต๊ะนี้ไม่ว่างแล้วครับ กรุณาเลือกโต๊ะอื่นน้า');
      return;
    }

    setLoading(true);
    try {
      // 1. ดึงข้อมูลตรวจสอบเช็คว่าเป็นวันคอนเสิร์ตและดึงราคาตั๋วมาคำนวณต่อหัว
      const { data: eventData } = await supabase
        .from('shop_events')
        .select('event_type, price')
        .eq('shop_id', shopSlug)
        .eq('event_date', bookingDate)
        .maybeSingle();

      const isConcertDay = eventData?.event_type === 'concert';
      const eventPricePerHead = eventData?.price || 0;
      
      // บันทึกราคาตั๋วลง State หลักเพื่อใช้คำนวณแสดงผลในหน้าสลิป
      setCurrentEventPrice(eventPricePerHead);

      // 2. Logic คัดกรองสิทธิ์สถานะ 
      const statusToSet = (isConcertDay && bookingDate >= ENFORCE_CHECK_DATE) 
        ? 'pending' 
        : 'confirmed';

      const randomCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

      const newBooking = {
        shop_id: shopSlug,
        booking_code: randomCode,
        customer_name: customerName,
        phone: phone,
        booking_date: bookingDate,
        booking_time: `${bookingTime}:00`,
        guests_count: guestsCount,
        table_number: selectedTable,
        status: statusToSet, 
      };

      const { data, error } = await supabase
        .from('restaurant_bookings')
        .insert([newBooking])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { 
          alert('มีลูกค้าท่านอื่นทำการจองแล้วกรุณาเลือกโต๊ะอื่นแทนนะครับ');
          fetchTodayBookings(bookingDate); 
          setSelectedTable(null);
          return;
        }
        throw error;
      }

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
    const ThaiFont = "'Prompt', 'Thonburi', 'Arial', sans-serif";
    ctx.textAlign = 'center'; ctx.fillStyle = '#121318'; ctx.font = `bold 22px ${ThaiFont}`; ctx.fillText(formattedShopName, 225, 60);
    ctx.fillStyle = '#64748B'; ctx.font = `14px ${ThaiFont}`; ctx.fillText(successData.status === 'pending' ? 'ใบยืนยันคิวรอชำระเงิน' : 'ใบยืนยันการจองโต๊ะอาหาร', 225, 88); ctx.fillText('----------------------------------------------------', 225, 115);
    ctx.fillStyle = '#888888'; ctx.font = `13px ${ThaiFont}`; ctx.fillText('BOOKING CODE', 225, 142);
    ctx.fillStyle = '#FF1F88'; ctx.font = `bold 36px ${ThaiFont}`; ctx.fillText(successData.booking_code, 225, 185);
    ctx.textAlign = 'left'; ctx.fillStyle = '#121318'; ctx.font = `16px ${ThaiFont}`;
    let currentY = 260; const spacing = 32;
    ctx.fillText(`ชื่อผู้จอง :   ${customerName}`, 50, currentY); currentY += spacing;
    ctx.fillText(`เบอร์ติดต่อ :  ${successData.phone}`, 50, currentY); currentY += spacing;
    ctx.fillText(`วันที่จอง :   ${successData.booking_date}`, 50, currentY); currentY += spacing;
    ctx.fillText(`เวลาเข้าโต๊ะ :  ${successData.booking_time.slice(0, 5)} น.`, 50, currentY); currentY += spacing;
    ctx.fillText(`จำนวนที่นั่ง :  ${successData.guests_count} ท่าน`, 50, currentY); currentY += spacing;
    ctx.textAlign = 'center'; ctx.fillStyle = '#64748B'; ctx.fillText('----------------------------------------------------', 225, currentY + 10);
    ctx.fillStyle = '#475569'; ctx.font = `bold 14px ${ThaiFont}`; ctx.fillText('ASSIGNED STATION TABLE', 225, currentY + 42);
    ctx.fillStyle = '#E5B842'; ctx.font = `bold 56px ${ThaiFont}`; ctx.fillText(successData.table_number, 225, currentY + 102);
    const ticketImg = canvas.toDataURL('image/jpeg', 1.0);
    const doc = new PDFInstance({ orientation: 'p', unit: 'mm', format: [80, 125] });
    doc.addImage(ticketImg, 'JPEG', 0, 0, 80, 125);
    doc.save(`SLIP-${successData.booking_code}.pdf`);
  };

  if (!shopExists) { return notFound(); }

  const isPendingPayment = successData?.status === 'pending';
  const calculatedTotalAmount = currentEventPrice * (successData?.guests_count || 0);

  return (
    <div className="min-h-screen w-full font-sans select-none flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300" style={{ backgroundColor: THEME.bg, color: THEME.text }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[150px] -top-32 -right-24" style={{ backgroundColor: `${THEME.pink}0A` }} />
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[140px] -bottom-32 -left-24" style={{ backgroundColor: `${THEME.purple}0D` }} />
      </div>

      <AnimatePresence mode="wait">
        {checkingStatus ? (
          <motion.div key="loader" className="text-sm font-mono tracking-widest animate-pulse" style={{ color: THEME.pink }}>
            INITIALIZING 21ST ANNIVERSARY PROTOCOL...
          </motion.div>
        ) : step === 'form' ? (
          <motion.div key="form-step" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="w-full max-w-xl z-10 flex justify-center px-2 sm:px-0">
            <div className="p-5 sm:p-8 border space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl rounded-3xl w-full max-w-md sm:max-w-xl" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
              
              <div className="text-center space-y-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white block">
                  <span style={{ color: THEME.pink }}>ร้าน เรๅ</span> สาขาศรีนครินทร์
                </h1>
                <p className="text-sm sm:text-base font-bold font-mono uppercase tracking-[0.18em]" style={{ color: THEME.gold }}>
                  ★ จองโต๊ะอาหารล่วงหน้า ★
                </p>
                <p className="text-xs sm:text-sm px-1 leading-relaxed" style={{ color: THEME.muted }}>กรุณาเลือกวันเวลา และตำแหน่งโต๊ะที่ชอบบนผังร้านเพื่อล็อกคิวของคุณในค่ำคืนสุดพิเศษ</p>
              </div>

              {!isShopOpen ? (
                <div className="p-6 rounded-2xl border text-center space-y-4 bg-black/40 mt-4" style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}>
                  <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto animate-pulse"><AlertTriangle size={22} /></div>
                  <div>
                    <h3 className="text-base font-bold text-white">ขออภัยครับ คิวจองออนไลน์ปิดชั่วคราว</h3>
                    <p className="text-xs sm:text-sm mt-2 leading-relaxed" style={{ color: THEME.muted }}>ขณะนี้ร้านมีผู้ใช้บริการหน้าร้านหนาแน่น ระบบรับคิวล่วงหน้าจึงปิดชั่วคราวครับ</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="space-y-5 text-base w-full">
                  
                  {/* แผงกล่องคู่ขนาน วันที่ และ เวลา */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full bg-black/30 p-3 rounded-2xl border" style={{ borderColor: `${THEME.gold}20` }}>
                    <div className="space-y-2 w-full min-w-0">
                      <label className="font-semibold text-sm sm:text-base flex items-center gap-1.5 font-mono" style={{ color: THEME.gold }}>
                        <Calendar size={15} /> 1. เลือกวันที่ต้องการจอง
                      </label>
                      <div className="relative flex items-center rounded-xl border bg-black/40 w-full h-12 transition-all duration-200 focus-within:border-amber-400" style={{ borderColor: THEME.border }}>
                        <input 
                          type="date" 
                          required 
                          min={new Date().toISOString().split('T')[0]} 
                          value={bookingDate} 
                          onChange={(e) => setBookingDate(e.target.value)} 
                          className="w-full h-full appearance-none bg-transparent px-4 text-white outline-none text-base color-scheme-dark block min-w-0 box-border iOS-date-input" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2 w-full">
                      <label className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-gray-300">
                        <Clock size={15} /> ระบุเวลาเข้าโต๊ะ
                      </label>
                      <div className="relative flex items-center rounded-xl border bg-black/40 w-full h-12 transition-all duration-200 focus-within:border-amber-400" style={{ borderColor: THEME.border }}>
                        <select 
                          value={bookingTime} 
                          onChange={(e) => setBookingTime(e.target.value)} 
                          className="w-full h-full cursor-pointer appearance-none bg-transparent px-4 text-white outline-none text-base font-medium"
                        >
                          {['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map(t => (
                            <option key={t} value={t} style={{ backgroundColor: THEME.card }}>{t} น.</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} />
                      </div>
                    </div>
                  </div>

                  {/* แผนผังร้านค้า */}
                  <div className="space-y-2 w-full">
                    <label className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-gray-200 leading-tight">
                      2. คลิกเลือกตำแหน่งโต๊ะอาหารบนแผนผังร้าน
                    </label>
                    <div className="w-full rounded-2xl bg-black/40 p-1 border box-sizing-border overflow-x-auto select-none relative min-h-[220px] flex items-center justify-center transition-all duration-300" style={{ borderColor: THEME.border }}>
                      {bookingDate ? (
                        <FloorPlan 
                          selectedTable={selectedTable} 
                          setSelectedTable={setSelectedTable} 
                          dayTables={dayTables} 
                        />
                      ) : (
                        <div className="text-center p-8 space-y-2.5 animate-pulse">
                          <div className="w-10 h-10 rounded-full bg-black/40 border text-flex items-center justify-center mx-auto mb-1 flex justify-center items-center" style={{ borderColor: `${THEME.gold}30`, color: THEME.gold }}>
                            <AlertTriangle size={18} />
                          </div>
                          <p className="text-sm font-bold" style={{ color: THEME.gold }}>กรุณาเลือก "วันที่ต้องการจอง" ด้านบนก่อนครับ</p>
                          <p className="text-xs max-w-xs mx-auto text-slate-400 leading-relaxed">ระบบจำเป็นต้องใช้วันที่ในการดึงข้อมูลสถานะโต๊ะว่างแบบเรียลไทม์รายวันครับ</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ข้อมูลผู้จอง */}
                  <div className="space-y-4 pt-1 w-full">
                    <div className="space-y-2 w-full">
                      <label className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-gray-300">
                        <User size={16} style={{ color: THEME.pink }} /> ชื่อผู้จอง / นามแฝง
                      </label>
                      <input 
                        type="text" 
                        required 
                        disabled={!bookingDate}
                        placeholder={bookingDate ? "กรอกชื่อและนามสกุลของคุณ..." : "กรุณาเลือกวันที่ด้านบนก่อน..."} 
                        value={customerName} 
                        onChange={(e) => setCustomerName(e.target.value)} 
                        className="w-full bg-black/20 border rounded-xl px-4 h-12 text-white outline-none transition-all text-base block min-w-0 disabled:opacity-30 disabled:cursor-not-allowed focus:border-purple-500 box-border" 
                        style={{ borderColor: THEME.border }} 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <div className="space-y-2 w-full">
                        <label className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-gray-300">
                          <Phone size={16} style={{ color: THEME.pink }} /> เบอร์โทรศัพท์ติดต่อ
                        </label>
                        <input 
                          type="tel" 
                          required 
                          disabled={!bookingDate}
                          placeholder={bookingDate ? "08X-XXX-XXXX" : "กรุณาเลือกวันที่ด้านบนก่อน..."} 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)} 
                          className="w-full bg-black/20 border rounded-xl px-4 h-12 text-white outline-none transition-all text-base block min-w-0 disabled:opacity-30 disabled:cursor-not-allowed focus:border-purple-500 box-border" 
                          style={{ borderColor: THEME.border }} 
                        />
                      </div>

                      <div className="space-y-2 w-full">
                        <label className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-gray-300">
                          <Users size={16} style={{ color: THEME.pink }} /> จำนวนผู้ร่วมโต๊ะ
                        </label>
                        <div className="relative flex items-center rounded-xl border bg-black/20 w-full h-12 transition-all duration-200" style={{ borderColor: THEME.border, opacity: bookingDate ? 1 : 0.3 }}>
                          <select 
                            disabled={!bookingDate}
                            value={guestsCount} 
                            onChange={(e) => setGuestsCount(Number(e.target.value))} 
                            className="w-full h-full cursor-pointer appearance-none bg-transparent px-4 text-white outline-none text-base font-medium disabled:cursor-not-allowed box-border"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                              <option key={n} value={n} style={{ backgroundColor: THEME.card }}>{n} ท่าน</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedTable && (
                    <div className="p-3.5 rounded-xl border flex items-center justify-between font-mono text-xs sm:text-sm bg-emerald-500/10 border-emerald-500/30 text-emerald-400 w-full animate-fade-in">
                      <span className="flex items-center gap-1.5 font-bold"><CheckCircle2 size={14} /> STATUS: SELECTED NODE</span>
                      <span className="font-bold">คุณเลือก: โต๊ะ {selectedTable}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading || !selectedTable || !bookingDate} 
                    className="w-full mt-3 py-4 text-base font-bold tracking-wide rounded-xl transition-all active:scale-[0.98] disabled:opacity-20 disabled:scale-100 flex items-center justify-center gap-1.5 text-black font-sans" 
                    style={{ backgroundColor: THEME.gold, boxShadow: selectedTable && bookingDate ? `0 4px 25px rgba(229, 184, 66, 0.4)` : 'none' }} 
                  >
                    {loading ? 'PROCESSING VECTOR...' : 'ยืนยันรหัสจองและจัดโต๊ะ'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="success-step" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-md z-10 px-2 sm:px-0" >
            <div className="p-6 sm:p-8 border text-center space-y-6 shadow-2xl relative overflow-hidden rounded-3xl" style={{ backgroundColor: THEME.card, borderColor: THEME.border }} >
              <div className="absolute w-4 h-8 border border-l-0 rounded-r-full top-1/2 -left-0.5 -translate-y-1/2" style={{ backgroundColor: THEME.bg, borderColor: THEME.border }} />
              <div className="absolute w-4 h-8 border border-r-0 rounded-l-full top-1/2 -right-0.5 -translate-y-1/2" style={{ backgroundColor: THEME.bg, borderColor: THEME.border }} />

              {/* หัวการ์ดไดนามิกแยกตามสถานะคิว */}
              <div className="space-y-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${isPendingPayment ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                  {isPendingPayment ? <QrCode size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <div>
                  <p className={`text-[10px] font-mono tracking-widest uppercase font-bold ${isPendingPayment ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isPendingPayment ? 'PROMPTPAY SCAN ACTIVE' : 'RESERVATION SECURED'}
                  </p>
                  <h2 className="text-2xl font-bold text-white mt-0.5">
                    {isPendingPayment ? 'สแกนคิวอาร์โค้ดชำระเงิน' : 'ล็อกที่นั่งสำเร็จเรียบร้อย'}
                  </h2>
                </div>
              </div>

              {/* 🔮 แผงโชว์ Dynamic PromptPay QR Code ล็อกยอดเงินอัจฉริยะ */}
              {isPendingPayment && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center space-y-2 bg-white p-4 rounded-2xl mx-auto w-56 shadow-[0_0_30px_rgba(229,184,66,0.15)] border border-amber-500/40">
                  <div className="w-full flex items-center justify-between text-[10px] font-bold text-blue-900 font-sans tracking-wide px-0.5 pb-1 border-b border-gray-100">
                    <span>PROMPTPAY Dynamic QR</span>
                    <span className="text-blue-600">พร้อมเพย์</span>
                  </div>
                  
                  <div className="w-44 h-44 bg-gray-50 flex items-center justify-center relative rounded-lg overflow-hidden mt-1 p-1">
                    <img 
                      src={`https://promptpay.io/${SHOP_PROMPTPAY_ID}/${calculatedTotalAmount}.png`} 
                      alt="PromptPay Dynamic QR Code"
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </div>
                  
                  <div className="text-center font-sans mt-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">Net Amount</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-1">{calculatedTotalAmount.toLocaleString()} <span className="text-xs font-semibold text-slate-600">บาท</span></p>
                  </div>
                </motion.div>
              )}

              {/* ตั๋วข้อมูลสรุปคิวจอง */}
              <div className="bg-black/40 border border-dashed rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm font-mono text-left" style={{ borderColor: THEME.border }}>
                <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span style={{ color: THEME.muted }}>BOOKING CODE</span>
                  <span className="font-bold" style={{ color: THEME.gold }}>{successData?.booking_code}</span>
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

              {/* ข้อความแจ้งเตือนคำแนะนำวิธีแนบสลิปส่งทางไลน์ */}
              {isPendingPayment && (
                <div className="p-3 text-left bg-black/20 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1.5 font-sans leading-relaxed">
                  <p className="text-gray-200 font-bold flex items-center gap-1.5">
                    <ArrowRight size={13} className="text-pink-500" /> คำแนะนำหลังโอนเงิน:
                  </p>
                  <p>1. เปิดแอปธนาคาร สแกนคิวอาร์โค้ดด้านบน ยอดเงินจะกรอกให้อัตโนมัติ</p>
                  <p>2. บันทึกสลิปหลักฐาน และกดปุ่มดาวน์โหลดใบยืนยันคิวด้านล่างนี้</p>
                  <p className="text-pink-500 font-semibold animate-pulse">3. ส่งหลักฐานทั้งหมดไปที่ LINE OA ของทางร้าน เพื่อให้สตาฟฟ์ตรวจสอบและเปิดคิวจองโต๊ะเป็นสถานะไฟเขียวให้คุณครับ</p>
                </div>
              )}

              {/* แผงควบคุมปุ่มกดออก */}
              <div className="space-y-2 pt-1 text-sm">
                <button onClick={handleDownloadPDF} className="w-full py-3 bg-emerald-500 text-[#121318] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all active:scale-95 hover:opacity-90">
                  <Download size={15} /> ดาวน์โหลดใบยืนยันคิว PDF
                </button>
                <button onClick={() => { setStep('form'); setCustomerName(''); setPhone(''); setSelectedTable(null); }} className="w-full py-2.5 border bg-transparent hover:bg-white/5 rounded-xl transition-colors" style={{ borderColor: THEME.border, color: THEME.muted }}>
                  ออกจากการจอง
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .color-scheme-dark { color-scheme: dark; }
        .box-sizing-border { box-sizing: border-box; }
        
        /* 📱 🔮 [แก้ไขจุดนี้] บังคับขยายท่อความสูงเป็น 100% เพื่อให้ Flexbox ดึงข้อความมาอยู่กึ่งกลางแนวตั้งเป๊ะ ๆ */
        input[type="date"]::-webkit-date-and-time-value {
          color: #F1F1F5 !important;
          text-align: left;
          display: flex;
          align-items: center;
          min-height: 100% !important;
          height: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        input[type="date"] {
          appearance: none !important;
          -webkit-appearance: none !important;
          color-scheme: dark !important;
          color: #F1F1F5 !important;
        }
      `}</style>
    </div>
  );
}
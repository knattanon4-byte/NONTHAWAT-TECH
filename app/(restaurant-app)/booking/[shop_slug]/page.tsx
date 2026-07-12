'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { jsPDF as PDFInstance } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, Phone, User, Clock, CheckCircle2, Download, AlertTriangle, ChevronDown, QrCode, ArrowRight, Plus, Minus, X, Music } from 'lucide-react';
import FloorPlan from '@/components/booking/FloorPlan';

// 🟢 ระบุหมายเลขพร้อมเพย์ของร้าน
const SHOP_PROMPTPAY_ID = '0922657200'; 
// 🟢 กำหนดวันที่เริ่มเข้มงวดการตรวจคิว
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

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [showConcertModal, setShowConcertModal] = useState(false);
  const [concertEvent, setConcertEvent] = useState<any>(null);

  // 🟢 State สำหรับ List คอนเสิร์ตทั้งหมด
  const [showConcertListModal, setShowConcertListModal] = useState(false);
  const [upcomingConcerts, setUpcomingConcerts] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<BookingRecord[] | null>(null);

  const [isShopOpen, setIsShopOpen] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true); 
  const [shopExists, setShopExists] = useState(true);

  // Form States
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('19:00');
  const [guestsCount, setGuestsCount] = useState(4);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [dayTables, setDayTables] = useState<Record<string, 'booked' | 'pending'>>({});
  
  const [currentEventPrice, setCurrentEventPrice] = useState(0);
  const [eventsMap, setEventsMap] = useState<Record<string, any>>({});

  const formattedShopName = 'ร้าน เรๅ สาขาศรีนครินทร์';
  const minAllowedGuests = 4;

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShowErrorModal(true);
  };

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

  // 🟢 ดึงข้อมูลคอนเสิร์ตทั้งหมดที่มีในอนาคตมาแสดงเป็น List และแมปปฏิทิน
  useEffect(() => {
    const fetchUpcomingConcerts = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('shop_events')
        .select('*')
        .eq('shop_id', shopSlug)
        .gte('event_date', today)
        .order('event_date', { ascending: true });
      
      if (data) {
        // แยกเก็บเป็นลิสต์คอนเสิร์ต
        setUpcomingConcerts(data.filter((e: any) => e.event_type === 'concert'));
        
        // แยกเก็บเป็น Map ไว้เช็กวันที่
        const mapped = data.reduce((acc, curr: any) => ({
          ...acc,
          [curr.event_date]: curr
        }), {} as Record<string, any>);
        setEventsMap(mapped);
      }
    };
    fetchUpcomingConcerts();
  }, [shopSlug]);

  // เช็ก event รายวันเมื่อลูกค้ากดเลือกวันที่
  useEffect(() => {
    if (!bookingDate) return;
    
    // ดึงข้อมูลจาก eventsMap แทนการยิงฐานข้อมูลใหม่
    const eventData = eventsMap[bookingDate];
    
    if (eventData && eventData.event_type === 'concert') {
      setConcertEvent(eventData);
      setShowConcertModal(true); 
      setCurrentEventPrice(eventData.price || 0);
    } else {
      setConcertEvent(null);
      setCurrentEventPrice(0);
    }
  }, [bookingDate, eventsMap]);

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
              setDayTables(prev => {
                const nextState = { ...prev };
                if (payload.new.status === 'no_show') {
                  delete nextState[payload.new.table_number];
                } else {
                  nextState[payload.new.table_number] = payload.new.status === 'pending' ? 'pending' : 'booked';
                }
                return nextState;
              });
            }
          }
        }
      ).subscribe();

    return () => { active = false; supabase.removeChannel(realtimeChannel); };
  }, [bookingDate, fetchTodayBookings, shopSlug]);

  useEffect(() => {
    setSelectedTables([]);
    setGuestsCount(4);
  }, [bookingDate]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !bookingDate || selectedTables.length === 0) return;

    if (!isShopOpen) { triggerError('ขออภัยครับขณะนี้ระบบรับคิวจองออนไลน์ปิดชั่วคราวแล้วครับ'); return; }

    const isAnyTableUnavailable = selectedTables.some(t => dayTables[t] === 'booked' || dayTables[t] === 'pending');
    if (isAnyTableUnavailable) {
      triggerError('ขออภัยครับ มีบางโต๊ะที่คุณเลือกถูกจองไปแล้ว กรุณาเลือกใหม่อีกครั้งครับ');
      fetchTodayBookings(bookingDate); setSelectedTables([]); return;
    }

    if (guestsCount < minAllowedGuests) {
      triggerError(`ขออภัยครับ ข้อกำหนดของทางร้านจำเป็นต้องมีสมาชิกขั้นต่ำ ${minAllowedGuests} ท่านครับ`);
      setGuestsCount(4); return;
    }

    setLoading(true);
    try {
      const eventData = eventsMap[bookingDate];
      const isConcertDay = eventData?.event_type === 'concert';
      const eventPricePerTable = eventData?.price || 0;
      setCurrentEventPrice(eventPricePerTable);

      const statusToSet = (isConcertDay && bookingDate >= ENFORCE_CHECK_DATE) ? 'pending' : 'confirmed';
      const randomCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

      const newBookings = selectedTables.map(table => ({
        shop_id: shopSlug,
        booking_code: selectedTables.length > 1 ? `${randomCode}-${table}` : randomCode, 
        customer_name: customerName,
        phone: phone,
        booking_date: bookingDate,
        booking_time: `${bookingTime}:00`, 
        guests_count: guestsCount, 
        table_number: table,
        status: statusToSet, 
      }));

      const { data, error } = await supabase.from('restaurant_bookings').insert(newBookings).select();

      if (error) {
        if (error.code === '23505') { 
          triggerError('มีการซ้อนทับของคิวจอง กรุณาเลือกโต๊ะอื่นแทนนะครับ');
          fetchTodayBookings(bookingDate); setSelectedTables([]); return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        setSuccessData(data as unknown as BookingRecord[]);
        
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
        } catch (lineErr) { console.error('LINE notification failed:', lineErr); }

        setShowModal(true); 
      }
    } catch (err) {
      console.error(err); triggerError('ระบบเชื่อมโยงข้อมูลขัดข้อง กรุณาลองใหม่อีกครั้ง');
    } finally { setLoading(false); }
  };

  const handleDownloadPDF = () => {
    if (!successData || successData.length === 0) return;
    const bookingInfo = successData[0]; 
    const allTables = successData.map(b => b.table_number).join(', '); 
    const canvas = document.createElement('canvas');
    canvas.width = 450; canvas.height = 720; 
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const ThaiFont = "'Prompt', 'Thonburi', 'Arial', sans-serif";
    ctx.fillStyle = '#111116'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#E5B842'; ctx.lineWidth = 4; ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
    ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 24px ${ThaiFont}`; 
    ctx.fillText(formattedShopName, 225, 120);
    ctx.fillStyle = '#FF1F88'; ctx.font = `bold 13px ${ThaiFont}`; 
    ctx.fillText(bookingInfo.status === 'pending' ? '★ ใบยืนยันคิวรอชำระเงิน ★' : '★ ใบยืนยันการจองโต๊ะอาหาร ★', 225, 150);
    ctx.strokeStyle = '#2D2235'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(35, 180); ctx.lineTo(415, 180); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#9E9EAF'; ctx.font = `12px ${ThaiFont}`; ctx.fillText('BOOKING CODE', 225, 215);
    const cleanDisplayCode = bookingInfo.booking_code.split('-').length > 2 ? bookingInfo.booking_code.split('-').slice(0, 2).join('-') : bookingInfo.booking_code;
    ctx.fillStyle = '#E5B842'; ctx.font = `bold 38px ${ThaiFont}`; ctx.fillText(cleanDisplayCode, 225, 260);
    ctx.strokeStyle = '#2D2235'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(40, 290); ctx.lineTo(410, 290); ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = `15px ${ThaiFont}`;
    let currentY = 335; const spacing = 36; const leftCol = 55; const rightCol = 185;
    const items = [
      { label: 'ชื่อผู้เช็กจอง :', value: bookingInfo.customer_name },
      { label: 'เบอร์ติดต่อ :', value: bookingInfo.phone },
      { label: 'วันที่เข้ารับสิทธิ์ :', value: bookingInfo.booking_date },
      { label: 'เวลาล็อกโต๊ะ :', value: `${bookingInfo.booking_time.slice(0, 5)} น.` }, 
      { label: 'จำนวนสมาชิก :', value: `${bookingInfo.guests_count} ท่าน (ขั้นต่ำ 4 ท่าน)` }
    ];
    items.forEach(item => {
      ctx.fillStyle = '#9E9EAF'; ctx.fillText(item.label, leftCol, currentY);
      ctx.fillStyle = '#FFFFFF'; ctx.fillText(item.value, rightCol, currentY);
      currentY += spacing;
    });
    ctx.strokeStyle = '#2D2235'; ctx.beginPath(); ctx.moveTo(40, 520); ctx.lineTo(410, 520); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#FF1F88'; ctx.font = `bold 12px ${ThaiFont}`;
    ctx.fillText('ASSIGNED STATION TABLE', 225, 555);
    const tableFontSize = allTables.length > 5 ? 40 : 64;
    ctx.fillStyle = '#E5B842'; ctx.font = `bold ${tableFontSize}px ${ThaiFont}`;
    ctx.fillText(allTables, 225, 630);
    const doc = new PDFInstance({ orientation: 'p', unit: 'mm', format: [85, 136] });
    const ticketImg = canvas.toDataURL('image/jpeg', 1.0);
    doc.addImage(ticketImg, 'JPEG', 0, 0, 85, 136);
    doc.save(`TICKET-${bookingInfo.booking_code.split('-')[0]}.pdf`);
  };

  const resetForm = () => {
    setShowModal(false);
    setCustomerName('');
    setPhone('');
    setSelectedTables([]);
    if (bookingDate) fetchTodayBookings(bookingDate);
  };

  if (!shopExists) { return notFound(); }

  const isPendingPayment = successData?.[0]?.status === 'pending';
  const calculatedTotalAmount = currentEventPrice * (successData?.length || 1); 

  return (
    <div className="min-h-screen w-full font-sans flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 select-none" style={{ backgroundColor: THEME.bg, color: THEME.text }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[150px] -top-32 -right-24" style={{ backgroundColor: `${THEME.pink}0A` }} />
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[140px] -bottom-32 -left-24" style={{ backgroundColor: `${THEME.purple}0D` }} />
      </div>

      <div className="w-full max-w-xl z-10 flex justify-center px-2 sm:px-0 mt-8 mb-8">
        <div className="p-5 sm:p-8 border space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl rounded-3xl w-full max-w-md sm:max-w-xl" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
          
          {/* 🟢 อัปเดตส่วนหัว โชว์โลโก้ร้าน */}
          <div className="text-center space-y-2 flex flex-col items-center">
            <img 
              src="/LOGO.png" 
              alt="โลโก้ร้าน เรๅ" 
              className="h-24 sm:h-28 w-auto object-contain mb-2 drop-shadow-[0_0_15px_rgba(255,31,136,0.3)] translate-x-3" 
            />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white block mt-2">
              สาขาศรีนครินทร์
            </h1>
            <p className="text-sm sm:text-base font-bold font-mono uppercase tracking-[0.18em] pt-1" style={{ color: THEME.gold }}>
              ★ จองโต๊ะอาหารล่วงหน้า ★
            </p>
            <p className="text-xs sm:text-sm px-1 leading-relaxed" style={{ color: THEME.muted }}>
              กรุณาเลือกวันเวลา และตำแหน่งโต๊ะที่ชอบบนผังร้าน (เลือกได้หลายโต๊ะ)
            </p>
          </div>

          {checkingStatus ? (
            <div className="text-center py-8 text-sm font-mono tracking-widest animate-pulse font-semibold" style={{ color: THEME.pink }}>
              INITIALIZING PROTOCOL...
            </div>
          ) : !isShopOpen ? (
            <div className="p-6 rounded-2xl border text-center space-y-4 bg-black/40 mt-4" style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}>
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto animate-pulse"><AlertTriangle size={22} /></div>
              <div>
                <h3 className="text-base font-bold text-white">ขออภัยครับ คิวจองออนไลน์ปิดชั่วคราว</h3>
                <p className="text-xs sm:text-sm mt-2 leading-relaxed" style={{ color: THEME.muted }}>ขณะนี้ร้านมีผู้ใช้บริการหน้าร้านหนาแน่น ระบบรับคิวล่วงหน้าจึงปิดชั่วคราวครับ</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-5 text-base w-full">
              
              {/* ปุ่มกดดูลิสต์คอนเสิร์ตทั้งหมด */}
              {upcomingConcerts.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setShowConcertListModal(true)}
                  className="w-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl p-3 flex items-center justify-between hover:bg-pink-500/30 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-pink-500 text-white p-1.5 rounded-lg group-hover:scale-110 transition-transform"><Music size={16} /></div>
                    <span className="font-bold text-sm text-pink-100 tracking-wide">ดูตารางปาร์ตี้คอนเสิร์ตทั้งหมด 🎉</span>
                  </div>
                  <ArrowRight size={16} className="text-pink-400 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full bg-black/30 p-3 rounded-2xl border" style={{ borderColor: `${THEME.gold}20` }}>
                <div className="space-y-2 w-full min-w-0">
                  <label className="font-semibold text-sm sm:text-base flex items-center gap-1.5 font-mono" style={{ color: THEME.gold }}>
                    <Calendar size={15} /> 1. เลือกวันที่ต้องการจอง
                  </label>
                  <div 
                    className="relative flex items-center rounded-xl border bg-black/40 w-full h-12 transition-all duration-300 focus-within:border-amber-400" 
                    style={{ 
                      borderColor: bookingDate && eventsMap[bookingDate]?.event_type === 'concert' ? THEME.pink : THEME.border,
                      boxShadow: bookingDate && eventsMap[bookingDate]?.event_type === 'concert' ? `0 0 15px ${THEME.pink}40` : 'none'
                    }}
                  >
                    <input 
                      type="date" 
                      required 
                      min={new Date().toISOString().split('T')[0]} 
                      value={bookingDate} 
                      onChange={(e) => setBookingDate(e.target.value)} 
                      className="w-full h-full appearance-none bg-transparent px-4 text-white outline-none text-base color-scheme-dark block min-w-0 box-border iOS-date-input" 
                    />
                  </div>
                  {/* แจ้งเตือนวันคอนเสิร์ตใต้ปฏิทินแบบเรียลไทม์ */}
                  <AnimatePresence>
                    {bookingDate && eventsMap[bookingDate]?.event_type === 'concert' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, height: 0 }} 
                        animate={{ opacity: 1, y: 0, height: 'auto' }} 
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="text-xs font-bold flex items-center gap-1.5 px-2 pt-1"
                        style={{ color: THEME.pink }}
                      >
                        <Music size={14} className="animate-pulse" /> 
                        วันนี้มีอีเวนต์พิเศษ: {eventsMap[bookingDate].title}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2 w-full">
                  <label className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-gray-300">
                    <Clock size={15} /> 2. ระบุเวลาเข้าโต๊ะ
                  </label>
                  <div className="relative flex items-center rounded-xl border bg-black/40 w-full h-12 transition-all duration-200 focus-within:border-amber-400" style={{ borderColor: THEME.border }}>
                    <select 
                      value={bookingTime} 
                      onChange={(e) => setBookingTime(e.target.value)} 
                      className="w-full h-full cursor-pointer appearance-none bg-transparent px-4 text-white outline-none text-base font-medium"
                    >
                      <option value="19:00" style={{ backgroundColor: THEME.card }}>19:00 น. </option>
                      <option value="20:00" style={{ backgroundColor: THEME.card }}>20:00 น. </option>
                      <option value="21:00" style={{ backgroundColor: THEME.card }}>21:00 น. </option>
                      <option value="22:00" style={{ backgroundColor: THEME.card }}>22:00 น. </option>
                      <option value="23:00" style={{ backgroundColor: THEME.card }}>23:00 น.</option>
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 w-full">
                <label className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-gray-200 leading-tight">
                  3. คลิกเลือกตำแหน่งโต๊ะอาหารบนแผนผังร้าน <span className="text-pink-400 text-xs ml-1">(เลือกได้หลายโต๊ะ)</span>
                </label>
                <div className="w-full rounded-2xl bg-black/40 p-1 border box-sizing-border overflow-x-auto relative min-h-[220px] flex items-center justify-center transition-all duration-300" style={{ borderColor: THEME.border }}>
                  {bookingDate ? (
                    <FloorPlan 
                      selectedTables={selectedTables} 
                      setSelectedTables={setSelectedTables} 
                      dayTables={dayTables} 
                    />
                  ) : (
                    <div className="text-center p-8 space-y-2.5 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-black/40 border flex items-center justify-center mx-auto mb-1" style={{ borderColor: `${THEME.gold}30`, color: THEME.gold }}>
                        <AlertTriangle size={18} />
                      </div>
                      <p className="text-sm font-bold" style={{ color: THEME.gold }}>กรุณาเลือก "วันที่ต้องการจอง" ด้านบนก่อนครับ</p>
                    </div>
                  )}
                </div>

                {/* 🟢 คำอธิบายสีสถานะโต๊ะ (Legend) */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-3 text-[10px] sm:text-xs font-medium text-slate-300 w-full">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-700"></span> ว่าง</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-400 border border-white animate-pulse"></span> โต๊ะที่เลือก</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 border border-red-700"></span> จองแล้ว</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600 animate-pulse"></span> รอชำระเงิน</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700 opacity-60"></span> ปิดใช้งาน</div>
                </div>
              </div>

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
                      <Users size={16} style={{ color: THEME.pink }} /> จำนวนสมาชิก <span className="text-xs ml-1" style={{ color: THEME.gold }}>(ขั้นต่ำ 4 คน)</span>
                    </label>
                    <div className="relative flex items-center justify-between rounded-xl border bg-black/20 w-full h-12 px-3 transition-all duration-200" style={{ borderColor: THEME.border, opacity: bookingDate ? 1 : 0.3 }}>
                      <button 
                        type="button" 
                        disabled={!bookingDate || selectedTables.length === 0 || guestsCount <= minAllowedGuests} 
                        onClick={() => setGuestsCount(prev => Math.max(minAllowedGuests, prev - 1))} 
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-20"
                      >
                        <Minus size={14} />
                      </button>

                      <input 
                        type="number"
                        disabled={!bookingDate || selectedTables.length === 0}
                        placeholder="ระบุจำนวน"
                        value={selectedTables.length === 0 || guestsCount === 0 ? '' : guestsCount} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setGuestsCount(val === '' ? 0 : parseInt(val, 10));
                        }}
                        className="w-16 bg-transparent text-center text-white outline-none text-base font-bold text-pink-400 block h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />

                      <button 
                        type="button" 
                        disabled={!bookingDate || selectedTables.length === 0} 
                        onClick={() => setGuestsCount(prev => prev + 1)} 
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-20"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {selectedTables.length > 0 && (
                <div className="p-3.5 rounded-xl border flex items-center justify-between font-mono text-xs sm:text-sm bg-emerald-500/10 border-emerald-500/30 text-emerald-400 w-full animate-fade-in">
                  <span className="flex items-center gap-1.5 font-bold"><CheckCircle2 size={14} /> STATUS: {selectedTables.length} NODES SELECTED</span>
                  <span className="font-bold">คุณเลือก: โต๊ะ {selectedTables.join(', ')}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || selectedTables.length === 0 || !bookingDate} 
                className="w-full mt-3 py-4 text-base font-bold tracking-wide rounded-xl transition-all active:scale-[0.98] disabled:opacity-20 disabled:scale-100 flex items-center justify-center gap-1.5 text-black font-sans" 
                style={{ backgroundColor: THEME.gold, boxShadow: selectedTables.length > 0 && bookingDate ? `0 4px 25px rgba(229, 184, 66, 0.4)` : 'none' }} 
              >
                {loading ? 'PROCESSING VECTOR...' : 'ยืนยันรหัสจองและจัดโต๊ะ'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ================= 🟢 POP-UP CONCERT LIST (ตารางคอนเสิร์ต) ================= */}
      <AnimatePresence>
        {showConcertListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConcertListModal(false)} className="fixed inset-0 bg-black/85 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md h-[80vh] flex flex-col relative overflow-hidden rounded-3xl z-10 shadow-2xl bg-[#16161E] border border-[#2D2235]"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Music className="text-pink-500"/> ตารางคอนเสิร์ต / ปาร์ตี้</h2>
                <button onClick={() => setShowConcertListModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {upcomingConcerts.length > 0 ? upcomingConcerts.map((concert) => (
                  <div key={concert.id} className="bg-black/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group hover:border-pink-500/50 transition-colors">
                    {concert.image_url && (
                      <div className="w-full relative overflow-hidden border-b border-white/5 bg-black">
                        {/* 🟢 ปล่อยให้รูปยืดความสูงตามจริง (h-auto) รูปจะเต็มขอบ 100% โดยไม่โดนตัดหัว */}
                        <img 
                          src={concert.image_url} 
                          alt={concert.title} 
                          className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-white text-lg leading-tight">{concert.title}</h3>
                        <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-1 rounded-md font-bold whitespace-nowrap ml-2">{concert.event_date}</span>
                      </div>
                      <p className="text-amber-400 font-bold text-sm">บัตรเหมาต่อโต๊ะ: {concert.price.toLocaleString()} THB</p>
                      
                      {concert.perks_note && (
                        <div className="pt-2 mt-2 border-t border-white/5">
                          <p className="text-[11px] text-slate-400 font-bold mb-1">หมายเหตุและเงื่อนไข:</p>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{concert.perks_note}</p>
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          setBookingDate(concert.event_date);
                          setShowConcertListModal(false);
                        }}
                        className="w-full mt-3 py-2.5 bg-white/5 hover:bg-pink-500 hover:text-white text-slate-300 rounded-xl text-sm font-bold transition-all border border-slate-700 hover:border-pink-500"
                      >
                        เลือกคอนเสิร์ตนี้
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                    <Music size={32} className="opacity-20" />
                    <p>ยังไม่มีคิวงานคอนเสิร์ตในขณะนี้</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= 🟢 POP-UP CONCERT (FULL IMAGE BACKGROUND) ================= */}
      <AnimatePresence>
        {showConcertModal && concertEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => { setShowConcertModal(false); setBookingDate(''); }} 
              className="fixed inset-0 bg-black/85 backdrop-blur-sm" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm min-h-[500px] relative overflow-hidden rounded-[2rem] z-10 flex flex-col justify-end shadow-2xl"
              style={{ backgroundColor: THEME.card }}
            >
              <button 
                onClick={() => { setShowConcertModal(false); setBookingDate(''); }} 
                className="absolute right-4 top-4 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 z-20 transition-colors"
              >
                <X size={18} />
              </button>
              
              {concertEvent.image_url && (
                <img src={concertEvent.image_url} alt="Concert Poster" className="absolute inset-0 w-full h-full object-cover z-0" />
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/80 to-transparent z-0 pointer-events-none" />

              <div className="relative z-10 p-6 flex flex-col items-center text-center w-full mt-auto">
                 <h2 className="text-sm font-black text-white bg-black/40 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full mb-2">
                   {concertEvent.event_date}
                 </h2>
                 <h3 className="text-3xl font-black text-white mb-4 drop-shadow-lg">
                   {concertEvent.title || 'Concert Event'}
                 </h3>
                 
                 <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-3xl p-5 w-full text-sm font-bold shadow-xl whitespace-pre-line leading-relaxed">
                    {concertEvent.perks_note || `โปรโมชั่นสำหรับวันนี้จองขั้นต่ำ 2 โต๊ะ\nเตรียมพร้อมมาสนุกสุดเหวี่ยง\nไปพร้อมกับสาวๆ ทั้ง 5 คนได้เลย\nราคาต่อโต๊ะ ${concertEvent.price} ฿`}
                 </div>
                 
                 <p className="text-xs text-amber-400 mt-4 font-bold animate-pulse drop-shadow-md">คลิกด้านล่างเพื่อทำการจอง</p>
                 
                 <button 
                  onClick={() => setShowConcertModal(false)} 
                  className="mt-3 w-[80%] py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black rounded-full shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-transform active:scale-95"
                 >
                   จองโต๊ะ
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= 🟢 POP-UP ERROR MODAL ================= */}
      <AnimatePresence>
        {showErrorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowErrorModal(false)} className="fixed inset-0 bg-black/85 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="w-full max-w-sm border shadow-2xl relative overflow-hidden rounded-2xl p-6 text-center z-10"
              style={{ backgroundColor: THEME.card, borderColor: `${THEME.pink}50` }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertTriangle size={24} className="animate-bounce" />
              </div>
              <h3 className="text-base font-extrabold text-white tracking-wide">ระบบตรวจพบข้อขัดข้อง</h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-2 px-1">{errorMessage}</p>
              <button 
                onClick={() => setShowErrorModal(false)} 
                className="w-full mt-5 py-2.5 font-bold rounded-xl text-xs transition-colors text-white border hover:bg-white/5 active:scale-95"
                style={{ borderColor: THEME.border }}
              >
                รับทราบและกลับไปแก้ไข
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= SUCCESS TICKET POP-UP MODAL ================= */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetForm} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md border shadow-2xl relative overflow-hidden rounded-2xl z-10" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
            >
              <div className="absolute w-4 h-8 border border-l-0 rounded-r-full top-1/2 -left-0.5 -translate-y-1/2" style={{ backgroundColor: THEME.bg, borderColor: THEME.border }} />
              <div className="absolute w-4 h-8 border border-r-0 rounded-l-full top-1/2 -right-0.5 -translate-y-1/2" style={{ backgroundColor: THEME.bg, borderColor: THEME.border }} />
              <button onClick={resetForm} className="absolute right-4 top-4 p-1.5 rounded-lg bg-black/20 text-gray-400 hover:text-white"><X size={16} /></button>

              <div className="p-6 md:p-8 space-y-5">
                <div className="text-center space-y-2">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border-2 ${isPendingPayment ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    {isPendingPayment ? <QrCode size={26} /> : <CheckCircle2 size={26} />}
                  </div>
                  <div>
                    <p className={`text-[10px] font-mono tracking-widest uppercase font-bold ${isPendingPayment ? 'text-amber-400' : 'text-emerald-400'}`}>{isPendingPayment ? 'PROMPTPAY SCAN ACTIVE' : 'RESERVATION SECURED'}</p>
                    <h2 className="text-xl md:text-2xl font-black text-white mt-1">{isPendingPayment ? 'สแกนคิวอาร์โค้ดชำระเงิน' : 'ล็อกที่นั่งสำเร็จเรียบร้อย'}</h2>
                  </div>
                </div>

                {isPendingPayment && (
                  <div className="flex flex-col items-center justify-center space-y-2 bg-white p-4 rounded-xl mx-auto w-56 border-2 border-amber-500/20">
                    <div className="w-full flex items-center justify-between text-[9px] font-black text-blue-900 font-sans tracking-wide pb-1.5 border-b border-gray-100"><span>PROMPTPAY Dynamic QR</span><span className="text-blue-600">พร้อมเพย์</span></div>
                    <div className="w-40 h-40 bg-gray-50 flex items-center justify-center relative rounded-md p-1">
                      <img src={`https://promptpay.io/${SHOP_PROMPTPAY_ID}/${calculatedTotalAmount}.png`} alt="PromptPay QR" className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <div className="text-center font-sans">
                      <p className="text-[9px] font-bold text-gray-400 uppercase leading-none">Net Amount <span className="text-[8px] text-pink-500 ml-1">({successData?.length} โต๊ะ)</span></p>
                      <p className="text-xl font-black text-slate-900 mt-1">{calculatedTotalAmount.toLocaleString()} <span className="text-xs font-semibold text-slate-600">บาท</span></p>
                    </div>
                  </div>
                )}

                <div className="bg-black/30 border border-dashed rounded-xl p-4 space-y-2.5 text-xs font-mono" style={{ borderColor: THEME.border }}>
                  <div className="flex justify-between border-b pb-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-gray-400">BOOKING CODE</span>
                    <span className="font-bold text-sm" style={{ color: THEME.gold }}>
                      {(successData?.[0]?.booking_code?.split('-')?.length ?? 0) > 2 ? successData?.[0]?.booking_code?.split('-')?.slice(0, 2)?.join('-') : successData?.[0]?.booking_code}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-400">TABLE STATION</span><span className="font-bold text-white text-right max-w-[160px] break-words">{successData?.map(b => b.table_number).join(', ')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">DATE</span><span className="font-sans text-gray-200">{successData?.[0]?.booking_date}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">ARRIVAL TIME</span><span className="font-sans text-gray-200">{successData?.[0]?.booking_time?.slice(0, 5)} น.</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">GUESTS</span><span className="font-sans text-gray-200">{successData?.[0]?.guests_count} ท่าน</span></div>
                </div>

                {isPendingPayment && (
                  <div className="p-3 bg-black/20 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1 font-sans leading-relaxed">
                    <p className="text-gray-200 font-bold flex items-center gap-1.5"><ArrowRight size={12} className="text-pink-500" /> คำแนะนำหลังโอนเงิน:</p>
                    <p>1. สแกนคิวอาร์โค้ดชำระเงินตามยอดด้านบน</p>
                    <p>2. ดาวน์โหลดใบยืนยันคิว PDF เก็บไว้เป็นหลักฐาน</p>
                    <p className="text-pink-400 font-semibold">3. ส่งหลักฐานทั้งหมดไปที่ LINE OA เพื่อให้แอดมินยืนยันล็อกโต๊ะครับ</p>
                  </div>
                )}

                <div className="space-y-2 pt-1 text-xs">
                  <button onClick={handleDownloadPDF} className="w-full py-3 bg-emerald-500 text-[#121318] font-black rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:bg-emerald-400 transition-all"><Download size={14} /> ดาวน์โหลดใบยืนยันคิว PDF</button>
                  <button onClick={resetForm} className="w-full py-2.5 border bg-transparent hover:bg-white/5 rounded-xl text-gray-400 transition-colors" style={{ borderColor: THEME.border }}>ออกและกลับไปหน้าหลัก</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .color-scheme-dark { color-scheme: dark; }
        .box-sizing-border { box-sizing: border-box; }
        
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
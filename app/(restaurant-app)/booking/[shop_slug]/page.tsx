'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { jsPDF as PDFInstance } from 'jspdf';
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
  
  // 🟢 เปลี่ยนมารับข้อมูลความสำเร็จเป็น Array เพราะอาจจะมีหลายโต๊ะ
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
  
  // 🟢 เปลี่ยนจาก string | null เป็น string[] (เก็บโต๊ะได้หลายตัว)
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [dayTables, setDayTables] = useState<Record<string, 'booked' | 'pending'>>({});
  
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

  // Real-time Database
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

  // ล้างค่าโต๊ะที่เลือกเมื่อเปลี่ยนวัน
  useEffect(() => {
    setSelectedTables([]);
    setGuestsCount(4);
  }, [bookingDate]);

  // 🟢 ปรับเปลี่ยนลอจิกเป็น: คำนวณจำนวนสมาชิกขั้นต่ำตามจำนวนโต๊ะที่เลือก (โต๊ะละ 4 คน)
  const minAllowedGuests = selectedTables.length * 4;

  // 🟢 เพิ่มระบบ Auto-Sync ตัวเลขในช่องกรอกให้ขยับตามขั้นต่ำอัตโนมัติเมื่อจำนวนโต๊ะเปลี่ยนไป
  useEffect(() => {
    if (selectedTables.length > 0 && guestsCount < minAllowedGuests) {
      setGuestsCount(minAllowedGuests);
    }
  }, [selectedTables, minAllowedGuests, guestsCount]);

  // ฟังก์ชันส่งจองโต๊ะเข้าระบบ
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !bookingDate || selectedTables.length === 0) return;

    if (!isShopOpen) {
      alert('ขออภัยครับขณะนี้ระบบรับคิวจองออนไลน์ปิดชั่วคราวแล้วครับ');
      return;
    }

    // 🟢 ตรวจสอบว่าโต๊ะที่เลือกมาทั้งหมด ยังว่างอยู่จริงๆ
    const isAnyTableUnavailable = selectedTables.some(t => dayTables[t] === 'booked' || dayTables[t] === 'pending');
    if (isAnyTableUnavailable) {
      alert('ขออภัยครับ มีบางโต๊ะที่คุณเลือกถูกจองไปแล้ว กรุณาเลือกใหม่อีกครั้งครับ');
      fetchTodayBookings(bookingDate); // Refresh ข้อมูลใหม่
      setSelectedTables([]);
      return;
    }

    // 🟢 เปลี่ยนเงื่อนไข Validation เป็นตรวจสอบค่าขั้นต่ำ
    if (guestsCount < minAllowedGuests) {
      alert(`ขออภัยครับ คุณเลือก ${selectedTables.length} โต๊ะ ข้อกำหนดของทางร้านจำเป็นต้องมีสมาชิกขั้นต่ำ ${minAllowedGuests} ท่านครับ`);
      return;
    }

    setLoading(true);
    try {
      const { data: eventData } = await supabase
        .from('shop_events')
        .select('event_type, price')
        .eq('shop_id', shopSlug)
        .eq('event_date', bookingDate)
        .maybeSingle();

      const isConcertDay = eventData?.event_type === 'concert';
      const eventPricePerTable = eventData?.price || 0; // 🟢 สมมติให้ Price ในฐานข้อมูลคือราคาต่อ 1 โต๊ะ
      
      setCurrentEventPrice(eventPricePerTable);

      const statusToSet = (isConcertDay && bookingDate >= ENFORCE_CHECK_DATE) 
        ? 'pending' 
        : 'confirmed';

      const randomCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

      // 🟢 เตรียมข้อมูลแบบ Array เพื่อ Insert หลายโต๊ะพร้อมกัน
      const newBookings = selectedTables.map(table => ({
        shop_id: shopSlug,
        booking_code: randomCode,
        customer_name: customerName,
        phone: phone,
        booking_date: bookingDate,
        booking_time: `${bookingTime}:00`, 
        guests_count: guestsCount, // บันทึกจำนวนคนรวมเข้าไป
        table_number: table,
        status: statusToSet, 
      }));

      // 🟢 ยิงข้อมูลลง Supabase แบบ Batch (หลายแถวในรอบเดียว)
      const { data, error } = await supabase
        .from('restaurant_bookings')
        .insert(newBookings)
        .select();

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
        
        try {
          await fetch('/api/booking-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'NEW_BOOKING',
              bookingCode: randomCode,
              customerName: customerName,
              phone: phone,
              tableNumber: selectedTables.join(', '), // 🟢 ส่งโต๊ะที่ต่อกันด้วยลูกน้ำไปที่ LINE
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

  // 🟢 พรีเมียมคอมโพเนนต์ดีไซน์ตั๋ว PDF (รองรับการโชว์หลายโต๊ะ)
  const handleDownloadPDF = () => {
    if (!successData || successData.length === 0) return;
    const bookingInfo = successData[0]; // ดึงข้อมูลจากแถวแรก (เพราะชื่อ, โค้ด เหมือนกัน)
    const allTables = successData.map(b => b.table_number).join(', '); // รวมชื่อโต๊ะ

    const canvas = document.createElement('canvas');
    canvas.width = 450; canvas.height = 720; 
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const ThaiFont = "'Prompt', 'Thonburi', 'Arial', sans-serif";

    ctx.fillStyle = '#111116'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#E5B842'; ctx.lineWidth = 4; ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    const drawContent = () => {
      ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 24px ${ThaiFont}`; 
      ctx.fillText(formattedShopName, 225, 120);
      
      ctx.fillStyle = '#FF1F88'; ctx.font = `bold 13px ${ThaiFont}`; 
      ctx.fillText(bookingInfo.status === 'pending' ? '★ ใบยืนยันคิวรอชำระเงิน ★' : '★ ใบยืนยันการจองโต๊ะอาหาร ★', 225, 150);

      ctx.strokeStyle = '#2D2235'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(35, 180); ctx.lineTo(415, 180); ctx.stroke(); ctx.setLineDash([]);

      ctx.fillStyle = '#9E9EAF'; ctx.font = `12px ${ThaiFont}`; ctx.fillText('BOOKING CODE', 225, 215);
      ctx.fillStyle = '#E5B842'; ctx.font = `bold 38px ${ThaiFont}`; ctx.fillText(bookingInfo.booking_code, 225, 260);
      ctx.strokeStyle = '#2D2235'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(40, 290); ctx.lineTo(410, 290); ctx.stroke();

      ctx.textAlign = 'left'; ctx.font = `15px ${ThaiFont}`;
      let currentY = 335; const spacing = 36; const leftCol = 55; const rightCol = 185;

      const items = [
        { label: 'ชื่อผู้เช็กจอง :', value: bookingInfo.customer_name },
        { label: 'เบอร์ติดต่อ :', value: bookingInfo.phone },
        { label: 'วันที่เข้ารับสิทธิ์ :', value: bookingInfo.booking_date },
        { label: 'เวลาล็อกโต๊ะ :', value: `${bookingInfo.booking_time.slice(0, 5)} น.` }, 
        { label: 'จำนวนสมาชิก :', value: `${bookingInfo.guests_count} ท่าน (ขั้นต่ำ ${successData.length * 4} ท่าน)` }
      ];

      items.forEach(item => {
        ctx.fillStyle = '#9E9EAF'; ctx.fillText(item.label, leftCol, currentY);
        ctx.fillStyle = '#FFFFFF'; ctx.fillText(item.value, rightCol, currentY);
        currentY += spacing;
      });

      ctx.strokeStyle = '#2D2235'; ctx.beginPath(); ctx.moveTo(40, 520); ctx.lineTo(410, 520); ctx.stroke();
      
      ctx.textAlign = 'center'; ctx.fillStyle = '#FF1F88'; ctx.font = `bold 12px ${ThaiFont}`;
      ctx.fillText('ASSIGNED STATION TABLE', 225, 555);
      
      // ปรับขนาดตัวอักษรโต๊ะให้เล็กลงถ้าโต๊ะเยอะ จะได้ไม่ล้นขอบ
      const tableFontSize = allTables.length > 5 ? 40 : 64;
      ctx.fillStyle = '#E5B842'; ctx.font = `bold ${tableFontSize}px ${ThaiFont}`;
      ctx.fillText(allTables, 225, 630);
    };

    drawContent();
    const doc = new PDFInstance({ orientation: 'p', unit: 'mm', format: [85, 136] });
    const ticketImg = canvas.toDataURL('image/jpeg', 1.0);
    doc.addImage(ticketImg, 'JPEG', 0, 0, 85, 136);
    doc.save(`TICKET-${bookingInfo.booking_code}.pdf`);
  };

  if (!shopExists) { return notFound(); }

  // 🟢 คำนวณราคาคูณด้วยจำนวนโต๊ะที่ถูกเลือก (ราคาต่อโต๊ะ * จำนวนโต๊ะ)
  const isPendingPayment = successData?.[0]?.status === 'pending';
  const calculatedTotalAmount = currentEventPrice * (successData?.length || 1); 

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
                <p className="text-xs sm:text-sm px-1 leading-relaxed" style={{ color: THEME.muted }}>กรุณาเลือกวันเวลา และตำแหน่งโต๊ะที่ชอบบนผังร้าน (เลือกได้หลายโต๊ะ)</p>
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
                    <div className="w-full rounded-2xl bg-black/40 p-1 border box-sizing-border overflow-x-auto select-none relative min-h-[220px] flex items-center justify-center transition-all duration-300" style={{ borderColor: THEME.border }}>
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
                          <p className="text-xs max-w-xs mx-auto text-slate-400 leading-relaxed">ระบบจำเป็นต้องใช้วันที่ในการดึงข้อมูลสถานะโต๊ะว่างแบบเรียลไทม์รายวันครับ</p>
                        </div>
                      )}
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

                      {/* 🟢 ส่วนปรับปรุงใหม่: เปลี่ยนจาก <select> เป็น <input type="number"> ตามที่บอสต้องการเพื่อความรวดเร็วในการใช้งาน */}
                      <div className="space-y-2 w-full">
                        <label className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-gray-300">
                          <Users size={16} style={{ color: THEME.pink }} /> จำนวนสมาชิก <span className="text-xs ml-1" style={{ color: THEME.gold }}>(ขั้นต่ำโต๊ะละ 4 คน)</span>
                        </label>
                        <div className="relative flex items-center rounded-xl border bg-black/20 w-full h-12 transition-all duration-200 focus-within:border-purple-500" style={{ borderColor: THEME.border, opacity: bookingDate ? 1 : 0.3 }}>
                          <input 
                            type="number"
                            disabled={!bookingDate || selectedTables.length === 0}
                            min={minAllowedGuests}
                            placeholder={selectedTables.length === 0 ? "กรุณาเลือกโต๊ะก่อน" : `ขั้นต่ำ ${minAllowedGuests} ท่าน`}
                            value={selectedTables.length === 0 ? '' : guestsCount} 
                            onChange={(e) => setGuestsCount(parseInt(e.target.value) || 0)}
                            className="w-full h-full bg-transparent px-4 text-white outline-none text-base font-bold disabled:cursor-not-allowed box-border text-pink-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
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
          </motion.div>
        ) : (
          <motion.div key="success-step" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-md z-10 px-2 sm:px-0" >
            <div className="p-6 sm:p-8 border text-center space-y-6 shadow-2xl relative overflow-hidden rounded-3xl" style={{ backgroundColor: THEME.card, borderColor: THEME.border }} >
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
                  <h2 className="text-2xl font-bold text-white mt-0.5">
                    {isPendingPayment ? 'สแกนคิวอาร์โค้ดชำระเงิน' : 'ล็อกที่นั่งสำเร็จเรียบร้อย'}
                  </h2>
                </div>
              </div>

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
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">
                      Net Amount <span className="text-[9px] text-pink-500 ml-1">({successData?.length} โต๊ะ)</span>
                    </p>
                    <p className="text-xl font-extrabold text-slate-900 mt-1">{calculatedTotalAmount.toLocaleString()} <span className="text-xs font-semibold text-slate-600">บาท</span></p>
                  </div>
                </motion.div>
              )}

              <div className="bg-black/40 border border-dashed rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm font-mono text-left" style={{ borderColor: THEME.border }}>
                <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span style={{ color: THEME.muted }}>BOOKING CODE</span>
                  <span className="font-bold" style={{ color: THEME.gold }}>{successData?.[0]?.booking_code}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: THEME.muted }}>TABLE STATION</span>
                  <span className="font-bold text-white text-right max-w-[150px] break-words">
                    {successData?.map(b => b.table_number).join(', ')}
                  </span>
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
                <div className="p-3 text-left bg-black/20 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1.5 font-sans leading-relaxed">
                  <p className="text-gray-200 font-bold flex items-center gap-1.5">
                    <ArrowRight size={13} className="text-pink-500" /> คำแนะนำหลังโอนเงิน:
                  </p>
                  <p>1. เปิดแอปธนาคาร สแกนคิวอาร์โค้ดด้านบน ยอดเงินจะกรอกให้อัตโนมัติ</p>
                  <p>2. บันทึกสลิปหลักฐาน และกดปุ่มดาวน์โหลดใบยืนยันคิวด้านล่างนี้</p>
                  <p className="text-pink-500 font-semibold animate-pulse">3. ส่งหลักฐานทั้งหมดไปที่ LINE OA ของทางร้าน เพื่อให้สตาฟฟ์ตรวจสอบและเปิดคิวจองโต๊ะเป็นสถานะไฟเขียวให้คุณครับ</p>
                </div>
              )}

              <div className="space-y-2 pt-1 text-sm">
                <button onClick={handleDownloadPDF} className="w-full py-3 bg-emerald-500 text-[#121318] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all active:scale-95 hover:opacity-90">
                  <Download size={15} /> ดาวน์โหลดใบยืนยันคิว PDF
                </button>
                <button onClick={() => { setStep('form'); setCustomerName(''); setPhone(''); setSelectedTables([]); fetchTodayBookings(bookingDate); }} className="w-full py-2.5 border bg-transparent hover:bg-white/5 rounded-xl transition-colors" style={{ borderColor: THEME.border, color: THEME.muted }}>
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
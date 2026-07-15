'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion'; 
import {
  Search, Filter, Users, Clock, Phone, Hash, CalendarDays, Crown, Trees, Music, Inbox, CircleDot, ChevronDown, AlertTriangle, Check, X, History, Radio, Download, Coins, Loader2, FileText, Image as ImageIcon, CheckCircle, DollarSign,    
  AlertCircle,    
  Lock,    
  Unlock, 
  Mail,    
  LogOut,  
  LayoutGrid,  
  Map,         
  Eye,
  Trash2,
  Plus,
  User,
  Briefcase,
  Ticket,
  ChevronLeft, 
  QrCode,      
  type LucideIcon,
} from 'lucide-react';
import FloorPlan from '@/components/booking/FloorPlan'; 

// 🟢 บอสเอาเลขพร้อมเพย์จริงๆ มาใส่ในเครื่องหมายคำพูดนี้ได้เลยครับ (พิมพ์เฉพาะตัวเลขติดกัน)
// ⚠️ ถ้ายังไม่ใส่ QR Code จะสแกนไม่ได้ ป้องกันการโอนผิดครับ
const PROMPTPAY_NUMBER = "0922657200"; 

const THEME = {
  bg: '#0A0A0E', card: '#16161E', border: '#2D2235', pink: '#FF1F88',
  gold: '#E5B842', purple: '#8A3FFC', mint: '#00F5D4', amber: '#FBBC05',
  text: '#F1F1F5', muted: '#9E9EAF',
};

type ZoneId = 'ALL' | 'V' | 'G' | 'A';
type UserRole = 'owner' | 'reception' | 'sale';

interface ZoneMeta { id: ZoneId; label: string; prefix: string; icon: LucideIcon; accent: string; }

const ZONES: ZoneMeta[] = [
  { id: 'ALL', label: 'All Zones', prefix: '', icon: Filter, accent: THEME.muted },
  { id: 'V', label: 'VIP Room', prefix: 'V-', icon: Crown, accent: THEME.gold },
  { id: 'G', label: 'Terrace / Garden', prefix: 'G-', icon: Trees, accent: THEME.mint },
  { id: 'A', label: 'Main Stage', prefix: 'A-', icon: Music, accent: THEME.pink },
];

function zoneOf(tableNumber: string): ZoneMeta {
  const match = ZONES.find((z) => z.prefix && tableNumber?.startsWith(z.prefix));
  return match ?? ZONES[0];
}

type LiveStatus = 'tonight' | 'upcoming' | 'past';

function deriveStatus(b: any): LiveStatus {
  const rawTime = b.booking_time || '00:00:00';
  const timePart = rawTime.includes('-') ? rawTime.split('-')[0].trim() : rawTime.slice(0, 5);
  const stamp = new Date(`${b.booking_date}T${timePart}:00`);
  if (Number.isNaN(stamp.getTime())) return 'upcoming';
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (b.booking_date === today) {
    return stamp.getTime() + 90 * 60 * 1000 < now.getTime() ? 'past' : 'tonight';
  }
  return stamp.getTime() < now.getTime() ? 'past' : 'upcoming';
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: '⏳ รอชำระเงิน', color: THEME.amber, dot: THEME.amber },
  checked_in: { label: 'มาแล้ว', color: THEME.mint, dot: THEME.mint },
  no_show: { label: 'ไม่มา (NO SHOW)', color: '#F87171', dot: '#EF4444' },
  tonight: { label: 'รอเช็คอิน (คืนนี้)', color: THEME.mint, dot: THEME.mint },
  upcoming: { label: 'รอเช็คอิน (เร็วๆนี้)', color: THEME.gold, dot: THEME.gold },
  past: { label: 'เลยเวลานัดหมาย', color: THEME.muted, dot: '#4A4C58' },
};

export default function MonitorPage() {
  const params = useParams<{ shop_slug: string }>();
  const shopSlug = (params?.shop_slug as string) || 'default-shop';

  const shopName = useMemo(() => {
    if (shopSlug === 'default-shop') return 'ร้าน เรๅ สาขาศรีนครินทร์';
    return shopSlug.split('-').map((w) => w.toUpperCase()).join(' ');
  }, [shopSlug]);

  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [role, setRole] = useState<UserRole>('owner');

  const [bookings, setBookings] = useState<any[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>('—');
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState<ZoneId>('ALL');
  const [showPast, setShowPast] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(true);
  const [shopExists, setShopExists] = useState(true);

  const [viewMode, setViewMode] = useState<'list' | 'floorplan'>('list');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [adminSelectedDate, setAdminSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [adminSelectedTables, setAdminSelectedTables] = useState<string[]>([]);
  
  const [adminForm, setAdminForm] = useState({ name: '', phone: '', time: '19:00', guests: 4, saleName: '', memberCode: '' });
  const [adminSlipFile, setAdminSlipFile] = useState<File | null>(null);
  const [adminSlipPreview, setAdminSlipPreview] = useState<string | null>(null);
  
  const [adminBookingStep, setAdminBookingStep] = useState<'form' | 'payment'>('form');
  const [pendingBookingsData, setPendingBookingsData] = useState<any[]>([]);

  const [selectedBookingForSlip, setSelectedBookingForSlip] = useState<any>(null);

  const [isLockConfirmModalOpen, setIsLockConfirmModalOpen] = useState(false);
  const [tablePendingLock, setTablePendingLock] = useState<string | null>(null);
  const [isLockProcessing, setIsLockProcessing] = useState(false);
  const [lockModalMode, setLockModalMode] = useState<'lock' | 'unlock'>('lock');

  const [appNotice, setAppNotice] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'info'; title: string; message: string; }>({ isOpen: false, type: 'info', title: '', message: '' });

  const triggerNotice = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setAppNotice({ isOpen: true, type, title, message });
  };

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ issueType: 'ระบบจองขัดข้อง', details: '' });
  const [isSendingReport, setIsSendingReport] = useState(false);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventStatusMsg, setEventStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<'normal' | 'concert' | 'closed'>('normal');
  const [eventTitle, setEventTitle] = useState('');
  const [eventPrice, setEventPrice] = useState(5000);
  const [eventExtraPrice, setEventExtraPrice] = useState(0);

  const [perksNote, setPerksNote] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberCode, setNewMemberCode] = useState('');
  const [isMemberLoading, setIsMemberLoading] = useState(false);

  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [newSaleName, setNewSaleName] = useState('');
  const [isSalesLoading, setIsSalesLoading] = useState(false);

  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());

  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => { 
      if (error) {
        console.warn("เคลียร์ Session เก่าที่พังทิ้ง...");
        supabase.auth.signOut();
      }
      setSession(session); 
      setAuthLoading(false); 
      assignRole(session?.user?.email);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { 
      setSession(session); 
      setAuthLoading(false); 
      assignRole(session?.user?.email);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { setAdminSelectedTables([]); }, [adminSelectedDate]);

  const assignRole = (email?: string) => {
    if (!email) return;
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes('reception')) setRole('reception');
    else if (lowerEmail.includes('sale')) setRole('sale');
    else setRole('owner');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoggingIn(true); setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) { setAuthError(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'); } finally { setIsLoggingIn(false); }
  };

  const handleLogoutClick = async () => {
    try { await supabase.auth.signOut(); setSession(null); setRole('owner'); } catch (error) { console.error('Error logging out:', error); }
  };

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('shop_members').select('*').eq('shop_id', shopSlug).order('created_at', { ascending: false });
    if (data) setMembersList(data);
  }, [shopSlug]);

  const loadSales = useCallback(async () => {
    const { data } = await supabase.from('shop_sales').select('*').eq('shop_id', shopSlug).order('created_at', { ascending: false });
    if (data) setSalesList(data);
  }, [shopSlug]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberCode) return;
    setIsMemberLoading(true);
    try {
      const { error } = await supabase.from('shop_members').insert([{ shop_id: shopSlug, member_code: newMemberCode, member_name: newMemberName }]);
      if (error) throw error;
      setNewMemberName(''); setNewMemberCode('');
      await loadMembers();
      triggerNotice('success', 'เพิ่มสมาชิกสำเร็จ', 'ลูกค้าสามารถนำรหัสนี้ไปใช้จองโต๊ะได้ทันที');
    } catch (err: any) {
      triggerNotice('error', 'เพิ่มสมาชิกไม่สำเร็จ', 'อาจมีรหัสนี้ในระบบแล้ว กรุณาตั้งรหัสใหม่');
    } finally { setIsMemberLoading(false); }
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('ยืนยันการลบสมาชิก VIP นี้ใช่หรือไม่?')) return;
    try {
      await supabase.from('shop_members').delete().eq('id', id);
      await loadMembers();
      triggerNotice('success', 'ลบสมาชิกสำเร็จ', 'รหัสนี้จะไม่สามารถใช้เข้าระบบได้อีกต่อไป');
    } catch (err) { triggerNotice('error', 'ลบไม่สำเร็จ', 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล'); }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSaleName) return;
    setIsSalesLoading(true);
    try {
      const { error } = await supabase.from('shop_sales').insert([{ shop_id: shopSlug, sale_name: newSaleName }]);
      if (error) throw error;
      setNewSaleName('');
      await loadSales();
      triggerNotice('success', 'เพิ่มเซลล์สำเร็จ', 'รายชื่อเซลล์ถูกอัปเดตเข้าระบบเรียบร้อยแล้ว');
    } catch (err: any) {
      triggerNotice('error', 'เพิ่มเซลล์ไม่สำเร็จ', 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally { setIsSalesLoading(false); }
  };

  const handleDeleteSale = async (id: string) => {
    if (!window.confirm('ยืนยันการลบรายชื่อเซลล์นี้ใช่หรือไม่?')) return;
    try {
      await supabase.from('shop_sales').delete().eq('id', id);
      await loadSales();
      triggerNotice('success', 'ลบรายชื่อสำเร็จ', 'ลบเซลล์ออกจากระบบเรียบร้อยแล้ว');
    } catch (err) { triggerNotice('error', 'ลบไม่สำเร็จ', 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล'); }
  };

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysArray = [];
    for (let i = 0; i < firstDayIndex; i++) daysArray.push(null);
    for (let i = 1; i <= totalDays; i++) daysArray.push(i);
    return daysArray;
  }, [viewYear, viewMonth]);

  const selectDateHandler = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setEventDate(`${viewYear}-${mm}-${dd}`);
  };

  const loadEventsData = useCallback(async () => {
    try {
      const { data } = await supabase.from('shop_events').select('*').eq('shop_id', shopSlug);
      if (data) {
        const mapped = data.reduce((acc, curr: any) => ({ ...acc, [curr.event_date]: curr }), {} as Record<string, any>);
        setEventsMap(mapped);
      }
    } catch (err) { console.error('Failed to load shop events mapping:', err); }
  }, [shopSlug]);

  useEffect(() => {
    if (eventDate && eventsMap[eventDate]) {
      const ev = eventsMap[eventDate];
      setEventType(ev.event_type || 'normal');
      setEventTitle(ev.title || '');
      setEventPrice(ev.price || 0);
      setEventExtraPrice(ev.extra_price_per_head || 0); 
      setPerksNote(ev.perks_note || '');
      setImagePreview(ev.image_url || null);
      setImageFile(null); 
    } else {
      setEventType('normal');
      setEventTitle('');
      setEventPrice(5000);
      setEventExtraPrice(0); 
      setPerksNote('');
      setImagePreview(null);
      setImageFile(null);
    }
  }, [eventDate, eventsMap]);

  useEffect(() => {
    if (!session) return; 
    let active = true;
    const loadData = async () => {
      try {
        await loadEventsData();
        await loadMembers(); 
        await loadSales(); 
        const { data, error: dbError } = await supabase.from('restaurant_bookings').select('*').eq('shop_id', shopSlug).order('booking_date', { ascending: true }).order('booking_time', { ascending: true });
        if (!active) return;
        if (dbError) throw dbError;
        setBookings((data as any[]) ?? []);
        setError(null);
        setLastSync(new Date().toLocaleTimeString('en-GB'));
      } catch (err) {
        if (!active) return;
        console.error('Monitor fetch failed:', err);
        setError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ ระบบกำลังพยายามเชื่อมต่อใหม่...');
      } finally { if (active) setLoading(false); }
    };
    loadData();

    const channel = supabase.channel(`live-monitor-v7:${shopSlug}`).on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_bookings', filter: `shop_id=eq.${shopSlug}` }, (payload) => {
        if (!active) return;
        const newRecord = payload.new as any;
        const oldRecord = payload.old as any;
        setBookings((prev) => {
          if (payload.eventType === 'INSERT') {
            const updated = [...prev, newRecord];
            return updated.sort((a, b) => {
              if (a.booking_date !== b.booking_date) return a.booking_date.localeCompare(b.booking_date);
              return (a.booking_time || '').localeCompare(b.booking_time || '');
            });
          }
          if (payload.eventType === 'UPDATE') {
            if (selectedBookingForSlip && selectedBookingForSlip.id === newRecord.id) { setSelectedBookingForSlip((curr: any) => ({ ...curr, ...newRecord })); }
            return prev.map((item) => (item.id === newRecord.id ? { ...item, ...newRecord } : item));
          }
          if (payload.eventType === 'DELETE') { return prev.filter((item) => item.id === oldRecord.id); }
          return prev;
        });
        setLastSync(new Date().toLocaleTimeString('en-GB'));
      }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [shopSlug, loadEventsData, session, selectedBookingForSlip, loadMembers, loadSales]);

  useEffect(() => {
    let active = true;
    const loadShopSettings = async () => {
      try {
        const { data, error: settingsError } = await supabase.from('shop_settings').select('is_booking_open').eq('shop_id', shopSlug).single();
        if (settingsError && settingsError.code === 'PGRST116') { if (active) setShopExists(false); return; }
        if (settingsError) throw settingsError;
        if (active && data) setIsBookingOpen(data.is_booking_open);
      } catch (err) { console.error(err); }
    };
    loadShopSettings();
  }, [shopSlug]);

  const handleUpdateStatus = async (bookingId: string, nextStatus: 'confirmed' | 'checked_in' | 'no_show') => {
    try {
      const { error: patchError } = await supabase.from('restaurant_bookings').update({ status: nextStatus }).eq('id', bookingId);
      if (patchError) throw patchError;
      if (nextStatus === 'confirmed') { triggerNotice('success', 'ยืนยันรับยอดเงินสำเร็จ', 'ระบบได้ทำการอนุมัติสิทธิ์ล็อกที่นั่ง และส่งคลื่นอัปเดตสถานะเปลี่ยนโต๊ะอาหารเป็นไฟแดงให้ลูกค้าออนไลน์ทุกรายเรียลไทม์เรียบร้อยแล้วครับ'); } 
      else if (nextStatus === 'no_show') { triggerNotice('info', 'ยกเลิกคิวสำเร็จ', 'ระบบได้ทำการยกเลิกคิวและเคลียร์โต๊ะให้ว่างเรียบร้อยแล้ว'); }
    } catch (err) { console.error(err); triggerNotice('error', 'ระบบทำงานขัดข้อง', 'ไม่สามารถเชื่อมต่อเน็ตเวิร์กเพื่อปรับปรุงสถานะคิวได้ในขณะนี้'); }
  };

  const handleToggleBookingStatus = async (targetState: boolean) => {
    setIsBookingOpen(targetState); setIsStatusDropdownOpen(false);
    try { await supabase.from('shop_settings').upsert({ shop_id: shopSlug, is_booking_open: targetState }); } 
    catch (err) { console.error(err); triggerNotice('error', 'อัปเดตระบบล้มเหลว', 'ไม่สามารถปรับเปลี่ยนสถานะการเปิดจองของร้านอาหารบนระบบคลาวด์ได้ครับ'); setIsBookingOpen(!targetState); }
  };

  const closeAdminLockModal = () => {
    setIsLockConfirmModalOpen(false);
    setTablePendingLock(null);
    setAdminBookingStep('form');
    setAdminForm({ name: '', phone: '', time: '19:00', guests: 4, saleName: '', memberCode: '' });
    setAdminSlipFile(null);
    setAdminSlipPreview(null);
    setPendingBookingsData([]);
  };

  const handleAdminLockTableClick = (tableNum: string) => {
    const existingBooking = bookings.find((b) => b.booking_date === adminSelectedDate && b.table_number === tableNum && b.status !== 'no_show');
    if (existingBooking) {
      if (existingBooking.booking_code?.startsWith('LOCK-')) { 
        setTablePendingLock(tableNum); 
        setLockModalMode('unlock'); 
        setIsLockConfirmModalOpen(true); 
      } else { setSelectedBookingForSlip(existingBooking); }
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (adminSelectedDate < today) {
       triggerNotice('error', 'ไม่อนุญาตให้จองย้อนหลัง', 'ระบบล็อกไม่ให้สร้างคิวจองใหม่สำหรับวันที่ผ่านมาแล้วครับ');
       return;
    }

    setAdminSelectedTables(prev => prev.includes(tableNum) ? prev.filter(t => t !== tableNum) : [...prev, tableNum]);
  };

  const adminTotalPrice = useMemo(() => {
    const ev = eventsMap[adminSelectedDate];
    if (!ev || ev.event_type !== 'concert') return 0;

    let isMemberValid = false;
    if (adminForm.memberCode) {
      isMemberValid = membersList.some(m => m.member_code?.trim().toUpperCase() === adminForm.memberCode.trim().toUpperCase());
    }

    const ticketPrice = ev.extra_price_per_head || 0;

    if (isMemberValid) {
       return adminForm.guests * ticketPrice;
    } else {
       const basePrice = ev.price * adminSelectedTables.length;
       const extraGuests = Math.max(0, adminForm.guests - (4 * adminSelectedTables.length));
       const extraPrice = extraGuests * ticketPrice;
       return basePrice + extraPrice;
    }
  }, [adminSelectedDate, eventsMap, adminSelectedTables.length, adminForm.guests, adminForm.memberCode, membersList]);

  const isAdminSlipRequired = useMemo(() => {
     const isConcert = eventsMap[adminSelectedDate]?.event_type === 'concert';
     return isConcert && adminTotalPrice > 0;
  }, [adminSelectedDate, eventsMap, adminTotalPrice]);

  // 🟢 ฟังก์ชันสร้างข้อความแจ้งเตือน LINE (เอาลิงก์สลิปออกเรียบร้อย)
  const generateLineMessage = useCallback((slipUrl: string | null = null) => {
    const ev = eventsMap[adminSelectedDate];
    const isConcert = ev?.event_type === 'concert';
    const isMemberValid = adminForm.memberCode && membersList.some(m => m.member_code?.trim().toUpperCase() === adminForm.memberCode.trim().toUpperCase());
    const ticketPrice = ev?.extra_price_per_head || 0;
    const basePrice = (ev?.price || 0) * adminSelectedTables.length;
    const extraGuests = Math.max(0, adminForm.guests - (4 * adminSelectedTables.length));
    const extraPrice = extraGuests * ticketPrice;

    let priceDetails = '';
    if (isConcert) {
      if (isMemberValid) {
        priceDetails = `\n💵 ค่าตั๋ว VIP (${adminForm.guests} ท่าน): ${adminTotalPrice.toLocaleString()} บ.\n💰 ยอดโอน: ${adminTotalPrice.toLocaleString()} บาท`;
      } else {
        priceDetails = `\n💵 ค่าโต๊ะ (${adminSelectedTables.length}): ${basePrice.toLocaleString()} บ.`;
        if (extraGuests > 0) {
          priceDetails += `\n💵 ค่าเสริม (${extraGuests} คน): ${extraPrice.toLocaleString()} บ.`;
        }
        priceDetails += `\n💰 ยอดโอน: ${adminTotalPrice.toLocaleString()} บาท`;
      }
    } else {
      priceDetails = `\n💰 ยอดโอน: 0 บาท (วันปกติ)`;
    }

    const vipText = adminForm.memberCode ? `\n🎟️ VIP Code: ${adminForm.memberCode}` : '';

    return `📣 ลูกค้าจองโต๊ะใหม่ (Walk-in / เซลล์)\n📌 โต๊ะ: ${adminSelectedTables.join(', ')}\n👤 ชื่อ: ${adminForm.name}\n📞 โทร: ${adminForm.phone || '-'}\n👥 จำนวน: ${adminForm.guests} ท่าน\n📅 วันที่: ${adminSelectedDate}\n⏰ เวลา: ${adminForm.time} น.\n🧑‍💼 เซลล์: ${adminForm.saleName || '-'}${vipText}${priceDetails}`;
  }, [adminSelectedDate, eventsMap, adminSelectedTables, adminForm, adminTotalPrice, membersList]);

  const handleAdminFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSelectedTables.length === 0) return;
    if (!adminForm.name) { triggerNotice('error', 'ข้อมูลไม่ครบ', 'กรุณาระบุชื่อลูกค้าครับ'); return; }

    let isMemberValid = false;
    if (adminForm.memberCode) {
      isMemberValid = membersList.some(m => m.member_code?.trim().toUpperCase() === adminForm.memberCode.trim().toUpperCase());
      if (!isMemberValid) {
        triggerNotice('error', 'รหัส VIP ไม่ถูกต้อง', 'ไม่พบรหัส VIP นี้ในระบบ กรุณาตรวจสอบอีกครั้ง');
        return;
      }
    }

    setIsLockProcessing(true);
    try {
      const randomCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
      const targetStatus = isAdminSlipRequired ? 'pending' : 'confirmed';

      const newBookings = adminSelectedTables.map(table => ({
        shop_id: shopSlug,
        booking_code: adminSelectedTables.length > 1 ? `${randomCode}-${table}` : randomCode,
        customer_name: adminForm.name,
        phone: adminForm.phone || '-',
        booking_date: adminSelectedDate,
        booking_time: `${adminForm.time}:00`,
        guests_count: adminForm.guests,
        table_number: table,
        status: targetStatus,
        slip_url: null,
        sales_name: adminForm.saleName || null,
        member_code: adminForm.memberCode || null,
      }));

      const { data, error } = await supabase.from('restaurant_bookings').insert(newBookings).select();
      if (error) throw error;

      if (isAdminSlipRequired) {
        setPendingBookingsData(data || []);
        setAdminBookingStep('payment');
        triggerNotice('info', 'ล็อกโต๊ะชั่วคราวสำเร็จ', 'ระบบจองโต๊ะไว้ให้แล้ว กรุณาชำระเงินและแนบสลิปเพื่อยืนยันให้สมบูรณ์');
      } else {
        try {
          const lineMessage = generateLineMessage(null);
          await fetch('/api/notify-line', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: lineMessage }) });
        } catch (lineErr) { console.error(lineErr); }

        closeAdminLockModal();
        setAdminSelectedTables([]); 
        triggerNotice('success', 'สำรองโต๊ะสำเร็จ', `ระบบได้ทำการจองโต๊ะ ${adminSelectedTables.join(', ')} เรียบร้อยแล้วครับ`);
      }
    } catch (err: any) { 
      console.error(err); 
      triggerNotice('error', 'ข้อผิดพลาด', err.message || 'ไม่สามารถบันทึกข้อมูลได้'); 
    } finally { setIsLockProcessing(false); }
  };

  const handleAdminPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLockProcessing(true);
    try {
      if (!adminSlipFile) throw new Error('กรุณาอัปโหลดหลักฐานการโอนเงิน (สลิป)');

      const fileExt = adminSlipFile.name.split('.').pop();
      const fileName = `admin-slip-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('slips').upload(fileName, adminSlipFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error('อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่');
      const { data: urlData } = supabase.storage.from('slips').getPublicUrl(fileName);
      const uploadedSlipUrl = urlData.publicUrl;

      const pendingIds = pendingBookingsData.map(b => b.id);
      const { error: updateError } = await supabase
        .from('restaurant_bookings')
        .update({ status: 'confirmed', slip_url: uploadedSlipUrl })
        .in('id', pendingIds);

      if (updateError) throw updateError;

      try {
        const lineMessage = generateLineMessage(uploadedSlipUrl);
        // 🟢 ส่ง imageUrl พ่วงไปด้วย เผื่อ API หลังบ้านรองรับการส่งรูปภาพตรงๆ
        await fetch('/api/notify-line', { 
           method: 'POST', 
           headers: { 'Content-Type': 'application/json' }, 
           body: JSON.stringify({ message: lineMessage, imageUrl: uploadedSlipUrl }) 
        });
      } catch (lineErr) { console.error(lineErr); }

      closeAdminLockModal();
      setAdminSelectedTables([]);
      triggerNotice('success', 'ยืนยันการชำระเงินสำเร็จ', `ระบบบันทึกสลิปและยืนยันโต๊ะ ${adminSelectedTables.join(', ')} เรียบร้อยแล้ว`);
    } catch (err: any) {
      triggerNotice('error', 'ข้อผิดพลาด', err.message || 'ไม่สามารถบันทึกสลิปได้');
    } finally { setIsLockProcessing(false); }
  };

  const executeAdminUnlockTable = async () => {
    if (!tablePendingLock) return;
    setIsLockProcessing(true);
    try {
      const res = await fetch('/api/admin/lock-table', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId: shopSlug, tableNumber: tablePendingLock, bookingDate: adminSelectedDate, action: 'unlock' }) });
      if (!res.ok) throw new Error('Server returned error');
      closeAdminLockModal();
      triggerNotice('success', 'คืนพื้นที่โต๊ะสำเร็จ', `ปลดล็อกโต๊ะหมายเลข ${tablePendingLock} เรียบร้อยแล้ว`);
    } catch (err: any) { triggerNotice('error', 'คำสั่งขัดข้อง', 'ระบบหลังบ้านพังกระจาย'); } finally { setIsLockProcessing(false); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]; setImageFile(file); setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAdminSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]; setAdminSlipFile(file); setAdminSlipPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate) { setEventStatusMsg({ type: 'error', text: 'กรุณาคลิกเลือกวันที่บนแผงปฏิทินก่อนครับ' }); return; }
    setEventLoading(true); setEventStatusMsg(null);
    try {
      let uploadedImageUrl = imagePreview || '';
      if (imageFile && eventType === 'concert') {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${shopSlug}-${eventDate}-${Math.floor(1000 + Math.random() * 9000)}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage.from('event-posters').upload(filePath, imageFile, { cacheControl: '3600', upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('event-posters').getPublicUrl(filePath);
        uploadedImageUrl = urlData.publicUrl;
      }
      
      const eventData = {
        shop_id: shopSlug,
        event_date: eventDate,
        event_type: eventType,
        title: eventType === 'concert' ? eventTitle : eventType === 'closed' ? 'วันหยุดร้าน' : 'วันบริการปกติ',
        price: eventType === 'concert' ? eventPrice : 0,
        extra_price_per_head: eventType === 'concert' ? eventExtraPrice : 0, 
        perks_note: eventType === 'concert' ? perksNote : eventType === 'closed' ? 'ปิดรับจองออนไลน์ วันหยุดทำการ' : 'จองฟรี ไม่มีค่าบริการ',
        image_url: eventType === 'concert' ? uploadedImageUrl : null,
      };

      const { error: dbError = null } = await supabase.from('shop_events').upsert([eventData], { onConflict: 'shop_id,event_date' });
      if (dbError) throw dbError;
      setEventStatusMsg({ type: 'success', text: `🎉 ตั้งค่าโหมด ${eventType === 'concert' ? 'วันคอนเสิร์ต' : eventType === 'closed' ? 'วันหยุดร้าน' : 'วันปกติ'} เรียบร้อยแล้ว` });
      await loadEventsData(); 
    } catch (err: any) { console.error(err); setEventStatusMsg({ type: 'error', text: err.message || 'ระบบบันทึกข้อมูลขัดข้อง กรุณาลองใหม่อีกครั้ง' }); } finally { setEventLoading(false); }
  };

  const handleCancelConcert = async () => {
    if (!eventDate) { setEventStatusMsg({ type: 'error', text: 'กรุณาเลือกวันที่ต้องการยกเลิกบนปฏิทินก่อนครับ' }); return; }
    const isConfirm = window.confirm(`ยืนยันการลบ/ยกเลิกการตั้งค่างานวันที่ ${eventDate} ใช่หรือไม่?`);
    if (!isConfirm) return;
    setEventLoading(true); setEventStatusMsg(null);
    try {
      const { error } = await supabase.from('shop_events').delete().eq('shop_id', shopSlug).eq('event_date', eventDate);
      if (error) throw error;
      setEventStatusMsg({ type: 'success', text: `🗑️ เคลียร์ข้อมูลงานวันที่ ${eventDate} เรียบร้อยแล้ว` });
      await loadEventsData(); 
    } catch (err: any) { console.error(err); setEventStatusMsg({ type: 'error', text: err.message || 'ระบบยกเลิกข้อมูลขัดข้อง กรุณาลองใหม่อีกครั้ง' }); } finally { setEventLoading(false); }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSendingReport(true);
    try {
      const bossEmail = "nattanonchatram05@gmail.com"; 
      const subject = encodeURIComponent(`[Report Bug] ปัญหาจากสาขา: ${shopName}`);
      const body = encodeURIComponent(`🚨 รายงานปัญหาจากระบบควบคุมคิวหน้าร้าน\n----------------------------------------\n🏢 ร้านสาขา: ${shopName}\n📁 ประเภทปัญหา: ${reportForm.issueType}\n📝 รายละเอียดที่พบ:\n${reportForm.details}\n----------------------------------------\nส่งจากระบบ: 21st Live Reservation Controller`);
      window.location.href = `mailto:${bossEmail}?subject=${subject}&body=${body}`;
      setReportForm({ issueType: 'ระบบจองขัดข้อง', details: '' }); setIsReportModalOpen(false);
      triggerNotice('success', 'เรียกใช้งานอีเมลสำเร็จ', 'ระบบได้ทำการเปิดหน้าแอปพลิเคชันอีเมลหลักเพื่อเตรียมจัดส่งรายงานปัญหาให้ทีมโปรแกรมเมอร์แล้วครับ');
    } catch (err) { console.error(err); triggerNotice('error', 'ระบบเรียกใช้สิทธิ์พัง', 'ไม่สามารถเปิดลิงก์จดหมายอีเมลของเครื่องคอมพิวเตอร์ได้ครับ'); } finally { setIsSendingReport(false); }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      const matchesZone = zone === 'ALL' || b.table_number?.startsWith(`${zone}-`);
      if (!matchesZone) return false;
      const liveStatus = deriveStatus(b);
      if (liveStatus === 'past' && !showPast && !q) return false;
      if (q) { return (b.customer_name?.toLowerCase().includes(q) || b.booking_code?.toLowerCase().includes(q) || b.phone?.toLowerCase().includes(q) || b.sales_name?.toLowerCase().includes(q)); }
      return true;
    });
  }, [bookings, query, zone, showPast]);

  const handleExportCSV = () => {
    if (filtered.length === 0) { triggerNotice('error', 'ไม่สามารถดาวน์โหลดได้', 'ไม่มีข้อมูลในหน้าฟีดให้ดาวน์โหลดในขณะนี้ครับ'); return; }
    const headers = ['วันที่จอง', 'เวลานัดหมาย', 'รหัสใบจอง', 'ชื่อลูกค้า', 'เบอร์โทรศัพท์', 'เซลล์', 'รหัสโต๊ะ', 'จำนวนแขก', 'สถานะคิว', 'ค่าบัตรแพ็กเกจรวม'];
    const rows = filtered.map((b) => {
      let statusText = 'รอเช็คอิน';
      if (b.status === 'pending') statusText = 'รอชำระเงิน';
      else if (b.status === 'checked_in') statusText = 'มาแล้ว';
      else if (b.status === 'no_show') statusText = 'ไม่มา (No Show)';
      const tablePrice = eventsMap[b.booking_date]?.price || 0;
      return [ b.booking_date, (b.booking_time || '').slice(0, 5), b.booking_code, `"${b.customer_name?.replace(/"/g, '""')}"`, `="${b.phone}"`, `"${b.sales_name || '-'}"`, b.table_number, b.guests_count, statusText, `${tablePrice} บาท` ];
    });
    const csvContent = ['\uFEFF' + headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Report_Monitor_${shopSlug}_${new Date().toISOString().split('T')[0]}.csv`); link.click();
  };

  const totalRevenue = useMemo(() => {
    return bookings.reduce((sum, b) => {
      if (b.status === 'pending' || b.status === 'no_show') return sum;
      const tablePrice = eventsMap[b.booking_date]?.price || 0;
      return sum + tablePrice;
    }, 0);
  }, [eventsMap, bookings]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof bookings> = {};
    filtered.forEach((b) => { const dateStr = b.booking_date || 'ไม่ระบุวันที่'; if (!groups[dateStr]) groups[dateStr] = []; groups[dateStr].push(b); });
    return groups;
  }, [filtered]);

  const sortedDates = useMemo(() => Object.keys(groupedByDate).sort(), [groupedByDate]);
  const tonightCount = useMemo(() => bookings.filter((b) => deriveStatus(b) === 'tonight' && b.status !== 'no_show' && b.status !== 'pending').length, [bookings]);
  const adminDayTablesMap = useMemo(() => {
    const dayBookings = bookings.filter(b => b.booking_date === adminSelectedDate && b.status !== 'no_show');
    return dayBookings.reduce((acc, curr) => ({ ...acc, [curr.table_number]: curr.status === 'pending' ? 'pending' : 'booked' }), {} as Record<string, 'booked' | 'pending'>);
  }, [bookings, adminSelectedDate]);

  if (!shopExists) return notFound();
  if (authLoading) return ( <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: THEME.bg }}> <div className="text-center space-y-3"> <Loader2 size={36} className="animate-spin mx-auto" style={{ color: THEME.pink }} /> <p className="text-sm font-medium" style={{ color: THEME.muted }}>กำลังตรวจสอบสิทธิ์การเข้าถึงระบบควบคุม...</p> </div> </div> );
  
  if (!session) {
    return (
      <div className="min-h-screen w-full font-sans flex items-center justify-center p-4 relative" style={{ backgroundColor: THEME.bg, color: THEME.text }}>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full blur-[140px]" style={{ backgroundColor: `${THEME.pink}12` }} />
          <div className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full blur-[130px]" style={{ backgroundColor: `${THEME.purple}12` }} />
        </div>
        <div className="w-full max-w-md p-6 sm:p-8 border rounded-3xl z-10 shadow-2xl transition-all" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
          <div className="text-center space-y-1.5 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto border" style={{ borderColor: `${THEME.pink}30` }}><Lock size={22} style={{ color: THEME.pink }} /></div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Live Reservation Gate</h2>
            <p className="text-xs" style={{ color: THEME.muted }}>กรุณาล็อกอินเข้าสู่ระบบเพื่อเข้าใช้งานแผงควบคุมหน้าร้าน</p>
          </div>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5"><label className="text-xs font-mono uppercase tracking-wider text-slate-300">อีเมลผู้ใช้งาน</label><div className="relative flex items-center"><Mail size={16} className="absolute left-4 text-slate-500" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@restaurant.com" className="w-full bg-black/40 border rounded-xl pl-11 pr-4 h-11 text-white outline-none focus:border-pink-500 text-sm transition-all" style={{ borderColor: THEME.border }} /></div></div>
            <div className="space-y-1.5"><label className="block text-xs font-mono uppercase tracking-wider text-slate-300">รหัสผ่านหลังบ้าน</label><div className="relative flex items-center"><Hash size={16} className="absolute left-4 text-slate-500" /><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-black/40 border rounded-xl pl-11 pr-4 h-11 text-white outline-none focus:border-pink-500 text-sm transition-all" style={{ borderColor: THEME.border }} /></div></div>
            {authError && <div className="p-3.5 rounded-xl border flex items-center gap-2 text-xs bg-red-500/10 border-red-500/30 text-red-400"><AlertCircle size={15} className="shrink-0" /><span className="font-medium">{authError}</span></div>}
            <button type="submit" disabled={isLoggingIn} className="w-full h-11 rounded-xl font-bold text-black transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2" style={{ backgroundColor: THEME.gold, boxShadow: `0 4px 15px rgba(229, 184, 66, 0.2)` }}>{isLoggingIn ? <><Loader2 size={16} className="animate-spin" />กำลังยืนยันตัวตน...</> : 'เข้าสู่ระบบควบคุมคิว'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full font-sans select-none" style={{ backgroundColor: THEME.bg, color: THEME.text }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full blur-[140px]" style={{ backgroundColor: `${THEME.pink}0A` }} />
        <div className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full blur-[130px]" style={{ backgroundColor: `${THEME.purple}0A` }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between border-b border-slate-800/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: THEME.pink, boxShadow: `0 0 12px ${THEME.pink}` }} />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: THEME.pink }}>21st Live Reservation Controller</span>
            </div>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white flex items-center flex-wrap gap-3">
              {shopName}
              <span className="text-[10px] sm:text-xs font-mono px-3 py-1 rounded-full border bg-black/40 text-emerald-400 border-emerald-500/30">
                ROLE: {role.toUpperCase()}
              </span>
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2 z-50">
            {role === 'owner' && (
              <>
                <button type="button" onClick={() => { setIsSalesModalOpen(true); loadSales(); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition-all active:scale-95 text-[#00F5D4] bg-[#00F5D4]/10 border-[#00F5D4]/20 hover:bg-[#00F5D4]/20"><Briefcase size={14} className="hidden sm:block" />จัดการเซลล์</button>
                <button type="button" onClick={() => { setIsMemberModalOpen(true); loadMembers(); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition-all active:scale-95 text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20"><Crown size={14} className="hidden sm:block" />จัดการ VIP</button>
                <button type="button" onClick={() => { setIsEventModalOpen(true); setEventStatusMsg(null); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition-all active:scale-95 text-pink-400 bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20"><Music size={14} className="hidden sm:block" />ปฏิทินร้าน</button>
                <div className="relative">
                  <button type="button" onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold border transition-all active:scale-95 ${isBookingOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    <Radio size={14} className={isBookingOpen ? "animate-pulse text-emerald-400" : "text-red-400"} />
                    <div className="hidden sm:block"><p className="font-mono text-[9px] uppercase tracking-widest font-bold leading-none text-left opacity-70">SYSTEM</p><p className="text-xs font-bold mt-0.5">{isBookingOpen ? `เปิดปกติ` : 'ปิดรับคิว'}</p></div>
                    <ChevronDown size={12} className="ml-1 opacity-70" />
                  </button>
                  <AnimatePresence>
                    {isStatusDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#16161E] border border-[#2D2235] p-1.5 shadow-2xl space-y-1 z-50">
                        <button type="button" onClick={() => handleToggleBookingStatus(true)} className="w-full text-left text-xs p-2.5 hover:bg-white/5 rounded-lg flex items-center gap-2 text-emerald-400 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> เปิดรับจองออนไลน์ปกติ</button>
                        <button type="button" onClick={() => handleToggleBookingStatus(false)} className="w-full text-left text-xs p-2.5 hover:bg-white/5 rounded-lg flex items-center gap-2 text-red-400 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> ปิดระบบรับคิวล่วงหน้าชั่วคราว</button>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
            <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition-all active:scale-95 text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20"><AlertTriangle size={14} className="hidden sm:block" />รายงานปัญหา</button>
            <button type="button" onClick={handleLogoutClick} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition-all active:scale-95 text-gray-400 border-slate-800 bg-black/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"><LogOut size={14} />ออกจากระบบ</button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill icon={CalendarDays} label="Total Bookings" value={`${bookings.length} คิว`} accent={THEME.text} />
          <StatPill icon={CircleDot} label="Active Tonight" value={`${tonightCount} โต๊ะ`} accent={THEME.mint} />
          <StatPill icon={Coins} label="Concert Ticket Revenue" value={`${totalRevenue.toLocaleString()} ฿`} accent={THEME.gold} />
          <StatPill icon={Users} label="Guests Inbound" value={`${bookings.filter((b) => deriveStatus(b) === 'tonight' && b.status !== 'no_show' && b.status !== 'pending').length} โต๊ะ`} accent="#8B9DFF" />
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row justify-between items-stretch lg:items-center">
          <div className="flex flex-1 items-center gap-2.5 rounded-xl px-4 h-11 bg-black/20 border" style={{ borderColor: THEME.border }}>
            <Search size={18} style={{ color: THEME.muted }} />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อลูกค้า / รหัสจอง / เซลล์ / เบอร์โทร..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600 text-white" />
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="bg-black/40 border p-1 rounded-xl flex items-center gap-1 h-11" style={{ borderColor: THEME.border }}>
              <button type="button" onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 h-full rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-[#FF1F88] text-white shadow-md' : 'text-[#9E9EAF] hover:text-white'}`}><LayoutGrid size={13} /> รายชื่อคิว</button>
              <button type="button" onClick={() => setViewMode('floorplan')} className={`flex items-center gap-1.5 px-3 h-full rounded-lg text-xs font-bold transition-all ${viewMode === 'floorplan' ? 'bg-[#FF1F88] text-white shadow-md' : 'text-[#9E9EAF] hover:text-white'}`}><Map size={13} /> ผังร้าน & บล็อกโต๊ะ</button>
            </div>
            <button type="button" onClick={() => { setShowPast(!showPast); }} className="flex items-center gap-2 rounded-xl px-4 h-11 text-sm font-medium border transition-all active:scale-95" style={{ backgroundColor: showPast ? `${THEME.purple}1A` : 'transparent', borderColor: showPast ? THEME.purple : THEME.border, color: showPast ? THEME.purple : THEME.text }}><History size={16} /><span>ประวัติอดีต</span><span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/50">{showPast ? 'ON' : 'OFF'}</span></button>
            
            {role === 'owner' && (
              <button type="button" onClick={handleExportCSV} className="flex items-center gap-2 rounded-xl px-4 h-11 text-sm font-bold border transition-all active:scale-95 bg-transparent hover:bg-white/5" style={{ borderColor: THEME.border, color: THEME.mint }}><Download size={16} /><span>Export CSV Report</span></button>
            )}

            <div className="relative flex items-center rounded-xl bg-black/20 border h-11" style={{ borderColor: THEME.border }}>
              <Filter size={16} className="pointer-events-none absolute left-4" style={{ color: THEME.muted }} />
              <select value={zone} onChange={(e) => setZone(e.target.value as ZoneId)} className="h-full cursor-pointer appearance-none bg-transparent pl-11 pr-10 text-sm font-medium outline-none text-white rounded-xl">
                {ZONES.map((z) => (<option key={z.id} value={z.id} style={{ backgroundColor: THEME.card }}>{z.label}</option>))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} />
            </div>
          </div>
        </div>

        <main className="mt-6">
          {error && <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium bg-red-950 border border-red-500 text-red-300">{error}</div>}

          {loading && bookings.length === 0 ? (
            <LoadingGrid />
          ) : viewMode === 'list' ? (
            filtered.length === 0 ? (
              <EmptyState hasBookings={bookings.length > 0} />
            ) : (
              <div className="space-y-10">
                {sortedDates.map((dateKey) => {
                  const isToday = dateKey === new Date().toISOString().split('T')[0];
                  const isPastDate = dateKey < new Date().toISOString().split('T')[0];
                  const dayEvent = eventsMap[dateKey];

                  return (
                    <div key={dateKey} className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2 border-b pb-2" style={{ borderColor: THEME.border }}>
                        <CalendarDays size={16} style={{ color: isToday ? THEME.pink : isPastDate ? THEME.muted : THEME.gold }} />
                        <h2 className="text-sm font-mono font-bold tracking-wider text-white">
                          {isToday ? `🔥 รายการวันนี้ (${dateKey})` : `⏳ บันทึกย้อนหลัง (${dateKey})`}
                        </h2>
                        
                        {dayEvent && dayEvent.event_type === 'concert' && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold border font-sans animate-pulse" style={{ backgroundColor: `${THEME.pink}10`, borderColor: `${THEME.pink}40`, color: THEME.pink }}>
                            🎵 โหมดอีเวนต์: {dayEvent.title} (บัตรเหมาต่อโต๊ะ {dayEvent.price.toLocaleString()}.-)
                          </span>
                        )}
                        {dayEvent && dayEvent.event_type === 'closed' && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold border font-sans" style={{ backgroundColor: `rgba(239, 68, 68, 0.1)`, borderColor: `rgba(239, 68, 68, 0.4)`, color: '#EF4444' }}>
                            🛑 วันหยุดร้าน (ลูกค้าจองไม่ได้)
                          </span>
                        )}

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-slate-400 ml-auto">
                          {groupedByDate[dateKey].length} รายการ
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {groupedByDate[dateKey].map((b) => (
                          <BookingCard 
                            key={b.id} 
                            booking={b} 
                            eventPrice={eventsMap[b.booking_date]?.price || 0}
                            onUpdateStatus={handleUpdateStatus}
                            onViewSlip={(bookingData) => setSelectedBookingForSlip(bookingData)}
                            role={role}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-500/5 border-amber-500/20 text-xs text-[#E5B842]">
                <div className="leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5 mb-1">🛡️ แผงควบคุมตำแหน่งโต๊ะอาหารหลังบ้าน</p>
                  <p className="text-slate-400">
                    คลิกที่ไอคอนโต๊ะว่างบนผังร้านเพื่อสั่งจอง (สำหรับเซลล์ หรือ Walk-in) โต๊ะที่จิ้มจะกลายเป็นสีแดงล็อกไว้ให้ทันทีครับ
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-white text-xs sm:text-sm">เลือกวันที่ตรวจสอบ:</span>
                  <div className="relative flex items-center bg-black/50 border border-[#2D2235] rounded-xl px-3.5 h-10 transition-all focus-within:border-pink-500 group shadow-lg">
                    <CalendarDays size={15} className="text-pink-500 absolute left-3.5 pointer-events-none group-focus-within:scale-110 transition-transform" />
                    <input 
                      type="date" 
                      value={adminSelectedDate}
                      onChange={(e) => setAdminSelectedDate(e.target.value)}
                      className="bg-transparent pl-6 pr-0 text-white outline-none font-mono text-xs cursor-pointer h-full w-32 appearance-none color-scheme-dark custom-date-hide-icon"
                    />
                  </div>
                </div>
              </div>

              <div className="w-full rounded-3xl bg-[#16161E] border border-[#2D2235] p-6 flex flex-col items-center justify-center min-h-[450px] overflow-x-auto shadow-inner relative">
                <FloorPlan 
                  selectedTables={adminSelectedTables} 
                  onTableClick={handleAdminLockTableClick}
                  dayTables={adminDayTablesMap}
                />
                
                <AnimatePresence>
                  {adminSelectedTables.length > 0 && (
                    <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: 10}} className="mt-6 p-4 w-full max-w-md rounded-2xl border bg-black/60 backdrop-blur-md flex items-center justify-between border-emerald-500/30 shadow-lg">
                      <div>
                        <p className="text-xs text-gray-400">โต๊ะที่เลือกเตรียมจอง</p>
                        <p className="text-emerald-400 font-bold text-lg">{adminSelectedTables.join(', ')}</p>
                      </div>
                      <button
                        onClick={() => { setLockModalMode('lock'); setIsLockConfirmModalOpen(true); }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      >
                        ดำเนินการจอง ({adminSelectedTables.length})
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {selectedBookingForSlip && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/85 backdrop-blur-sm"
              onClick={() => setSelectedBookingForSlip(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-[#16161E] border border-[#2D2235] shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-2xl flex flex-col relative z-10 max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-black/20 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20"><Search size={16}/></div>
                  <h3 className="text-lg font-bold text-white tracking-wide">ข้อมูลการจอง & สลิป</h3>
                </div>
                <button onClick={() => setSelectedBookingForSlip(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                <div>
                  <h4 className="text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">หลักฐานการชำระเงิน</h4>
                  {selectedBookingForSlip.slip_url ? (
                    <div className="w-full rounded-xl overflow-hidden bg-black/50 border border-slate-800 relative group">
                      <img 
                        src={selectedBookingForSlip.slip_url} 
                        alt="Payment Slip" 
                        className="w-full h-auto max-h-[50vh] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-black/40 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
                      <ImageIcon size={24} className="mb-2 opacity-50"/>
                      <span className="text-xs font-medium text-center">ไม่พบรูปภาพสลิปแนบมาในระบบ<br/>(อาจเป็นการจองฟรี หรือใช้โค้ด VIP)</span>
                    </div>
                  )}
                </div>

                <div className="bg-black/30 rounded-xl p-4 border border-slate-800/50 shadow-inner space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs">สถานะคิว:</span> 
                    <span className="font-bold text-white text-right px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: `${STATUS_META[selectedBookingForSlip.status]?.color || THEME.muted}20`, color: STATUS_META[selectedBookingForSlip.status]?.color || THEME.text }}>
                      {STATUS_META[selectedBookingForSlip.status]?.label || selectedBookingForSlip.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">ชื่อลูกค้า:</span> <span className="font-bold text-white text-right">{selectedBookingForSlip.customer_name}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">เบอร์ติดต่อ:</span> <span className="font-mono text-white text-right">{selectedBookingForSlip.phone}</span></div>
                  
                  {selectedBookingForSlip.sales_name && (
                    <div className="flex justify-between items-center bg-[#00F5D4]/10 p-1.5 -mx-1.5 rounded text-[#00F5D4]">
                      <span className="text-xs font-bold flex items-center gap-1"><Briefcase size={14}/> ผู้ดูแล (เซลล์):</span> <span className="font-bold">{selectedBookingForSlip.sales_name}</span>
                    </div>
                  )}
                  {selectedBookingForSlip.member_code && (
                    <div className="flex justify-between items-center bg-amber-500/10 p-1.5 -mx-1.5 rounded text-amber-400">
                      <span className="text-xs font-bold flex items-center gap-1"><Ticket size={14}/> รหัส VIP ที่ใช้:</span> <span className="font-mono">{selectedBookingForSlip.member_code}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">วันที่เข้ารับบริการ:</span> <span className="font-mono text-white">{selectedBookingForSlip.booking_date}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">เวลานัดหมาย:</span> <span className="font-mono text-white">{(selectedBookingForSlip.booking_time || '').slice(0, 5)} น.</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">จำนวนแขก:</span> <span className="font-mono text-white">{selectedBookingForSlip.guests_count} ท่าน</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">โต๊ะที่จอง:</span> <span className="font-bold text-emerald-400 text-right">{selectedBookingForSlip.table_number}</span></div>
                  
                  {selectedBookingForSlip.created_at && (
                    <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                      <span className="text-gray-500 text-[10px]">เวลาที่กดทำรายการจอง:</span> 
                      <span className="font-mono text-gray-500 text-[10px]">{new Date(selectedBookingForSlip.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-800/80 pt-3 mt-1 flex justify-between items-center bg-amber-500/5 -mx-4 px-4 pb-1">
                    <span className="text-amber-500/80 text-xs font-bold">ราคาเหมา (ต่อ 1 โต๊ะ):</span> 
                    <span className="font-black text-amber-400 text-base">
                      {((eventsMap[selectedBookingForSlip.booking_date]?.price || 0)).toLocaleString()} ฿
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-slate-800/80 bg-black/40 shrink-0 grid grid-cols-2 gap-3">
                {selectedBookingForSlip.status === 'pending' ? (
                  role === 'owner' ? (
                    <>
                      <button 
                        type="button" 
                        onClick={() => {
                          if(window.confirm('คุณต้องการปฏิเสธคิวและล้างโต๊ะนี้ให้ว่างใช่หรือไม่?')) {
                            handleUpdateStatus(selectedBookingForSlip.id, 'no_show');
                            setSelectedBookingForSlip(null);
                          }
                        }}
                        className="py-3 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                      >
                        ปฏิเสธคิว (ลบทิ้ง)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          handleUpdateStatus(selectedBookingForSlip.id, 'confirmed');
                          setSelectedBookingForSlip(null);
                        }}
                        className="py-3 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-[0_0_15px_rgba(229,184,66,0.2)]"
                        style={{ backgroundColor: THEME.gold }}
                      >
                        <Check size={14} className="stroke-[3]"/>
                        ยืนยันรับยอดเงิน
                      </button>
                    </>
                  ) : (
                    <div className="col-span-2 py-3 rounded-xl text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 text-center">
                      รอแอดมินตรวจสอบสลิปและยืนยันยอด
                    </div>
                  )
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setSelectedBookingForSlip(null)}
                    className="col-span-2 py-3 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    ปิดหน้าต่าง
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLockConfirmModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999] overflow-y-auto custom-scrollbar">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] my-8 bg-[#16161E] border-[#2D2235]" 
            >
              {lockModalMode === 'lock' ? (
                <>
                  {/* 🟢 STEP 1: หน้าฟอร์มกรอกข้อมูล */}
                  {adminBookingStep === 'form' ? (
                    <form onSubmit={handleAdminFormSubmit} className="space-y-4 animate-fade-in">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <User size={20}/>
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-white">สำรองโต๊ะ (Walk-in / Sale)</h3>
                          <p className="text-[11px] text-[#9E9EAF]">กรอกข้อมูลเพื่อจองโต๊ะและบล็อกผังให้ลูกค้า</p>
                        </div>
                      </div>

                      <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-slate-800">
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-gray-300">ชื่อลูกค้า / นามแฝง</label>
                          <input type="text" required value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} className="w-full bg-black/20 border border-slate-700 rounded-lg px-3 h-10 text-white outline-none focus:border-emerald-500 text-sm" placeholder="เช่น ลูกค้า Walk-in / หรือชื่อลูกค้า" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-gray-300">เบอร์โทรศัพท์ติดต่อ</label>
                          <input type="tel" required value={adminForm.phone} onChange={e => setAdminForm({...adminForm, phone: e.target.value})} className="w-full bg-black/20 border border-slate-700 rounded-lg px-3 h-10 text-white outline-none focus:border-emerald-500 text-sm" placeholder="08X-XXX-XXXX" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-300">เวลาเข้าโต๊ะ</label>
                            <select value={adminForm.time} onChange={e => setAdminForm({...adminForm, time: e.target.value})} className="w-full bg-black/20 border border-slate-700 rounded-lg px-3 h-10 text-white outline-none focus:border-emerald-500 text-sm">
                              <option value="19:00" style={{backgroundColor: '#16161E'}}>19:00 น.</option>
                              <option value="20:00" style={{backgroundColor: '#16161E'}}>20:00 น.</option>
                              <option value="21:00" style={{backgroundColor: '#16161E'}}>21:00 น.</option>
                              <option value="22:00" style={{backgroundColor: '#16161E'}}>22:00 น.</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-300">จำนวนคน</label>
                            <input type="number" min="1" value={adminForm.guests} onChange={e => setAdminForm({...adminForm, guests: parseInt(e.target.value) || 1})} className="w-full bg-black/20 border border-slate-700 rounded-lg px-3 h-10 text-white outline-none focus:border-emerald-500 text-sm text-center" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-slate-800">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-[#00F5D4] flex items-center gap-1"><Briefcase size={13}/> เซลล์ผู้รับผิดชอบ (ถ้ามี)</label>
                            <input 
                              list="sales-list" 
                              placeholder="พิมพ์หรือเลือกชื่อเซลล์" 
                              value={adminForm.saleName} 
                              onChange={(e) => setAdminForm({...adminForm, saleName: e.target.value})}
                              className="w-full bg-black/20 border border-slate-700 rounded-lg px-3 h-10 text-white outline-none focus:border-[#00F5D4] text-sm"
                            />
                            <datalist id="sales-list">
                              {salesList.map(s => <option key={s.id} value={s.sale_name} />)}
                            </datalist>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-amber-400 flex items-center gap-1"><Ticket size={13}/> รหัสสมาชิก VIP (ถ้ามี)</label>
                            <input 
                              type="text" 
                              placeholder="กรอกโค้ดเพื่อรับสิทธิ์จองฟรี/ส่วนลด" 
                              value={adminForm.memberCode} 
                              onChange={(e) => setAdminForm({...adminForm, memberCode: e.target.value})}
                              className="w-full bg-black/20 border border-slate-700 rounded-lg px-3 h-10 text-amber-400 outline-none focus:border-amber-500 font-mono text-sm uppercase placeholder:text-slate-600"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col gap-1 text-sm">
                         <span className="text-emerald-500 text-xs font-bold">ตำแหน่งที่โต๊ะที่สั่งบล็อก:</span>
                         <span className="text-emerald-400 font-mono font-bold tracking-wide">{adminSelectedTables.join(', ')}</span>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={closeAdminLockModal} className="flex-1 h-10 rounded-xl border border-slate-700 hover:bg-white/5 text-white text-xs font-bold transition-colors">ยกเลิก</button>
                        <button type="submit" disabled={isLockProcessing} className="flex-1 h-10 rounded-xl bg-emerald-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-400 transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                          {isLockProcessing ? <Loader2 size={16} className="animate-spin" /> : null} 
                          {isAdminSlipRequired ? 'ดำเนินการต่อ (ชำระเงิน) ➔' : 'บันทึกคิวจองทันที'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* 🟢 STEP 2: หน้าชำระเงินและแนบสลิป */
                    <form onSubmit={handleAdminPaymentSubmit} className="space-y-4 animate-fade-in">
                      <div className="flex items-center gap-3 mb-2">
                        <button type="button" onClick={() => setAdminBookingStep('form')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-slate-800">
                           <ChevronLeft size={18} />
                        </button>
                        <div>
                          <h3 className="text-base font-extrabold text-white">ชำระเงินยืนยันโต๊ะ</h3>
                          <p className="text-[11px] text-amber-400 animate-pulse">⏳ กรุณาโอนเงินและแนบสลิปเพื่อล็อกโต๊ะ</p>
                        </div>
                      </div>

                      <div className="bg-black/40 border border-slate-800 p-4 rounded-xl space-y-2.5 text-sm">
                         <div className="flex justify-between text-gray-300 text-xs"><span>โต๊ะที่จอง:</span><span className="font-bold text-white">{adminSelectedTables.join(', ')}</span></div>
                         <div className="flex justify-between text-gray-300 text-xs"><span>ชื่อลูกค้า:</span><span className="font-bold text-white">{adminForm.name}</span></div>
                         <div className="flex justify-between text-gray-300 text-xs"><span>จำนวนคน:</span><span className="font-bold text-white">{adminForm.guests} ท่าน</span></div>
                         
                         {/* 🟢 แจ้งเตือนสิทธิ์เมมเบอร์ในสรุปยอด */}
                         {membersList.some(m => m.member_code?.trim().toUpperCase() === adminForm.memberCode.trim().toUpperCase()) && (
                           <div className="flex justify-between text-amber-400 text-xs"><span>ใช้สิทธิ์เมมเบอร์:</span><span className="font-bold">ชำระเฉพาะค่าตั๋ว {adminForm.guests} ท่าน</span></div>
                         )}

                         <div className="flex justify-between items-center text-pink-400 font-bold border-t border-slate-800 pt-3 mt-1">
                           <span className="text-xs">ยอดรวมที่ต้องชำระ:</span>
                           <span className="text-xl tracking-tight">{adminTotalPrice.toLocaleString()} ฿</span>
                         </div>
                      </div>

                      {/* 🟢 ส่วนแสดง Dynamic PromptPay QR Code */}
                      <div className="bg-[#003D6A] p-4 rounded-xl flex flex-col items-center justify-center text-white border border-[#002D4E] shadow-inner">
                        <div className="bg-white p-2.5 rounded-xl mb-3 shadow-lg h-36 w-36 flex items-center justify-center overflow-hidden">
                          <img 
                            src={`https://promptpay.io/${PROMPTPAY_NUMBER}/${adminTotalPrice}.png`} 
                            alt="PromptPay QR" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="font-bold text-sm tracking-wide">Thai QR Payment</p>
                        <p className="text-[10px] text-blue-200 mt-0.5">เบอร์พร้อมเพย์: {PROMPTPAY_NUMBER}</p>
                      </div>

                      <div className="bg-black/40 p-4 rounded-xl border border-slate-800">
                        <label className="block text-xs font-semibold mb-2 text-white">แนบหลักฐานการโอนเงิน (สลิป)</label>
                        <div className="relative h-28 w-full border border-dashed rounded-xl flex flex-col items-center justify-center bg-black/20 cursor-pointer overflow-hidden group transition-all" style={{ borderColor: adminSlipFile ? THEME.mint : '#EF4444' }}>
                          <input type="file" accept="image/*" required onChange={handleAdminSlipChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          {adminSlipPreview ? (
                            <>
                              <img src={adminSlipPreview} alt="Preview" className="w-full h-full object-contain" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-0"><ImageIcon size={20} className="text-white mb-1" /><p className="text-[10px] font-bold text-white">เปลี่ยนรูป</p></div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                              <ImageIcon size={24} className="mb-2" />
                              <p className="text-[10px] font-bold">คลิกอัปโหลดสลิปที่นี่</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        {/* ถ้ากดปิดหน้านี้ โต๊ะจะยังคงค้างเป็นสีเหลือง (Pending) ตามลอจิกล็อกโต๊ะไว้ให้เซลล์รอสลิป */}
                        <button type="button" onClick={closeAdminLockModal} className="w-1/3 h-11 rounded-xl border border-slate-700 hover:bg-white/5 text-white text-xs font-bold transition-colors">พักบิลรอจ่าย</button>
                        <button type="submit" disabled={isLockProcessing || !adminSlipFile} className="flex-1 h-11 rounded-xl bg-emerald-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-400 transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                          {isLockProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} className="stroke-[3]" />} ยืนยันการชำระเงิน
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                      <Unlock size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">ยืนยันคำสั่ง "ปลดล็อก" โต๊ะอาหาร</h3>
                      <p className="text-[11px] text-[#9E9EAF] font-mono mt-0.5">ADMIN DISMANTLE OVERRIDE PROTOCOL</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-slate-800 text-xs sm:text-sm space-y-2 leading-relaxed">
                    <p className="text-gray-300">คุณต้องการทำการ <span className="text-emerald-400 font-extrabold">ปลดล็อกโต๊ะหมายเลข {tablePendingLock}</span> ใช่หรือไม่?</p>
                  </div>
                  <div className="flex items-center gap-3 pt-1 font-bold text-xs">
                    <button type="button" disabled={isLockProcessing} onClick={closeAdminLockModal} className="flex-1 h-10 rounded-xl border border-slate-700 hover:bg-white/5 text-white transition-colors active:scale-95 disabled:opacity-40">ยกเลิก</button>
                    <button type="button" disabled={isLockProcessing} onClick={executeAdminUnlockTable} className="flex-1 h-10 rounded-xl text-black font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 bg-emerald-500 hover:bg-emerald-400 shadow-[0_4px_15px_rgba(0,245,212,0.2)]">{isLockProcessing ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} />ยืนยันปลดล็อกโต๊ะ</>}</button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMemberModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[80] transition-all overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl p-6 border my-8" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
              <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: THEME.border }}>
                <div className="flex items-center gap-2"><Crown style={{ color: THEME.gold }} size={20} /><h2 className="text-xl font-bold tracking-tight text-white">จัดการระบบสมาชิก VIP</h2></div>
                <button onClick={() => setIsMemberModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <form onSubmit={handleAddMember} className="space-y-4 p-4 bg-black/30 rounded-2xl border" style={{ borderColor: THEME.border }}>
                  <h3 className="text-sm font-bold text-white mb-2">เพิ่มรหัส VIP ใหม่</h3>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-300">ชื่อสมาชิก / กลุ่ม VIP</label>
                    <input type="text" required placeholder="เช่น กลุ่มคุณแพทตี้" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="w-full bg-black/20 border rounded-xl px-4 h-10 text-white outline-none focus:border-amber-500 text-sm" style={{ borderColor: THEME.border }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-300">รหัสผ่านสำหรับจองฟรี (Code)</label>
                    <input type="text" required placeholder="เช่น PATTYVIP99" value={newMemberCode} onChange={(e) => setNewMemberCode(e.target.value)} className="w-full bg-black/20 border rounded-xl px-4 h-10 text-white outline-none focus:border-amber-500 text-sm font-mono" style={{ borderColor: THEME.border }} />
                  </div>
                  <button type="submit" disabled={isMemberLoading || !newMemberName || !newMemberCode} className="w-full h-10 rounded-xl font-bold text-black transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2 text-sm" style={{ backgroundColor: THEME.gold }}>
                    {isMemberLoading ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> บันทึกรหัส VIP</>}
                  </button>
                </form>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white px-1">รายชื่อ VIP ในระบบ ({membersList.length})</h3>
                  <div className="h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {membersList.length > 0 ? membersList.map((m) => (
                      <div key={m.id} className="p-3 bg-black/40 border rounded-xl flex items-center justify-between group" style={{ borderColor: THEME.border }}>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{m.member_name}</p>
                          <p className="text-xs font-mono text-amber-400 truncate">Code: {m.member_code}</p>
                        </div>
                        <button onClick={() => handleDeleteMember(m.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="ลบรหัสนี้">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <Crown size={24} className="opacity-20" />
                        <p className="text-xs">ยังไม่มีรหัส VIP ในระบบ</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSalesModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[80] transition-all overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl p-6 border my-8" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
              <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: THEME.border }}>
                <div className="flex items-center gap-2"><Briefcase className="text-[#00F5D4]" size={20} /><h2 className="text-xl font-bold tracking-tight text-white">จัดการรายชื่อเซลล์หน้าร้าน</h2></div>
                <button onClick={() => setIsSalesModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <form onSubmit={handleAddSale} className="space-y-4 p-4 bg-black/30 rounded-2xl border" style={{ borderColor: THEME.border }}>
                  <h3 className="text-sm font-bold text-white mb-2">เพิ่มเซลล์ใหม่</h3>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-300">ชื่อเซลล์ที่ใช้ทำงาน</label>
                    <input type="text" required placeholder="เช่น เซลล์น้องมายด์" value={newSaleName} onChange={(e) => setNewSaleName(e.target.value)} className="w-full bg-black/20 border border-slate-700 rounded-xl px-4 h-10 text-white outline-none focus:border-[#00F5D4] text-sm" />
                  </div>
                  <button type="submit" disabled={isSalesLoading || !newSaleName} className="w-full h-10 rounded-xl font-bold text-black transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2 text-sm bg-[#00F5D4] hover:bg-[#00F5D4]/80">
                    {isSalesLoading ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> บันทึกรายชื่อเซลล์</>}
                  </button>
                </form>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white px-1">รายชื่อเซลล์ปัจจุบัน ({salesList.length})</h3>
                  <div className="h-[150px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {salesList.length > 0 ? salesList.map((s) => (
                      <div key={s.id} className="p-3 bg-black/40 border rounded-xl flex items-center justify-between group" style={{ borderColor: THEME.border }}>
                        <div className="min-w-0 flex items-center gap-2">
                          <User size={14} className="text-slate-400"/>
                          <p className="text-sm font-bold text-white truncate">{s.sale_name}</p>
                        </div>
                        <button onClick={() => handleDeleteSale(s.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="ลบเซลล์นี้">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <Briefcase size={24} className="opacity-20" />
                        <p className="text-xs">ยังไม่มีรายชื่อเซลล์</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appNotice.isOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} className="w-full max-w-sm rounded-2xl border p-5 text-center space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)]" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
              <div className="w-12 h-12 rounded-full border flex items-center justify-center mx-auto text-base" style={{ backgroundColor: appNotice.type === 'success' ? 'rgba(0,245,212,0.1)' : appNotice.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(229,184,66,0.1)', borderColor: appNotice.type === 'success' ? 'rgba(0,245,212,0.2)' : appNotice.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(229,184,66,0.2)', color: appNotice.type === 'success' ? THEME.mint : appNotice.type === 'error' ? '#F87171' : THEME.gold }}>
                {appNotice.type === 'success' ? <CheckCircle size={22} /> : appNotice.type === 'error' ? <AlertCircle size={22} /> : <Radio size={22} className="animate-pulse" />}
              </div>
              <div className="space-y-1"><h4 className="text-base font-bold text-white tracking-wide">{appNotice.title}</h4><p className="text-xs text-[#9E9EAF] leading-relaxed px-1">{appNotice.message}</p></div>
              <button type="button" onClick={() => setAppNotice(prev => ({ ...prev, isOpen: false }))} className="w-full h-10 font-bold rounded-xl text-xs transition-transform active:scale-[0.97] text-white hover:bg-white/5 border border-slate-700">รับทราบคำแนะนำ</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[80] transition-all overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl p-6 border my-8" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: THEME.border }}>
              <div className="flex items-center gap-2"><Music style={{ color: THEME.pink }} size={20} /><h2 className="text-xl font-bold tracking-tight text-white">ตั้งค่าปฏิทินร้านและอีเวนต์</h2></div>
              <button onClick={() => { setIsEventModalOpen(false); }} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateEventSubmit} className="space-y-5 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-3 p-3 bg-black/30 rounded-2xl border" style={{ borderColor: THEME.border }}>
                  <div className="flex items-center justify-between px-1">
                    <span className="font-bold text-sm text-white">{monthNames[viewMonth]} {viewYear + 543}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else { setViewMonth(viewMonth - 1); } }} className="p-1 text-xs font-bold text-slate-400 hover:text-white border border-slate-800 rounded bg-black/20">◀</button>
                      <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else { setViewMonth(viewMonth + 1); } }} className="p-1 text-xs font-bold text-slate-400 hover:text-white border border-slate-800 rounded bg-black/20">▶</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d}>{d}</div>)}</div>
                  <div className="grid grid-cols-7 gap-1 text-center font-mono">
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} />;
                      const checkDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = eventDate === checkDateStr;
                      const ev = eventsMap[checkDateStr];
                      const isClosed = ev?.event_type === 'closed';
                      const isConcert = ev?.event_type === 'concert';

                      return (
                        <button
                          key={`day-${day}`} type="button" onClick={() => selectDateHandler(day)}
                          className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center relative ${isSelected ? 'shadow-md' : 'hover:bg-white/10 border border-transparent'}`}
                          style={{ 
                            backgroundColor: isSelected ? (isClosed ? '#EF4444' : THEME.pink) : (isClosed ? 'rgba(239,68,68,0.2)' : ''), 
                            color: isClosed && !isSelected ? '#EF4444' : 'white'
                          }}
                        >
                          {day}
                          {isConcert && !isSelected && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-pink-500"></span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-center border-t pt-2 text-xs font-medium text-slate-400" style={{ borderColor: THEME.border }}>วันที่เลือก: {eventDate ? <span className="text-white font-bold underline font-mono">{eventDate}</span> : <span className="text-amber-400">กรุณาคลิกเลือกบนปฏิทิน</span>}</div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono mb-1.5 uppercase tracking-wider text-slate-300">ประเภทของวัน</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-black/30 p-1 rounded-xl border h-11 items-center" style={{ borderColor: THEME.border }}>
                      <button type="button" onClick={() => { setEventType('normal'); }} className="h-8 rounded-lg font-bold text-[11px] transition-all" style={{ backgroundColor: eventType === 'normal' ? THEME.purple : 'transparent', color: 'white' }}>วันปกติ (ฟรี)</button>
                      <button type="button" onClick={() => { setEventType('concert'); }} className="h-8 rounded-lg font-bold text-[11px] transition-all" style={{ backgroundColor: eventType === 'concert' ? THEME.pink : 'transparent', color: 'white' }}>🚀 คอนเสิร์ต</button>
                      <button type="button" onClick={() => { setEventType('closed'); }} className="h-8 rounded-lg font-bold text-[11px] transition-all" style={{ backgroundColor: eventType === 'closed' ? '#EF4444' : 'transparent', color: 'white' }}>🛑 วันหยุดร้าน</button>
                    </div>
                  </div>
                  
                  {eventType === 'closed' && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs leading-relaxed animate-fade-in">
                      <AlertTriangle size={14} className="inline mr-1" />
                      ตั้งค่าวางระบบเป็นวันหยุดร้าน ลูกค้าจะไม่สามารถจองคิวออนไลน์ในวันนี้ได้ ระบบจะแจ้งเตือนลูกค้าทันทีเมื่อกดเลือกวันนี้ครับ
                    </div>
                  )}

                  {eventType === 'concert' && (
                    <div className="space-y-4 pt-1 animate-fade-in">
                      <div className="grid grid-cols-1 gap-3">
                        <div><label className="block text-xs font-semibold mb-1 text-gray-300">ชื่อคอนเสิร์ต / ศิลปิน</label><input type="text" placeholder="e.g. Three Man Down Live" value={eventTitle} onChange={(e) => { setEventTitle(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="w-full bg-black/20 border rounded-xl px-4 h-11 text-white outline-none focus:border-pink-500" style={{ borderColor: THEME.border }} /></div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-300">ราคาเหมา (บาท/โต๊ะ)</label>
                            <div className="relative flex items-center">
                              <DollarSign size={15} className="absolute left-3.5 text-amber-400" />
                              <input type="number" value={eventPrice} onChange={(e) => { setEventPrice(Number(e.target.value)); }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="w-full bg-black/20 border rounded-xl pl-9 pr-4 h-11 text-white outline-none focus:border-amber-500 font-mono" style={{ borderColor: THEME.border }} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-300">เสริมเกิน 4 คน (บาท/คน)</label>
                            <div className="relative flex items-center">
                              <Plus size={15} className="absolute left-3.5 text-pink-400" />
                              <input type="number" value={eventExtraPrice} onChange={(e) => { setEventExtraPrice(Number(e.target.value)); }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="w-full bg-black/20 border rounded-xl pl-9 pr-4 h-11 text-white outline-none focus:border-pink-500 font-mono" style={{ borderColor: THEME.border }} />
                            </div>
                          </div>
                        </div>
                        
                      </div>
                      <div><label className="block text-xs font-semibold mb-1 text-gray-300 flex items-center gap-1"><FileText size={13} /> รายละเอียดของแถม</label><textarea rows={3} placeholder="ตั๋วเข้างานยกโต๊ะ นั่งได้สูงสุด 4 ท่าน ฟรีมิกเซอร์..." value={perksNote} onChange={(e) => { setPerksNote(e.target.value); }} className="w-full bg-black/20 border rounded-xl p-3 text-white outline-none focus:border-pink-500 text-xs leading-relaxed resize-none" style={{ borderColor: THEME.border }} /></div>
                    </div>
                  )}
                </div>
              </div>
              {eventType === 'concert' && (
                <div className="animate-fade-in mt-2">
                  <label className="block text-xs font-semibold mb-1.5 text-gray-300 flex items-center gap-1"><ImageIcon size={13} /> รูปภาพโปสเตอร์ศิลปิน</label>
                  <div className="relative h-48 w-full border border-dashed rounded-xl flex flex-col items-center justify-center bg-black/20 cursor-pointer overflow-hidden group transition-all" style={{ borderColor: THEME.border }}>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    {imagePreview ? (<><img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-0"><ImageIcon size={24} className="text-white mb-1.5" /><p className="text-xs font-bold text-white">คลิกเพื่อเปลี่ยนรูปโปสเตอร์</p></div></>) : (<div className="flex flex-col items-center justify-center"><div className="p-3 bg-pink-500/10 rounded-full mb-2.5"><ImageIcon size={24} className="text-pink-500" /></div><p className="text-xs font-bold text-gray-200">คลิกเลือกหรือลากรูปภาพมาวาง</p></div>)}
                  </div>
                </div>
              )}
              {eventStatusMsg && <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${eventStatusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>{eventStatusMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}<span className="font-medium">{eventStatusMsg.text}</span></div>}
              <div className="flex justify-end gap-3 pt-4 font-bold border-t border-slate-800" style={{ borderColor: THEME.border }}>
                {eventsMap[eventDate] && <button type="button" disabled={eventLoading || !eventDate} onClick={handleCancelConcert} className="mr-auto px-4 py-2.5 text-xs rounded-xl border transition-all active:scale-95 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed">ยกเลิกการตั้งค่าวันนี้</button>}
                <button type="button" onClick={() => { setIsEventModalOpen(false); }} className="px-5 py-2.5 text-xs rounded-xl border text-white border-slate-700 hover:bg-white/5 transition-colors">ปิดหน้าต่าง</button>
                <button type="submit" disabled={eventLoading} className="px-5 py-2.5 text-xs rounded-xl text-black flex items-center gap-1.5 font-bold transition-all disabled:opacity-70" style={{ backgroundColor: THEME.gold }}>{eventLoading ? <Loader2 size={14} className="animate-spin" /> : null} อัปเดตโหมดปฏิทิน</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[90] transition-all">
          <div className="w-full max-w-md rounded-2xl p-6 border" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
            <div className="flex items-center gap-2 mb-4"><AlertTriangle style={{ color: THEME.gold }} size={20} /><h2 className="text-xl font-bold tracking-tight text-white">รายงานปัญหาคิวจองระบบ</h2></div>
            <form onSubmit={handleSendReport} className="space-y-4 text-sm">
              <div><label className="block text-xs font-mono mb-1.5 uppercase tracking-wider">สาขาที่รายงาน</label><div className="w-full px-3 py-2.5 rounded-xl border text-sm font-bold bg-black/40 text-slate-400 border-slate-800" style={{ borderColor: THEME.border }}>🏢 {shopName}</div></div>
              <div><label className="block text-xs font-mono mb-1.5 uppercase tracking-wider">ประเภทปัญหา</label><div className="relative flex items-center rounded-xl bg-black/40 border" style={{ borderColor: THEME.border }}><select value={reportForm.issueType} onChange={e => setReportForm({...reportForm, issueType: e.target.value})} className="w-full cursor-pointer appearance-none bg-transparent py-2.5 pl-3 pr-10 text-sm outline-none text-white"><option value="UI Bug / หน้าเว็บเพี้ยน" style={{ backgroundColor: THEME.card }}>UI Bug / หน้าเว็บเพี้ยน</option><option value="ระบบจองขัดข้อง" style={{ backgroundColor: THEME.card }}>ระบบจองขัดข้อง</option><option value="ข้อมูลไม่ตรงความเป็นจริง" style={{ backgroundColor: THEME.card }}>ข้อมูลไม่ตรงความเป็นจริง</option><option value="อื่นๆ" style={{ backgroundColor: THEME.card }}>อื่นๆ</option></select><ChevronDown size={16} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} /></div></div>
              <div><label className="block text-xs font-mono mb-1.5 uppercase tracking-wider">รายละเอียดของปัญหา</label><textarea rows={4} required value={reportForm.details} onChange={e => setReportForm({...reportForm, details: e.target.value})} placeholder="กรุณาระบุสิ่งที่เกิดขึ้นอย่างละเอียด..." className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm bg-black/20 resize-none text-white" style={{ borderColor: THEME.border }} /></div>
              <div className="flex justify-end gap-3 pt-2 font-bold"><button type="button" onClick={() => { setIsReportModalOpen(false); }} className="px-4 py-2 text-xs rounded-xl border hover:bg-white/5 transition-all text-white border-slate-700">ยกเลิก</button><button type="submit" disabled={isSendingReport} className="px-4 py-2 text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50 text-black font-bold" style={{ backgroundColor: THEME.mint }}>🚀 ส่งข้อมูล</button></div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-date-hide-icon::-webkit-calendar-picker-indicator { background: transparent; bottom: 0; color: transparent; cursor: pointer; height: auto; left: 0; position: absolute; right: 0; top: 0; width: auto; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-black/20 border" style={{ borderColor: THEME.border }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}15`, color: accent }}><Icon size={18} /></div>
      <div className="min-w-0"><p className="truncate font-mono text-[10px] uppercase tracking-widest" style={{ color: THEME.muted }}>{label}</p><p className="text-xl sm:text-2xl font-bold leading-tight text-white mt-0.5">{value}</p></div>
    </div>
  );
}

function BookingCard({ 
  booking, 
  eventPrice,
  onUpdateStatus,
  onViewSlip,
  role 
}: { 
  booking: any;
  eventPrice: number;
  onUpdateStatus: (id: string, nextStatus: 'confirmed' | 'checked_in' | 'no_show') => Promise<void>;
  onViewSlip: (b: any) => void;
  role: UserRole;
}) {
  const zone = zoneOf(booking.table_number);
  const derived = deriveStatus(booking);
  let currentMeta = STATUS_META[booking.status] || STATUS_META[derived];

  const totalPaidForThisBooking = eventPrice;

  return (
    <div className="group relative overflow-hidden rounded-2xl transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[230px]" style={{ backgroundColor: THEME.card, border: booking.status === 'checked_in' ? '1px solid rgba(0, 245, 212, 0.3)' : booking.status === 'pending' ? `1px solid ${THEME.amber}` : booking.status === 'no_show' ? '1px solid rgba(239, 68, 68, 0.2)' : `1px solid ${THEME.border}`, opacity: booking.status === 'no_show' || derived === 'past' ? 0.4 : 1 }}>
      <div className="p-5 flex-1 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => onViewSlip(booking)} title="คลิกเพื่อดูรายละเอียดการจองและรูปสลิป">
        <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: booking.status === 'pending' ? THEME.amber : zone.accent }} />
        <div className="flex items-start justify-between relative">
          <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-bold" style={{ backgroundColor: `${zone.accent}1A`, color: zone.accent }}><zone.icon size={13} />{booking.table_number}</div>
          <div className="flex items-center gap-1.5 flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${booking.status === 'pending' ? 'animate-ping' : ''}`} style={{ backgroundColor: currentMeta.dot, boxShadow: (derived === 'tonight' || booking.status === 'pending') ? `0 0 10px ${currentMeta.dot}` : 'none' }} />
              <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color: currentMeta.color }}>{currentMeta.label}</span>
            </div>
          </div>
        </div>
        <h3 className="mt-4 truncate text-lg font-bold text-white pr-6 relative">{booking.customer_name}<div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400"><Eye size={16} /></div></h3>
        <div className="mt-1 flex items-center justify-between font-mono text-xs" style={{ color: zone.accent }}>
          <span className="flex items-center gap-1.5"><Hash size={12} /> {booking.booking_code}</span>
          {eventPrice > 0 && booking.status !== 'pending' && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-sans">Paid: {totalPaidForThisBooking.toLocaleString()} ฿</span>}
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-[11px]">
          {booking.sales_name ? (
             <div className="col-span-2 flex items-center gap-1.5 text-[#00F5D4] bg-[#00F5D4]/5 rounded px-1.5 py-0.5 border border-[#00F5D4]/20 truncate">
               <Briefcase size={12}/> <span className="truncate">เซลล์: {booking.sales_name}</span>
             </div>
          ) : null}
          {booking.member_code ? (
             <div className="col-span-2 flex items-center gap-1.5 text-amber-400 bg-amber-500/5 rounded px-1.5 py-0.5 border border-amber-500/20 truncate">
               <Ticket size={12}/> <span className="font-mono truncate">{booking.member_code}</span>
             </div>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-y-2.5 text-sm" style={{ color: THEME.muted }}>
          <DetailRow icon={CalendarDays} value={booking.booking_date} />
          <DetailRow icon={Clock} value={booking.booking_time?.includes('19:00') || booking.booking_time === '19:00:00' ? '19:00 - 23:00' : (booking.booking_time || '').slice(0, 5)} />
          <DetailRow icon={Users} value={`${booking.guests_count} ท่าน`} />
          <DetailRow icon={Phone} value={booking.phone} />
        </div>
      </div>
      <div className="px-5 pb-5 pt-0">
        <div className="pt-3 flex gap-2 border-t" style={{ borderColor: THEME.border }}>
          {booking.status === 'pending' ? (
            <button type="button" onClick={() => onViewSlip(booking)} className="w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 text-black hover:opacity-90" style={{ backgroundColor: THEME.gold, boxShadow: `0 2px 10px rgba(229, 184, 66, 0.15)` }}><Eye size={14} className="stroke-[3]" />{role === 'sale' || role === 'reception' ? 'ดูสลิป' : 'ตรวจสอบสลิปและยืนยัน'}</button>
          ) : (!booking.status || booking.status === 'confirmed') && derived !== 'past' ? (
            <>
              {role !== 'sale' && (
                <button type="button" onClick={() => onUpdateStatus(booking.id, 'checked_in')} className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400"><Check size={14} />เช็คอินเข้าร้าน</button>
              )}
              {role === 'owner' && (
                <button type="button" onClick={() => onUpdateStatus(booking.id, 'no_show')} className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400"><X size={14} />No Show / ยกเลิกคิว</button>
              )}
              {role === 'sale' && (
                <button type="button" onClick={() => onViewSlip(booking)} className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 bg-black/20 hover:bg-white/10 text-gray-400 border border-slate-800"><Eye size={14} />รายละเอียด</button>
              )}
            </>
          ) : (
            <button type="button" onClick={() => onViewSlip(booking)} className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 bg-black/20 hover:bg-white/10 text-gray-400 border border-slate-800"><Eye size={14} />ดูรายละเอียด / สลิป</button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  return <div className="flex items-center gap-2 truncate"><Icon size={14} className="shrink-0 text-slate-600" /><span className="truncate text-gray-200">{value || '—'}</span></div>;
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex h-44 animate-pulse flex-col justify-between rounded-2xl p-5 bg-slate-900 border border-slate-800">
          <div className="flex justify-between"><div className="h-6 w-16 rounded bg-slate-800" /><div className="h-4 w-20 rounded bg-slate-800" /></div>
          <div className="h-6 w-2/3 rounded bg-slate-800" />
          <div className="grid grid-cols-2 gap-2"><div className="h-4 rounded bg-slate-800" /><div className="h-4 rounded bg-slate-800" /></div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasBookings }: { hasBookings: boolean }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl px-6 py-16 text-center" style={{ backgroundColor: THEME.card, border: `1px dashed ${THEME.border}` }}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40" style={{ color: THEME.pink }}>{hasBookings ? <Search size={28} /> : <Inbox size={28} />}</div>
      <div><p className="text-lg font-bold text-white">{hasBookings ? 'ไม่พบรายการที่ตรงกับการค้นหา' : 'ยังไม่มีรายการจองในระบบ'}</p><p className="mt-1 text-sm" style={{ color: THEME.muted }}>{hasBookings ? 'ลองปรับคำค้นหา เปิดสวิตช์ประวัติย้อนหลัง หรือเปลี่ยนโซนที่นั่งดูอีกครั้ง' : 'รายการจองใหม่จะปรากฏที่นี่โดยอัตโนมัติ'}</p></div>
    </div>
  );
}
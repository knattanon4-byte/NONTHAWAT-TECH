'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Search,
  Filter,
  Users,
  Clock,
  Phone,
  Hash,
  CalendarDays,
  Crown,
  Trees,
  Music,
  Inbox,
  CircleDot,
  ChevronDown,
  AlertTriangle,
  Check,
  X,
  History,
  Radio,
  Download,
  Coins,
  Loader2,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  DollarSign,    
  AlertCircle,   
  Lock,    // 🟢 เพิ่มไอคอนสำหรับระบบล็อกอิน
  Mail,    // 🟢 เพิ่มไอคอนสำหรับระบบล็อกอิน
  LogOut,  // 🟢 เพิ่มไอคอนสำหรับออกจากระบบ
  type LucideIcon,
} from 'lucide-react';

/* ----------------------------------------------------------------------------
 * Premium Nightlife Theme tokens
 * -------------------------------------------------------------------------- */
const THEME = {
  bg: '#0A0A0E',
  card: '#16161E',
  border: '#2D2235',
  pink: '#FF1F88',
  gold: '#E5B842',
  purple: '#8A3FFC',
  mint: '#00F5D4',
  amber: '#FBBC05',
  text: '#F1F1F5',
  muted: '#9E9EAF',
};

type ZoneId = 'ALL' | 'V' | 'G' | 'A';

interface ZoneMeta {
  id: ZoneId;
  label: string;
  prefix: string;
  icon: LucideIcon;
  accent: string;
}

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
  const stamp = new Date(`${b.booking_date}T${(b.booking_time || '00:00:00').slice(0, 8)}`);
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

  // 🔐 Authentication States
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Main States
  const [bookings, setBookings] = useState<any[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, { title: string; price: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>('—');
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState<ZoneId>('ALL');
  const [showPast, setShowPast] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(true);
  const [shopExists, setShopExists] = useState(true);

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ issueType: 'ระบบจองขัดข้อง', details: '' });
  const [isSendingReport, setIsSendingReport] = useState(false);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventStatusMsg, setEventStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<'normal' | 'concert'>('normal');
  const [eventTitle, setEventTitle] = useState('');
  const [eventPrice, setEventPrice] = useState(5000);
  const [perksNote, setPerksNote] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());

  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  // 🔐 ผลดักจับและฟังสัญญาณ Auth Session รายวัน
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ฟังก์ชันยิงขอล็อกอินเข้าสู่ระบบคุมบอร์ด
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutClick = async () => {
    if (confirm('คุณต้องการออกจากระบบควบคุมคิวงานใช่หรือไม่?')) {
      await supabase.auth.signOut();
    }
  };

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    
    const daysArray = [];
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push(i);
    }
    return daysArray;
  }, [viewYear, viewMonth]);

  const selectDateHandler = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setEventDate(`${viewYear}-${mm}-${dd}`);
  };

  const loadEventsData = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('shop_events')
        .select('event_date, title, price')
        .eq('shop_id', shopSlug);
      
      if (data) {
        const mapped = data.reduce((acc, curr: any) => ({
          ...acc,
          [curr.event_date]: { title: curr.title, price: curr.price || 0 }
        }), {} as Record<string, { title: string; price: number }>);
        setEventsMap(mapped);
      }
    } catch (err) {
      console.error('Failed to load shop events mapping:', err);
    }
  }, [shopSlug]);

  useEffect(() => {
    if (!session) return; // ถ้าไม่ได้ล็อกอิน ไม่ต้องดึงข้อมูลหลังบ้านออกมาพ่น

    let active = true;
    const loadData = async () => {
      try {
        await loadEventsData();
        const { data, error: dbError } = await supabase
          .from('restaurant_bookings')
          .select('*')
          .eq('shop_id', shopSlug)
          .order('booking_date', { ascending: true })
          .order('booking_time', { ascending: true });

        if (!active) return;
        if (dbError) throw dbError;

        setBookings((data as any[]) ?? []);
        setError(null);
        setLastSync(new Date().toLocaleTimeString('en-GB'));
      } catch (err) {
        if (!active) return;
        console.error('Monitor fetch failed:', err);
        setError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ ระบบกำลังพยายามเชื่อมต่อใหม่...');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();

    const channel = supabase
      .channel(`live-monitor-v6:${shopSlug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_bookings', filter: `shop_id=eq.${shopSlug}` }, (payload) => {
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
            return prev.map((item) => (item.id === newRecord.id ? { ...item, ...newRecord } : item));
          }
          if (payload.eventType === 'DELETE') {
            return prev.filter((item) => item.id === oldRecord.id);
          }
          return prev;
        });
        setLastSync(new Date().toLocaleTimeString('en-GB'));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [shopSlug, loadEventsData, session]);

  useEffect(() => {
    let active = true;
    const loadShopSettings = async () => {
      try {
        const { data, error: settingsError } = await supabase
          .from('shop_settings')
          .select('is_booking_open')
          .eq('shop_id', shopSlug)
          .single();

        if (settingsError && settingsError.code === 'PGRST116') {
          if (active) setShopExists(false);
          return;
        }
        if (settingsError) throw settingsError;
        if (active && data) setIsBookingOpen(data.is_booking_open);
      } catch (err) {
        console.error(err);
      }
    };
    loadShopSettings();
  }, [shopSlug]);

  const handleUpdateStatus = async (bookingId: string, nextStatus: 'checked_in' | 'no_show') => {
    try {
      const { error: patchError } = await supabase
        .from('restaurant_bookings')
        .update({ status: nextStatus })
        .eq('id', bookingId);
      if (patchError) throw patchError;
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาด ไม่สามารถเปลี่ยนสถานะคิวได้ครับ');
    }
  };

  const handleToggleBookingStatus = async () => {
    const nextState = !isBookingOpen;
    setIsBookingOpen(nextState);
    try {
      await supabase.from('shop_settings').upsert({ shop_id: shopSlug, is_booking_open: nextState });
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถอัปเดตสถานะร้านได้ กรุณาลองใหม่อีกครั้งครับ');
      setIsBookingOpen(!nextState);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate) {
      setEventStatusMsg({ type: 'error', text: 'กรุณาคลิกเลือกวันที่บนแผงปฏิทินก่อนครับ' });
      return;
    }

    setEventLoading(true);
    setEventStatusMsg(null);

    try {
      let uploadedImageUrl = '';

      if (imageFile && eventType === 'concert') {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${shopSlug}-${eventDate}-${Math.floor(1000 + Math.random() * 9000)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-posters')
          .upload(filePath, imageFile, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('event-posters')
          .getPublicUrl(filePath);

        uploadedImageUrl = urlData.publicUrl;
      }

      const eventData = {
        shop_id: shopSlug,
        event_date: eventDate,
        event_type: eventType,
        title: eventType === 'concert' ? eventTitle : 'วันบริการปกติ',
        price: eventType === 'concert' ? eventPrice : 0,
        perks_note: eventType === 'concert' ? perksNote : 'จองฟรี ไม่มีค่าบริการ',
        image_url: eventType === 'concert' ? uploadedImageUrl : null,
      };

      const { error: dbError = null } = await supabase
        .from('shop_events')
        .upsert([eventData], { onConflict: 'shop_id,event_date' });

      if (dbError) throw dbError;

      setEventStatusMsg({ type: 'success', text: `🎉 ตั้งค่าโหมด ${eventType === 'concert' ? 'วันคอนเสิร์ต' : 'วันปกติ'} เรียบร้อยแล้ว` });
      await loadEventsData(); 

      if (eventType === 'concert') {
        setEventTitle('');
        setPerksNote('');
        setImageFile(null);
        setImagePreview(null);
      }
    } catch (err: any) {
      console.error(err);
      setEventStatusMsg({ type: 'error', text: err.message || 'ระบบบันทึกข้อมูลขัดข้อง กรุณาลองใหม่อีกครั้ง' });
    } finally { 
      setEventLoading(false);
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReport(true);
    try {
      const response = await fetch('/api/logs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSystem: `USER_REPORT: ${shopName}`,
          errorCode: `รายงานปัญหาจากผู้ใช้งาน monitor (${reportForm.issueType})`,
          errorMessage: reportForm.details
        })
      });
      if (response.ok) {
        alert('ส่งสัญญาณรายงานปัญหาไปยังศูนย์ประมวลผลเรียบร้อยครับ!');
        setReportForm({ issueType: 'ระบบจองขัดข้อง', details: '' });
        setIsReportModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingReport(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      const matchesZone = zone === 'ALL' || b.table_number?.startsWith(`${zone}-`);
      if (!matchesZone) return false;
      if (b.status === 'pending') return true;
      const liveStatus = deriveStatus(b);
      if (liveStatus === 'past' && !showPast && !q) return false;
      if (q) {
        return (
          b.customer_name?.toLowerCase().includes(q) ||
          b.booking_code?.toLowerCase().includes(q) ||
          b.phone?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, query, zone, showPast]);

  const totalRevenue = useMemo(() => {
    return bookings.reduce((sum, b) => {
      if (b.status === 'pending' || b.status === 'no_show') return sum;
      const priceAmount = eventsMap[b.booking_date]?.price || 0;
      return sum + priceAmount;
    }, 0);
  }, [bookings, eventsMap]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('ไม่มีข้อมูลในหน้าฟีดให้ดาวน์โหลดในขณะนี้ครับ');
      return;
    }
    const headers = ['วันที่จอง', 'เวลานัดหมาย', 'รหัสใบจอง', 'ชื่อลูกค้า', 'เบอร์โทรศัพท์', 'รหัสโต๊ะ', 'จำนวนแขก', 'สถานะคิว', 'ค่าบัตรแพ็กเกจ'];
    const rows = filtered.map((b) => {
      let statusText = 'รอเช็คอิน';
      if (b.status === 'pending') statusText = 'รอชำระเงิน';
      else if (b.status === 'checked_in') statusText = 'มาแล้ว';
      else if (b.status === 'no_show') statusText = 'ไม่มา (No Show)';
      const priceAmount = eventsMap[b.booking_date]?.price || 0;

      return [b.booking_date, (b.booking_time || '').slice(0, 5), b.booking_code, `"${b.customer_name?.replace(/"/g, '""')}"`, `="${b.phone}"`, b.table_number, b.guests_count, statusText, `${priceAmount} บาท`];
    });

    const csvContent = ['\uFEFF' + headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Report_Monitor_${shopSlug}_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof bookings> = {};
    filtered.forEach((b) => {
      const dateStr = b.booking_date || 'ไม่ระบุวันที่';
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(b);
    });
    return groups;
  }, [filtered]);

  const sortedDates = useMemo(() => Object.keys(groupedByDate).sort(), [groupedByDate]);

  const tonightCount = useMemo(
    () => bookings.filter((b) => deriveStatus(b) === 'tonight' && b.status !== 'no_show' && b.status !== 'pending').length,
    [bookings]
  );

  if (!shopExists) return notFound();

  // ⏳ หน้าจอกำลังโหลดเช็คสิทธิ์ Auth ด่านแรกสุด
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: THEME.bg }}>
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin mx-auto" style={{ color: THEME.pink }} />
          <p className="text-sm font-medium" style={{ color: THEME.muted }}>กำลังตรวจสอบสิทธิ์การเข้าถึงระบบควบคุม...</p>
        </div>
      </div>
    );
  }

  // 🔒 รันหน้าจอล็อกอิน (Login หน้าต่างมาสเตอร์) ถ้ายังไม่มีเซสชันในระบบ
  if (!session) {
    return (
      <div className="min-h-screen w-full font-sans flex items-center justify-center p-4 relative" style={{ backgroundColor: THEME.bg, color: THEME.text }}>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full blur-[140px]" style={{ backgroundColor: `${THEME.pink}12` }} />
          <div className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full blur-[130px]" style={{ backgroundColor: `${THEME.purple}12` }} />
        </div>

        <div className="w-full max-w-md p-6 sm:p-8 border rounded-3xl z-10 shadow-2xl transition-all" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
          <div className="text-center space-y-1.5 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto border" style={{ borderColor: `${THEME.pink}30` }}>
              <Lock size={22} style={{ color: THEME.pink }} />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Live Reservation Gate</h2>
            <p className="text-xs" style={{ color: THEME.muted }}>กรุณาล็อกอินเข้าสู่ระบบเพื่อเข้าใช้งานแผงควบคุมหน้าร้าน</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300">อีเมลผู้ใช้งาน</label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-4 text-slate-500" />
                <input 
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  className="w-full bg-black/40 border rounded-xl pl-11 pr-4 h-11 text-white outline-none focus:border-pink-500 text-sm transition-all"
                  style={{ borderColor: THEME.border }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300">รหัสผ่านหลังบ้าน</label>
              <div className="relative flex items-center">
                <Hash size={16} className="absolute left-4 text-slate-500" />
                <input 
                  type="password" required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border rounded-xl pl-11 pr-4 h-11 text-white outline-none focus:border-pink-500 text-sm transition-all"
                  style={{ borderColor: THEME.border }}
                />
              </div>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl border flex items-center gap-2 text-xs bg-red-500/10 border-red-500/30 text-red-400">
                <AlertCircle size={15} className="shrink-0" />
                <span className="font-medium">{authError}</span>
              </div>
            )}

            <button
              type="submit" disabled={isLoggingIn}
              className="w-full h-11 rounded-xl font-bold text-black transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: THEME.gold, boxShadow: `0 4px 15px rgba(229, 184, 66, 0.2)` }}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  กำลังยืนยันตัวตน...
                </>
              ) : 'เข้าสู่ระบบควบคุมคิว'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 🟢 หากผ่านการ Auth เรียบร้อย ระบบจะกางหน้าจอมอนิเตอร์ตัวจริงออกมาให้ทำงานทันที
  return (
    <div className="min-h-screen w-full font-sans select-none" style={{ backgroundColor: THEME.bg, color: THEME.text }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full blur-[140px]" style={{ backgroundColor: `${THEME.pink}0A` }} />
        <div className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full blur-[130px]" style={{ backgroundColor: `${THEME.purple}0A` }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-800/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: THEME.pink, boxShadow: `0 0 12px ${THEME.pink}` }} />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: THEME.pink }}>
                21st Live Reservation Controller
              </span>
            </div>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white">{shopName}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => { setIsEventModalOpen(true); setEventStatusMsg(null); }}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition-all active:scale-95 text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20"
            >
              <Music size={14} />
              จัดการวันคอนเสิร์ต
            </button>

            <button
              type="button"
              onClick={handleToggleBookingStatus}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition-all active:scale-95"
              style={{
                backgroundColor: isBookingOpen ? 'rgba(0, 245, 212, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                borderColor: isBookingOpen ? 'rgba(0, 245, 212, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isBookingOpen ? THEME.mint : '#F87171',
              }}
            >
              <span className={`h-2 w-2 rounded-full ${isBookingOpen ? 'animate-pulse bg-[#00F5D4]' : 'bg-red-500'}`} />
              {isBookingOpen ? 'เปิดรับจองออนไลน์ปกติ' : 'ปิดระบบรับคิวชั่วคราว'}
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition-all active:scale-95 text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
            >
              <AlertTriangle size={14} />
              รายงานปัญหา
            </button>

            {/* 🚪 [เพิ่มปุ่มใหม่] ปุ่มออกจากระบบรักษาความปลอดภัยคุมร้าน */}
            <button
              type="button"
              onClick={handleLogoutClick}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition-all active:scale-95 text-gray-400 border-slate-800 bg-black/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
            >
              <LogOut size={14} />
              ออกจากระบบ
            </button>

            <div className="flex items-center gap-2.5 bg-black/40 border rounded-xl px-4 py-2" style={{ borderColor: THEME.border }}>
              <Radio size={14} className="animate-pulse" style={{ color: THEME.pink }} />
              <div className="text-left">
                <p className="font-mono text-[9px] uppercase tracking-widest font-bold leading-none" style={{ color: THEME.pink }}>STREAM LIVE</p>
                <p className="font-mono text-xs font-semibold mt-0.5" style={{ color: THEME.text }}>Sync: {lastSync}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Stat Ribbon */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill icon={CalendarDays} label="Total Bookings" value={`${bookings.length} คิว`} accent={THEME.text} />
          <StatPill icon={CircleDot} label="Active Tonight" value={`${tonightCount} โต๊ะ`} accent={THEME.mint} />
          <StatPill icon={Coins} label="Concert Ticket Revenue" value={`${totalRevenue.toLocaleString()} ฿`} accent={THEME.gold} />
          <StatPill
            icon={Users}
            label="Guests Inbound"
            value={`${bookings
              .filter((b) => deriveStatus(b) === 'tonight' && b.status !== 'no_show' && b.status !== 'pending')
              .reduce((sum, b) => sum + (b.guests_count || 0), 0)} ท่าน`}
            accent="#8B9DFF"
          />
        </div>

        {/* Filters Controls */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2.5 rounded-xl px-4 py-3 bg-black/20 border" style={{ borderColor: THEME.border }}>
            <Search size={18} style={{ color: THEME.muted }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า / รหัสจอง / เบอร์โทร..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600 text-white"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => { setShowPast(!showPast); }}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border transition-all active:scale-95"
              style={{
                backgroundColor: showPast ? `${THEME.purple}1A` : 'transparent',
                borderColor: showPast ? THEME.purple : THEME.border,
                color: showPast ? THEME.purple : THEME.text,
              }}
            >
              <History size={16} />
              <span>ประวัติอดีต</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/50">
                {showPast ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold border transition-all active:scale-95 bg-transparent hover:bg-white/5"
              style={{ borderColor: THEME.border, color: THEME.mint }}
            >
              <Download size={16} />
              <span>Export CSV Report</span>
            </button>

            <div className="relative flex items-center rounded-xl bg-black/20 border" style={{ borderColor: THEME.border }}>
              <Filter size={16} className="pointer-events-none absolute left-4" style={{ color: THEME.muted }} />
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as ZoneId)}
                className="h-full cursor-pointer appearance-none bg-transparent py-3 pl-11 pr-10 text-sm font-medium outline-none text-white"
              >
                {ZONES.map((z) => (
                  <option key={z.id} value={z.id} style={{ backgroundColor: THEME.card }}>
                    {z.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} />
            </div>
          </div>
        </div>

        {/* Main Feed */}
        <main className="mt-6">
          {error && <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium bg-red-950 border border-red-500 text-red-300">{error}</div>}

          {loading && bookings.length === 0 ? (
            <LoadingGrid />
          ) : filtered.length === 0 ? (
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
                      
                      {dayEvent && (
                        <span 
                          className="text-[11px] px-2.5 py-0.5 rounded-md font-bold border font-sans animate-pulse"
                          style={{ backgroundColor: `${THEME.pink}10`, borderColor: `${THEME.pink}40`, color: THEME.pink }}
                        >
                          🎵 โหมดอีเวนต์: {dayEvent.title} (บัตร {dayEvent.price.toLocaleString()}.-)
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
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* 🔮 Pop-up หลังบ้านจัดการคอนเสิร์ตและจัดเก็บเงิน */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-all overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl p-6 border my-8" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: THEME.border }}>
              <div className="flex items-center gap-2">
                <Music style={{ color: THEME.pink }} size={20} />
                <h2 className="text-xl font-bold tracking-tight text-white">ตั้งค่าปฏิทินกิจกรรมวันคอนเสิร์ต</h2>
              </div>
              <button onClick={() => { setIsEventModalOpen(false); }} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEventSubmit} className="space-y-5 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* แผงปฏิทิน Custom คมชัด */}
                <div className="space-y-3 p-3 bg-black/30 rounded-2xl border" style={{ borderColor: THEME.border }}>
                  <div className="flex items-center justify-between px-1">
                    <span className="font-bold text-sm text-white">{monthNames[viewMonth]} {viewYear + 543}</span>
                    <div className="flex gap-1">
                      <button 
                        type="button" 
                        onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else { setViewMonth(viewMonth - 1); } }} 
                        className="p-1 text-xs font-bold text-slate-400 hover:text-white border border-slate-800 rounded bg-black/20"
                      >
                        ◀
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else { setViewMonth(viewMonth + 1); } }} 
                        className="p-1 text-xs font-bold text-slate-400 hover:text-white border border-slate-800 rounded bg-black/20"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400">
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d}>{d}</div>)}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center font-mono">
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} />;
                      
                      const checkDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = eventDate === checkDateStr;

                      return (
                        <button
                          key={`day-${day}`}
                          type="button"
                          onClick={() => selectDateHandler(day)}
                          className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                            isSelected 
                              ? 'bg-pink-500 text-white shadow-md' 
                              : 'text-gray-200 hover:bg-white/10 border border-transparent'
                          }`}
                          style={{ backgroundColor: isSelected ? THEME.pink : '' }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 text-center border-t pt-2 text-xs font-medium text-slate-400" style={{ borderColor: THEME.border }}>
                    วันที่เลือก: {eventDate ? <span className="text-white font-bold underline font-mono">{eventDate}</span> : <span className="text-amber-400">กรุณาคลิกเลือกบนปฏิทิน</span>}
                  </div>
                </div>

                {/* ฝั่งขวา: รายละเอียดประเภทงานกิจกรรม */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono mb-1.5 uppercase tracking-wider text-slate-300">ประเภทของวันกิจกรรม</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-black/30 p-1 rounded-xl border h-11 items-center" style={{ borderColor: THEME.border }}>
                      <button
                        type="button" onClick={() => { setEventType('normal'); }}
                        className="h-8 rounded-lg font-bold text-xs transition-all"
                        style={{ backgroundColor: eventType === 'normal' ? THEME.purple : 'transparent', color: 'white' }}
                      >
                        วันปกติ (ฟรี)
                      </button>
                      <button
                        type="button" onClick={() => { setEventType('concert'); }}
                        className="h-8 rounded-lg font-bold text-xs transition-all"
                        style={{ backgroundColor: eventType === 'concert' ? THEME.pink : 'transparent', color: 'white' }}
                      >
                        🚀 คอนเสิร์ต
                      </button>
                    </div>
                  </div>

                  {eventType === 'concert' && (
                    <div className="space-y-4 pt-1 animate-fade-in">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-gray-300">ชื่อคอนเสิร์ต / ศิลปิน</label>
                          <input 
                            type="text" placeholder="e.g. Three Man Down Live"
                            value={eventTitle} onChange={(e) => { setEventTitle(e.target.value); }}
                            className="w-full bg-black/20 border rounded-xl px-4 h-11 text-white outline-none focus:border-pink-500"
                            style={{ borderColor: THEME.border }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-gray-300">ราคาค่าล็อกบัตรโต๊ะ (บาท)</label>
                          <div className="relative flex items-center">
                            <DollarSign size={15} className="absolute left-3.5 text-amber-400" />
                            <input 
                              type="number"
                              value={eventPrice} onChange={(e) => { setEventPrice(Number(e.target.value)); }}
                              className="w-full bg-black/20 border rounded-xl pl-9 pr-4 h-11 text-white outline-none focus:border-pink-500 font-mono"
                              style={{ borderColor: THEME.border }}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-300 flex items-center gap-1"><FileText size={13} /> รายละเอียดของแถม</label>
                        <textarea
                          rows={3} placeholder="ตั๋วเข้างานได้ 4 ท่าน ได้มิกเซอร์และเหล้าฟรี..."
                          value={perksNote} onChange={(e) => { setPerksNote(e.target.value); }}
                          className="w-full bg-black/20 border rounded-xl p-3 text-white outline-none focus:border-pink-500 text-xs leading-relaxed resize-none"
                          style={{ borderColor: THEME.border }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* กล่องอัปโหลดรูปภาพย้ายลงมาอยู่ตรงนี้ กางเต็มพื้นที่ 100% */}
              {eventType === 'concert' && (
                <div className="animate-fade-in mt-2">
                  <label className="block text-xs font-semibold mb-1.5 text-gray-300 flex items-center gap-1">
                    <ImageIcon size={13} /> รูปภาพโปสเตอร์ศิลปิน (แนะนำสัดส่วนแนวนอน)
                  </label>
                  <div 
                    className="relative h-48 w-full border border-dashed rounded-xl flex flex-col items-center justify-center bg-black/20 cursor-pointer overflow-hidden group transition-all" 
                    style={{ borderColor: THEME.border }}
                  >
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />
                    
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-0">
                          <ImageIcon size={24} className="text-white mb-1.5" />
                          <p className="text-xs font-bold text-white">คลิกเพื่อเปลี่ยนรูปโปสเตอร์</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-3 bg-pink-500/10 rounded-full mb-2.5">
                          <ImageIcon size={24} className="text-pink-500" />
                        </div>
                        <p className="text-xs font-bold text-gray-200">คลิกเลือกหรือลากรูปภาพมาวาง</p>
                        <p className="text-[10px] text-slate-500 mt-1">คลิกอัปโหลดเพื่อแสดงภาพแบนเนอร์กว้างเต็มกล่อง</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {eventStatusMsg && (
                <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${eventStatusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {eventStatusMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span className="font-medium">{eventStatusMsg.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 font-bold border-t border-slate-800" style={{ borderColor: THEME.border }}>
                <button type="button" onClick={() => { setIsEventModalOpen(false); }} className="px-5 py-2.5 text-xs rounded-xl border text-white border-slate-700">ปิดหน้าต่าง</button>
                <button type="submit" disabled={eventLoading} className="px-5 py-2.5 text-xs rounded-xl text-black flex items-center gap-1.5 font-bold" style={{ backgroundColor: THEME.gold }}>
                  {eventLoading ? <Loader2 size={14} className="animate-spin" /> : 'อัปเดตโหมดปฏิทิน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal รายงานปัญหา */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div className="w-full max-w-md rounded-2xl p-6 border" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle style={{ color: THEME.gold }} size={20} />
              <h2 className="text-xl font-bold tracking-tight text-white">รายงานปัญหาคิวจองระบบ</h2>
            </div>
            <form onSubmit={handleSendReport} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-mono mb-1.5 uppercase tracking-wider">สาขาที่รายงาน</label>
                <div className="w-full px-3 py-2.5 rounded-xl border text-sm font-bold bg-black/40 text-slate-400 border-slate-800" style={{ borderColor: THEME.border }}>🏢 {shopName}</div>
              </div>
              <div>
                <label className="block text-xs font-mono mb-1.5 uppercase tracking-wider">ประเภทปัญหา</label>
                <div className="relative flex items-center rounded-xl bg-black/40 border" style={{ borderColor: THEME.border }}>
                  <select 
                    value={reportForm.issueType}
                    onChange={e => setReportForm({...reportForm, issueType: e.target.value})}
                    className="w-full cursor-pointer appearance-none bg-transparent py-2.5 pl-3 pr-10 text-sm outline-none text-white"
                  >
                    <option value="UI Bug / หน้าเว็บเพี้ยน" style={{ backgroundColor: THEME.card }}>UI Bug / หน้าเว็บเพี้ยน</option>
                    <option value="ระบบจองขัดข้อง" style={{ backgroundColor: THEME.card }}>ระบบจองขัดข้อง</option>
                    <option value="ข้อมูลไม่ตรงความเป็นจริง" style={{ backgroundColor: THEME.card }}>ข้อมูลไม่ตรงความเป็นจริง</option>
                    <option value="อื่นๆ" style={{ backgroundColor: THEME.card }}>อื่นๆ</option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-4" style={{ color: THEME.muted }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono mb-1.5 uppercase tracking-wider">รายละเอียดของปัญหา</label>
                <textarea 
                  rows={4} required
                  value={reportForm.details}
                  onChange={e => setReportForm({...reportForm, details: e.target.value})}
                  placeholder="กรุณาระบุสิ่งที่เกิดขึ้นอย่างละเอียด..."
                  className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm bg-black/20 resize-none text-white"
                  style={{ borderColor: THEME.border }}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 font-bold">
                <button type="button" onClick={() => { setIsReportModalOpen(false); }} className="px-4 py-2 text-xs rounded-xl border hover:bg-white/5 transition-all text-white border-slate-700">ยกเลิก</button>
                <button type="submit" disabled={isSendingReport} className="px-4 py-2 text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50 text-black font-bold" style={{ backgroundColor: THEME.mint }}>🚀 ส่งข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-black/20 border" style={{ borderColor: THEME.border }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}15`, color: accent }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-[10px] uppercase tracking-widest" style={{ color: THEME.muted }}>{label}</p>
        <p className="text-xl sm:text-2xl font-bold leading-tight text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function BookingCard({ 
  booking, 
  eventPrice,
  onUpdateStatus 
}: { 
  booking: any;
  eventPrice: number;
  onUpdateStatus: (id: string, nextStatus: 'checked_in' | 'no_show') => Promise<void>;
}) {
  const zone = zoneOf(booking.table_number);
  const derived = deriveStatus(booking);
  let currentMeta = STATUS_META[booking.status] || STATUS_META[derived];

  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[230px]"
      style={{ 
        backgroundColor: THEME.card, 
        border: booking.status === 'checked_in' 
          ? '1px solid rgba(0, 245, 212, 0.3)' 
          : booking.status === 'pending'
            ? `1px solid ${THEME.amber}` 
            : booking.status === 'no_show' 
              ? '1px solid rgba(239, 68, 68, 0.2)' 
              : `1px solid ${THEME.border}`,
        opacity: booking.status === 'no_show' || derived === 'past' ? 0.4 : 1
      }}
    >
      <div>
        <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: booking.status === 'pending' ? THEME.amber : zone.accent }} />

        <div className="flex items-start justify-between">
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-bold"
            style={{ backgroundColor: `${zone.accent}1A`, color: zone.accent }}
          >
            <zone.icon size={13} />
            {booking.table_number}
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${booking.status === 'pending' ? 'animate-ping' : ''}`}
              style={{
                backgroundColor: currentMeta.dot,
                boxShadow: (derived === 'tonight' || booking.status === 'pending') ? `0 0 10px ${currentMeta.dot}` : 'none',
              }}
            />
            <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color: currentMeta.color }}>
              {currentMeta.label}
            </span>
          </div>
        </div>

        <h3 className="mt-4 truncate text-lg font-bold text-white">{booking.customer_name}</h3>

        <div className="mt-1 flex items-center justify-between font-mono text-xs" style={{ color: zone.accent }}>
          <span className="flex items-center gap-1.5"><Hash size={12} /> {booking.booking_code}</span>
          {eventPrice > 0 && booking.status !== 'pending' && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-sans">
              Paid: {eventPrice.toLocaleString()} ฿
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-y-2.5 text-sm" style={{ color: THEME.muted }}>
          <DetailRow icon={CalendarDays} value={booking.booking_date} />
          <DetailRow icon={Clock} value={(booking.booking_time || '').slice(0, 5)} />
          <DetailRow icon={Users} value={`${booking.guests_count} ท่าน`} />
          <DetailRow icon={Phone} value={booking.phone} />
        </div>
      </div>

      {(!booking.status || booking.status === 'confirmed') && derived !== 'past' ? (
        <div className="mt-5 pt-3 flex gap-2 border-t" style={{ borderColor: THEME.border }}>
          <button
            onClick={() => onUpdateStatus(booking.id, 'checked_in')}
            className="flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400"
          >
            <Check size={14} />
            เช็คอินเข้าร้าน
          </button>
          <button
            onClick={() => onUpdateStatus(booking.id, 'no_show')}
            className="flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400"
          >
            <X size={14} />
            No Show
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  return (
    <div className="flex items-center gap-2 truncate">
      <Icon size={14} className="shrink-0 text-slate-600" />
      <span className="truncate text-gray-200">{value || '—'}</span>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex h-44 animate-pulse flex-col justify-between rounded-2xl p-5 bg-slate-900 border border-slate-800">
          <div className="flex justify-between">
            <div className="h-6 w-16 rounded bg-slate-800" />
            <div className="h-4 w-20 rounded bg-slate-800" />
          </div>
          <div className="h-6 w-2/3 rounded bg-slate-800" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-4 rounded bg-slate-800" />
            <div className="h-4 rounded bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasBookings }: { hasBookings: boolean }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl px-6 py-16 text-center" style={{ backgroundColor: THEME.card, border: `1px dashed ${THEME.border}` }}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40" style={{ color: THEME.pink }}>
        {hasBookings ? <Search size={28} /> : <Inbox size={28} />}
      </div>
      <div>
        <p className="text-lg font-bold text-white">{hasBookings ? 'ไม่พบรายการที่ตรงกับการค้นหา' : 'ยังไม่มีรายการจองในระบบ'}</p>
        <p className="mt-1 text-sm" style={{ color: THEME.muted }}>{hasBookings ? 'ลองปรับคำค้นหา เปิดสวิตช์ประวัติย้อนหลัง หรือเปลี่ยนโซนที่นั่งดูอีกครั้ง' : 'รายการจองใหม่จะปรากฏที่นี่โดยอัตโนมัติ'}</p>
      </div>
    </div>
  );
}
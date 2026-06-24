'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { RestaurantBooking } from '@/types/database';
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
  type LucideIcon,
} from 'lucide-react';

/* ----------------------------------------------------------------------------
 * Premium Nightlife Theme tokens
 * -------------------------------------------------------------------------- */
const THEME = {
  bg: '#121318',
  card: '#1F2029',
  border: '#2E303C',
  amber: '#FBBC05',
  mint: '#00F5D4',
  text: '#E0E0E0',
  muted: '#A0A0A0',
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
  { id: 'V', label: 'VIP Room', prefix: 'V-', icon: Crown, accent: THEME.amber },
  { id: 'G', label: 'Terrace / Garden', prefix: 'G-', icon: Trees, accent: THEME.mint },
  { id: 'A', label: 'Main Stage', prefix: 'A-', icon: Music, accent: '#8B9DFF' },
];

function zoneOf(tableNumber: string): ZoneMeta {
  const match = ZONES.find((z) => z.prefix && tableNumber?.startsWith(z.prefix));
  return match ?? ZONES[0];
}

type LiveStatus = 'tonight' | 'upcoming' | 'past';

function deriveStatus(b: RestaurantBooking): LiveStatus {
  const stamp = new Date(`${b.booking_date}T${(b.booking_time || '00:00:00').slice(0, 8)}`);
  if (Number.isNaN(stamp.getTime())) return 'upcoming';

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (b.booking_date === today) {
    return stamp.getTime() + 90 * 60 * 1000 < now.getTime() ? 'past' : 'tonight';
  }
  return stamp.getTime() < now.getTime() ? 'past' : 'upcoming';
}

const STATUS_META: Record<LiveStatus, { label: string; color: string; dot: string }> = {
  tonight: { label: 'TONIGHT', color: THEME.mint, dot: THEME.mint },
  upcoming: { label: 'UPCOMING', color: THEME.amber, dot: THEME.amber },
  past: { label: 'COMPLETED', color: THEME.muted, dot: '#4A4C58' },
};

export default function MonitorPage() {
  const params = useParams<{ shop_slug: string }>();
  const shopSlug = (params?.shop_slug as string) || 'default-shop';

  const shopName = useMemo(() => {
    if (shopSlug === 'default-shop') return 'LOVE RESTAURANT';
    return shopSlug.split('-').map((w) => w.toUpperCase()).join(' ');
  }, [shopSlug]);

  const [bookings, setBookings] = useState<(RestaurantBooking & { status?: 'confirmed' | 'checked_in' | 'no_show' })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>('—');

  const [query, setQuery] = useState('');
  const [zone, setZone] = useState<ZoneId>('ALL');
  const [showPast, setShowPast] = useState(false);
  
  const [isBookingOpen, setIsBookingOpen] = useState(true);
  const [shopExists, setShopExists] = useState(true);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ issueType: 'ระบบจองขัดข้อง', details: '' });
  const [isSendingReport, setIsSendingReport] = useState(false);

  // 🛰️ ท่อสตรีมสดที่ 1: ดักจับรายการจองโต๊ะอาหาร (เวอร์ชันอัปเกรด Bypass TypeScript)
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
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
        setLastSync(
          new Date().toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
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
      .channel(`live-monitor:${shopSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_bookings',
          filter: `shop_id=eq.${shopSlug}`,
        },
        (payload) => {
          if (!active) return;
          console.log('Realtime Event Detected:', payload);

          // 🎯 แคสต์ Type หลบตา TypeScript Compiler ป้องกันคอมไพล์พังบนเวิร์กเกอร์ Vercel
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

          setLastSync(
            new Date().toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [shopSlug]);

  // 🛰️ ท่อสตรีมสดที่ 2: ดักจับสวิตช์เปิด/ปิดร้านจากตาราง shop_settings
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

        if (active && data) {
          setIsBookingOpen(data.is_booking_open);
        }
      } catch (err) {
        console.error('Failed to load shop settings:', err);
      }
    };

    loadShopSettings();

    const settingsChannel = supabase
      .channel(`shop-settings:${shopSlug}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shop_settings',
          filter: `shop_id=eq.${shopSlug}`,
        },
        (payload) => {
          const newSettings = payload.new as any;
          if (active && newSettings) setIsBookingOpen(newSettings.is_booking_open);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(settingsChannel);
    };
  }, [shopSlug]);

  const handleUpdateStatus = async (bookingId: string, nextStatus: 'checked_in' | 'no_show') => {
    try {
      const { error: patchError } = await (supabase.from('restaurant_bookings') as any)
        .update({ status: nextStatus })
        .eq('id', bookingId);

      if (patchError) throw patchError;
    } catch (err) {
      console.error('Failed to update booking status:', err);
      alert('เกิดข้อผิดพลาดหลังบ้าน ไม่สามารถเปลี่ยนสถานะคิวได้ครับบอส');
    }
  };

  const handleToggleBookingStatus = async () => {
    const nextState = !isBookingOpen;
    setIsBookingOpen(nextState);

    try {
      const { error: upsertError } = await supabase
        .from('shop_settings')
        .upsert({ shop_id: shopSlug, is_booking_open: nextState });

      if (upsertError) throw upsertError;
    } catch (err) {
      console.error('Failed to toggle booking status:', err);
      alert('ไม่สามารถอัปเดตสเตตัสร้านได้ กรุณาลองใหม่อีกครั้งครับบอส');
      setIsBookingOpen(!nextState);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      const matchesZone = zone === 'ALL' || b.table_number?.startsWith(`${zone}-`);
      if (!matchesZone) return false;

      const status = deriveStatus(b);
      if (status === 'past' && !showPast && !q) return false;

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

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('ไม่มีข้อมูลในหน้าฟีดให้ดาวน์โหลดในขณะนี้ครับบอส');
      return;
    }

    const headers = ['วันที่จอง', 'เวลานัดหมาย', 'รหัสใบจอง', 'ชื่อลูกค้า', 'เบอร์โทรศัพท์', 'รหัสโต๊ะ', 'จำนวนแขก (ท่าน)', 'สถานะเช็คอิน'];

    const rows = filtered.map((b) => {
      const derived = deriveStatus(b);
      let statusText = 'รอเช็คอิน';
      if (b.status === 'checked_in') statusText = 'มาแล้ว';
      else if (b.status === 'no_show') statusText = 'ไม่มา (No Show)';
      else if (derived === 'past') statusText = 'เลยเวลานัดหมาย';

      return [
        b.booking_date,
        (b.booking_time || '').slice(0, 5),
        b.booking_code,
        `"${b.customer_name?.replace(/"/g, '""')}"`,
        `="${b.phone}"`,
        b.table_number,
        b.guests_count,
        statusText
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Report_${shopSlug}_${dateStamp}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort();
  }, [groupedByDate]);

  const tonightCount = useMemo(
    () => bookings.filter((b) => deriveStatus(b) === 'tonight' && b.status !== 'no_show').length,
    [bookings]
  );

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReport(true);
    try {
      const response = await fetch('/api/logs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSystem: `USER_REPORT: ${shopName}`,
          errorCode: `รายงานปัญหาจากผู้ใช้งาน (${reportForm.issueType})`,
          errorMessage: reportForm.details
        })
      });

      if (response.ok) {
        alert('ส่งสัญญาณรายงานปัญหาไปยังศูนย์ประมวลผล AI เรียบร้อยครับบอส!');
        setReportForm({ issueType: 'ระบบจองขัดข้อง', details: '' });
        setIsReportModalOpen(false);
      } else {
        alert('สัญญาณขัดข้อง ไม่สามารถส่งข้อมูลหา AI ได้ในขณะนี้');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่ง Telemetry Report');
    } finally {
      setIsSendingReport(false);
    }
  };

  if (!shopExists) {
    return notFound();
  }

  return (
    <div
      className="min-h-screen w-full font-sans select-none"
      style={{ backgroundColor: THEME.bg, color: THEME.text }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full blur-[140px]" style={{ backgroundColor: `${THEME.mint}14` }} />
        <div className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full blur-[130px]" style={{ backgroundColor: `${THEME.amber}14` }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: THEME.mint, boxShadow: `0 0 12px ${THEME.mint}` }} />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: THEME.mint }}>
                Live Reservation Monitor
              </span>
            </div>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight" style={{ color: THEME.text }}>
              {shopName}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleBookingStatus}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition-all active:scale-95"
              style={{
                backgroundColor: isBookingOpen ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                borderColor: isBookingOpen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                color: isBookingOpen ? THEME.mint : '#F87171',
              }}
            >
              <span className={`h-2 w-2 rounded-full ${isBookingOpen ? 'animate-pulse bg-[#00F5D4]' : 'bg-red-500'}`} />
              {isBookingOpen ? 'เปิดรับจองออนไลน์' : 'ปิดรับจองชั่วคราว'}
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border transition-all active:scale-95 text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
            >
              <AlertTriangle size={16} />
              รายงานปัญหา
            </button>

            <div className="flex items-center gap-2.5 bg-black/30 border rounded-xl px-4 py-2" style={{ borderColor: THEME.border }}>
              <Radio size={14} className="text-[#00F5D4] animate-pulse" />
              <div className="text-left">
                <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 font-bold leading-none">REALTIME LIVE</p>
                <p className="font-mono text-xs font-semibold mt-0.5" style={{ color: THEME.text }}>Sync: {lastSync}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Stat ribbon */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill icon={CalendarDays} label="Total Reservations" value={bookings.length} accent={THEME.text} />
          <StatPill icon={CircleDot} label="Active Tonight" value={tonightCount} accent={THEME.mint} />
          <StatPill icon={Filter} label="In View" value={filtered.length} accent={THEME.amber} />
          <StatPill
            icon={Users}
            label="Guests Tonight"
            value={bookings
              .filter((b) => deriveStatus(b) === 'tonight' && b.status !== 'no_show')
              .reduce((sum, b) => sum + (b.guests_count || 0), 0)}
            accent="#8B9DFF"
          />
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div
            className="flex flex-1 items-center gap-2.5 rounded-xl px-4 py-3"
            style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}` }}
          >
            <Search size={18} style={{ color: THEME.muted }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า / รหัสจอง / เบอร์โทร..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#6B6D7A]"
              style={{ color: THEME.text }}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowPast(!showPast)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border transition-all active:scale-95"
              style={{
                backgroundColor: showPast ? `${THEME.amber}1A` : THEME.card,
                borderColor: showPast ? THEME.amber : THEME.border,
                color: showPast ? THEME.amber : THEME.text,
              }}
            >
              <History size={16} style={{ color: showPast ? THEME.amber : THEME.muted }} />
              <span className="hidden sm:inline">ประวัติย้อนหลัง</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/30">
                {showPast ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold border transition-all active:scale-95 bg-transparent hover:bg-white/5"
              style={{
                borderColor: THEME.border,
                color: THEME.mint,
              }}
            >
              <Download size={16} style={{ color: THEME.mint }} />
              <span>Export CSV</span>
            </button>

            <div
              className="relative flex items-center rounded-xl"
              style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}` }}
            >
              <Filter size={16} className="pointer-events-none absolute left-4" style={{ color: THEME.muted }} />
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as ZoneId)}
                className="h-full cursor-pointer appearance-none bg-transparent py-3 pl-11 pr-10 text-sm font-medium outline-none"
                style={{ color: THEME.text }}
              >
                {ZONES.map((z) => (
                  <option key={z.id} value={z.id} style={{ backgroundColor: THEME.card, color: THEME.text }}>
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
          {error && (
            <div
              className="mb-4 rounded-xl px-4 py-3 text-sm font-medium"
              style={{ backgroundColor: '#3A1F22', border: '1px solid #F87171', color: '#FCA5A5' }}
            >
              {error}
            </div>
          )}

          {loading && bookings.length === 0 ? (
            <LoadingGrid />
          ) : filtered.length === 0 ? (
            <EmptyState hasBookings={bookings.length > 0} />
          ) : (
            <div className="space-y-10">
              {sortedDates.map((dateKey) => {
                const isToday = dateKey === new Date().toISOString().split('T')[0];
                const isPastDate = dateKey < new Date().toISOString().split('T')[0];
                return (
                  <div key={dateKey} className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: THEME.border }}>
                      <CalendarDays size={16} style={{ color: isToday ? THEME.mint : isPastDate ? THEME.muted : THEME.amber }} />
                      <h2 className="text-sm font-mono font-bold tracking-wider" style={{ color: isPastDate ? THEME.muted : THEME.text }}>
                        {isToday ? `🔥 วันนี้ (${dateKey})` : `⏳ ประวัติอดีต (${dateKey})`}
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-slate-400">
                        {groupedByDate[dateKey].length} คิว
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {groupedByDate[dateKey].map((b) => (
                        <BookingCard 
                          key={b.id} 
                          booking={b} 
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

      {/* Modal รายงานปัญหา */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div className="w-full max-w-md rounded-2xl p-6 border" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle style={{ color: THEME.amber }} size={20} />
              <h2 className="text-xl font-bold tracking-tight" style={{ color: THEME.text }}>รายงานปัญหาจากผู้ใช้งาน</h2>
            </div>
            <form onSubmit={handleSendReport} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-mono mb-1.5 uppercase tracking-wider" style={{ color: THEME.muted }}>ร้านที่รายงานระบบ</label>
                <div className="w-full px-3 py-2.5 rounded-xl border text-sm font-bold bg-black/40 text-slate-400 cursor-not-allowed select-none" style={{ borderColor: THEME.border }}>
                  🏢 {shopName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono mb-1.5 uppercase tracking-wider" style={{ color: THEME.muted }}>ประเภทปัญหา</label>
                <div className="relative flex items-center rounded-xl" style={{ border: `1px solid ${THEME.border}`, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <select 
                    value={reportForm.issueType}
                    onChange={e => setReportForm({...reportForm, issueType: e.target.value})}
                    className="w-full cursor-pointer appearance-none bg-transparent py-2.5 pl-3 pr-10 text-sm outline-none"
                    style={{ color: THEME.text }}
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
                <label className="block text-xs font-mono mb-1.5 uppercase tracking-wider" style={{ color: THEME.muted }}>รายละเอียดของปัญหา</label>
                <textarea 
                  rows={4} required
                  value={reportForm.details}
                  onChange={e => setReportForm({...reportForm, details: e.target.value})}
                  placeholder="กรุณาระบุสิ่งที่เกิดขึ้นอย่างละเอียด..."
                  className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-all focus:border-blue-500 bg-black/20 resize-none"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 font-bold">
                <button 
                  type="button" 
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-xl border hover:bg-white/5 transition-all"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={isSendingReport}
                  className="px-4 py-2 text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: THEME.mint, color: THEME.bg }}
                >
                  {isSendingReport ? '🛰️ SENDING LOG...' : '🚀 ส่งข้อมูลเข้า AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}` }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}1A`, color: accent }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-[10px] uppercase tracking-widest" style={{ color: THEME.muted }}>{label}</p>
        <p className="text-2xl font-bold leading-tight" style={{ color: THEME.text }}>{value}</p>
      </div>
    </div>
  );
}

function BookingCard({ 
  booking, 
  onUpdateStatus 
}: { 
  booking: RestaurantBooking & { status?: 'confirmed' | 'checked_in' | 'no_show' };
  onUpdateStatus: (id: string, nextStatus: 'checked_in' | 'no_show') => Promise<void>;
}) {
  const zone = zoneOf(booking.table_number);
  const derived = deriveStatus(booking);
  
  let currentMeta = STATUS_META[derived];
  if (booking.status === 'checked_in') {
    currentMeta = { label: 'มาแล้ว', color: THEME.mint, dot: THEME.mint };
  } else if (booking.status === 'no_show') {
    currentMeta = { label: 'ไม่มา (NO SHOW)', color: '#F87171', dot: '#EF4444' };
  }

  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[220px]"
      style={{ 
        backgroundColor: THEME.card, 
        border: booking.status === 'checked_in' 
          ? '1px solid #10B98140' 
          : booking.status === 'no_show' 
            ? '1px solid #EF444430' 
            : `1px solid ${THEME.border}`,
        opacity: booking.status === 'no_show' || derived === 'past' ? 0.5 : 1
      }}
    >
      <div>
        <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: booking.status === 'no_show' ? '#4A4C58' : zone.accent }} />

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
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: currentMeta.dot,
                boxShadow: derived === 'tonight' && !booking.status ? `0 0 10px ${currentMeta.dot}` : 'none',
              }}
            />
            <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color: currentMeta.color }}>
              {currentMeta.label}
            </span>
          </div>
        </div>

        <h3 className="mt-4 truncate text-lg font-bold" style={{ color: THEME.text }}>
          {booking.customer_name}
        </h3>

        <div className="mt-1 flex items-center gap-1.5 font-mono text-xs" style={{ color: zone.accent }}>
          <Hash size={12} />
          {booking.booking_code}
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
            className="flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 bg-emerald-500/10 hover:bg-emerald-500 hover:text-[#121318] text-emerald-400"
          >
            <Check size={14} />
            มาแล้ว
          </button>
          <button
            onClick={() => onUpdateStatus(booking.id, 'no_show')}
            className="flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400"
          >
            <X size={14} />
            ไม่มา
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  return (
    <div className="flex items-center gap-2 truncate">
      <Icon size={14} className="shrink-0" style={{ color: '#6B6D7A' }} />
      <span className="truncate" style={{ color: THEME.text }}>{value || '—'}</span>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex h-44 animate-pulse flex-col justify-between rounded-2xl p-5" style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}` }}>
          <div className="flex justify-between">
            <div className="h-6 w-16 rounded-lg" style={{ backgroundColor: THEME.border }} />
            <div className="h-4 w-20 rounded" style={{ backgroundColor: THEME.border }} />
          </div>
          <div className="h-6 w-2/3 rounded" style={{ backgroundColor: THEME.border }} />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-4 rounded" style={{ backgroundColor: THEME.border }} />
            <div className="h-4 rounded" style={{ backgroundColor: THEME.border }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasBookings }: { hasBookings: boolean }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl px-6 py-16 text-center" style={{ backgroundColor: THEME.card, border: `1px dashed ${THEME.border}` }}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${THEME.mint}12`, color: THEME.mint }}>
        {hasBookings ? <Search size={28} /> : <Inbox size={28} />}
      </div>
      <div>
        <p className="text-lg font-bold" style={{ color: THEME.text }}>
          {hasBookings ? 'ไม่พบรายการที่ตรงกับการค้นหา' : 'ยังไม่มีรายการจองในระบบ'}
        </p>
        <p className="mt-1 text-sm" style={{ color: THEME.muted }}>
          {hasBookings ? 'ลองปรับคำค้นหา เปิดสวิตช์ประวัติย้อนหลัง หรือเปลี่ยนโซนที่นั่งดูอีกครั้ง' : 'รายการจองใหม่จะปรากฏที่นี่โดยอัตโนมัติ'}
        </p>
      </div>
    </div>
  );
}
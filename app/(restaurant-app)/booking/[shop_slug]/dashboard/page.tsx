'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { RestaurantBooking } from '@/types/database';
import {
  RefreshCw,
  CalendarDays,
  Users,
  TrendingUp,
  Hash,
  Clock,
  Phone,
  Crown,
  Trees,
  Music,
  Inbox,
  LayoutGrid,
  Sparkles,
  ArrowUpDown,
  type LucideIcon,
} from 'lucide-react';

/* ----------------------------------------------------------------------------
 * Premium Nightlife Theme tokens (shared palette with the live monitor)
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

type ZoneId = 'V' | 'G' | 'A' | 'OTHER';

interface ZoneMeta {
  id: ZoneId;
  label: string;
  prefix: string;
  icon: LucideIcon;
  accent: string;
}

const ZONES: ZoneMeta[] = [
  { id: 'V', label: 'VIP Room', prefix: 'V-', icon: Crown, accent: THEME.amber },
  { id: 'G', label: 'Terrace / Garden', prefix: 'G-', icon: Trees, accent: THEME.mint },
  { id: 'A', label: 'Main Stage', prefix: 'A-', icon: Music, accent: '#8B9DFF' },
  { id: 'OTHER', label: 'Unassigned', prefix: '', icon: LayoutGrid, accent: THEME.muted },
];

function zoneOf(tableNumber: string): ZoneMeta {
  const match = ZONES.find((z) => z.prefix && tableNumber?.startsWith(z.prefix));
  return match ?? ZONES[ZONES.length - 1];
}

function sortBookings(rows: RestaurantBooking[], dir: 'asc' | 'desc'): RestaurantBooking[] {
  return [...rows].sort((a, b) => {
    const aKey = `${a.booking_date}T${(a.booking_time || '').slice(0, 8)}`;
    const bKey = `${b.booking_date}T${(b.booking_time || '').slice(0, 8)}`;
    return dir === 'desc' ? bKey.localeCompare(aKey) : aKey.localeCompare(bKey);
  });
}

export default function DashboardPage() {
  const params = useParams<{ shop_slug: string }>();
  const shopSlug = (params?.shop_slug as string) || 'default-shop';

  const shopName = useMemo(
    () => shopSlug.split('-').map((w) => w.toUpperCase()).join(' '),
    [shopSlug]
  );

  const [bookings, setBookings] = useState<RestaurantBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // `reloadKey` re-triggers the fetch effect (mount + manual refresh) without a
  // useCallback called directly inside the effect (which would flag the
  // react-hooks/set-state-in-effect lint rule). All setState happens post-await.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        // Strict tenant isolation: only this shop's rows are ever requested.
        const { data, error: dbError } = await supabase
          .from('restaurant_bookings')
          .select('*')
          .eq('shop_id', shopSlug)
          .order('booking_date', { ascending: false })
          .order('booking_time', { ascending: false });

        if (!active) return;
        if (dbError) throw dbError;

        setBookings((data as RestaurantBooking[]) ?? []);
        setError(null);
      } catch (err) {
        if (!active) return;
        console.error('Dashboard fetch failed:', err);
        setError('ไม่สามารถดึงข้อมูลการจองได้ กรุณาลองโหลดใหม่อีกครั้ง');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [shopSlug, reloadKey]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  /* ---------------------------- Derived metrics --------------------------- */
  const metrics = useMemo(() => {
    const totalGuests = bookings.reduce((sum, b) => sum + (b.guests_count || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const todayCount = bookings.filter((b) => b.booking_date === today).length;

    const byDay = new Map<string, number>();
    bookings.forEach((b) => byDay.set(b.booking_date, (byDay.get(b.booking_date) || 0) + 1));
    let peakDay = '—';
    let peakCount = 0;
    byDay.forEach((count, day) => {
      if (count > peakCount) {
        peakCount = count;
        peakDay = day;
      }
    });

    const avgParty = bookings.length ? (totalGuests / bookings.length).toFixed(1) : '0';

    return { totalGuests, todayCount, peakDay, peakCount, avgParty };
  }, [bookings]);

  const zoneBreakdown = useMemo(() => {
    return ZONES.map((z) => ({
      ...z,
      count: bookings.filter((b) =>
        z.prefix ? b.table_number?.startsWith(z.prefix) : zoneOf(b.table_number).id === 'OTHER'
      ).length,
    }));
  }, [bookings]);

  const sorted = useMemo(() => sortBookings(bookings, sortDir), [bookings, sortDir]);

  return (
    <div className="min-h-screen w-full font-sans" style={{ backgroundColor: THEME.bg, color: THEME.text }}>
      {/* Ambient glow accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/3 h-[420px] w-[420px] rounded-full blur-[150px]"
          style={{ backgroundColor: `${THEME.amber}10` }}
        />
        <div
          className="absolute -bottom-32 -right-24 h-[380px] w-[380px] rounded-full blur-[130px]"
          style={{ backgroundColor: `${THEME.mint}12` }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: THEME.amber }} />
              <span
                className="font-mono text-[11px] font-bold uppercase tracking-[0.3em]"
                style={{ color: THEME.amber }}
              >
                Owner Control Panel
              </span>
            </div>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight" style={{ color: THEME.text }}>
              {shopName}
            </h1>
            <p className="mt-1 text-sm" style={{ color: THEME.muted }}>
              ภาพรวมการจองและสถิติร้านแบบเรียลไทม์
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 self-start rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 sm:self-auto"
            style={{ backgroundColor: THEME.amber, color: THEME.bg }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </header>

        {error && (
          <div
            className="mt-6 rounded-xl px-4 py-3 text-sm font-medium"
            style={{ backgroundColor: '#3A1F22', border: '1px solid #F87171', color: '#FCA5A5' }}
          >
            {error}
          </div>
        )}

        {/* Metric cards */}
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={CalendarDays}
            label="Total Bookings"
            value={loading ? '…' : bookings.length.toLocaleString()}
            accent={THEME.mint}
          />
          <MetricCard
            icon={Users}
            label="Total Guests"
            value={loading ? '…' : metrics.totalGuests.toLocaleString()}
            accent={THEME.amber}
            sub={`เฉลี่ย ${metrics.avgParty} ท่าน/โต๊ะ`}
          />
          <MetricCard
            icon={Clock}
            label="Arriving Today"
            value={loading ? '…' : metrics.todayCount.toLocaleString()}
            accent="#8B9DFF"
          />
          <MetricCard
            icon={TrendingUp}
            label="Peak Day"
            value={loading ? '…' : metrics.peakDay}
            accent={THEME.mint}
            sub={metrics.peakCount > 0 ? `${metrics.peakCount} การจอง` : undefined}
            small
          />
        </section>

        {/* Zone distribution */}
        <section
          className="mt-4 rounded-2xl p-5"
          style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}` }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold" style={{ color: THEME.text }}>
            <LayoutGrid size={16} style={{ color: THEME.muted }} />
            สัดส่วนการจองแยกตามโซนที่นั่ง
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {zoneBreakdown.map((z) => {
              const pct = bookings.length ? Math.round((z.count / bookings.length) * 100) : 0;
              const ZoneIcon = z.icon;
              return (
                <div key={z.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5" style={{ color: THEME.text }}>
                      <ZoneIcon size={14} style={{ color: z.accent }} />
                      {z.label}
                    </span>
                    <span className="font-mono font-bold" style={{ color: z.accent }}>
                      {z.count}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: THEME.border }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: z.accent }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Data table */}
        <section
          className="mt-4 overflow-hidden rounded-2xl"
          style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}` }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${THEME.border}` }}
          >
            <h2 className="text-sm font-bold" style={{ color: THEME.text }}>
              รายการจองทั้งหมด{' '}
              <span style={{ color: THEME.muted }}>({bookings.length})</span>
            </h2>
            <button
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors"
              style={{ backgroundColor: THEME.bg, color: THEME.muted, border: `1px solid ${THEME.border}` }}
            >
              <ArrowUpDown size={13} />
              วันที่ {sortDir === 'desc' ? 'ล่าสุด' : 'เก่าสุด'}
            </button>
          </div>

          {loading && bookings.length === 0 ? (
            <TableSkeleton />
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: `${THEME.amber}12`, color: THEME.amber }}
              >
                <Inbox size={28} />
              </div>
              <p className="text-lg font-bold" style={{ color: THEME.text }}>
                ยังไม่มีข้อมูลการจอง
              </p>
              <p className="text-sm" style={{ color: THEME.muted }}>
                เมื่อมีลูกค้าทำการจอง รายการจะปรากฏในตารางนี้ทันที
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr
                    className="font-mono text-[11px] uppercase tracking-wider"
                    style={{ color: THEME.muted, borderBottom: `1px solid ${THEME.border}` }}
                  >
                    <th className="px-5 py-3 font-semibold">Code</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Date / Time</th>
                    <th className="px-5 py-3 font-semibold">Table</th>
                    <th className="px-5 py-3 text-center font-semibold">Guests</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b, i) => {
                    const zone = zoneOf(b.table_number);
                    const ZoneIcon = zone.icon;
                    return (
                      <tr
                        key={b.id}
                        className="transition-colors hover:bg-white/[0.03]"
                        style={{
                          borderBottom: i === sorted.length - 1 ? 'none' : `1px solid ${THEME.border}`,
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1 font-mono font-bold" style={{ color: THEME.amber }}>
                            <Hash size={12} />
                            {b.booking_code}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium" style={{ color: THEME.text }}>
                          {b.customer_name}
                        </td>
                        <td className="px-5 py-3.5" style={{ color: THEME.text }}>
                          <div className="flex flex-col">
                            <span>{b.booking_date}</span>
                            <span className="font-mono text-xs" style={{ color: THEME.muted }}>
                              {(b.booking_time || '').slice(0, 5)} น.
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-bold"
                            style={{ backgroundColor: `${zone.accent}1A`, color: zone.accent }}
                          >
                            <ZoneIcon size={12} />
                            {b.table_number}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center font-mono" style={{ color: THEME.text }}>
                          {b.guests_count}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs" style={{ color: THEME.muted }}>
                          <span className="flex items-center gap-1.5">
                            <Phone size={12} />
                            {b.phone}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Presentational pieces
 * -------------------------------------------------------------------------- */
function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
  small,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}` }}
    >
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl"
        style={{ backgroundColor: `${accent}1A` }}
      />
      <div className="relative flex items-start justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: THEME.muted }}>
          {label}
        </p>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          <Icon size={16} />
        </div>
      </div>
      <p
        className={`relative mt-3 font-bold leading-none ${small ? 'text-xl' : 'text-3xl'}`}
        style={{ color: THEME.text }}
      >
        {value}
      </p>
      {sub && (
        <p className="relative mt-2 text-xs" style={{ color: THEME.muted }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y" style={{ borderColor: THEME.border }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-4" style={{ borderColor: THEME.border }}>
          <div className="h-4 w-20 rounded" style={{ backgroundColor: THEME.border }} />
          <div className="h-4 flex-1 rounded" style={{ backgroundColor: THEME.border }} />
          <div className="h-4 w-24 rounded" style={{ backgroundColor: THEME.border }} />
          <div className="h-4 w-16 rounded" style={{ backgroundColor: THEME.border }} />
          <div className="h-4 w-24 rounded" style={{ backgroundColor: THEME.border }} />
        </div>
      ))}
    </div>
  );
}

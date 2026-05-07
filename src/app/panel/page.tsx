'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { setStaffSession, isStaffSessionValid, clearStaffSession } from '@/lib/staffSession';
import { TIERS, getTier } from '@/lib/puntos';
import { FLAVOR_NODES, coerceProfile, emptyProfile, normalizeProfile } from '@/lib/dna';
import AuraDNA from '@/components/AuraDNA';
import type { FlavorProfile } from '@/lib/dna';

const PANEL_PIN = process.env.NEXT_PUBLIC_STAFF_PIN || '4321';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawUser {
  nombre: string;
  createdAt: string;
  sellos: number;
  totalSellosHistoricos: number;
  totalCanjesHistoricos: number;
  recompensaDisponible: boolean;
  baneado: boolean;
  rol: string;
  flavorProfile?: Partial<FlavorProfile>;
}
interface LogEntry  { tipo: string; fecha: string; usuarioNombre: string; accion: string; }
interface CanjeData { premioNombre: string; premioIcono: string; status: string; creadoEn: any; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToDay(iso: string) { return iso.slice(0, 10); }

function getLast14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
}

function shortDay(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short' });
}

function monthKey(iso: string) { return iso.slice(0, 7); }

function currentMonthKey() { return new Date().toISOString().slice(0, 7); }

function prevMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function deltaLabel(curr: number, prev: number) {
  const diff = curr - prev;
  if (diff === 0) return { text: '= igual que antes', color: 'var(--muted)' };
  if (diff > 0)   return { text: `+${diff} vs período anterior`, color: '#4ade80' };
  return           { text: `${diff} vs período anterior`, color: '#f87171' };
}

function fmtNum(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

// ─── Derived metrics ──────────────────────────────────────────────────────────

function computeMetrics(users: RawUser[], logs: LogEntry[], canjes: CanjeData[]) {
  const clientes = users.filter(u => u.rol !== 'staff' && !u.baneado);
  const now = new Date();

  // Date boundaries
  const weekAgo  = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const twoWeeks = new Date(now); twoWeeks.setDate(now.getDate() - 14);

  // Sellos (stamps)
  const sellosLogs = logs.filter(l => l.tipo === 'SELLO');
  const sellosThisWeek = sellosLogs.filter(l => new Date(l.fecha) >= weekAgo).length;
  const sellosLastWeek = sellosLogs.filter(l => {
    const d = new Date(l.fecha);
    return d >= twoWeeks && d < weekAgo;
  }).length;

  // New members
  const currMonth = currentMonthKey();
  const prevMonth = prevMonthKey();
  const newThisMonth = clientes.filter(u => monthKey(u.createdAt) === currMonth).length;
  const newLastMonth = clientes.filter(u => monthKey(u.createdAt) === prevMonth).length;

  // Retention: members with 2+ stamps
  const retained = clientes.filter(u => u.totalSellosHistoricos >= 2).length;
  const retentionPct = clientes.length > 0 ? Math.round((retained / clientes.length) * 100) : 0;

  // Tiers
  const tierCounts = Object.fromEntries(TIERS.map(t => [t.name, 0])) as Record<string, number>;
  for (const u of clientes) {
    const t = getTier(u.totalSellosHistoricos);
    tierCounts[t.name] = (tierCounts[t.name] || 0) + 1;
  }

  // Activity chart (last 14 days)
  const days = getLast14Days();
  const byDay: Record<string, number> = {};
  for (const d of days) byDay[d] = 0;
  for (const l of sellosLogs) {
    const d = isoToDay(l.fecha);
    if (d in byDay) byDay[d]++;
  }
  const activityChart = days.map(d => ({ day: d, label: shortDay(d), value: byDay[d] }));

  // Canjes
  const totalCanjes = canjes.length;
  const canjesThisWeek = canjes.filter(c => {
    const d = c.creadoEn?.toDate?.() ?? new Date(0);
    return d >= weekAgo;
  }).length;
  const canjesUsed = canjes.filter(c => c.status === 'used').length;

  // Top premios
  const premioCount: Record<string, { count: number; icon: string }> = {};
  for (const c of canjes) {
    if (!premioCount[c.premioNombre]) premioCount[c.premioNombre] = { count: 0, icon: c.premioIcono };
    premioCount[c.premioNombre].count++;
  }
  const topPremios = Object.entries(premioCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4)
    .map(([nombre, { count, icon }]) => ({ nombre, count, icon }));

  // Community DNA
  const communityDNA: FlavorProfile = emptyProfile();
  let usersWithDNA = 0;
  for (const u of clientes) {
    if (!u.flavorProfile) continue;
    const p = coerceProfile(u.flavorProfile);
    if (Object.values(p).every(v => v === 0)) continue;
    usersWithDNA++;
    for (const node of FLAVOR_NODES) communityDNA[node.id] += p[node.id];
  }

  return {
    totalSocios: clientes.length,
    sellosThisWeek,
    sellosLastWeek,
    newThisMonth,
    newLastMonth,
    retentionPct,
    retained,
    tierCounts,
    activityChart,
    totalCanjes,
    canjesThisWeek,
    canjesUsed,
    topPremios,
    communityDNA,
    usersWithDNA,
    recompensasActivas: clientes.filter(u => u.recompensaDisponible).length,
    totalSellosEntregados: clientes.reduce((s, u) => s + u.totalSellosHistoricos, 0),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, delta, accent,
}: { icon: string; label: string; value: string; delta?: { text: string; color: string }; accent?: string }) {
  return (
    <div
      className="rounded-2xl p-4 space-y-2"
      style={{ background: 'var(--surface)', border: `1px solid ${accent ? accent + '33' : 'var(--border)'}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        {accent && <div className="w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />}
      </div>
      <p className="text-2xl font-black" style={{ color: accent ?? 'var(--cream)' }}>{value}</p>
      <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{label}</p>
      {delta && (
        <p className="text-xs font-semibold" style={{ color: delta.color }}>{delta.text}</p>
      )}
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const today = new Date().toLocaleDateString('es-CL', { weekday: 'short' });
  return (
    <div className="flex items-end gap-1.5 h-28 pt-4">
      {data.map((d, i) => {
        const isToday = d.label === today;
        const pct = Math.max((d.value / max) * 100, 3);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            {d.value > 0 && (
              <span style={{ color: 'var(--fire)', fontSize: 9, fontWeight: 700, lineHeight: 1 }}>{d.value}</span>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-700"
              style={{
                height: `${pct}%`,
                background: isToday
                  ? 'linear-gradient(to top, #e8411a, #c9a84c)'
                  : d.value > 0
                    ? 'rgba(232,65,26,0.45)'
                    : 'var(--surface2)',
                boxShadow: isToday ? '0 0 8px rgba(232,65,26,0.5)' : 'none',
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: isToday ? 'var(--fire)' : 'var(--muted)',
                fontWeight: isToday ? 700 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TierBar({ tierCounts, total }: { tierCounts: Record<string, number>; total: number }) {
  if (total === 0) return <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>Sin datos</p>;
  return (
    <div className="space-y-3">
      {TIERS.slice().reverse().map(tier => {
        const count = tierCounts[tier.name] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={tier.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: pct > 0 ? tier.color : 'var(--muted)' }}>
                {tier.emoji} {tier.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {count} · {Math.round(pct)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: tier.color,
                  boxShadow: pct > 5 ? `0 0 6px ${tier.color}88` : 'none',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommunityDNA({ profile, usersWithDNA }: { profile: FlavorProfile; usersWithDNA: number }) {
  const normalized = normalizeProfile(profile);
  const hasDNA = usersWithDNA >= 1;
  const dominant = FLAVOR_NODES.reduce((a, b) => normalized[a.id] > normalized[b.id] ? a : b);

  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <AuraDNA profile={hasDNA ? profile : emptyProfile()} size={72} />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {!hasDNA ? (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Aún sin datos — el ADN se forma a medida que los socios actualizan sus preferencias.
          </p>
        ) : (
          <>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {usersWithDNA} socio{usersWithDNA !== 1 ? 's' : ''} con perfil · sabor dominante:{' '}
              <span style={{ color: dominant.color, fontWeight: 700 }}>{dominant.emoji} {dominant.label}</span>
            </p>
            <div className="space-y-1">
              {FLAVOR_NODES.filter(n => normalized[n.id] > 0.02).sort((a, b) => normalized[b.id] - normalized[a.id]).map(node => (
                <div key={node.id} className="flex items-center gap-2">
                  <span style={{ fontSize: 12 }}>{node.emoji}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${normalized[node.id] * 100}%`, background: node.color }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', width: 28, textAlign: 'right' }}>
                    {Math.round(normalized[node.id] * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PIN Screen ───────────────────────────────────────────────────────────────

function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin]   = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, '⌫'] as const;

  function handleDigit(d: number | string) {
    if (d === '⌫') { setPin(p => p.slice(0, -1)); setError(false); return; }
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (next === PANEL_PIN) { onSuccess(); }
      else {
        setShake(true); setError(true);
        setTimeout(() => { setPin(''); setShake(false); }, 700);
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-24" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">📊</div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--cream)' }}>Panel de Métricas</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Ingresa el PIN para continuar</p>
        </div>
        <div className={`flex justify-center gap-4 ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-4 h-4 rounded-full transition-all duration-200"
              style={{
                background: i < pin.length ? (error ? '#ef4444' : 'var(--fire)') : 'var(--surface2)',
                border: `2px solid ${i < pin.length ? (error ? '#ef4444' : 'var(--fire)') : 'var(--border)'}`,
              }}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => (
            <button key={i}
              onClick={() => d !== null && handleDigit(d)}
              disabled={d === null}
              className="h-16 rounded-2xl text-xl font-black transition-all active:scale-90"
              style={{
                background: d === null ? 'transparent' : 'var(--surface)',
                color: d === '⌫' ? 'var(--fire)' : 'var(--cream)',
                border: d === null ? 'none' : '1px solid var(--border)',
              }}
            >
              {d === null ? '' : d}
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

type Tab = 'resumen' | 'actividad' | 'socios' | 'dna';

export default function PanelPage() {
  const [unlocked, setUnlocked]   = useState(() => isStaffSessionValid());
  const [loading, setLoading]     = useState(false);
  const [lastSync, setLastSync]   = useState<Date | null>(null);
  const [tab, setTab]             = useState<Tab>('resumen');

  const [users, setUsers]   = useState<RawUser[]>([]);
  const [logs, setLogs]     = useState<LogEntry[]>([]);
  const [canjes, setCanjes] = useState<CanjeData[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersSnap, logsSnap, canjesSnap] = await Promise.all([
        getDocs(collection(db, 'fermata_usuarios')),
        getDocs(query(collection(db, 'fermata_logs'), orderBy('fecha', 'desc'), limit(500))),
        getDocs(collection(db, 'fermata_canjes')),
      ]);
      setUsers(usersSnap.docs.map(d => d.data() as RawUser));
      setLogs(logsSnap.docs.map(d => d.data() as LogEntry));
      setCanjes(canjesSnap.docs.map(d => d.data() as CanjeData));
      setLastSync(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (unlocked) fetchData();
  }, [unlocked, fetchData]);

  if (!unlocked) return <PinScreen onSuccess={() => { setStaffSession(); setUnlocked(true); }} />;

  const m = computeMetrics(users, logs, canjes);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'resumen',   label: 'Resumen',  icon: '📊' },
    { id: 'actividad', label: 'Actividad', icon: '📈' },
    { id: 'socios',    label: 'Socios',   icon: '👥' },
    { id: 'dna',       label: 'ADN',      icon: '🧬' },
  ];

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-4 flex items-center justify-between"
        style={{ background: 'rgba(12,11,9,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/" style={{ color: 'var(--muted)', fontSize: '1.4rem' }}>←</Link>
        <div className="text-center">
          <p className="text-sm font-black" style={{ color: 'var(--cream)' }}>Panel de Métricas</p>
          {lastSync && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {loading ? 'Actualizando…' : `Sync ${lastSync.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-40"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          title="Actualizar datos"
        >
          <span style={{ display: 'inline-block', animation: loading ? 'spin 0.8s linear infinite' : 'none' }}>↻</span>
        </button>
      </div>

      {/* Quick links to other staff tools */}
      <div className="flex overflow-x-auto gap-2 px-4 py-2 no-scrollbar"
        style={{ background: 'rgba(201,168,76,0.05)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/club/staff"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--surface2)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
          ⭐ Club / Sellos
        </Link>
        <Link href="/reservas/staff"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--surface2)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
          📅 Reservas
        </Link>
      </div>

      {/* Tabs */}
      <div
        className="flex overflow-x-auto gap-2 px-4 py-3 no-scrollbar"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold"
            style={{
              background: tab === t.id ? 'var(--fire)' : 'var(--surface2)',
              color: tab === t.id ? '#fff' : 'var(--muted)',
              border: '1px solid var(--border)',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Tab: Resumen ──────────────────────────────────────── */}
        {tab === 'resumen' && (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                icon="👥" label="Total socios" value={fmtNum(m.totalSocios)}
                accent="var(--fire)"
              />
              <KpiCard
                icon="🔥" label="Sellos esta semana" value={fmtNum(m.sellosThisWeek)}
                delta={deltaLabel(m.sellosThisWeek, m.sellosLastWeek)}
                accent="#e8411a"
              />
              <KpiCard
                icon="🌱" label="Nuevos este mes" value={fmtNum(m.newThisMonth)}
                delta={deltaLabel(m.newThisMonth, m.newLastMonth)}
                accent="var(--gold)"
              />
              <KpiCard
                icon="♻️" label="Tasa retención" value={`${m.retentionPct}%`}
                delta={{ text: `${m.retained} con 2+ visitas`, color: 'var(--muted)' }}
                accent="#a855f7"
              />
            </div>

            {/* Second row KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '🎯', label: 'Sellos totales', value: fmtNum(m.totalSellosEntregados) },
                { icon: '🎁', label: 'Canjes totales', value: fmtNum(m.totalCanjes) },
                { icon: '⚡', label: 'Recomp. activas', value: fmtNum(m.recompensasActivas) },
              ].map(k => (
                <div key={k.label}
                  className="rounded-2xl p-3 text-center"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <p className="text-xl mb-1">{k.icon}</p>
                  <p className="text-lg font-black" style={{ color: 'var(--cream)' }}>{k.value}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{k.label}</p>
                </div>
              ))}
            </div>

            {/* Top premios canjeados */}
            {m.topPremios.length > 0 && (
              <div className="rounded-3xl p-5 space-y-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  🏅 Premios más canjeados
                </p>
                <div className="space-y-2">
                  {m.topPremios.map((p, i) => {
                    const maxCount = m.topPremios[0].count;
                    return (
                      <div key={p.nombre} className="flex items-center gap-3">
                        <span className="text-lg w-7 text-center">{p.icon}</span>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>{p.nombre}</p>
                            <span className="text-xs font-black" style={{ color: 'var(--fire)' }}>{p.count}×</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                            <div className="h-full rounded-full" style={{
                              width: `${(p.count / maxCount) * 100}%`,
                              background: i === 0 ? 'linear-gradient(90deg,#e8411a,#c9a84c)' : 'rgba(232,65,26,0.4)',
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Actividad ────────────────────────────────────── */}
        {tab === 'actividad' && (
          <>
            <div className="rounded-3xl p-5 space-y-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  📈 Sellos por día — últimas 2 semanas
                </p>
                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(232,65,26,0.15)', color: 'var(--fire)' }}>
                  {m.sellosThisWeek} esta sem.
                </span>
              </div>
              <BarChart data={m.activityChart} />
            </div>

            {/* Comparativa semanas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 space-y-1"
                style={{ background: 'var(--surface)', border: '1px solid rgba(232,65,26,0.3)' }}
              >
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Esta semana</p>
                <p className="text-3xl font-black" style={{ color: 'var(--fire)' }}>{m.sellosThisWeek}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>sellos entregados</p>
              </div>
              <div className="rounded-2xl p-4 space-y-1"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Semana pasada</p>
                <p className="text-3xl font-black" style={{ color: 'var(--cream)' }}>{m.sellosLastWeek}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>sellos entregados</p>
              </div>
            </div>

            {/* Log reciente */}
            <div className="rounded-3xl p-5 space-y-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                📋 Actividad reciente
              </p>
              {logs.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>Sin actividad registrada</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.slice(0, 30).map((log, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl p-3"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-base mt-0.5 shrink-0">
                        {log.tipo === 'SELLO' ? '🔥' : log.tipo === 'CANJE' ? '🎁' : '🌱'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--cream)' }}>{log.usuarioNombre}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{log.accion}</p>
                      </div>
                      <p className="text-xs shrink-0" style={{ color: 'var(--muted)', fontSize: 10 }}>
                        {new Date(log.fecha).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Tab: Socios ───────────────────────────────────────── */}
        {tab === 'socios' && (
          <>
            {/* Tier distribution */}
            <div className="rounded-3xl p-5 space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  🏆 Distribución de niveles
                </p>
                <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>
                  {m.totalSocios} socios totales
                </span>
              </div>
              <TierBar tierCounts={m.tierCounts} total={m.totalSocios} />
            </div>

            {/* Tier cards */}
            <div className="grid grid-cols-2 gap-3">
              {TIERS.slice().reverse().map(tier => {
                const count = m.tierCounts[tier.name] || 0;
                const pct = m.totalSocios > 0 ? Math.round((count / m.totalSocios) * 100) : 0;
                return (
                  <div key={tier.name}
                    className="rounded-2xl p-4 space-y-2"
                    style={{
                      background: count > 0 ? `${tier.color}0f` : 'var(--surface)',
                      border: `1px solid ${count > 0 ? tier.color + '33' : 'var(--border)'}`,
                    }}
                  >
                    <p className="text-2xl">{tier.emoji}</p>
                    <p className="text-xl font-black" style={{ color: count > 0 ? tier.color : 'var(--muted)' }}>{count}</p>
                    <p className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>{tier.name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{pct}% del total</p>
                  </div>
                );
              })}
            </div>

            {/* Growth */}
            <div className="rounded-3xl p-5 space-y-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                📅 Crecimiento mensual
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3 text-center"
                  style={{ background: 'var(--surface2)', border: '1px solid rgba(232,65,26,0.3)' }}
                >
                  <p className="text-2xl font-black" style={{ color: 'var(--fire)' }}>{m.newThisMonth}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Este mes</p>
                </div>
                <div className="rounded-2xl p-3 text-center"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                >
                  <p className="text-2xl font-black" style={{ color: 'var(--cream)' }}>{m.newLastMonth}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Mes anterior</p>
                </div>
              </div>
              <div className="rounded-xl p-3 text-center"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs font-semibold" style={{ color: m.retentionPct >= 50 ? '#4ade80' : 'var(--gold)' }}>
                  ♻️ Tasa de retención: {m.retentionPct}%
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  Socios que han visitado 2 o más veces
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── Tab: ADN ──────────────────────────────────────────── */}
        {tab === 'dna' && (
          <>
            <div className="rounded-3xl p-5 space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                🧬 ADN gastronómico de la comunidad
              </p>
              <CommunityDNA profile={m.communityDNA} usersWithDNA={m.usersWithDNA} />
            </div>

            {/* Flavor breakdown */}
            <div className="rounded-3xl p-5 space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Distribución de sabores
              </p>
              {m.usersWithDNA === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
                  Sin datos todavía — aparecerán cuando los socios actualicen su ADN
                </p>
              ) : (
                (() => {
                  const norm = normalizeProfile(m.communityDNA);
                  return FLAVOR_NODES
                    .slice()
                    .sort((a, b) => norm[b.id] - norm[a.id])
                    .map(node => {
                      const pct = Math.round(norm[node.id] * 100);
                      return (
                        <div key={node.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2" style={{ color: pct > 0 ? node.color : 'var(--muted)' }}>
                              {node.emoji} <span className="font-bold">{node.label}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs" style={{ color: 'var(--muted)' }}>{m.communityDNA[node.id]} pts</span>
                              <span className="text-xs font-black w-8 text-right" style={{ color: pct > 0 ? node.color : 'var(--muted)' }}>{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: pct > 0 ? `linear-gradient(90deg,${node.color}88,${node.color})` : 'transparent',
                                boxShadow: pct > 10 ? `0 0 8px ${node.color}55` : 'none',
                              }}
                            />
                          </div>
                        </div>
                      );
                    });
                })()
              )}
            </div>

            {/* Insight card */}
            {m.usersWithDNA > 0 && (() => {
              const norm = normalizeProfile(m.communityDNA);
              const top = FLAVOR_NODES.slice().sort((a, b) => norm[b.id] - norm[a.id]).slice(0, 2);
              return (
                <div className="rounded-3xl p-5 space-y-2"
                  style={{ background: `${top[0].color}10`, border: `1px solid ${top[0].color}33` }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: top[0].color }}>
                    💡 Insight del local
                  </p>
                  <p className="text-sm font-black" style={{ color: 'var(--cream)' }}>
                    Tu comunidad es de alma {top[0].emoji} {top[0].label}
                    {top[1] && ` con toques de ${top[1].emoji} ${top[1].label}`}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    Considera destacar en el menú los platos con {top[0].label.toLowerCase()} — son los que más resuenan con tus socios más fieles.
                  </p>
                </div>
              );
            })()}
          </>
        )}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

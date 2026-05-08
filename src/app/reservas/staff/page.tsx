'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { subscribeByFecha, actualizarStatus } from '@/lib/reservas';
import type { Reserva, ReservaStatus } from '@/lib/reservas';
import { setStaffSession, isStaffSessionValid, clearStaffSession } from '@/lib/staffSession';

const STAFF_PIN = process.env.NEXT_PUBLIC_STAFF_PIN || '4321';

// ─── helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function formatDateLabel(iso: string): string {
  const today = isoDate(new Date());
  const tmrw  = addDays(today, 1);
  const yest  = addDays(today, -1);
  if (iso === today) return 'Hoy';
  if (iso === tmrw)  return 'Mañana';
  if (iso === yest)  return 'Ayer';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

const STATUS_META: Record<ReservaStatus, { label: string; color: string; bg: string }> = {
  pendiente:  { label: 'Pendiente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  confirmada: { label: 'Confirmada', color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  llegó:      { label: 'Llegó',      color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  cancelada:  { label: 'Cancelada',  color: '#7a7468', bg: 'var(--surface2)'         },
  no_show:    { label: 'No show',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)'     },
};

// ─── PIN screen ───────────────────────────────────────────────────────────────

function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin]     = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const digits = [1,2,3,4,5,6,7,8,9,null,0,'⌫'] as const;

  function handleDigit(d: number | string) {
    if (d === '⌫') { setPin(p => p.slice(0,-1)); setError(false); return; }
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (next === STAFF_PIN) { onSuccess(); }
      else {
        setShake(true); setError(true);
        setTimeout(() => { setPin(''); setShake(false); }, 700);
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">📅</div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--cream)' }}>
            Panel de Reservas
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Ingresa el PIN para continuar</p>
        </div>
        <div className={`flex justify-center gap-4 ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className="w-4 h-4 rounded-full transition-all duration-200"
              style={{
                background: i < pin.length ? (error ? '#ef4444' : 'var(--fire)') : 'var(--surface2)',
                border: `2px solid ${i < pin.length ? (error ? '#ef4444' : 'var(--fire)') : 'var(--border)'}`,
              }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => (
            <button key={i} onClick={() => d !== null && handleDigit(d)} disabled={d === null}
              className="h-16 rounded-2xl text-xl font-black transition-all active:scale-90"
              style={{
                background: d === null ? 'transparent' : 'var(--surface)',
                color: d === '⌫' ? 'var(--fire)' : 'var(--cream)',
                border: d === null ? 'none' : '1px solid var(--border)',
              }}>
              {d === null ? '' : d}
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

// ─── Reservation card ─────────────────────────────────────────────────────────

function ReservationCard({
  r, processing, onAction,
}: {
  r: Reserva;
  processing: string | null;
  onAction: (id: string, s: ReservaStatus) => void;
}) {
  const meta    = STATUS_META[r.status];
  const isLocked = r.status === 'llegó' || r.status === 'cancelada' || r.status === 'no_show';
  const busy    = processing === r.id;

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--surface)', border: `1px solid ${meta.color}33`, opacity: isLocked ? 0.7 : 1 }}>

      {/* Top row: time + name + covers */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="text-center shrink-0">
            <p className="text-2xl font-black leading-none" style={{ color: 'var(--fire)' }}>
              {r.hora}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>hrs</p>
          </div>
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: 'var(--cream)' }}>
              {r.nombre}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              👥 {r.personas} persona{r.personas !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {/* Status badge */}
        <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
          {meta.label}
        </span>
      </div>

      {/* Contact + notes */}
      {r.telefono && (
        <a href={`tel:${r.telefono}`}
          className="flex items-center gap-2 text-sm"
          style={{ color: 'var(--gold)' }}>
          <PhoneIcon />
          {r.telefono}
        </a>
      )}
      {r.notas && (
        <p className="text-xs rounded-xl px-3 py-2"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          📝 {r.notas}
        </p>
      )}

      {/* Reservation ID */}
      <p className="text-xs font-mono" style={{ color: 'var(--muted)', opacity: 0.6 }}>
        #{r.id.slice(0, 8).toUpperCase()}
      </p>

      {/* Action buttons */}
      {!isLocked && (
        <div className="flex gap-2 pt-1">
          {r.status === 'pendiente' && (
            <button onClick={() => onAction(r.id, 'confirmada')} disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: '#4ade80', color: '#14532d' }}>
              {busy ? '⏳' : '✅ Confirmar'}
            </button>
          )}
          {r.status === 'confirmada' && (
            <button onClick={() => onAction(r.id, 'llegó')} disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: '#60a5fa', color: '#1e3a5f' }}>
              {busy ? '⏳' : '🏠 Llegó'}
            </button>
          )}
          {r.status === 'confirmada' && (
            <button onClick={() => onAction(r.id, 'no_show')} disabled={busy}
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              No show
            </button>
          )}
          {(r.status === 'pendiente' || r.status === 'confirmada') && (
            <button onClick={() => onAction(r.id, 'cancelada')} disabled={busy}
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function ReservasStaffPage() {
  const [unlocked, setUnlocked]   = useState(() => isStaffSessionValid());
  const [fecha, setFecha]         = useState(() => isoDate(new Date()));
  const [reservas, setReservas]   = useState<Reserva[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReservaStatus | 'todas'>('todas');

  // Keep a ref so handleAction always sees fresh reserva data without being recreated
  const reservasRef = useRef<Reserva[]>([]);
  useEffect(() => { reservasRef.current = reservas; }, [reservas]);

  useEffect(() => {
    if (!unlocked) return;
    const unsub = subscribeByFecha(fecha, setReservas);
    return unsub;
  }, [unlocked, fecha]);

  const handleAction = useCallback(async (id: string, status: ReservaStatus) => {
    setProcessing(id);
    try {
      await actualizarStatus(id, status);
      if (status === 'confirmada') {
        const r = reservasRef.current.find(x => x.id === id);
        if (r) {
          fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type:     'reserva_confirmada',
              id,
              nombre:   r.nombre,
              telefono: r.telefono,
              fecha:    r.fecha,
              hora:     r.hora,
              personas: r.personas,
            }),
          }).catch(() => {});
        }
      }
    }
    catch { alert('Error al actualizar la reserva.'); }
    finally { setProcessing(null); }
  }, []);

  if (!unlocked) return <PinScreen onSuccess={() => { setStaffSession(); setUnlocked(true); }} />;

  // Stats
  const pendientes  = reservas.filter(r => r.status === 'pendiente');
  const confirmadas = reservas.filter(r => r.status === 'confirmada');
  const llegaron    = reservas.filter(r => r.status === 'llegó');
  const totalCovers = reservas
    .filter(r => r.status !== 'cancelada' && r.status !== 'no_show')
    .reduce((s, r) => s + r.personas, 0);

  const filtered = filterStatus === 'todas'
    ? reservas
    : reservas.filter(r => r.status === filterStatus);

  // Date navigation shortcuts
  const today = isoDate(new Date());
  const navDates = [-1, 0, 1, 2, 3].map(n => addDays(today, n));

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--bg)' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 px-4 py-4 flex items-center justify-between"
        style={{ background: 'rgba(12,11,9,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/admin" style={{ color: 'var(--muted)', fontSize: '1.4rem' }}>←</Link>
        <div className="text-center">
          <p className="text-sm font-black" style={{ color: 'var(--cream)' }}>Panel Reservas</p>
          <p className="text-xs" style={{ color: 'var(--fire)' }}>🔥 La Fermata</p>
        </div>
        <button onClick={() => { clearStaffSession(); setUnlocked(false); }}
          className="text-xs px-3 py-1.5 rounded-full"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          Salir
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
        <Link href="/reservas/staff/mesas"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--surface2)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
          🪑 Mesas
        </Link>
        <Link href="/panel"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          📊 Métricas
        </Link>
      </div>

      {/* ── Selector de fecha ──────────────────────────────── */}
      <div className="flex overflow-x-auto gap-2 px-4 py-3 no-scrollbar"
        style={{ borderBottom: '1px solid var(--border)' }}>
        {navDates.map(d => (
          <button key={d} onClick={() => setFecha(d)}
            className="shrink-0 flex flex-col items-center px-4 py-2 rounded-2xl text-xs font-bold transition-all"
            style={{
              background: fecha === d ? 'var(--fire)' : 'var(--surface2)',
              color: fecha === d ? '#fff' : 'var(--muted)',
              border: '1px solid var(--border)',
            }}>
            <span className="text-sm font-black">{formatDateLabel(d)}</span>
            <span style={{ opacity: 0.75 }}>{d.slice(5).replace('-', '/')}</span>
          </button>
        ))}
        {/* Manual date input */}
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          className="shrink-0 px-3 py-2 rounded-2xl text-xs font-bold"
          style={{
            background: 'var(--surface2)', color: 'var(--muted)',
            border: '1px solid var(--border)', outline: 'none',
          }} />
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* ── Stats ────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Pendientes', value: pendientes.length,  color: '#f59e0b' },
            { label: 'Confirm.',   value: confirmadas.length, color: '#4ade80' },
            { label: 'Llegaron',   value: llegaron.length,    color: '#60a5fa' },
            { label: 'Cubiertos',  value: totalCovers,        color: 'var(--fire)' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filtro de estado ─────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['todas', 'pendiente', 'confirmada', 'llegó', 'cancelada', 'no_show'] as const).map(s => {
            const meta = s === 'todas'
              ? { label: `Todas (${reservas.length})`, color: 'var(--cream)', bg: 'var(--surface2)' }
              : { label: `${STATUS_META[s].label} (${reservas.filter(r => r.status === s).length})`,
                  color: STATUS_META[s].color, bg: STATUS_META[s].bg };
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: filterStatus === s ? meta.bg : 'transparent',
                  color: filterStatus === s ? meta.color : 'var(--muted)',
                  border: `1px solid ${filterStatus === s ? meta.color + '55' : 'var(--border)'}`,
                }}>
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* ── Lista de reservas ────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="rounded-3xl py-14 px-6 text-center space-y-3"
            style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
            <div className="text-4xl">{reservas.length === 0 ? '📭' : '🔍'}</div>
            <p className="font-bold" style={{ color: 'var(--cream)' }}>
              {reservas.length === 0
                ? `Sin reservas para ${formatDateLabel(fecha).toLowerCase()}`
                : 'Sin reservas en este filtro'}
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {reservas.length === 0
                ? 'Las solicitudes de clientes desde la app aparecen aquí en tiempo real.'
                : 'Prueba seleccionando "Todas" o cambiando la fecha.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <ReservationCard
                key={r.id}
                r={r}
                processing={processing}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}

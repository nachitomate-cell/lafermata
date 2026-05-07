'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { subscribeKitchen, actualizarStatusPedido } from '@/lib/pedidos';
import type { Pedido, PedidoStatus } from '@/lib/pedidos';
import { setStaffSession, isStaffSessionValid, clearStaffSession } from '@/lib/staffSession';

const STAFF_PIN = process.env.NEXT_PUBLIC_STAFF_PIN || '4321';

function formatCLP(n: number) { return '$' + n.toLocaleString('es-CL'); }

function timeElapsed(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

// ─── Status meta ─────────────────────────────────────────────────────────────

const META: Record<
  Exclude<PedidoStatus, 'pending' | 'entregado'>,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  en_preparacion: { label: 'Preparando',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.35)', icon: '👨‍🍳' },
  en_horno:       { label: 'En el horno', color: '#e8411a', bg: 'rgba(232,65,26,0.1)',  border: 'rgba(232,65,26,0.4)',   icon: '🔥'   },
  lista:          { label: 'Lista',       color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.35)', icon: '✅'   },
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
          <div className="text-5xl mb-4">🍕</div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--cream)' }}>Panel Cocina</h1>
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

// ─── Order card ───────────────────────────────────────────────────────────────

function PedidoCard({
  pedido,
  processing,
  onAction,
}: {
  pedido: Pedido;
  processing: string | null;
  onAction: (id: string, status: PedidoStatus) => void;
}) {
  const status = pedido.status as Exclude<PedidoStatus, 'pending' | 'entregado'>;
  const meta = META[status];
  const busy = processing === pedido.id;

  return (
    <div className="rounded-2xl p-4 space-y-3 transition-all duration-500"
      style={{ background: meta.bg, border: `2px solid ${meta.border}` }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className="text-xs font-mono font-bold" style={{ color: 'var(--muted)' }}>
              #{pedido.buyOrder.slice(-6).toUpperCase()}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Hace {timeElapsed(pedido.creadoEn)}
            </p>
          </div>
        </div>
        <span className="text-xs font-black px-2.5 py-1 rounded-full"
          style={{ background: meta.border, color: meta.color, border: `1px solid ${meta.border}` }}>
          {meta.label}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1 rounded-xl px-3 py-2"
        style={{ background: 'rgba(0,0,0,0.2)' }}>
        {pedido.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span style={{ color: 'var(--cream)' }}>
              <strong style={{ color: meta.color }}>{item.cantidad}×</strong> {item.nombre}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>
              {formatCLP(item.precio * item.cantidad)}
            </span>
          </div>
        ))}
        <div className="flex justify-between text-xs font-bold pt-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4 }}>
          <span style={{ color: 'var(--muted)' }}>Total</span>
          <span style={{ color: 'var(--gold)' }}>{formatCLP(pedido.amount)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {status === 'en_preparacion' && (
          <button onClick={() => onAction(pedido.id, 'en_horno')} disabled={busy}
            className="flex-1 py-3 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#e8411a', color: '#fff' }}>
            {busy ? '⏳' : '🔥 Al horno'}
          </button>
        )}
        {status === 'en_horno' && (
          <button onClick={() => onAction(pedido.id, 'lista')} disabled={busy}
            className="flex-1 py-3 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#4ade80', color: '#14532d' }}>
            {busy ? '⏳' : '✅ Lista para retiro'}
          </button>
        )}
        {status === 'lista' && (
          <button onClick={() => onAction(pedido.id, 'entregado')} disabled={busy}
            className="flex-1 py-3 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            {busy ? '⏳' : '🏠 Entregado'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CocinaPage() {
  const [unlocked, setUnlocked]   = useState(() => isStaffSessionValid());
  const [pedidos, setPedidos]     = useState<Pedido[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todos' | Exclude<PedidoStatus, 'pending' | 'entregado'>>('todos');

  useEffect(() => {
    if (!unlocked) return;
    return subscribeKitchen(setPedidos);
  }, [unlocked]);

  const handleAction = useCallback(async (id: string, status: PedidoStatus) => {
    setProcessing(id);
    try { await actualizarStatusPedido(id, status); }
    catch { alert('Error al actualizar el pedido.'); }
    finally { setProcessing(null); }
  }, []);

  if (!unlocked) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)' }}>
        <PinScreen onSuccess={() => { setStaffSession(); setUnlocked(true); }} />
      </div>
    );
  }

  const counts = {
    en_preparacion: pedidos.filter(p => p.status === 'en_preparacion').length,
    en_horno:       pedidos.filter(p => p.status === 'en_horno').length,
    lista:          pedidos.filter(p => p.status === 'lista').length,
  };

  const filtered = filter === 'todos' ? pedidos : pedidos.filter(p => p.status === filter);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)', overflowY: 'auto' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-4 flex items-center justify-between"
        style={{ background: 'rgba(12,11,9,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ color: 'var(--muted)', fontSize: '1.4rem' }}>←</Link>
        <div className="text-center">
          <p className="text-sm font-black" style={{ color: 'var(--cream)' }}>Panel Cocina</p>
          <p className="text-xs" style={{ color: 'var(--fire)' }}>🔥 La Fermata</p>
        </div>
        <button onClick={() => { clearStaffSession(); setUnlocked(false); }}
          className="text-xs px-3 py-1.5 rounded-full"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          Salir
        </button>
      </div>

      {/* Quick links */}
      <div className="flex overflow-x-auto gap-2 px-4 py-2 no-scrollbar"
        style={{ background: 'rgba(201,168,76,0.05)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/reservas/staff"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--surface2)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
          📅 Reservas
        </Link>
        <Link href="/reservas/staff/mesas"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--surface2)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
          🪑 Mesas
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(counts) as [keyof typeof counts, number][]).map(([key, val]) => (
            <div key={key} className="rounded-2xl p-3 text-center"
              style={{ background: META[key].bg, border: `1px solid ${META[key].border}` }}>
              <p className="text-2xl font-black" style={{ color: META[key].color }}>{val}</p>
              <p className="text-xs" style={{ color: META[key].color }}>{META[key].label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([
            { key: 'todos',          label: `Todos (${pedidos.length})`,                    color: 'var(--cream)' },
            { key: 'en_preparacion', label: `Preparando (${counts.en_preparacion})`,         color: '#f59e0b' },
            { key: 'en_horno',       label: `En horno (${counts.en_horno})`,                 color: '#e8411a' },
            { key: 'lista',          label: `Listos (${counts.lista})`,                      color: '#4ade80' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: filter === tab.key ? 'var(--surface2)' : 'transparent',
                color: filter === tab.key ? tab.color : 'var(--muted)',
                border: `1px solid ${filter === tab.key ? tab.color + '55' : 'var(--border)'}`,
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Order list */}
        {filtered.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed py-16 text-center space-y-3"
            style={{ borderColor: 'var(--border)' }}>
            <div className="text-4xl">🍕</div>
            <p className="font-bold" style={{ color: 'var(--cream)' }}>
              {pedidos.length === 0 ? 'Sin pedidos activos' : 'Sin pedidos en este filtro'}
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Los pedidos pagados online aparecen aquí en tiempo real.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <PedidoCard key={p.id} pedido={p} processing={processing} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

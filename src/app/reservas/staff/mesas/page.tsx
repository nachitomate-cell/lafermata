'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { setStaffSession, isStaffSessionValid, clearStaffSession } from '@/lib/staffSession';

const STAFF_PIN = process.env.NEXT_PUBLIC_STAFF_PIN || '4321';
const TOTAL = 16;

type Estado = 'libre' | 'ocupada' | 'reservada';

const NEXT: Record<Estado, Estado> = {
  libre:     'ocupada',
  ocupada:   'reservada',
  reservada: 'libre',
};

const META: Record<Estado, { label: string; color: string; bg: string; border: string }> = {
  libre:     { label: 'Libre',    color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)'  },
  ocupada:   { label: 'Ocupada',  color: '#e8411a', bg: 'rgba(232,65,26,0.12)',   border: 'rgba(232,65,26,0.4)'    },
  reservada: { label: 'Reserv.',  color: '#c9a84c', bg: 'rgba(201,168,76,0.12)',  border: 'rgba(201,168,76,0.4)'   },
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
          <div className="text-5xl mb-4">🪑</div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--cream)' }}>Estado de Mesas</h1>
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MesasPage() {
  const [unlocked, setUnlocked]     = useState(() => isStaffSessionValid());
  const [mesas, setMesas]           = useState<Record<number, Estado>>({});
  const [updating, setUpdating]     = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    return onSnapshot(collection(db, 'fermata_mesas'), (snap) => {
      const map: Record<number, Estado> = {};
      snap.docs.forEach(d => {
        const n = parseInt(d.id.replace('mesa_', ''));
        if (!isNaN(n)) map[n] = d.data().estado as Estado;
      });
      setMesas(map);
    });
  }, [unlocked]);

  async function toggleMesa(n: number) {
    if (updating !== null) return;
    setUpdating(n);
    const current = mesas[n] ?? 'libre';
    await setDoc(doc(db, 'fermata_mesas', `mesa_${n}`), {
      numero: n,
      estado: NEXT[current],
      updatedAt: new Date().toISOString(),
    });
    setUpdating(null);
  }

  if (!unlocked) return <PinScreen onSuccess={() => { setStaffSession(); setUnlocked(true); }} />;

  const tables = Array.from({ length: TOTAL }, (_, i) => i + 1);
  const counts = tables.reduce((acc, n) => {
    const e = mesas[n] ?? 'libre';
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, { libre: 0, ocupada: 0, reservada: 0 } as Record<Estado, number>);

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--bg)' }}>

      {/* ── Modal de confirmación ──────────────────────────── */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="text-4xl">⚠️</div>
              <h3 className="text-lg font-black" style={{ color: 'var(--cream)' }}>
                ¿Liberar todas las mesas?
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Se marcarán las {TOTAL} mesas como <strong style={{ color: 'var(--cream)' }}>Libre</strong>.
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ background: 'var(--surface2)', color: 'var(--cream)', border: '1px solid var(--border)' }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setConfirmReset(false);
                  for (const n of tables) {
                    if ((mesas[n] ?? 'libre') !== 'libre') {
                      await setDoc(doc(db, 'fermata_mesas', `mesa_${n}`), {
                        numero: n, estado: 'libre', updatedAt: new Date().toISOString(),
                      });
                    }
                  }
                }}
                className="flex-1 py-3 rounded-xl text-sm font-black transition-all active:scale-95"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                Sí, liberar todas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-4 flex items-center justify-between"
        style={{ background: 'rgba(12,11,9,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/reservas/staff" style={{ color: 'var(--muted)', fontSize: '1.4rem' }}>←</Link>
        <div className="text-center">
          <p className="text-sm font-black" style={{ color: 'var(--cream)' }}>Estado de Mesas</p>
          <p className="text-xs" style={{ color: 'var(--fire)' }}>🔥 La Fermata</p>
        </div>
        <button onClick={() => { clearStaffSession(); setUnlocked(false); }}
          className="text-xs px-3 py-1.5 rounded-full"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          Salir
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {(['libre','ocupada','reservada'] as Estado[]).map(e => (
            <div key={e} className="rounded-2xl p-3 text-center"
              style={{ background: META[e].bg, border: `1px solid ${META[e].border}` }}>
              <p className="text-2xl font-black" style={{ color: META[e].color }}>{counts[e]}</p>
              <p className="text-xs font-bold" style={{ color: META[e].color }}>{META[e].label}</p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
          <span>Toca para cambiar estado:</span>
          {(['libre','ocupada','reservada'] as Estado[]).map(e => (
            <span key={e} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: META[e].color }} />
              {META[e].label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-3">
          {tables.map(n => {
            const estado = mesas[n] ?? 'libre';
            const meta   = META[estado];
            const busy   = updating === n;
            return (
              <button key={n} onClick={() => toggleMesa(n)} disabled={busy}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-90 disabled:opacity-60"
                style={{ background: meta.bg, border: `2px solid ${meta.border}` }}>
                <span className="text-xl font-black" style={{ color: meta.color }}>
                  {busy ? '⏳' : n}
                </span>
                <span className="text-xs font-bold" style={{ color: meta.color, fontSize: '10px' }}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Reset all — acción destructiva */}
        <button
          onClick={() => setConfirmReset(true)}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          🔄 Liberar todas las mesas
        </button>

      </div>
    </div>
  );
}

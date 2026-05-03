'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection, query, where, onSnapshot, doc, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { canjearPremio, verificarCanjesExpirados, marcarCanjeUsado } from '@/lib/puntos';
import type { Premio, Canje } from '@/lib/puntos';

function formatCLP(n: number) { return '$' + n.toLocaleString('es-CL'); }

// ── Countdown hook ──────────────────────────────────────────────────────────
function useCountdown(expiraEn: string | null) {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (!expiraEn) return;
    const tick = () => {
      const diff = new Date(expiraEn).getTime() - Date.now();
      if (diff <= 0) { setDisplay('Expirado'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiraEn]);
  return display;
}

// ── Confirm modal ────────────────────────────────────────────────────────────
function ConfirmModal({ premio, userSellos, onConfirm, onClose, loading }:
  { premio: Premio; userSellos: number; onConfirm: () => void; onClose: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
      <div
        className="relative w-full max-w-lg mx-auto rounded-t-3xl p-6 space-y-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--border)' }} />
        <div className="text-center space-y-2">
          <div className="text-5xl">{premio.icono}</div>
          <h3 className="text-xl font-black" style={{ color: 'var(--cream)' }}>{premio.nombre}</h3>
          {premio.descripcion && <p className="text-sm" style={{ color: 'var(--muted)' }}>{premio.descripcion}</p>}
        </div>
        <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--muted)' }}>Se descontarán</span>
            <span className="font-black" style={{ color: 'var(--fire)' }}>{premio.sellosRequeridos} sellos 🔥</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--muted)' }}>Te quedarán</span>
            <span className="font-bold" style={{ color: 'var(--cream)' }}>{userSellos - premio.sellosRequeridos} sellos</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--muted)' }}>Validez</span>
            <span className="font-bold" style={{ color: 'var(--gold)' }}>48 horas</span>
          </div>
        </div>
        <div className="space-y-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--fire)', color: '#fff' }}
          >
            {loading ? '⏳ Procesando...' : '✅ Confirmar canje'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-3 rounded-2xl font-bold text-sm"
            style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ data, onClose }: { data: { codigo: string; premioNombre: string; premioIcono: string; expiraEn: string }; onClose: () => void }) {
  const countdown = useCountdown(data.expiraEn);
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-white overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #e8411a 0%, #c9a84c 100%)' }}
    >
      {/* Rings */}
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-white/15"
          style={{
            width: `${160 + i * 80}px`, height: `${160 + i * 80}px`,
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            animation: `ping ${1.8 + i * 0.35}s cubic-bezier(0,0,0.2,1) infinite`,
            animationDelay: `${i * 0.25}s`,
          }}
        />
      ))}
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center gap-6 text-center">
        <div className="text-7xl drop-shadow-xl" style={{ animation: 'bounce 1.2s infinite' }}>{data.premioIcono}</div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black drop-shadow-lg">¡Premio canjeado!</h1>
          <p className="text-white/85 font-semibold text-lg">{data.premioNombre}</p>
          <p className="text-white/65 text-sm">La Fermata – Viña del Mar</p>
        </div>
        <div className="w-full bg-white/15 backdrop-blur-xl rounded-3xl border border-white/25 p-6 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">Tu código único</p>
            <p className="text-4xl font-black tracking-[0.15em]">{data.codigo}</p>
          </div>
          <div className="h-px bg-white/15" />
          <p className="text-xs font-bold text-white/70">
            ⏱ {countdown ? `Vence en ${countdown}` : 'Válido 48 horas'} · Muéstralo en caja
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full h-14 rounded-2xl font-black text-base active:scale-95 transition-transform"
          style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)' }}
        >
          Ver mis canjes activos
        </button>
      </div>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes ping { 75%,100%{transform:translate(-50%,-50%) scale(1.5);opacity:0} }
      `}</style>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function PremiosPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const canjesRef = useRef<HTMLDivElement>(null);

  const [premios, setPremios] = useState<Premio[]>([]);
  const [canjes, setCanjes] = useState<Canje[]>([]);
  const [premiosLoading, setPremiosLoading] = useState(true);
  const [confirmPremio, setConfirmPremio] = useState<Premio | null>(null);
  const [canjeando, setCanjeando] = useState(false);
  const [successData, setSuccessData] = useState<null | { codigo: string; premioNombre: string; premioIcono: string; expiraEn: string }>(null);

  useEffect(() => {
    if (!user) { router.replace('/club/unete'); return; }

    verificarCanjesExpirados(user.uid).catch(() => {});

    const q = query(collection(db, 'fermata_premios'), where('activo', '==', true));
    const unsubPremios = onSnapshot(q, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Premio))
        .sort((a, b) => a.sellosRequeridos - b.sellosRequeridos);
      setPremios(list);
      setPremiosLoading(false);
    });

    const qCanjes = query(collection(db, 'fermata_canjes'), where('clienteId', '==', user.uid));
    const unsubCanjes = onSnapshot(qCanjes, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Canje))
        .sort((a: Canje, b: Canje) => {
          const ta = (a.creadoEn as Timestamp)?.toMillis?.() ?? 0;
          const tb = (b.creadoEn as Timestamp)?.toMillis?.() ?? 0;
          return tb - ta;
        });
      setCanjes(list);
    });

    return () => { unsubPremios(); unsubCanjes(); };
  }, [user, router]);

  async function handleCanjear() {
    if (!confirmPremio || !user || !userData) return;
    setCanjeando(true);
    try {
      const { codigo } = await canjearPremio(user.uid, userData.nombre, confirmPremio);
      setSuccessData({
        codigo,
        premioNombre: confirmPremio.nombre,
        premioIcono: confirmPremio.icono,
        expiraEn: new Date(Date.now() + 48 * 3600000).toISOString(),
      });
      setConfirmPremio(null);
    } catch (err: any) {
      alert(err?.message || 'Error al canjear. Intenta de nuevo.');
    } finally {
      setCanjeando(false);
    }
  }

  const sellosActuales = userData?.sellos ?? 0;
  const pendingCanjes = canjes.filter(c => c.status === 'pending');
  const pastCanjes = canjes.filter(c => c.status !== 'pending');

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3" style={{ background: 'rgba(12,11,9,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/club" style={{ color: 'var(--muted)', fontSize: '1.4rem' }}>←</Link>
        <div className="flex-1">
          <h1 className="text-base font-black" style={{ color: 'var(--cream)' }}>Catálogo de Premios</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{sellosActuales} sello{sellosActuales !== 1 ? 's' : ''} disponibles</p>
        </div>
        <div
          className="px-3 py-1.5 rounded-2xl font-black text-sm"
          style={{ background: 'rgba(232,65,26,0.15)', color: 'var(--fire)', border: '1px solid rgba(232,65,26,0.3)' }}
        >
          {sellosActuales} 🔥
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

        {/* ── Premios ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            🎁 Beneficios disponibles
          </p>

          {premiosLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--fire)', borderTopColor: 'transparent' }} />
            </div>
          ) : premios.length === 0 ? (
            <div
              className="rounded-3xl border-2 border-dashed py-12 text-center space-y-2"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="text-4xl">🎁</div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay premios activos por ahora.</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>El equipo los está preparando 🔥</p>
            </div>
          ) : (
            <div className="space-y-3">
              {premios.map(premio => {
                const puedeCanjear = sellosActuales >= premio.sellosRequeridos &&
                  (typeof premio.stock !== 'number' || premio.stock > 0);
                const faltantes = premio.sellosRequeridos - sellosActuales;
                return (
                  <div
                    key={premio.id}
                    className="flex items-center gap-3 rounded-2xl p-4 transition-all"
                    style={{
                      background: 'var(--surface)',
                      border: `1px solid ${puedeCanjear ? 'rgba(232,65,26,0.35)' : 'var(--border)'}`,
                      boxShadow: puedeCanjear ? '0 0 16px rgba(232,65,26,0.1)' : 'none',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: puedeCanjear ? 'rgba(232,65,26,0.15)' : 'var(--surface2)' }}
                    >
                      {premio.icono || '🎁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: 'var(--cream)' }}>{premio.nombre}</p>
                      {premio.descripcion && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{premio.descripcion}</p>
                      )}
                      <p className="text-xs font-black mt-1" style={{ color: 'var(--fire)' }}>
                        {premio.sellosRequeridos} sellos 🔥
                      </p>
                    </div>
                    {puedeCanjear ? (
                      <button
                        onClick={() => setConfirmPremio(premio)}
                        className="shrink-0 px-4 py-2 rounded-2xl font-black text-xs text-white active:scale-95 transition-transform"
                        style={{ background: 'var(--fire)' }}
                      >
                        Canjear
                      </button>
                    ) : (
                      <span
                        className="shrink-0 px-3 py-1.5 rounded-2xl text-xs font-bold"
                        style={{ background: 'var(--surface2)', color: 'var(--gold)' }}
                      >
                        Faltan {faltantes}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Canjes activos ───────────────────────────────────── */}
        <section className="space-y-3" ref={canjesRef}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            ✅ Mis canjes activos
          </p>

          {pendingCanjes.length === 0 ? (
            <div
              className="rounded-3xl border-2 border-dashed py-10 text-center space-y-2"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="text-3xl">🎫</div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No tienes canjes activos</p>
            </div>
          ) : (
            pendingCanjes.map(canje => {
              const isLow = new Date(canje.expiraEn).getTime() - Date.now() < 3600000;
              return (
                <div
                  key={canje.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--surface)', border: '1px solid rgba(232,65,26,0.3)' }}
                >
                  <div className="h-1" style={{ background: 'linear-gradient(90deg, #e8411a, #c9a84c)' }} />
                  <div className="p-4 flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: 'rgba(232,65,26,0.12)' }}
                    >
                      {canje.premioIcono || '🎁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: 'var(--cream)' }}>{canje.premioNombre}</p>
                      <p className="text-xs mt-0.5" style={{ color: isLow ? '#f87171' : 'var(--muted)' }}>
                        ⏱ {isLow ? '¡Vence pronto!' : 'Válido hasta'} {new Date(canje.expiraEn).toLocaleString('es-CL')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black tracking-widest" style={{ color: 'var(--fire)' }}>{canje.codigo}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>Mostrar en caja</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Historial */}
          {pastCanjes.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)', fontSize: '10px' }}>Historial</p>
              {pastCanjes.slice(0, 5).map(canje => (
                <div
                  key={canje.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <span className="text-lg">{canje.premioIcono || '🎁'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--muted)' }}>{canje.premioNombre}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)', fontSize: '10px' }}>{canje.codigo}</p>
                  </div>
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: canje.status === 'used' ? 'rgba(74,222,128,0.15)' : 'var(--surface2)',
                      color: canje.status === 'used' ? '#4ade80' : 'var(--muted)',
                    }}
                  >
                    {canje.status === 'used' ? 'USADO' : 'EXPIRADO'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {confirmPremio && (
        <ConfirmModal
          premio={confirmPremio}
          userSellos={sellosActuales}
          onConfirm={handleCanjear}
          onClose={() => setConfirmPremio(null)}
          loading={canjeando}
        />
      )}
      {successData && (
        <SuccessScreen
          data={successData}
          onClose={() => { setSuccessData(null); canjesRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
        />
      )}
    </div>
  );
}

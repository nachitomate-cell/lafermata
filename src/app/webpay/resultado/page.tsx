'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmarPedido, subscribePedidoByOrder } from '@/lib/pedidos';
import type { Pedido, PedidoStatus } from '@/lib/pedidos';

function formatCLP(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

// ─── Animations ───────────────────────────────────────────────────────────────

const ANIMATIONS = `
@keyframes dot-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-10px); opacity: 1; }
}
@keyframes fuego-flicker {
  0%, 100% { transform: scale(1) rotate(-3deg); }
  25% { transform: scale(1.15) rotate(3deg); }
  50% { transform: scale(0.95) rotate(-2deg); }
  75% { transform: scale(1.1) rotate(2deg); }
}
@keyframes horno-glow {
  0%, 100% { box-shadow: 0 0 30px rgba(232,65,26,0.3), 0 0 60px rgba(232,65,26,0.1); }
  50% { box-shadow: 0 0 50px rgba(232,65,26,0.6), 0 0 100px rgba(201,168,76,0.2); }
}
@keyframes lista-pop {
  0% { transform: scale(0.3); opacity: 0; }
  60% { transform: scale(1.25); }
  80% { transform: scale(0.92); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes sparkle-up {
  0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-60px) scale(0) rotate(180deg); opacity: 0; }
}
@keyframes preparando-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes slide-in-up {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes step-fill {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
`;

// ─── Status configs ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Exclude<PedidoStatus, 'pending' | 'nuevo' | 'entregado'>,
  { title: string; subtitle: string; color: string; bg: string; border: string }
> = {
  en_preparacion: {
    title: 'Preparando tu pedido',
    subtitle: 'Estamos reuniendo los ingredientes para tu pizza',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.3)',
  },
  en_horno: {
    title: '¡En el horno!',
    subtitle: 'Tu pizza está recibiendo el calor del horno de piedra 🔥',
    color: '#e8411a',
    bg: 'rgba(232,65,26,0.08)',
    border: 'rgba(232,65,26,0.4)',
  },
  lista: {
    title: '¡Lista para retirar!',
    subtitle: 'Pasa por el mostrador — tu pedido te espera caliente',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.35)',
  },
};

const STEPS: { key: PedidoStatus; label: string }[] = [
  { key: 'en_preparacion', label: 'Preparando' },
  { key: 'en_horno',       label: 'En el horno' },
  { key: 'lista',          label: 'Lista' },
];

function stepIndex(status: PedidoStatus): number {
  return STEPS.findIndex(s => s.key === status);
}

// ─── Animated icon for each state ─────────────────────────────────────────────

function PreparandoIcon() {
  return (
    <div style={{ animation: 'preparando-pulse 2s ease-in-out infinite' }}>
      <div className="text-7xl text-center select-none">👨‍🍳</div>
      <div className="flex justify-center gap-2 mt-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-3 h-3 rounded-full"
            style={{
              background: '#f59e0b',
              animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
        ))}
      </div>
    </div>
  );
}

function HornoIcon() {
  return (
    <div className="relative flex justify-center items-center" style={{ height: 100 }}>
      {/* outer glow */}
      <div className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(232,65,26,0.25) 0%, transparent 70%)', animation: 'horno-glow 1.5s ease-in-out infinite' }} />
      <div className="relative flex gap-1">
        {['🔥','🍕','🔥'].map((e, i) => (
          <span key={i} className="text-5xl select-none"
            style={{ animation: `fuego-flicker ${0.8 + i * 0.15}s ease-in-out ${i * 0.1}s infinite`, display: 'inline-block' }}>
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

function ListaIcon() {
  const sparkles = ['✨','⭐','🌟','✨','⭐'];
  return (
    <div className="relative flex justify-center items-center" style={{ height: 120 }}>
      {sparkles.map((s, i) => (
        <span key={i} className="absolute text-xl select-none"
          style={{
            left: `${15 + i * 17}%`,
            bottom: '10%',
            animation: `sparkle-up ${1.2 + i * 0.2}s ease-out ${i * 0.15}s infinite`,
          }}>
          {s}
        </span>
      ))}
      <span className="relative text-8xl select-none"
        style={{ animation: 'lista-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        🎉
      </span>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressSteps({ status }: { status: PedidoStatus }) {
  const current = stepIndex(status);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done    = i <= current;
        const active  = i === current;
        const color   = done ? STATUS_CONFIG[step.key as keyof typeof STATUS_CONFIG]?.color ?? '#4ade80' : 'var(--border)';
        return (
          <div key={step.key} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500"
                style={{
                  background: done ? color : 'var(--surface2)',
                  border: `2px solid ${color}`,
                  boxShadow: active ? `0 0 12px ${color}88` : 'none',
                }}>
                {done && !active ? '✓' : i + 1}
              </div>
              <p className="text-xs font-bold" style={{ color: done ? color : 'var(--muted)', whiteSpace: 'nowrap' }}>
                {step.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 rounded-full overflow-hidden mb-5" style={{ background: 'var(--surface2)', minWidth: 24 }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: i < current ? '100%' : '0%',
                    background: `linear-gradient(90deg, ${color}, ${STATUS_CONFIG[STEPS[Math.min(i+1, STEPS.length-1)].key as keyof typeof STATUS_CONFIG]?.color ?? color})`,
                  }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Order tracker ────────────────────────────────────────────────────────────

function OrderTracker({ buyOrder, authCode }: { buyOrder: string; authCode: string }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const confirmed = useRef(false);

  useEffect(() => {
    if (!confirmed.current) {
      confirmed.current = true;
      confirmarPedido(buyOrder, authCode).catch(() => {});
    }
    return subscribePedidoByOrder(buyOrder, setPedido);
  }, [buyOrder, authCode]);

  const status = (pedido?.status ?? 'en_preparacion') as Exclude<PedidoStatus, 'pending' | 'nuevo' | 'entregado'>;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.en_preparacion;

  return (
    <div className="w-full max-w-md mx-auto space-y-4" style={{ animation: 'slide-in-up 0.5s ease forwards' }}>

      {/* Status card */}
      <div className="rounded-3xl p-6 text-center space-y-5 transition-all duration-700"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>

        {/* Animated icon */}
        <div className="py-2">
          {status === 'en_preparacion' && <PreparandoIcon />}
          {status === 'en_horno'       && <HornoIcon />}
          {status === 'lista'          && <ListaIcon />}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black transition-all duration-500" style={{ color: cfg.color }}>
            {cfg.title}
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{cfg.subtitle}</p>
        </div>

        {/* Progress steps */}
        <div className="pt-2">
          <ProgressSteps status={status} />
        </div>
      </div>

      {/* Order details */}
      {pedido && (
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', animation: 'slide-in-up 0.5s ease 0.15s both' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Tu pedido
          </p>
          <div className="space-y-1.5">
            {pedido.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span style={{ color: 'var(--cream)' }}>
                  {item.cantidad}× {item.nombre}
                </span>
                <span style={{ color: 'var(--gold)' }}>{formatCLP(item.precio * item.cantidad)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-bold pt-1"
            style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <span style={{ color: 'var(--muted)' }}>Total pagado</span>
            <span style={{ color: 'var(--gold)' }}>{formatCLP(pedido.amount)}</span>
          </div>
          <p className="text-xs font-mono text-center" style={{ color: 'var(--muted)', opacity: 0.6 }}>
            Orden #{pedido.buyOrder.slice(-8).toUpperCase()}
          </p>
        </div>
      )}

      {/* Pickup reminder */}
      <div className="rounded-xl px-4 py-3 text-center text-sm"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)',
          animation: 'slide-in-up 0.5s ease 0.3s both' }}>
        📍 Retiro en Av. Libertad 1040, Viña del Mar
      </div>

      <Link href="/" className="block text-center text-sm pt-1" style={{ color: 'var(--muted)' }}>
        ← Inicio
      </Link>
    </div>
  );
}

// ─── Non-success screens ──────────────────────────────────────────────────────

function ErrorScreen({ status }: { status: string }) {
  const cancelled = status === 'cancelado';
  return (
    <div className="w-full max-w-md rounded-3xl p-8 text-center space-y-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-6xl">{cancelled ? '↩️' : '❌'}</div>
      <div className="space-y-1">
        <h1 className="text-xl font-black" style={{ color: 'var(--cream)' }}>
          {cancelled ? 'Pago cancelado' : 'Pago rechazado'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {cancelled
            ? 'Cancelaste el proceso de pago.'
            : 'El pago no pudo procesarse. Intenta nuevamente.'}
        </p>
      </div>
      <Link href="/menu"
        className="flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black transition-all active:scale-95"
        style={{ background: 'var(--fire)', color: '#fff' }}>
        🍕 Volver a la carta
      </Link>
      <Link href="/" className="block text-sm" style={{ color: 'var(--muted)' }}>← Inicio</Link>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function ResultContent() {
  const params = useSearchParams();
  const status = params.get('status') ?? '';
  const order  = params.get('order') ?? '';
  const auth   = params.get('auth')  ?? '';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-28 pt-8">
      <style>{ANIMATIONS}</style>
      {status === 'exitoso' && order
        ? <OrderTracker buyOrder={order} authCode={auth} />
        : <ErrorScreen status={status} />}
    </div>
  );
}

export default function WebPayResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}

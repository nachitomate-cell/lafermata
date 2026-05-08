'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { subscribePedidoByOrder, confirmarPedido, savePushSubscription } from '@/lib/pedidos';
import type { Pedido, PedidoStatus } from '@/lib/pedidos';
import { subscribeChat, sendMessage } from '@/lib/chat';
import type { ChatMessage } from '@/lib/chat';

// ─── Stepper config ───────────────────────────────────────────────────────────

const STEPS: { label: string; statuses: PedidoStatus[]; color: string; icon: string }[] = [
  { label: 'Recibido',          statuses: ['nuevo', 'pending'], color: '#c9a84c', icon: '✓' },
  { label: 'En Preparación',    statuses: ['en_preparacion', 'en_horno'], color: '#f59e0b', icon: '👨‍🍳' },
  { label: 'Listo para Retiro', statuses: ['lista'],            color: '#4ade80', icon: '🎉' },
];

function getStepIndex(status: PedidoStatus): number {
  const idx = STEPS.findIndex(s => s.statuses.includes(status));
  return idx === -1 ? 0 : idx;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCLP(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

function formatTime(ts: ChatMessage['timestamp']): string {
  if (!ts) return '';
  try {
    return ts.toDate().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── Page content (requires Suspense for useSearchParams) ────────────────────

function OrderContent() {
  const rawParams = useParams();
  const id = rawParams.id as string;
  const searchParams = useSearchParams();
  const isPaid = searchParams.get('paid') === '1';
  const authCode = searchParams.get('auth') ?? '';

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  const [notifDismissed, setNotifDismissed] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const confirmedRef = useRef(false);
  const prevStatusRef = useRef<PedidoStatus | null>(null);

  // Init notification state (client-only)
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
      setNotifDismissed(localStorage.getItem('lf_notif_dismissed') === 'true');
    }
  }, []);

  // Anonymous auth for chat identity (best-effort — works even if disabled)
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(() => {});
    }
  }, []);

  // Subscribe to order by buyOrder from URL
  useEffect(() => {
    const unsub = subscribePedidoByOrder(id, p => {
      setPedido(p);
      if (p === null) setNotFound(true);
    });
    return unsub;
  }, [id]);

  // Fire browser notification when status transitions to lista
  useEffect(() => {
    if (!pedido) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = pedido.status;
    if (prev !== null && prev !== 'lista' && pedido.status === 'lista') {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('🎉 ¡Tu pedido está listo!', {
          body: 'Pasa a retirarlo en Av. Libertad 1040, Viña del Mar',
          icon: '/icon-192.png',
          tag: 'order-ready',
        });
      }
    }
  }, [pedido?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side WebPay confirmation fallback
  useEffect(() => {
    if (!isPaid || !pedido || confirmedRef.current) return;
    if (pedido.status === 'pending') {
      confirmedRef.current = true;
      confirmarPedido(id, authCode).catch(() => {});
    }
  }, [isPaid, pedido, id, authCode]);

  // Subscribe to chat once we have the Firestore doc ID
  useEffect(() => {
    if (!pedido?.id) return;
    return subscribeChat(pedido.id, setMessages);
  }, [pedido?.id]);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleEnableNotifs() {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm !== 'granted' || !id) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });
      await savePushSubscription(id, sub);
    } catch {
      // push subscription failed — in-page notification still works
    }
  }

  function handleDismissNotifs() {
    localStorage.setItem('lf_notif_dismissed', 'true');
    setNotifDismissed(true);
  }

  async function handleSend() {
    if (!pedido || !chatInput.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(pedido.id, chatInput.trim(), 'client');
      setChatInput('');
    } finally {
      setSending(false);
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (!pedido && !notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--fire)' }}
          />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Cargando tu pedido…
          </p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-xs">
          <p className="text-4xl">🔍</p>
          <h1 className="text-lg font-black" style={{ color: 'var(--cream)' }}>
            Pedido no encontrado
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No pudimos encontrar este pedido. Verifica el enlace o contacta al local.
          </p>
          <Link
            href="/menu"
            className="inline-block mt-2 py-3 px-6 rounded-2xl text-sm font-black"
            style={{ background: 'var(--fire)', color: '#fff' }}
          >
            Volver al menú
          </Link>
        </div>
      </div>
    );
  }

  const stepIdx = getStepIndex(pedido!.status);
  const isListo = pedido!.status === 'lista';
  const isEntregado = pedido!.status === 'entregado';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Sticky header */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{
          background: 'rgba(12,11,9,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link
          href="/"
          className="flex items-center justify-center w-9 h-9 rounded-full text-sm"
          style={{ background: 'var(--surface)', color: 'var(--muted)' }}
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: 'var(--cream)' }}>
            Seguimiento del pedido
          </p>
          <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
            #{pedido!.buyOrder.slice(-8).toUpperCase()}
          </p>
        </div>
        {isListo && (
          <div
            className="px-3 py-1 rounded-full text-xs font-bold anim-badge-pop"
            style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)' }}
          >
            ¡Listo!
          </div>
        )}
      </header>

      {/* Notification permission banner */}
      {notifPermission === 'default' && !notifDismissed && !isEntregado && (
        <div
          className="mx-4 mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 anim-fade-in-up"
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(201,168,76,0.35)',
          }}
        >
          <span className="text-xl flex-shrink-0">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--cream)' }}>
              Activa las notificaciones
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Te avisamos cuando tu pedido esté listo
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleEnableNotifs}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{ background: 'var(--fire)', color: '#fff' }}
            >
              Activar
            </button>
            <button
              onClick={handleDismissNotifs}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
              style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Status card + Stepper */}
      <div className="px-4 pt-5 space-y-4">
        <div
          className="rounded-3xl p-5 space-y-5 transition-all duration-700"
          style={{
            background: isListo
              ? 'rgba(74,222,128,0.06)'
              : isEntregado
                ? 'rgba(201,168,76,0.06)'
                : 'var(--surface)',
            border: `1px solid ${isListo ? 'rgba(74,222,128,0.3)' : isEntregado ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
          }}
        >
          {/* Step nodes */}
          <div className="flex items-start">
            {STEPS.map((step, i) => {
              const done   = i <= stepIdx;
              const active = i === stepIdx;
              const color  = done ? step.color : 'var(--border)';
              return (
                <div
                  key={step.label}
                  className="flex items-start"
                  style={{ flex: i < STEPS.length - 1 ? 1 : 'none' }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500"
                      style={{
                        background: done ? color : 'var(--surface2)',
                        border: `2px solid ${color}`,
                        boxShadow: active ? `0 0 16px ${color}66` : 'none',
                        color: done ? (i === 2 ? '#022c22' : '#1a0a00') : 'var(--muted)',
                        minWidth: 36,
                      }}
                    >
                      {done && !active ? '✓' : i + 1}
                    </div>
                    <p
                      className="text-xs font-semibold text-center leading-tight"
                      style={{ color: done ? color : 'var(--muted)', maxWidth: 68 }}
                    >
                      {step.label}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mt-4 mx-1 rounded-full overflow-hidden"
                      style={{ background: 'var(--surface2)', minWidth: 12 }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: i < stepIdx ? '100%' : '0%',
                          background: `linear-gradient(90deg, ${STEPS[i].color}, ${STEPS[i + 1].color})`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status message */}
          <div className="text-center pt-1">
            {(pedido!.status === 'nuevo' || pedido!.status === 'pending') && (
              <p className="text-sm font-semibold" style={{ color: '#c9a84c' }}>
                Revisando tu pedido para pasarlo a cocina…
              </p>
            )}
            {pedido!.status === 'en_preparacion' && (
              <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                👨‍🍳 ¡Estamos preparando tu pedido!
              </p>
            )}
            {pedido!.status === 'en_horno' && (
              <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                🔥 ¡Tu pizza está en el horno!
              </p>
            )}
            {pedido!.status === 'lista' && (
              <p className="text-sm font-black anim-fade-in" style={{ color: '#4ade80' }}>
                🎉 ¡Tu pedido está listo para retirar!
              </p>
            )}
            {pedido!.status === 'entregado' && (
              <p className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>
                ¡Pedido entregado! ¡Gracias por elegirnos!
              </p>
            )}
          </div>
        </div>

        {/* Order details */}
        <div
          className="rounded-2xl p-4 space-y-2 anim-fade-in-up"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: '80ms' }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: 'var(--muted)' }}
          >
            Tu pedido
          </p>
          {pedido!.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span style={{ color: 'var(--cream)' }}>
                {item.cantidad}× {item.nombre}
              </span>
              <span style={{ color: 'var(--gold)' }}>
                {formatCLP(item.precio * item.cantidad)}
              </span>
            </div>
          ))}
          <div
            className="flex justify-between text-sm font-bold"
            style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}
          >
            <span style={{ color: 'var(--muted)' }}>
              Total{pedido!.paymentMethod === 'efectivo' ? ' (pago en local)' : ' pagado'}
            </span>
            <span style={{ color: 'var(--gold)' }}>{formatCLP(pedido!.amount)}</span>
          </div>
        </div>

        {/* Pickup info */}
        <div
          className="rounded-xl px-4 py-3 text-center text-sm anim-fade-in-up"
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            animationDelay: '120ms',
          }}
        >
          📍 Retiro en Av. Libertad 1040, Viña del Mar
        </div>
      </div>

      {/* Chat widget */}
      <div className="px-4 pt-4 pb-6 flex-1 flex flex-col anim-fade-in-up" style={{ animationDelay: '160ms' }}>
        <div
          className="flex-1 flex flex-col rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Chat header */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade8088' }}
            />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Chat con el local
            </p>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ minHeight: 200, maxHeight: 360 }}
          >
            {messages.length === 0 && (
              <p
                className="text-center text-xs py-6"
                style={{ color: 'var(--muted)', opacity: 0.7 }}
              >
                Aquí verás las actualizaciones de tu pedido
              </p>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === 'client'
                    ? 'justify-end'
                    : msg.sender === 'system'
                      ? 'justify-center'
                      : 'justify-start'
                }`}
              >
                {msg.sender === 'system' ? (
                  <div
                    className="max-w-[85%] px-4 py-2 rounded-2xl text-xs text-center"
                    style={{
                      background: 'var(--surface2)',
                      color: 'var(--muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {msg.text}
                    <div className="text-xs mt-0.5 opacity-50">{formatTime(msg.timestamp)}</div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[80%] flex flex-col gap-1 ${
                      msg.sender === 'client' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className="px-4 py-2.5 text-sm leading-relaxed"
                      style={{
                        background:
                          msg.sender === 'client' ? 'var(--fire)' : 'var(--surface2)',
                        color: msg.sender === 'client' ? '#fff' : 'var(--cream)',
                        border:
                          msg.sender === 'staff' ? '1px solid var(--border)' : 'none',
                        borderRadius:
                          msg.sender === 'client'
                            ? '18px 18px 4px 18px'
                            : '18px 18px 18px 4px',
                      }}
                    >
                      {msg.text}
                    </div>
                    <span className="text-xs px-1" style={{ color: 'var(--muted)' }}>
                      {msg.sender === 'client' ? 'Tú' : 'La Fermata'} ·{' '}
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-2 items-center">
              <input
                className="form-field flex-1 text-sm"
                placeholder="Escribe un mensaje al local…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                style={{ borderRadius: 14, padding: '10px 14px' }}
                disabled={pedido!.status === 'entregado'}
              />
              <button
                onClick={handleSend}
                disabled={!chatInput.trim() || sending || pedido!.status === 'entregado'}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'var(--fire)', color: '#fff' }}
              >
                {sending ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--fire)' }}
          />
        </div>
      }
    >
      <OrderContent />
    </Suspense>
  );
}

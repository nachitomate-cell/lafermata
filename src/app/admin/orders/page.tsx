'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { subscribeOrders, actualizarStatusPedido } from '@/lib/pedidos';
import type { Pedido, PedidoStatus } from '@/lib/pedidos';
import { subscribeChat, sendMessage, QUICK_REPLIES, AUTO_MSG_LISTO } from '@/lib/chat';
import type { ChatMessage } from '@/lib/chat';
import { setStaffSession, isStaffSessionValid, clearStaffSession } from '@/lib/staffSession';

const STAFF_PIN = process.env.NEXT_PUBLIC_STAFF_PIN || '4321';

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

function calcElapsed(iso: string) {
  const total = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return { display: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, minutes: m };
}

// ─── LiveTimer ────────────────────────────────────────────────────────────────

function LiveTimer({ isoString }: { isoString: string }) {
  const [elapsed, setElapsed] = useState(() => calcElapsed(isoString));
  useEffect(() => {
    const id = setInterval(() => setElapsed(calcElapsed(isoString)), 1000);
    return () => clearInterval(id);
  }, [isoString]);
  const color = elapsed.minutes < 10 ? '#4ade80' : elapsed.minutes < 20 ? '#f59e0b' : '#ef4444';
  return (
    <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>
      ⏱ {elapsed.display}
    </span>
  );
}

// ─── PIN screen ───────────────────────────────────────────────────────────────

function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, '⌫'] as const;

  function handleDigit(d: number | string) {
    if (d === '⌫') { setPin(p => p.slice(0, -1)); setError(false); return; }
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      if (next === STAFF_PIN) {
        setStaffSession();
        onSuccess();
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => { setPin(''); setShake(false); }, 600);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-xs space-y-8 anim-fade-in-up">
        <div className="text-center">
          <p className="text-4xl mb-3">🔐</p>
          <h1 className="text-xl font-black" style={{ color: 'var(--cream)' }}>Staff · Gestión de Pedidos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Ingresa tu PIN para continuar</p>
        </div>
        <div className={`flex justify-center gap-3 ${shake ? 'anim-scale-pop' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="w-4 h-4 rounded-full transition-all duration-200"
              style={{ background: i < pin.length ? (error ? '#ef4444' : 'var(--fire)') : 'var(--surface2)', border: '2px solid var(--border)' }}
            />
          ))}
        </div>
        {error && (
          <p className="text-center text-sm" style={{ color: '#f87171' }}>PIN incorrecto</p>
        )}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => (
            <button
              key={i}
              onClick={() => d !== null && handleDigit(d)}
              disabled={d === null}
              className="aspect-square rounded-2xl text-xl font-bold flex items-center justify-center transition-all active:scale-95 disabled:opacity-0"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--cream)' }}
            >
              {d}
            </button>
          ))}
        </div>
        <Link href="/admin" className="block text-center text-sm" style={{ color: 'var(--muted)' }}>
          ← Panel de administración
        </Link>
      </div>
    </div>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

interface CardProps {
  pedido: Pedido;
  selected: boolean;
  onSelect: () => void;
  actionLabel: string;
  actionColor: string;
  onAction: (e: React.MouseEvent) => void;
  isActioning: boolean;
}

function OrderCard({ pedido, selected, onSelect, actionLabel, actionColor, onAction, isActioning }: CardProps) {
  const itemCount = pedido.items.reduce((s, i) => s + i.cantidad, 0);
  return (
    <div
      onClick={onSelect}
      className="rounded-2xl p-4 cursor-pointer transition-all duration-200 space-y-3"
      style={{
        background: selected ? 'rgba(232,65,26,0.08)' : 'var(--surface2)',
        border: `1px solid ${selected ? 'rgba(232,65,26,0.5)' : 'var(--border)'}`,
        boxShadow: selected ? '0 0 0 2px rgba(232,65,26,0.2)' : 'none',
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold" style={{ color: 'var(--gold)' }}>
          #{pedido.buyOrder.slice(-6).toUpperCase()}
        </span>
        <LiveTimer isoString={pedido.creadoEn} />
      </div>

      {/* Client name */}
      {pedido.clientName && (
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--cream)' }}>
          {pedido.clientName}
        </p>
      )}

      {/* Items preview */}
      <div className="space-y-0.5">
        {pedido.items.slice(0, 3).map((item, i) => (
          <p key={i} className="text-xs truncate" style={{ color: 'var(--muted)' }}>
            {item.cantidad}× {item.nombre}
          </p>
        ))}
        {pedido.items.length > 3 && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            +{pedido.items.length - 3} más…
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: pedido.paymentMethod === 'efectivo'
                ? 'rgba(201,168,76,0.15)'
                : 'rgba(232,65,26,0.15)',
              color: pedido.paymentMethod === 'efectivo' ? 'var(--gold)' : 'var(--fire)',
            }}
          >
            {pedido.paymentMethod === 'efectivo' ? '💵 Efectivo' : '💳 WebPay'}
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>
            {formatCLP(pedido.amount)}
          </span>
        </div>
        <button
          onClick={onAction}
          disabled={isActioning}
          className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-60"
          style={{ background: actionColor, color: '#000' }}
        >
          {isActioning ? '…' : actionLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeChat(pedido.id, setMessages);
  }, [pedido.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput('');
    try {
      await sendMessage(pedido.id, text.trim(), 'staff');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed right-0 top-0 bottom-0 z-30 flex flex-col w-full max-w-sm shadow-2xl anim-slide-right"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
    >
      {/* Panel header */}
      <div
        className="flex items-start gap-3 p-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
        >
          ✕
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm" style={{ color: 'var(--cream)' }}>
            #{pedido.buyOrder.slice(-6).toUpperCase()}
            {pedido.clientName && (
              <span className="ml-2 font-normal" style={{ color: 'var(--muted)' }}>
                — {pedido.clientName}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {pedido.items.slice(0, 4).map((item, i) => (
              <span key={i} className="text-xs" style={{ color: 'var(--muted)' }}>
                {item.cantidad}× {item.nombre}
              </span>
            ))}
          </div>
          <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--gold)' }}>
            {formatCLP(pedido.amount)} · {pedido.paymentMethod === 'efectivo' ? 'Efectivo' : 'WebPay'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs py-6" style={{ color: 'var(--muted)' }}>
            Sin mensajes aún
          </p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === 'staff'
                ? 'justify-end'
                : msg.sender === 'system'
                  ? 'justify-center'
                  : 'justify-start'
            }`}
          >
            {msg.sender === 'system' ? (
              <div
                className="max-w-[90%] px-3 py-1.5 rounded-xl text-xs text-center"
                style={{
                  background: 'rgba(201,168,76,0.1)',
                  color: 'var(--gold)',
                  border: '1px solid rgba(201,168,76,0.25)',
                }}
              >
                {msg.text}
                <div className="opacity-50 mt-0.5">{formatTime(msg.timestamp)}</div>
              </div>
            ) : (
              <div
                className={`max-w-[80%] flex flex-col gap-1 ${
                  msg.sender === 'staff' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className="px-3 py-2 text-sm leading-relaxed"
                  style={{
                    background: msg.sender === 'staff' ? 'var(--fire)' : 'var(--surface2)',
                    color: msg.sender === 'staff' ? '#fff' : 'var(--cream)',
                    border: msg.sender === 'client' ? '1px solid var(--border)' : 'none',
                    borderRadius:
                      msg.sender === 'staff'
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                  }}
                >
                  {msg.text}
                </div>
                <span className="text-xs px-1" style={{ color: 'var(--muted)' }}>
                  {msg.sender === 'staff' ? 'Staff' : 'Cliente'} · {formatTime(msg.timestamp)}
                </span>
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Quick replies */}
      <div
        className="p-3 space-y-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide px-1" style={{ color: 'var(--muted)' }}>
          Respuestas rápidas
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REPLIES.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSend(reply)}
              disabled={sending}
              className="text-xs px-3 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-50 text-left"
              style={{
                background: 'var(--surface2)',
                color: 'var(--cream)',
                border: '1px solid var(--border)',
                maxWidth: '100%',
              }}
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-2 items-center">
          <input
            className="form-field flex-1 text-sm"
            placeholder="Responder al cliente…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            style={{ borderRadius: 14, padding: '10px 14px' }}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--fire)', color: '#fff' }}
          >
            {sending ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

interface ColumnProps {
  title: string;
  color: string;
  pedidos: Pedido[];
  actionLabel: string;
  actionColor: string;
  selectedId: string | null;
  onSelect: (p: Pedido) => void;
  onAction: (p: Pedido) => Promise<void>;
}

function KanbanColumn({
  title, color, pedidos, actionLabel, actionColor, selectedId, onSelect, onAction,
}: ColumnProps) {
  const [actioning, setActioning] = useState<string | null>(null);

  async function handleAction(e: React.MouseEvent, p: Pedido) {
    e.stopPropagation();
    setActioning(p.id);
    try {
      await onAction(p);
    } finally {
      setActioning(null);
    }
  }

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden flex-shrink-0"
      style={{
        width: 280,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        maxHeight: 'calc(100vh - 80px)',
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}88` }}
        />
        <p className="text-sm font-black" style={{ color: 'var(--cream)' }}>
          {title}
        </p>
        <span
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}22`, color }}
        >
          {pedidos.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {pedidos.length === 0 && (
          <p className="text-center text-xs py-6" style={{ color: 'var(--muted)', opacity: 0.6 }}>
            Sin pedidos aquí
          </p>
        )}
        {pedidos.map(p => (
          <OrderCard
            key={p.id}
            pedido={p}
            selected={selectedId === p.id}
            onSelect={() => onSelect(p)}
            actionLabel={actionLabel}
            actionColor={actionColor}
            onAction={e => handleAction(e, p)}
            isActioning={actioning === p.id}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);

  useEffect(() => {
    if (isStaffSessionValid()) setUnlocked(true);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    return subscribeOrders(list => {
      setPedidos(list);
      // Keep selectedOrder in sync with updated data
      setSelectedOrder(prev =>
        prev ? (list.find(p => p.id === prev.id) ?? null) : null,
      );
    });
  }, [unlocked]);

  const nuevos    = pedidos.filter(p => p.status === 'nuevo');
  const cocinando = pedidos.filter(p => ['en_preparacion', 'en_horno'].includes(p.status));
  const listos    = pedidos.filter(p => p.status === 'lista');

  const advance = useCallback(
    async (pedido: Pedido, nextStatus: PedidoStatus) => {
      await actualizarStatusPedido(pedido.id, nextStatus);
      if (nextStatus === 'lista') {
        await sendMessage(pedido.id, AUTO_MSG_LISTO, 'system');
        if (pedido.pushSubscription) {
          fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'pedido_listo',
              subscription: pedido.pushSubscription,
              buyOrder: pedido.buyOrder,
            }),
          }).catch(() => {});
        }
      }
    },
    [],
  );

  if (!unlocked) {
    return <PinScreen onSuccess={() => setUnlocked(true)} />;
  }

  const totalActivos = nuevos.length + cocinando.length + listos.length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{
          background: 'rgba(12,11,9,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link
          href="/admin"
          className="flex items-center justify-center w-9 h-9 rounded-full text-sm"
          style={{ background: 'var(--surface)', color: 'var(--muted)' }}
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: 'var(--cream)' }}>
            Gestión de Pedidos
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {totalActivos > 0 ? `${totalActivos} pedido${totalActivos !== 1 ? 's' : ''} activo${totalActivos !== 1 ? 's' : ''}` : 'Sin pedidos activos'}
          </p>
        </div>
        <button
          onClick={() => { clearStaffSession(); setUnlocked(false); }}
          className="text-xs px-3 py-1.5 rounded-xl"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          Salir
        </button>
      </header>

      {/* Board */}
      <div
        className="flex-1 flex overflow-x-auto gap-4 p-4"
        style={{ alignItems: 'flex-start' }}
      >
        <KanbanColumn
          title="Nuevos"
          color="#c9a84c"
          pedidos={nuevos}
          actionLabel="Comenzar"
          actionColor="#c9a84c"
          selectedId={selectedOrder?.id ?? null}
          onSelect={setSelectedOrder}
          onAction={p => advance(p, 'en_preparacion')}
        />
        <KanbanColumn
          title="Cocinando"
          color="#f59e0b"
          pedidos={cocinando}
          actionLabel="Marcar listo"
          actionColor="#4ade80"
          selectedId={selectedOrder?.id ?? null}
          onSelect={setSelectedOrder}
          onAction={p => advance(p, 'lista')}
        />
        <KanbanColumn
          title="Listos"
          color="#4ade80"
          pedidos={listos}
          actionLabel="Entregado ✓"
          actionColor="#6b7280"
          selectedId={selectedOrder?.id ?? null}
          onSelect={setSelectedOrder}
          onAction={p => advance(p, 'entregado')}
        />
      </div>

      {/* Chat side panel */}
      {selectedOrder && (
        <>
          <div
            className="fixed inset-0 z-20 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedOrder(null)}
          />
          <ChatPanel
            pedido={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        </>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { crearPedidoPendiente, crearPedidoDirecto } from '@/lib/pedidos';
import { sendMessage, AUTO_MSG_RECIBIDO } from '@/lib/chat';
import type { CartItem } from '@/context/CartContext';

interface Props {
  items: CartItem[];
  total: number;
  onClose: () => void;
  onClearCart: () => void;
}

function formatCLP(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

async function getAnonymousUid(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const { user } = await signInAnonymously(auth);
    return user.uid;
  } catch {
    // Anonymous Auth not enabled in Firebase → use a stable session fallback
    const KEY = 'lf_session_uid';
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const generated = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem(KEY, generated);
    return generated;
  }
}

export default function CheckoutModal({ items, total, onClose, onClearCart }: Props) {
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState<'webpay' | 'efectivo' | null>(null);
  const [error, setError] = useState('');

  function buildPedidoItems() {
    return items.map(item => ({
      nombre:
        item.product.name +
        (item.product.priceFamily
          ? item.sizeFamily ? ' (Familiar)' : ' (Individual)'
          : ''),
      precio:
        item.sizeFamily && item.product.priceFamily
          ? item.product.priceFamily
          : item.product.price,
      cantidad: item.quantity,
    }));
  }

  async function handleEfectivo() {
    setError('');
    setLoading('efectivo');
    try {
      const uid = await getAnonymousUid();
      const buyOrder = `LF${Date.now()}`.slice(0, 26);

      // 1. Create order in Firestore (critical)
      const docId = await crearPedidoDirecto(
        buyOrder,
        buildPedidoItems(),
        total,
        uid,
        clientName.trim(),
      );

      // 2. Auto welcome message (non-blocking — chat rules may not be set yet)
      sendMessage(docId, AUTO_MSG_RECIBIDO, 'system').catch(() => {});

      localStorage.setItem('lf_active_order', buyOrder);
      onClearCart();
      onClose();
      router.push(`/order/${buyOrder}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
      setLoading(null);
    }
  }

  async function handleWebPay() {
    setError('');
    setLoading('webpay');
    try {
      const uid = await getAnonymousUid();
      const buyOrder = `LF${Date.now()}`.slice(0, 26);
      const sessionId = `s${Date.now()}`;
      const returnUrl = `${window.location.origin}/api/webpay/confirm`;

      await crearPedidoPendiente(buyOrder, buildPedidoItems(), total, uid);
      localStorage.setItem('lf_active_order', buyOrder);

      const res = await fetch('/api/webpay/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total, buyOrder, sessionId, returnUrl }),
      });
      if (!res.ok) throw new Error('WebPay error');
      const { token, url } = await res.json();

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'token_ws';
      input.value = token;
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } catch {
      setError('Error al conectar con WebPay. Intenta nuevamente.');
      setLoading(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] anim-fade-in"
        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
        onClick={loading ? undefined : onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-md rounded-t-3xl anim-fade-in-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        <div className="px-6 pt-3 pb-8 space-y-5">
          {/* Title */}
          <div>
            <h3 className="text-xl font-black" style={{ color: 'var(--cream)' }}>
              Confirmar pedido
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              {items.length} producto{items.length !== 1 ? 's' : ''} · {formatCLP(total)}
            </p>
          </div>

          {/* Summary */}
          <div
            className="rounded-2xl p-4 space-y-2 max-h-40 overflow-y-auto"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            {items.map((item, i) => {
              const price =
                item.sizeFamily && item.product.priceFamily
                  ? item.product.priceFamily
                  : item.product.price;
              return (
                <div key={i} className="flex justify-between text-sm">
                  <span style={{ color: 'var(--cream)' }}>
                    {item.quantity}× {item.product.name}
                    {item.product.priceFamily && (
                      <span className="ml-1 text-xs" style={{ color: 'var(--muted)' }}>
                        {item.sizeFamily ? '(Familiar)' : '(Individual)'}
                      </span>
                    )}
                  </span>
                  <span style={{ color: 'var(--gold)' }}>
                    {formatCLP(price * item.quantity)}
                  </span>
                </div>
              );
            })}
            <div
              className="flex justify-between text-sm font-bold"
              style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}
            >
              <span style={{ color: 'var(--muted)' }}>Total</span>
              <span style={{ color: 'var(--gold)' }}>{formatCLP(total)}</span>
            </div>
          </div>

          {/* Name */}
          <input
            className="form-field"
            placeholder="Tu nombre (opcional)"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            maxLength={40}
            disabled={loading !== null}
          />

          {error && (
            <p className="text-xs text-center" style={{ color: '#f87171' }}>{error}</p>
          )}

          {/* WebPay */}
          <button
            onClick={handleWebPay}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-4 text-sm font-black transition-all active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #e8411a, #c9a84c)', color: '#fff' }}
          >
            {loading === 'webpay' ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            )}
            {loading === 'webpay' ? 'Conectando con WebPay…' : 'Pagar en línea con WebPay'}
          </button>

          {/* Efectivo */}
          <button
            onClick={handleEfectivo}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-4 text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: 'var(--surface2)',
              color: 'var(--cream)',
              border: '1px solid var(--border)',
            }}
          >
            {loading === 'efectivo' ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              '💵'
            )}
            {loading === 'efectivo' ? 'Creando pedido…' : 'Pagar en el local (efectivo)'}
          </button>

          <button
            onClick={loading ? undefined : onClose}
            disabled={loading !== null}
            className="w-full text-sm py-2 disabled:opacity-40"
            style={{ color: 'var(--muted)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}

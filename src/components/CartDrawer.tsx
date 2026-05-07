'use client';

import { useCart } from '@/context/CartContext';
import { useEffect, useState } from 'react';
import { crearPedidoPendiente } from '@/lib/pedidos';

function formatCLP(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

function buildWhatsAppMessage(items: ReturnType<typeof useCart>['items'], total: number) {
  const lines = items.map(i => {
    const price = i.sizeFamily && i.product.priceFamily ? i.product.priceFamily : i.product.price;
    const size = i.product.priceFamily ? (i.sizeFamily ? ' (Familiar)' : ' (Individual)') : '';
    return `• ${i.quantity}x ${i.product.name}${size} – ${formatCLP(price * i.quantity)}`;
  });
  const msg = [
    '🍕 *Pedido La Fermata App*',
    '',
    ...lines,
    '',
    `*Total: ${formatCLP(total)}*`,
    '',
    '📍 Retiro en: Av. Libertad 1040, Viña del Mar',
  ].join('\n');
  return encodeURIComponent(msg);
}

export default function CartDrawer() {
  const { items, add, remove, clear, total, count, isOpen, setIsOpen } = useCart();
  const [webpayLoading, setWebpayLoading] = useState(false);
  const [webpayError, setWebpayError] = useState('');

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  async function handleWebPay() {
    setWebpayError('');
    setWebpayLoading(true);
    try {
      const buyOrder = `LF${Date.now()}`.slice(0, 26);
      const sessionId = `s${Date.now()}`;
      const returnUrl = `${window.location.origin}/api/webpay/confirm`;

      // Persist cart to Firestore before leaving the page
      const pedidoItems = items.map(item => ({
        nombre: item.product.name + (item.product.priceFamily
          ? (item.sizeFamily ? ' (Familiar)' : ' (Individual)') : ''),
        precio: item.sizeFamily && item.product.priceFamily
          ? item.product.priceFamily : item.product.price,
        cantidad: item.quantity,
      }));
      await crearPedidoPendiente(buyOrder, pedidoItems, total);

      const res = await fetch('/api/webpay/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total, buyOrder, sessionId, returnUrl }),
      });

      if (!res.ok) throw new Error('No se pudo iniciar el pago');

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
      setWebpayError('Error al conectar con WebPay. Intenta nuevamente.');
      setWebpayLoading(false);
    }
  }

  const whatsappUrl = `https://wa.me/56941225555?text=${buildWhatsAppMessage(items, total)}`;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 anim-fade-in"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={() => setIsOpen(false)}
      />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-md shadow-2xl anim-slide-right"
        style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--cream)' }}>
            Tu pedido {count > 0 && <span style={{ color: 'var(--fire)' }}>({count})</span>}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 transition-colors"
            style={{ color: 'var(--muted)', background: 'var(--surface2)' }}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <span className="text-5xl">🍕</span>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Tu carrito está vacío</p>
              <button
                onClick={() => setIsOpen(false)}
                className="mt-2 text-sm underline"
                style={{ color: 'var(--fire)' }}
              >
                Ver la carta
              </button>
            </div>
          ) : (
            items.map((item, idx) => {
              const price = item.sizeFamily && item.product.priceFamily
                ? item.product.priceFamily
                : item.product.price;
              const key = item.product.id + (item.sizeFamily ? '-f' : '-i');
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-xl p-3 anim-fade-in-up"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--cream)' }}>
                      {item.product.name}
                      {item.product.priceFamily && (
                        <span className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>
                          {item.sizeFamily ? 'Familiar' : 'Individual'}
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--gold)' }}>
                      {formatCLP(price)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => remove(item.product.id, item.sizeFamily)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--border)', color: 'var(--cream)' }}
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold" style={{ color: 'var(--cream)' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => add(item.product, item.sizeFamily)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--fire)', color: '#fff' }}
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-semibold w-16 text-right" style={{ color: 'var(--cream)' }}>
                    {formatCLP(price * item.quantity)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex justify-between text-sm" style={{ color: 'var(--muted)' }}>
              <span>Subtotal</span>
              <span style={{ color: 'var(--cream)', fontWeight: 600 }}>{formatCLP(total)}</span>
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
              📍 Solo retiro en Av. Libertad 1040
            </p>

            {/* WebPay online */}
            {webpayError && (
              <p className="text-xs text-center" style={{ color: '#f87171' }}>{webpayError}</p>
            )}
            <button
              onClick={handleWebPay}
              disabled={webpayLoading}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-4 text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #e8411a, #c9a84c)',
                color: '#fff',
              }}
            >
              {webpayLoading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <WebPayIcon />
              )}
              {webpayLoading ? 'Conectando con WebPay…' : 'Pagar en línea con WebPay'}
            </button>

            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-95"
              style={{
                background: 'var(--surface2)',
                color: '#25D366',
                border: '1px solid var(--border)',
              }}
            >
              <WhatsAppIcon />
              Coordinar por WhatsApp
            </a>

            <button
              onClick={clear}
              className="w-full text-xs py-2 rounded-lg transition-colors"
              style={{ color: 'var(--muted)', background: 'var(--surface2)' }}
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>

    </>
  );
}

function WebPayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

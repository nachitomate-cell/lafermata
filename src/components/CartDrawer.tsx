'use client';

import { useCart } from '@/context/CartContext';
import { useEffect, useState } from 'react';
import CheckoutModal from './CheckoutModal';

function formatCLP(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

export default function CartDrawer() {
  const { items, add, remove, clear, total, count, isOpen, setIsOpen } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 anim-fade-in"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={() => { if (!showCheckout) setIsOpen(false); }}
      />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-md shadow-2xl anim-slide-right"
        style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--cream)' }}>
            Tu pedido{' '}
            {count > 0 && <span style={{ color: 'var(--fire)' }}>({count})</span>}
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
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Tu carrito está vacío
              </p>
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
              const price =
                item.sizeFamily && item.product.priceFamily
                  ? item.product.priceFamily
                  : item.product.price;
              const key = item.product.id + (item.sizeFamily ? '-f' : '-i');
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-xl p-3 anim-fade-in-up"
                  style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    animationDelay: `${idx * 60}ms`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium text-sm truncate"
                      style={{ color: 'var(--cream)' }}
                    >
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
                    <span
                      className="w-5 text-center text-sm font-semibold"
                      style={{ color: 'var(--cream)' }}
                    >
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
                  <p
                    className="text-sm font-semibold w-16 text-right"
                    style={{ color: 'var(--cream)' }}
                  >
                    {formatCLP(price * item.quantity)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="p-5 space-y-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div
              className="flex justify-between text-sm"
              style={{ color: 'var(--muted)' }}
            >
              <span>Subtotal</span>
              <span style={{ color: 'var(--cream)', fontWeight: 600 }}>
                {formatCLP(total)}
              </span>
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
              📍 Solo retiro en Av. Libertad 1040
            </p>

            <button
              onClick={() => setShowCheckout(true)}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-4 text-sm font-black transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #e8411a, #c9a84c)',
                color: '#fff',
              }}
            >
              Confirmar pedido →
            </button>

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

      {showCheckout && (
        <CheckoutModal
          items={items}
          total={total}
          onClose={() => setShowCheckout(false)}
          onClearCart={() => { clear(); setIsOpen(false); }}
        />
      )}
    </>
  );
}

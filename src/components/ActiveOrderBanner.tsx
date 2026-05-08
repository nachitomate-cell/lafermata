'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { subscribePedidoByOrder } from '@/lib/pedidos';
import type { PedidoStatus } from '@/lib/pedidos';

export default function ActiveOrderBanner() {
  const pathname = usePathname();
  const [buyOrder, setBuyOrder] = useState<string | null>(null);
  const [status, setStatus] = useState<PedidoStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const prevStatusRef = useRef<PedidoStatus | null>(null);

  // Read active order from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('lf_active_order');
    setBuyOrder(stored);
  }, []);

  // Subscribe to order status and auto-clear when delivered
  useEffect(() => {
    if (!buyOrder) return;
    return subscribePedidoByOrder(buyOrder, pedido => {
      if (!pedido || pedido.status === 'entregado') {
        localStorage.removeItem('lf_active_order');
        setBuyOrder(null);
      } else {
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
        setStatus(pedido.status);
      }
    });
  }, [buyOrder]);

  // Hide on the order tracking page itself, on admin pages, and when dismissed
  const isOrderPage = pathname.startsWith('/order/');
  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/cocina');

  if (!buyOrder || dismissed || isOrderPage || isAdminPage) return null;

  const isListo = status === 'lista';

  return (
    // Sits above BottomNav on mobile (60px), floating bottom-right on desktop
    <div className="fixed bottom-[68px] sm:bottom-5 left-0 right-0 sm:left-auto sm:right-4 z-40 flex justify-center sm:justify-end px-3 sm:px-0 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl anim-fade-in-up"
        style={{
          background: isListo
            ? 'rgba(74,222,128,0.12)'
            : 'rgba(22,20,16,0.97)',
          border: `1px solid ${isListo ? 'rgba(74,222,128,0.45)' : 'rgba(201,168,76,0.35)'}`,
          backdropFilter: 'blur(24px)',
          maxWidth: 360,
          width: '100%',
          boxShadow: isListo
            ? '0 8px 32px rgba(74,222,128,0.15)'
            : '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Pulsing status dot */}
        <div className="flex-shrink-0 relative w-3 h-3">
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-60"
            style={{ background: isListo ? '#4ade80' : '#f59e0b' }}
          />
          <span
            className="relative block w-3 h-3 rounded-full"
            style={{ background: isListo ? '#4ade80' : '#f59e0b' }}
          />
        </div>

        {/* Text — tappable area goes to order page */}
        <Link
          href={`/order/${buyOrder}`}
          className="flex-1 min-w-0 block"
        >
          <p className="text-sm font-black leading-tight truncate" style={{ color: isListo ? '#4ade80' : 'var(--cream)' }}>
            {isListo
              ? '🎉 ¡Tu pedido está listo!'
              : status === 'en_horno'
                ? '🔥 Tu pedido está en el horno'
                : status === 'en_preparacion'
                  ? '👨‍🍳 Preparando tu pedido…'
                  : '📋 Pedido recibido'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Ver seguimiento →
          </p>
        </Link>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors"
          style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';

const links = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/menu', label: 'Carta', icon: '🍕' },
  { href: '/reservas', label: 'Reservar', icon: '📅' },
  { href: '/club', label: 'Club', icon: '⭐' },
];

const HIDDEN_PATHS = ['/order/', '/admin/orders', '/cocina'];

export default function BottomNav() {
  const pathname = usePathname();
  const { count, setIsOpen } = useCart();
  const prevCount = useRef(count);
  const [badgePop, setBadgePop] = useState(false);

  useEffect(() => {
    if (count > prevCount.current) {
      setBadgePop(false);
      requestAnimationFrame(() => { setBadgePop(true); });
      setTimeout(() => setBadgePop(false), 400);
    }
    prevCount.current = count;
  }, [count]);

  // All hooks done — safe to return null conditionally now
  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex sm:hidden items-center justify-around pb-safe pt-2"
      style={{
        background: 'rgba(12,11,9,0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
      }}
    >
      {links.map(l => (
        <Link
          key={l.href}
          href={l.href}
          className="flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl"
          style={{ color: pathname === l.href ? 'var(--fire)' : 'var(--muted)' }}
        >
          <span className="text-xl">{l.icon}</span>
          <span className="text-xs font-medium">{l.label}</span>
        </Link>
      ))}
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl relative"
        style={{ color: count > 0 ? 'var(--fire)' : 'var(--muted)' }}
      >
        <span className="text-xl relative">
          🛒
          {count > 0 && (
            <span
              key={count}
              className={`absolute -top-1 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${badgePop ? 'anim-badge-pop' : ''}`}
              style={{ background: 'var(--fire)', color: '#fff', fontSize: '10px' }}
            >
              {count}
            </span>
          )}
        </span>
        <span className="text-xs font-medium">Pedido</span>
      </button>
    </nav>
  );
}

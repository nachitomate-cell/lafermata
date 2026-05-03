'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const { count, setIsOpen } = useCart();
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Inicio' },
    { href: '/menu', label: 'Carta' },
    { href: '/reservas', label: 'Reservar' },
    { href: '/club', label: '⭐ Club' },
  ];

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 py-3"
      style={{ background: 'rgba(12,11,9,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}
    >
      <Link href="/" className="flex items-center">
        {/* logo1.avif: banner horizontal oficial — fondo negro se funde con el navbar oscuro */}
        <Image
          src="/images/logo1.avif"
          alt="La Fermata"
          width={148}
          height={37}
          className="object-contain"
          priority
          unoptimized
        />
      </Link>

      <nav className="hidden sm:flex items-center gap-6">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm font-medium transition-colors"
            style={{ color: pathname === l.href ? 'var(--fire)' : 'var(--muted)' }}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95"
        style={{ background: count > 0 ? 'var(--fire)' : 'var(--surface2)', color: 'var(--cream)', border: '1px solid var(--border)' }}
      >
        <span>🛒</span>
        {count > 0 && <span>{count}</span>}
        <span className="hidden sm:inline">{count > 0 ? `Ver pedido` : 'Pedido'}</span>
      </button>
    </header>
  );
}

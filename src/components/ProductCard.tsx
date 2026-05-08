'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/data/menu';
import { useCart } from '@/context/CartContext';

const CATEGORY_IMAGES: Partial<Record<string, string>> = {
  pizzas:     '/images/pizzas/napoletana.svg',
  sin_gluten: '/images/pizzas/napoletana.svg',
};

const TAG_MAP: Record<string, { label: string; bg: string; color: string }> = {
  PC:           { label: 'Oferta',        bg: 'rgba(34,197,94,0.14)',  color: '#4ade80' },
  PP:           { label: '⭐ Popular',    bg: 'rgba(201,168,76,0.18)', color: 'var(--gold)' },
  TG:           { label: 'Destacada',     bg: 'var(--fire)',           color: '#fff' },
  'Sin Gluten': { label: '🌾 Sin Gluten', bg: 'rgba(34,197,94,0.12)', color: '#86efac' },
};

function formatCLP(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [sizeFamily, setSizeFamily] = useState(false);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(product, sizeFamily);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  const price = sizeFamily && product.priceFamily ? product.priceFamily : product.price;
  const cardImage = CATEGORY_IMAGES[product.category];

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl anim-fade-in-up"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Image — aspect-ratio 4/3 keeps consistent proportions for real photos */}
      {cardImage && (
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '4/3', background: 'var(--surface2)' }}
        >
          <Image
            src={cardImage}
            alt={product.name}
            fill
            className="object-cover"
            unoptimized
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 55%, var(--surface) 100%)' }}
          />
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug" style={{ color: 'var(--cream)' }}>
            {product.name}
          </h3>
          <div className="flex flex-wrap gap-1 shrink-0">
            {product.tags?.map(t => {
              const tag = TAG_MAP[t] ?? { label: t, bg: 'var(--surface2)', color: 'var(--muted)' };
              return (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: tag.bg, color: tag.color }}
                >
                  {tag.label}
                </span>
              );
            })}
          </div>
        </div>

        <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--muted)' }}>
          {product.description}
        </p>
        {product.note && (
          <p className="text-xs italic" style={{ color: 'var(--gold)' }}>
            ℹ️ {product.note}
          </p>
        )}
      </div>

      <div className="px-4 pb-4 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          {/* iOS-style segmented control */}
          {product.priceFamily && (
            <div
              className="relative flex rounded-full mb-2"
              style={{
                background: '#0f0e0c',
                border: '1px solid var(--border)',
                padding: '3px',
              }}
            >
              {/* Sliding indicator */}
              <div
                className="absolute rounded-full"
                style={{
                  background: 'var(--fire)',
                  top: 3,
                  bottom: 3,
                  left: sizeFamily ? '50%' : 3,
                  right: sizeFamily ? 3 : '50%',
                  transition:
                    'left 0.22s cubic-bezier(0.34,1.56,0.64,1), right 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
              <button
                onClick={() => setSizeFamily(false)}
                className="relative z-10 flex-1 text-xs px-3 py-1.5 font-semibold rounded-full"
                style={{
                  color: !sizeFamily ? '#fff' : 'rgba(245,240,232,0.45)',
                  transition: 'color 0.15s ease',
                }}
              >
                Individual
              </button>
              <button
                onClick={() => setSizeFamily(true)}
                className="relative z-10 flex-1 text-xs px-3 py-1.5 font-semibold rounded-full"
                style={{
                  color: sizeFamily ? '#fff' : 'rgba(245,240,232,0.45)',
                  transition: 'color 0.15s ease',
                }}
              >
                Familiar
              </button>
            </div>
          )}
          <span className="font-bold text-base tabular-nums" style={{ color: 'var(--gold)' }}>
            {formatCLP(price)}
          </span>
        </div>

        <button
          onClick={handleAdd}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold active:scale-95 hover:opacity-90 ${added ? 'anim-added-flash anim-scale-pop' : ''}`}
          style={{
            background: added ? '#25D366' : 'var(--fire)',
            color: '#fff',
            transition: 'background 0.25s ease, opacity 0.15s ease, transform 0.15s ease',
          }}
        >
          {added ? '✓ Listo' : '+ Agregar'}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { Product } from '@/data/menu';
import { useCart } from '@/context/CartContext';

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

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug" style={{ color: 'var(--cream)' }}>
            {product.name}
          </h3>
          {product.tags?.map(t => (
            <span
              key={t}
              className="shrink-0 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              {t === 'Sin Gluten' ? '🌾 SG' : t}
            </span>
          ))}
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

      <div
        className="px-4 pb-4 flex items-center justify-between gap-3"
      >
        <div className="flex flex-col">
          {product.priceFamily && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setSizeFamily(false)}
                className="text-xs px-2 py-1 rounded-full transition-all"
                style={{
                  background: !sizeFamily ? 'var(--fire)' : 'var(--surface2)',
                  color: !sizeFamily ? '#fff' : 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                Individual
              </button>
              <button
                onClick={() => setSizeFamily(true)}
                className="text-xs px-2 py-1 rounded-full transition-all"
                style={{
                  background: sizeFamily ? 'var(--fire)' : 'var(--surface2)',
                  color: sizeFamily ? '#fff' : 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                Familiar
              </button>
            </div>
          )}
          <span className="font-bold text-base" style={{ color: 'var(--gold)' }}>
            {formatCLP(price)}
          </span>
        </div>
        <button
          onClick={handleAdd}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
          style={{
            background: added ? '#25D366' : 'var(--fire)',
            color: '#fff',
          }}
        >
          {added ? '✓ Listo' : '+ Agregar'}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { products, categories } from '@/data/menu';
import type { Category } from '@/data/menu';
import ProductCard from '@/components/ProductCard';

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('pizzas');
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = products.filter(p => p.category === activeCategory);
  const currentCat = categories.find(c => c.id === activeCategory);

  function selectCategory(id: Category) {
    setActiveCategory(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Page header */}
      <div
        className="px-4 pt-8 pb-6 text-center"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="text-2xl font-bold" style={{ color: 'var(--cream)' }}>Nuestra Carta</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Todo preparado con ingredientes frescos y masa de fermentación lenta
        </p>
      </div>

      {/* Category tabs — horizontal scroll */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {categories.map(cat => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.id)}
              className="shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all"
              style={{
                background: active ? 'rgba(232,65,26,0.15)' : 'var(--surface2)',
                border: `1.5px solid ${active ? 'var(--fire)' : 'var(--border)'}`,
                minWidth: '68px',
              }}
            >
              <div
                className="relative rounded-xl overflow-hidden"
                style={{ width: 44, height: 44, background: active ? 'rgba(232,65,26,0.1)' : 'var(--surface)' }}
              >
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              </div>
              <span
                className="text-xs font-semibold leading-tight text-center"
                style={{ color: active ? 'var(--fire)' : 'var(--muted)', maxWidth: 64 }}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active category hero */}
      {currentCat && (
        <div
          key={`hero-${activeCategory}`}
          className="flex items-center gap-4 px-4 py-5 anim-fade-in-up"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="relative rounded-2xl overflow-hidden shrink-0"
            style={{ width: 72, height: 72, background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Image
              src={currentCat.image}
              alt={currentCat.label}
              fill
              className="object-contain p-2"
              unoptimized
            />
          </div>
          <div>
            <h2 className="text-xl font-black" style={{ color: 'var(--cream)' }}>
              {currentCat.label}
            </h2>
            {activeCategory === 'pizzas' && (
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>
                Tamaño Individual y Familiar · Horno a leña · Masa de fermentación lenta
              </p>
            )}
            {activeCategory === 'sin_gluten' && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--gold)' }}>
                Elaborados en ambiente con trazas de harina. No apto para celíacos.
              </p>
            )}
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {filtered.length} {filtered.length === 1 ? 'opción' : 'opciones'}
            </p>
          </div>
        </div>
      )}

      {/* Product grid */}
      <div key={`grid-${activeCategory}`} className="px-4 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((product, i) => (
          <div key={product.id} className="anim-fade-in-up" style={{ animationDelay: `${i * 55}ms` }}>
            <ProductCard product={product} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center py-16" style={{ color: 'var(--muted)' }}>
            No hay productos en esta categoría.
          </p>
        )}
      </div>
    </div>
  );
}

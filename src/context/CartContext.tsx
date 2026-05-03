'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Product } from '@/data/menu';

export interface CartItem {
  product: Product;
  quantity: number;
  sizeFamily: boolean;
}

interface CartContextValue {
  items: CartItem[];
  add: (product: Product, sizeFamily?: boolean) => void;
  remove: (id: string, sizeFamily: boolean) => void;
  clear: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const add = useCallback((product: Product, sizeFamily = false) => {
    setItems(prev => {
      const key = product.id + (sizeFamily ? '-f' : '-i');
      const existing = prev.find(i => i.product.id + (i.sizeFamily ? '-f' : '-i') === key);
      if (existing) {
        return prev.map(i =>
          i.product.id + (i.sizeFamily ? '-f' : '-i') === key
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1, sizeFamily }];
    });
    setIsOpen(true);
  }, []);

  const remove = useCallback((id: string, sizeFamily: boolean) => {
    setItems(prev => {
      const key = id + (sizeFamily ? '-f' : '-i');
      return prev
        .map(i => i.product.id + (i.sizeFamily ? '-f' : '-i') === key ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0);
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => {
    const price = i.sizeFamily && i.product.priceFamily ? i.product.priceFamily : i.product.price;
    return sum + price * i.quantity;
  }, 0);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, clear, total, count, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

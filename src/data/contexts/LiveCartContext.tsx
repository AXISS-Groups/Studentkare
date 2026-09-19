import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { LiveCatalogItem } from '../types/workflowTypes';
import { useAuth } from './AuthContext';

export interface LiveCartLine { item: LiveCatalogItem; quantity: number }
interface CartContextValue { lines: LiveCartLine[]; add: (item: LiveCatalogItem) => void; setQuantity: (id: string, quantity: number) => void; clear: () => void }
const CartContext = createContext<CartContextValue | null>(null);
export function LiveCartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<LiveCartLine[]>([]);
  const previousUser = useRef<string | null>(null);
  useEffect(() => {
    if (previousUser.current && previousUser.current !== user?.id) setLines([]);
    previousUser.current = user?.id || null;
  }, [user?.id]);
  const add = (item: LiveCatalogItem) => {
    if (item.requiresPrescription || (item.kind === 'product' && item.stock < 1)) return;
    setLines(previous => {
      const line = previous.find(entry => entry.item.id === item.id);
      const maximum = item.kind === 'product' ? Math.min(10, item.stock) : 1;
      return line ? previous.map(entry => entry.item.id === item.id ? { item, quantity: Math.min(entry.quantity + 1, maximum) } : entry) : [...previous, { item, quantity: 1 }];
    });
  };
  const setQuantity = (id: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 0) return;
    setLines(previous => previous.map(entry => entry.item.id === id ? { ...entry, quantity: Math.min(quantity, entry.item.kind === 'product' ? Math.min(entry.item.stock, 10) : 1) } : entry).filter(entry => entry.quantity > 0));
  };
  return <CartContext.Provider value={{ lines, add, setQuantity, clear: () => setLines([]) }}>{children}</CartContext.Provider>;
}
export function useLiveCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useLiveCart must be used inside LiveCartProvider');
  return context;
}

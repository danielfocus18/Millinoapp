'use client'
import { create } from 'zustand'

export interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  sku?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: number) => void
  updateQty: (id: number, qty: number) => void
  clearCart: () => void
  total: () => number
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return { items: [...state.items, { ...item, quantity: 1 }] }
    })
  },
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  updateQty: (id, qty) => {
    if (qty <= 0) {
      get().removeItem(id)
      return
    }
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
    }))
  },
  clearCart: () => set({ items: [] }),
  total: () =>
    get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}))

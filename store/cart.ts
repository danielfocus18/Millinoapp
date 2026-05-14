'use client'
import { create } from 'zustand'

export type PricingType = 'normal' | 'discount' | 'free'

export interface CartItem {
  id: number
  name: string
  unitPrice: number
  quantity: number
  sku?: string
  pricingType: PricingType
  discountPercent: number   // 0 for normal, calculated for discount, 100 for free
  lineTotal: number         // actual charged amount
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: number) => void
  updateQty: (id: number, qty: number) => void
  clearCart: () => void
  grossTotal: () => number   // sum of unitPrice * qty
  discountTotal: () => number // sum of discounts
  netTotal: () => number     // what customer actually pays
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) => {
    set((state) => {
      // Don't merge if different pricing type
      const existing = state.items.find(
        (i) => i.id === item.id && i.pricingType === item.pricingType
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id && i.pricingType === item.pricingType
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  lineTotal: (i.quantity + 1) * i.unitPrice * (1 - i.discountPercent / 100),
                }
              : i
          ),
        }
      }
      return { items: [...state.items, { ...item, quantity: 1 }] }
    })
  },

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQty: (id, qty) => {
    if (qty <= 0) { get().removeItem(id); return }
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id
          ? { ...i, quantity: qty, lineTotal: qty * i.unitPrice * (1 - i.discountPercent / 100) }
          : i
      ),
    }))
  },

  clearCart: () => set({ items: [] }),

  grossTotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
  discountTotal: () => get().items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.lineTotal), 0),
  netTotal: () => get().items.reduce((s, i) => s + i.lineTotal, 0),
}))

'use client'
import { create } from 'zustand'

export type PricingType = 'normal' | 'discount' | 'free'

export interface CartItem {
  id: string           // UUID string — never convert to number
  name: string
  unitPrice: number
  quantity: number
  sku?: string
  pricingType: PricingType
  discountPercent: number
  lineTotal: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  grossTotal: () => number
  discountTotal: () => number
  netTotal: () => number
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) => {
    set((state) => {
      // Merge with existing only if same product AND same pricing type
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

  grossTotal:    () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
  discountTotal: () => get().items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.lineTotal), 0),
  netTotal:      () => get().items.reduce((s, i) => s + i.lineTotal, 0),
}))

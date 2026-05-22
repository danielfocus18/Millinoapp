'use client'
import { create } from 'zustand'

export type PricingType = 'normal' | 'discount' | 'free'

export interface CartItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
  sku?: string
  pricingType: PricingType
  discountPercent: number
  lineTotal: number
}

// addItem accepts an initial quantity (defaults to 1)
type AddItemPayload = Omit<CartItem, 'quantity'> & { quantity?: number }

interface CartStore {
  items: CartItem[]
  addItem: (item: AddItemPayload) => void
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
    const initialQty = item.quantity ?? 1

    set((state) => {
      // If same product + same pricing type already in cart, increment
      const existing = state.items.find(
        (i) => i.id === item.id && i.pricingType === item.pricingType
      )
      if (existing) {
        const newQty = existing.quantity + initialQty
        return {
          items: state.items.map((i) =>
            i.id === item.id && i.pricingType === item.pricingType
              ? {
                  ...i,
                  quantity: newQty,
                  lineTotal: newQty * i.unitPrice * (1 - i.discountPercent / 100),
                }
              : i
          ),
        }
      }
      // New item — use provided quantity and lineTotal
      return {
        items: [
          ...state.items,
          { ...item, quantity: initialQty },
        ],
      }
    })
  },

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQty: (id, qty) => {
    if (qty <= 0) { get().removeItem(id); return }
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id
          ? {
              ...i,
              quantity: qty,
              lineTotal: qty * i.unitPrice * (1 - i.discountPercent / 100),
            }
          : i
      ),
    }))
  },

  clearCart: () => set({ items: [] }),

  grossTotal:    () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
  discountTotal: () => get().items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.lineTotal), 0),
  netTotal:      () => get().items.reduce((s, i) => s + i.lineTotal, 0),
}))

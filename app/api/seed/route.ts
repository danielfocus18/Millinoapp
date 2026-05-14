import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const CATEGORY_NAMES = ['Meals', 'Pastries', 'Drinks']

const PRODUCTS_BY_CATEGORY: Record<string, { name: string; price: number; stock: number; sku: string }[]> = {
  Meals: [
    { sku: 'ML-001', name: 'Fried Rice (Reg)',                     price: 50,  stock: 99 },
    { sku: 'ML-002', name: 'Fried Rice (Small)',                   price: 35,  stock: 99 },
    { sku: 'ML-003', name: 'Jollof (Reg)',                         price: 50,  stock: 99 },
    { sku: 'ML-004', name: 'Jollof (Small)',                       price: 35,  stock: 99 },
    { sku: 'ML-005', name: 'Fries & Grilled Chicken',              price: 45,  stock: 99 },
    { sku: 'ML-006', name: 'Yam Chips & Grilled Chicken',          price: 40,  stock: 99 },
    { sku: 'ML-007', name: 'Assorted Jollof/Fried Rice',           price: 75,  stock: 99 },
    { sku: 'ML-008', name: 'Yam Chips Only',                       price: 20,  stock: 99 },
    { sku: 'ML-009', name: 'Fries Only',                           price: 30,  stock: 99 },
    { sku: 'ML-010', name: 'Boneless Chicken Only',                price: 60,  stock: 99 },
    { sku: 'ML-011', name: 'Jollof/Fried Rice & Boneless Chicken', price: 85,  stock: 99 },
    { sku: 'ML-012', name: 'Smokey Pepper Wings Only (14pcs)',      price: 100, stock: 0  },
    { sku: 'ML-013', name: 'Jollof/Fried Rice & Wings (5pcs)',      price: 65,  stock: 0  },
  ],
  Pastries: [
    { sku: 'PT-001', name: 'Chips',                 price: 8,  stock: 99 },
    { sku: 'PT-002', name: 'Rockies',               price: 8,  stock: 99 },
    { sku: 'PT-003', name: 'Spring Rolls (3pcs)',   price: 10, stock: 99 },
    { sku: 'PT-004', name: 'Spring Rolls (Frozen)', price: 30, stock: 20 },
    { sku: 'PT-005', name: 'Ring Donuts (5pcs)',    price: 12, stock: 50 },
    { sku: 'PT-006', name: 'Chin Chin (Achomo)',    price: 10, stock: 99 },
    { sku: 'PT-007', name: 'Meat Pie',              price: 15, stock: 50 },
    { sku: 'PT-008', name: 'Pizza Sandwich',        price: 30, stock: 30 },
    { sku: 'PT-009', name: 'CakeBread',             price: 65, stock: 0  },
    { sku: 'PT-010', name: 'Bread (Reg)',            price: 25, stock: 30 },
    { sku: 'PT-011', name: 'Small Chops Mix',        price: 30, stock: 30 },
    { sku: 'PT-012', name: 'PanCakes (2pcs)',        price: 5,  stock: 50 },
  ],
  Drinks: [
    { sku: 'DK-001', name: 'Sobolo',                price: 12, stock: 99 },
    { sku: 'DK-002', name: 'Coke/Sprite',           price: 10, stock: 99 },
    { sku: 'DK-003', name: 'Pineapple Juice',       price: 20, stock: 0  },
    { sku: 'DK-004', name: 'Mix Fruit Blend Juice', price: 20, stock: 0  },
  ],
}

export async function POST() {
  const log: string[] = []
  try {
    const supabase = createAdminClient()

    // Step 1: ensure categories exist
    const { data: existingCats } = await supabase.from('categories').select('id, name')
    const existingCatNames = new Set((existingCats ?? []).map((c: { name: string }) => c.name))
    const missingCats = CATEGORY_NAMES.filter(n => !existingCatNames.has(n))
    if (missingCats.length > 0) {
      const { error } = await supabase.from('categories').insert(missingCats.map(name => ({ name })))
      if (error) return NextResponse.json({ step: 'insert_categories', error: error.message }, { status: 500 })
    }
    log.push(`Categories ready`)

    // Step 2: get UUID map
    const { data: allCats } = await supabase.from('categories').select('id, name')
    const catMap: Record<string, string> = {}
    for (const c of allCats ?? []) catMap[c.name] = c.id

    // Step 3: skip existing SKUs
    const { data: existingProds } = await supabase.from('products').select('sku')
    const existingSkus = new Set((existingProds ?? []).map((p: { sku: string }) => p.sku))
    log.push(`Existing products: ${existingProds?.length ?? 0}`)

    // Step 4: insert products with SKU
    const errors: string[] = []
    let inserted = 0

    for (const [catName, prods] of Object.entries(PRODUCTS_BY_CATEGORY)) {
      for (const p of prods) {
        if (existingSkus.has(p.sku)) continue
        const { error } = await supabase.from('products').insert({
          sku: p.sku,
          name: p.name,
          price: p.price,
          stock: p.stock,
          category_id: catMap[catName] ?? null,
        })
        if (error) errors.push(`${p.name}: ${error.message}`)
        else inserted++
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ step: 'insert_products', errors, log, inserted }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      summary: { categories: allCats?.length, inserted, skipped: existingProds?.length ?? 0 },
    })

  } catch (err) {
    return NextResponse.json({ step: 'unexpected', error: String(err), log }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ info: 'POST to seed Millino Chops data' })
}

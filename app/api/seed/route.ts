import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Exact columns from original Supabase schema:
// products: id(uuid), sku(text NOT NULL UNIQUE), name(text NOT NULL),
//           description(text), price(numeric), stock(integer), category_id(uuid), image_url(text)

const CATEGORY_NAMES = ['Meals', 'Pastries', 'Drinks']

const PRODUCTS_BY_CATEGORY: Record<string, { sku: string; name: string; price: number; stock: number }[]> = {
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
  const supabase = createAdminClient()

  // 1. Upsert categories by name (safe repeated runs)
  for (const name of CATEGORY_NAMES) {
    const { data: existing } = await supabase.from('categories').select('id').eq('name', name).single()
    if (!existing) {
      const { error } = await supabase.from('categories').insert({ name })
      if (error) return NextResponse.json({ error: `Category "${name}": ${error.message}` }, { status: 500 })
    }
  }

  // 2. Fetch UUID map
  const { data: allCats } = await supabase.from('categories').select('id, name')
  const catMap: Record<string, string> = {}
  for (const c of allCats ?? []) catMap[c.name] = c.id

  // 3. Insert products - skip existing SKUs, only use guaranteed columns
  const results: string[] = []
  for (const [catName, prods] of Object.entries(PRODUCTS_BY_CATEGORY)) {
    for (const p of prods) {
      const { data: exists } = await supabase.from('products').select('id').eq('sku', p.sku).single()
      if (exists) { results.push(`SKIP ${p.sku}`); continue }

      const { error } = await supabase.from('products').insert({
        sku: p.sku,
        name: p.name,
        price: p.price,
        stock: p.stock,
        category_id: catMap[catName] ?? null,
      })
      if (error) return NextResponse.json({ error: `Product "${p.name}" (${p.sku}): ${error.message}` }, { status: 500 })
      results.push(`OK   ${p.sku} ${p.name}`)
    }
  }

  const inserted = results.filter(r => r.startsWith('OK')).length
  const skipped  = results.filter(r => r.startsWith('SKIP')).length

  return NextResponse.json({ success: true, inserted, skipped, detail: results })
}

export async function GET() {
  return NextResponse.json({ info: 'POST to this endpoint to seed Millino Chops data' })
}

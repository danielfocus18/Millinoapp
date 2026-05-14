import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const CATEGORY_NAMES = ['Meals', 'Pastries', 'Drinks']

// Products keyed by category name
const PRODUCTS_BY_CATEGORY: Record<string, { name: string; price: number; stock: number; is_available: boolean; sku: string }[]> = {
  Meals: [
    { name: 'Fried Rice (Reg)',                     price: 50,  stock: 99, is_available: true,  sku: 'ML-001' },
    { name: 'Fried Rice (Small)',                   price: 35,  stock: 99, is_available: true,  sku: 'ML-002' },
    { name: 'Jollof (Reg)',                         price: 50,  stock: 99, is_available: true,  sku: 'ML-003' },
    { name: 'Jollof (Small)',                       price: 35,  stock: 99, is_available: true,  sku: 'ML-004' },
    { name: 'Fries & Grilled Chicken',              price: 45,  stock: 99, is_available: true,  sku: 'ML-005' },
    { name: 'Yam Chips & Grilled Chicken',          price: 40,  stock: 99, is_available: true,  sku: 'ML-006' },
    { name: 'Assorted Jollof/Fried Rice',           price: 75,  stock: 99, is_available: true,  sku: 'ML-007' },
    { name: 'Yam Chips Only',                       price: 20,  stock: 99, is_available: true,  sku: 'ML-008' },
    { name: 'Fries Only',                           price: 30,  stock: 99, is_available: true,  sku: 'ML-009' },
    { name: 'Boneless Chicken Only',                price: 60,  stock: 99, is_available: true,  sku: 'ML-010' },
    { name: 'Jollof/Fried Rice & Boneless Chicken', price: 85,  stock: 99, is_available: true,  sku: 'ML-011' },
    { name: 'Smokey Pepper Wings Only (14pcs)',      price: 100, stock: 0,  is_available: false, sku: 'ML-012' },
    { name: 'Jollof/Fried Rice & Wings (5pcs)',      price: 65,  stock: 0,  is_available: false, sku: 'ML-013' },
  ],
  Pastries: [
    { name: 'Chips',                 price: 8,  stock: 99, is_available: true,  sku: 'PT-001' },
    { name: 'Rockies',               price: 8,  stock: 99, is_available: true,  sku: 'PT-002' },
    { name: 'Spring Rolls (3pcs)',   price: 10, stock: 99, is_available: true,  sku: 'PT-003' },
    { name: 'Spring Rolls (Frozen)', price: 30, stock: 20, is_available: true,  sku: 'PT-004' },
    { name: 'Ring Donuts (5pcs)',    price: 12, stock: 50, is_available: true,  sku: 'PT-005' },
    { name: 'Chin Chin (Achomo)',    price: 10, stock: 99, is_available: true,  sku: 'PT-006' },
    { name: 'Meat Pie',             price: 15, stock: 50, is_available: true,  sku: 'PT-007' },
    { name: 'Pizza Sandwich',        price: 30, stock: 30, is_available: true,  sku: 'PT-008' },
    { name: 'CakeBread',             price: 65, stock: 0,  is_available: false, sku: 'PT-009' },
    { name: 'Bread (Reg)',           price: 25, stock: 30, is_available: true,  sku: 'PT-010' },
    { name: 'Small Chops Mix',       price: 30, stock: 30, is_available: true,  sku: 'PT-011' },
    { name: 'PanCakes (2pcs)',       price: 5,  stock: 50, is_available: true,  sku: 'PT-012' },
  ],
  Drinks: [
    { name: 'Sobolo',               price: 12, stock: 99, is_available: true,  sku: 'DK-001' },
    { name: 'Coke/Sprite',          price: 10, stock: 99, is_available: true,  sku: 'DK-002' },
    { name: 'Pineapple Juice',      price: 20, stock: 0,  is_available: false, sku: 'DK-003' },
    { name: 'Mix Fruit Blend Juice', price: 20, stock: 0,  is_available: false, sku: 'DK-004' },
  ],
}

export async function POST() {
  const supabase = createAdminClient()

  // 1. Check which categories already exist
  const { data: existing } = await supabase.from('categories').select('id, name')
  const existingNames = new Set((existing ?? []).map((c: { name: string }) => c.name))

  // 2. Insert only missing categories
  const toInsert = CATEGORY_NAMES.filter(n => !existingNames.has(n)).map(name => ({ name }))
  if (toInsert.length > 0) {
    const { error } = await supabase.from('categories').insert(toInsert)
    if (error) return NextResponse.json({ error: `Categories: ${error.message}` }, { status: 500 })
  }

  // 3. Fetch all categories (existing + newly inserted) to get their UUIDs
  const { data: allCats, error: fetchErr } = await supabase.from('categories').select('id, name')
  if (fetchErr) return NextResponse.json({ error: `Fetch categories: ${fetchErr.message}` }, { status: 500 })

  const catMap: Record<string, string> = {}
  for (const c of allCats ?? []) catMap[c.name] = c.id

  // 4. Build product rows with correct UUID category_ids
  const productRows = Object.entries(PRODUCTS_BY_CATEGORY).flatMap(([catName, prods]) =>
    prods.map(p => ({ ...p, category_id: catMap[catName] ?? null }))
  )

  // 5. Check existing products by SKU to avoid duplicates
  const { data: existingProds } = await supabase.from('products').select('sku')
  const existingSkus = new Set((existingProds ?? []).map((p: { sku: string }) => p.sku))
  const newProducts = productRows.filter(p => !existingSkus.has(p.sku))

  let inserted = 0
  if (newProducts.length > 0) {
    const { error: prodErr } = await supabase.from('products').insert(newProducts)
    if (prodErr) return NextResponse.json({ error: `Products: ${prodErr.message}` }, { status: 500 })
    inserted = newProducts.length
  }

  return NextResponse.json({
    success: true,
    categories: { total: allCats?.length, inserted: toInsert.length },
    products: { total: productRows.length, inserted, skipped: productRows.length - inserted },
    message: inserted > 0 ? `Seeded ${inserted} products across ${allCats?.length} categories` : 'Already seeded — no duplicates inserted',
  })
}

export async function GET() {
  return NextResponse.json({ info: 'POST to this endpoint to seed Millino Chops data' })
}

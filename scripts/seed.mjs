/**
 * Millino Chops — Database Seed
 * Seeds the real categories and products from MillinoDB.accdb (exported as CSV)
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const categories = [
  { id: 1, name: 'Meals' },
  { id: 2, name: 'Pastries' },
  { id: 3, name: 'Drinks' },
]

const products = [
  // ── Meals ────────────────────────────────────────────
  { id: 1,  name: 'Fried Rice (Reg)',                      category_id: 1, price: 50.00, stock: 50, is_available: true },
  { id: 2,  name: 'Fried Rice (Small)',                    category_id: 1, price: 35.00, stock: 50, is_available: true },
  { id: 3,  name: 'Jollof (Reg)',                          category_id: 1, price: 50.00, stock: 50, is_available: true },
  { id: 4,  name: 'Jollof (Small)',                        category_id: 1, price: 35.00, stock: 50, is_available: true },
  { id: 5,  name: 'Fries & Grilled Chicken',               category_id: 1, price: 45.00, stock: 50, is_available: true },
  { id: 6,  name: 'Yam Chips & Grilled Chicken',           category_id: 1, price: 40.00, stock: 50, is_available: true },
  { id: 7,  name: 'Assorted Jollof/Fried Rice',            category_id: 1, price: 75.00, stock: 50, is_available: true },
  { id: 8,  name: 'Yam Chips Only',                        category_id: 1, price: 20.00, stock: 50, is_available: true },
  { id: 9,  name: 'Fries Only',                            category_id: 1, price: 30.00, stock: 50, is_available: true },
  { id: 10, name: 'Boneless Chicken Only',                 category_id: 1, price: 60.00, stock: 50, is_available: true },
  { id: 11, name: 'Jollof/Fried Rice & Boneless Chicken',  category_id: 1, price: 85.00, stock: 50, is_available: true },
  { id: 12, name: 'Smokey Pepper Wings Only (14pcs)',       category_id: 1, price: 100.00, stock: 0, is_available: false },
  { id: 13, name: 'Jollof/Fried Rice & Wings (5pcs)',       category_id: 1, price: 65.00, stock: 0, is_available: false },

  // ── Pastries ─────────────────────────────────────────
  { id: 14, name: 'Chips',                                 category_id: 2, price: 8.00,  stock: 50, is_available: true },
  { id: 15, name: 'Rockies',                               category_id: 2, price: 8.00,  stock: 50, is_available: true },
  { id: 16, name: 'Spring Rolls (3pcs)',                   category_id: 2, price: 10.00, stock: 50, is_available: true },
  { id: 17, name: 'Spring Rolls (Frozen)',                 category_id: 2, price: 30.00, stock: 20, is_available: true },
  { id: 18, name: 'Ring Donuts (5pcs)',                    category_id: 2, price: 12.00, stock: 30, is_available: true },
  { id: 19, name: 'Chin Chin (Achomo)',                    category_id: 2, price: 10.00, stock: 50, is_available: true },
  { id: 20, name: 'Meat Pie',                              category_id: 2, price: 15.00, stock: 30, is_available: true },
  { id: 21, name: 'Pizza Sandwich',                        category_id: 2, price: 30.00, stock: 20, is_available: true },
  { id: 22, name: 'CakeBread',                             category_id: 2, price: 65.00, stock: 0,  is_available: false },
  { id: 23, name: 'Bread (Reg)',                           category_id: 2, price: 25.00, stock: 20, is_available: true },
  { id: 24, name: 'Small Chops Mix',                       category_id: 2, price: 30.00, stock: 20, is_available: true },
  { id: 29, name: 'PanCakes (2pcs)',                       category_id: 2, price: 5.00,  stock: 30, is_available: true },

  // ── Drinks ───────────────────────────────────────────
  { id: 25, name: 'Sobolo',                                category_id: 3, price: 12.00, stock: 50, is_available: true },
  { id: 26, name: 'Coke/Sprite',                           category_id: 3, price: 10.00, stock: 50, is_available: true },
  { id: 27, name: 'Pineapple Juice',                       category_id: 3, price: 20.00, stock: 0,  is_available: false },
  { id: 28, name: 'Mix Fruit Blend Juice',                 category_id: 3, price: 20.00, stock: 0,  is_available: false },
]

async function seed() {
  console.log('🌱 Seeding Millino Chops database...\n')

  // ── Categories ──
  console.log('📁 Inserting categories...')
  const { error: catErr } = await supabase
    .from('categories')
    .upsert(categories, { onConflict: 'id' })
  if (catErr) { console.error('❌ Categories:', catErr.message); process.exit(1) }
  console.log(`   ✓ ${categories.length} categories inserted\n`)

  // ── Products ──
  console.log('📦 Inserting products...')
  const { error: prodErr } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'id' })
  if (prodErr) { console.error('❌ Products:', prodErr.message); process.exit(1) }
  console.log(`   ✓ ${products.length} products inserted\n`)

  console.log('✅ Seed complete! Millino Chops is ready.')
}

seed()

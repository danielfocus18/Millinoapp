import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const CATEGORIES = [
  { id: 1, name: 'Meals' },
  { id: 2, name: 'Pastries' },
  { id: 3, name: 'Drinks' },
]

const PRODUCTS = [
  // Meals
  { id: 1,  name: 'Fried Rice (Reg)',                     category_id: 1, price: 50,  stock: 99, is_available: true,  sku: 'ML-001' },
  { id: 2,  name: 'Fried Rice (Small)',                   category_id: 1, price: 35,  stock: 99, is_available: true,  sku: 'ML-002' },
  { id: 3,  name: 'Jollof (Reg)',                         category_id: 1, price: 50,  stock: 99, is_available: true,  sku: 'ML-003' },
  { id: 4,  name: 'Jollof (Small)',                       category_id: 1, price: 35,  stock: 99, is_available: true,  sku: 'ML-004' },
  { id: 5,  name: 'Fries & Grilled Chicken',              category_id: 1, price: 45,  stock: 99, is_available: true,  sku: 'ML-005' },
  { id: 6,  name: 'Yam Chips & Grilled Chicken',          category_id: 1, price: 40,  stock: 99, is_available: true,  sku: 'ML-006' },
  { id: 7,  name: 'Assorted Jollof/Fried Rice',           category_id: 1, price: 75,  stock: 99, is_available: true,  sku: 'ML-007' },
  { id: 8,  name: 'Yam Chips Only',                       category_id: 1, price: 20,  stock: 99, is_available: true,  sku: 'ML-008' },
  { id: 9,  name: 'Fries Only',                           category_id: 1, price: 30,  stock: 99, is_available: true,  sku: 'ML-009' },
  { id: 10, name: 'Boneless Chicken Only',                category_id: 1, price: 60,  stock: 99, is_available: true,  sku: 'ML-010' },
  { id: 11, name: 'Jollof/Fried Rice & Boneless Chicken', category_id: 1, price: 85,  stock: 99, is_available: true,  sku: 'ML-011' },
  { id: 12, name: 'Smokey Pepper Wings Only (14pcs)',      category_id: 1, price: 100, stock: 0,  is_available: false, sku: 'ML-012' },
  { id: 13, name: 'Jollof/Fried Rice & Wings (5pcs)',      category_id: 1, price: 65,  stock: 0,  is_available: false, sku: 'ML-013' },
  // Pastries
  { id: 14, name: 'Chips',                                category_id: 2, price: 8,   stock: 99, is_available: true,  sku: 'PT-001' },
  { id: 15, name: 'Rockies',                              category_id: 2, price: 8,   stock: 99, is_available: true,  sku: 'PT-002' },
  { id: 16, name: 'Spring Rolls (3pcs)',                  category_id: 2, price: 10,  stock: 99, is_available: true,  sku: 'PT-003' },
  { id: 17, name: 'Spring Rolls (Frozen)',                category_id: 2, price: 30,  stock: 20, is_available: true,  sku: 'PT-004' },
  { id: 18, name: 'Ring Donuts (5pcs)',                   category_id: 2, price: 12,  stock: 50, is_available: true,  sku: 'PT-005' },
  { id: 19, name: 'Chin Chin (Achomo)',                   category_id: 2, price: 10,  stock: 99, is_available: true,  sku: 'PT-006' },
  { id: 20, name: 'Meat Pie',                             category_id: 2, price: 15,  stock: 50, is_available: true,  sku: 'PT-007' },
  { id: 21, name: 'Pizza Sandwich',                       category_id: 2, price: 30,  stock: 30, is_available: true,  sku: 'PT-008' },
  { id: 22, name: 'CakeBread',                            category_id: 2, price: 65,  stock: 0,  is_available: false, sku: 'PT-009' },
  { id: 23, name: 'Bread (Reg)',                          category_id: 2, price: 25,  stock: 30, is_available: true,  sku: 'PT-010' },
  { id: 24, name: 'Small Chops Mix',                      category_id: 2, price: 30,  stock: 30, is_available: true,  sku: 'PT-011' },
  { id: 29, name: 'PanCakes (2pcs)',                      category_id: 2, price: 5,   stock: 50, is_available: true,  sku: 'PT-012' },
  // Drinks
  { id: 25, name: 'Sobolo',                               category_id: 3, price: 12,  stock: 99, is_available: true,  sku: 'DK-001' },
  { id: 26, name: 'Coke/Sprite',                          category_id: 3, price: 10,  stock: 99, is_available: true,  sku: 'DK-002' },
  { id: 27, name: 'Pineapple Juice',                      category_id: 3, price: 20,  stock: 0,  is_available: false, sku: 'DK-003' },
  { id: 28, name: 'Mix Fruit Blend Juice',                category_id: 3, price: 20,  stock: 0,  is_available: false, sku: 'DK-004' },
]

export async function POST() {
  const supabase = createAdminClient()

  // Upsert categories
  const { error: catErr } = await supabase
    .from('categories')
    .upsert(CATEGORIES, { onConflict: 'id' })
  if (catErr) return NextResponse.json({ error: `Categories: ${catErr.message}` }, { status: 500 })

  // Upsert products
  const { error: prodErr } = await supabase
    .from('products')
    .upsert(PRODUCTS, { onConflict: 'id' })
  if (prodErr) return NextResponse.json({ error: `Products: ${prodErr.message}` }, { status: 500 })

  return NextResponse.json({
    success: true,
    inserted: { categories: CATEGORIES.length, products: PRODUCTS.length },
    message: 'Millino Chops database seeded successfully',
  })
}

// Prevent accidental GET triggering
export async function GET() {
  return NextResponse.json({
    info: 'POST to this endpoint to seed the Millino Chops database',
    categories: CATEGORIES.length,
    products: PRODUCTS.length,
  })
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const CATEGORY_NAMES = ['Meals', 'Pastries', 'Drinks']

const PRODUCTS_BY_CATEGORY: Record<string, { name: string; price: number; stock: number }[]> = {
  Meals: [
    { name: 'Fried Rice (Reg)',                     price: 50,  stock: 99 },
    { name: 'Fried Rice (Small)',                   price: 35,  stock: 99 },
    { name: 'Jollof (Reg)',                         price: 50,  stock: 99 },
    { name: 'Jollof (Small)',                       price: 35,  stock: 99 },
    { name: 'Fries & Grilled Chicken',              price: 45,  stock: 99 },
    { name: 'Yam Chips & Grilled Chicken',          price: 40,  stock: 99 },
    { name: 'Assorted Jollof/Fried Rice',           price: 75,  stock: 99 },
    { name: 'Yam Chips Only',                       price: 20,  stock: 99 },
    { name: 'Fries Only',                           price: 30,  stock: 99 },
    { name: 'Boneless Chicken Only',                price: 60,  stock: 99 },
    { name: 'Jollof/Fried Rice & Boneless Chicken', price: 85,  stock: 99 },
    { name: 'Smokey Pepper Wings Only (14pcs)',      price: 100, stock: 0  },
    { name: 'Jollof/Fried Rice & Wings (5pcs)',      price: 65,  stock: 0  },
  ],
  Pastries: [
    { name: 'Chips',                 price: 8,  stock: 99 },
    { name: 'Rockies',               price: 8,  stock: 99 },
    { name: 'Spring Rolls (3pcs)',   price: 10, stock: 99 },
    { name: 'Spring Rolls (Frozen)', price: 30, stock: 20 },
    { name: 'Ring Donuts (5pcs)',    price: 12, stock: 50 },
    { name: 'Chin Chin (Achomo)',    price: 10, stock: 99 },
    { name: 'Meat Pie',             price: 15, stock: 50 },
    { name: 'Pizza Sandwich',        price: 30, stock: 30 },
    { name: 'CakeBread',             price: 65, stock: 0  },
    { name: 'Bread (Reg)',           price: 25, stock: 30 },
    { name: 'Small Chops Mix',       price: 30, stock: 30 },
    { name: 'PanCakes (2pcs)',       price: 5,  stock: 50 },
  ],
  Drinks: [
    { name: 'Sobolo',                price: 12, stock: 99 },
    { name: 'Coke/Sprite',           price: 10, stock: 99 },
    { name: 'Pineapple Juice',       price: 20, stock: 0  },
    { name: 'Mix Fruit Blend Juice', price: 20, stock: 0  },
  ],
}

export async function POST() {
  const log: string[] = []
  try {
    const supabase = createAdminClient()

    // Step 1: upsert categories by name
    const { data: existingCats } = await supabase.from('categories').select('id, name')
    const existingCatNames = new Set((existingCats ?? []).map((c: { name: string }) => c.name))
    const missingCats = CATEGORY_NAMES.filter(n => !existingCatNames.has(n))

    if (missingCats.length > 0) {
      const { error } = await supabase.from('categories').insert(missingCats.map(name => ({ name })))
      if (error) return NextResponse.json({ step: 'insert_categories', error: error.message, log }, { status: 500 })
      log.push(`Inserted categories: ${missingCats.join(', ')}`)
    } else {
      log.push('Categories already exist')
    }

    // Step 2: get all category UUIDs
    const { data: allCats } = await supabase.from('categories').select('id, name')
    const catMap: Record<string, string> = {}
    for (const c of allCats ?? []) catMap[c.name] = c.id
    log.push(`Categories: ${JSON.stringify(catMap)}`)

    // Step 3: get existing product names to skip duplicates
    const { data: existingProds } = await supabase.from('products').select('name')
    const existingNames = new Set((existingProds ?? []).map((p: { name: string }) => p.name))
    log.push(`Existing products: ${existingProds?.length ?? 0}`)

    // Step 4: insert products — only columns guaranteed to exist in the schema
    const errors: string[] = []
    let inserted = 0

    for (const [catName, prods] of Object.entries(PRODUCTS_BY_CATEGORY)) {
      for (const p of prods) {
        if (existingNames.has(p.name)) continue
        const { error } = await supabase.from('products').insert({
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
      log,
      next: inserted > 0
        ? 'Products seeded! Run the SQL in supabase-migration.sql to enable availability toggling.'
        : 'Already seeded.',
    })

  } catch (err) {
    return NextResponse.json({ step: 'unexpected', error: String(err), log }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ info: 'POST to seed Millino Chops data' })
}

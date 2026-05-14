import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const CATEGORY_NAMES = ['Meals', 'Pastries', 'Drinks']

const PRODUCTS_BY_CATEGORY: Record<string, { name: string; price: number; stock: number; is_available: boolean }[]> = {
  Meals: [
    { name: 'Fried Rice (Reg)',                     price: 50,  stock: 99, is_available: true  },
    { name: 'Fried Rice (Small)',                   price: 35,  stock: 99, is_available: true  },
    { name: 'Jollof (Reg)',                         price: 50,  stock: 99, is_available: true  },
    { name: 'Jollof (Small)',                       price: 35,  stock: 99, is_available: true  },
    { name: 'Fries & Grilled Chicken',              price: 45,  stock: 99, is_available: true  },
    { name: 'Yam Chips & Grilled Chicken',          price: 40,  stock: 99, is_available: true  },
    { name: 'Assorted Jollof/Fried Rice',           price: 75,  stock: 99, is_available: true  },
    { name: 'Yam Chips Only',                       price: 20,  stock: 99, is_available: true  },
    { name: 'Fries Only',                           price: 30,  stock: 99, is_available: true  },
    { name: 'Boneless Chicken Only',                price: 60,  stock: 99, is_available: true  },
    { name: 'Jollof/Fried Rice & Boneless Chicken', price: 85,  stock: 99, is_available: true  },
    { name: 'Smokey Pepper Wings Only (14pcs)',      price: 100, stock: 0,  is_available: false },
    { name: 'Jollof/Fried Rice & Wings (5pcs)',      price: 65,  stock: 0,  is_available: false },
  ],
  Pastries: [
    { name: 'Chips',                  price: 8,  stock: 99, is_available: true  },
    { name: 'Rockies',                price: 8,  stock: 99, is_available: true  },
    { name: 'Spring Rolls (3pcs)',    price: 10, stock: 99, is_available: true  },
    { name: 'Spring Rolls (Frozen)',  price: 30, stock: 20, is_available: true  },
    { name: 'Ring Donuts (5pcs)',     price: 12, stock: 50, is_available: true  },
    { name: 'Chin Chin (Achomo)',     price: 10, stock: 99, is_available: true  },
    { name: 'Meat Pie',              price: 15, stock: 50, is_available: true  },
    { name: 'Pizza Sandwich',         price: 30, stock: 30, is_available: true  },
    { name: 'CakeBread',              price: 65, stock: 0,  is_available: false },
    { name: 'Bread (Reg)',            price: 25, stock: 30, is_available: true  },
    { name: 'Small Chops Mix',        price: 30, stock: 30, is_available: true  },
    { name: 'PanCakes (2pcs)',        price: 5,  stock: 50, is_available: true  },
  ],
  Drinks: [
    { name: 'Sobolo',                price: 12, stock: 99, is_available: true  },
    { name: 'Coke/Sprite',           price: 10, stock: 99, is_available: true  },
    { name: 'Pineapple Juice',       price: 20, stock: 0,  is_available: false },
    { name: 'Mix Fruit Blend Juice', price: 20, stock: 0,  is_available: false },
  ],
}

export async function POST() {
  const log: string[] = []
  try {
    const supabase = createAdminClient()

    // ── Step 1: fetch existing categories ──
    const { data: existingCats, error: e1 } = await supabase.from('categories').select('id, name')
    if (e1) return NextResponse.json({ step: 'fetch_categories', error: e1.message, log }, { status: 500 })
    log.push(`Found ${existingCats?.length ?? 0} existing categories`)

    const existingCatNames = new Set((existingCats ?? []).map((c: { name: string }) => c.name))

    // ── Step 2: insert missing categories ──
    const missingCats = CATEGORY_NAMES.filter(n => !existingCatNames.has(n))
    if (missingCats.length > 0) {
      const { error: e2 } = await supabase.from('categories').insert(missingCats.map(name => ({ name })))
      if (e2) return NextResponse.json({ step: 'insert_categories', error: e2.message, log }, { status: 500 })
      log.push(`Inserted categories: ${missingCats.join(', ')}`)
    } else {
      log.push('All categories already exist')
    }

    // ── Step 3: fetch all categories with their UUIDs ──
    const { data: allCats, error: e3 } = await supabase.from('categories').select('id, name')
    if (e3) return NextResponse.json({ step: 'refetch_categories', error: e3.message, log }, { status: 500 })

    const catMap: Record<string, string> = {}
    for (const c of allCats ?? []) catMap[c.name] = c.id
    log.push(`Category map: ${JSON.stringify(catMap)}`)

    // ── Step 4: fetch existing products by name ──
    const { data: existingProds, error: e4 } = await supabase.from('products').select('name')
    if (e4) return NextResponse.json({ step: 'fetch_products', error: e4.message, log }, { status: 500 })
    const existingNames = new Set((existingProds ?? []).map((p: { name: string }) => p.name))
    log.push(`Found ${existingProds?.length ?? 0} existing products`)

    // ── Step 5: build and insert new products ──
    const toInsert = Object.entries(PRODUCTS_BY_CATEGORY).flatMap(([catName, prods]) =>
      prods
        .filter(p => !existingNames.has(p.name))
        .map(p => ({
          name: p.name,
          price: p.price,
          stock: p.stock,
          is_available: p.is_available,
          category_id: catMap[catName] ?? null,
        }))
    )
    log.push(`Products to insert: ${toInsert.length}`)

    if (toInsert.length > 0) {
      // Insert one by one so a single failure is identifiable
      const errors: string[] = []
      for (const product of toInsert) {
        const { error } = await supabase.from('products').insert(product)
        if (error) errors.push(`${product.name}: ${error.message}`)
      }
      if (errors.length > 0) {
        return NextResponse.json({ step: 'insert_products', errors, log }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      log,
      summary: {
        categories: allCats?.length,
        productsInserted: toInsert.length,
        productsSkipped: (existingProds?.length ?? 0),
      },
    })

  } catch (err) {
    return NextResponse.json({ step: 'unexpected', error: String(err), log }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ info: 'POST to this endpoint to seed Millino Chops data' })
}

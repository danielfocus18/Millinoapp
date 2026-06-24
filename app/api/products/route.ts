import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('products').select('*, categories(name)').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data })
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase.from('products').insert(body).select().single()

  if (error) {
    // If image_url column doesn't exist yet (migration not run), retry without it
    if (error.message?.includes('image_url') && body.image_url !== undefined) {
      const { image_url, ...rest } = body
      const { data: data2, error: error2 } = await supabase.from('products').insert(rest).select().single()
      if (error2) return NextResponse.json({ error: error2.message }, { status: 500 })
      return NextResponse.json({ product: data2, warning: 'image_url column missing — run the migration to save product photos' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ product: data })
}

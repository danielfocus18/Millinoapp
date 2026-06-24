import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase.from('products').update(body).eq('id', id).select().single()

  if (error) {
    if (error.message?.includes('image_url') && body.image_url !== undefined) {
      const { image_url, ...rest } = body
      const { data: data2, error: error2 } = await supabase.from('products').update(rest).eq('id', id).select().single()
      if (error2) return NextResponse.json({ error: error2.message }, { status: 500 })
      return NextResponse.json({ product: data2, warning: 'image_url column missing — run the migration to save product photos' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ product: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

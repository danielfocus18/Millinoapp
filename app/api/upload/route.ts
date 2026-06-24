import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const BUCKET = 'product-images'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })

    const supabase = createAdminClient()

    // Ensure the storage bucket exists and is public (idempotent)
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.some(b => b.name === BUCKET)) {
      const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE,
      })
      // Ignore "already exists" race condition errors, fail on anything else
      if (bucketErr && !bucketErr.message?.toLowerCase().includes('already exists')) {
        return NextResponse.json({ error: `Bucket setup failed: ${bucketErr.message}` }, { status: 500 })
      }
    }

    // Build a unique, safe filename
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)

    return NextResponse.json({ url: urlData.publicUrl, fileName })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Delete an image by its public URL (used when replacing/removing a product photo)
export async function DELETE(request: Request) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'No url provided' }, { status: 400 })

    const supabase = createAdminClient()
    const fileName = url.split(`/${BUCKET}/`).pop()
    if (!fileName) return NextResponse.json({ success: true }) // nothing to delete

    await supabase.storage.from(BUCKET).remove([fileName])
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

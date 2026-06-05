import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Called by Vercel cron every 3 days to prevent Supabase free-tier pausing
export async function GET() {
  try {
    const supabase = createAdminClient()
    // Lightest possible query — just count categories
    const { count, error } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return NextResponse.json({
      alive: true,
      ping: new Date().toISOString(),
      db_rows: count,
    })
  } catch (err) {
    return NextResponse.json({ alive: false, error: String(err) }, { status: 500 })
  }
}

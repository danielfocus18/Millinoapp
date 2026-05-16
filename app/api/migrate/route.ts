import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST() {
  return NextResponse.json({
    message: 'Run the SQL below in your Supabase SQL Editor to enable all features.',
    sql: `
-- Extended order columns (pricing breakdown)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gross_amount numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS net_amount numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
UPDATE public.orders SET net_amount = total WHERE net_amount IS NULL;
UPDATE public.orders SET gross_amount = total WHERE gross_amount IS NULL;
UPDATE public.orders SET discount_amount = 0 WHERE discount_amount IS NULL;

-- Extended order_items columns
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT 'normal';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS line_total numeric(10,2);
UPDATE public.order_items SET line_total = unit_price * quantity WHERE line_total IS NULL;

-- Product availability toggle
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;
UPDATE public.products SET is_available = true WHERE is_available IS NULL;
    `.trim(),
  })
}

export async function GET() {
  return NextResponse.json({ info: 'POST to get the migration SQL' })
}

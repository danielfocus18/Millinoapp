import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    info: 'Run the SQL below in your Supabase SQL Editor — this fixes the RLS blocking all data',
    sql: `
-- ─────────────────────────────────────────────────────
-- MILLINO CHOPS — Fix RLS so the POS app can read data
-- Run this entire block in Supabase SQL Editor
-- ─────────────────────────────────────────────────────

-- 1. Allow anyone to read products and categories (public menu data)
ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses   ENABLE ROW LEVEL SECURITY;

-- 2. Products: authenticated users can read; service role manages writes
CREATE POLICY IF NOT EXISTS "products_read" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "products_write" ON public.products
  FOR ALL TO service_role USING (true);

-- 3. Categories: same as products
CREATE POLICY IF NOT EXISTS "categories_read" ON public.categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "categories_write" ON public.categories
  FOR ALL TO service_role USING (true);

-- 4. Users: authenticated users can read their own row
CREATE POLICY IF NOT EXISTS "users_read_own" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "users_service" ON public.users
  FOR ALL TO service_role USING (true);

-- 5. Orders: authenticated users can read/insert; service role manages all
CREATE POLICY IF NOT EXISTS "orders_read" ON public.orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "orders_insert" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "orders_service" ON public.orders
  FOR ALL TO service_role USING (true);

-- 6. Order items
CREATE POLICY IF NOT EXISTS "order_items_read" ON public.order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "order_items_insert" ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "order_items_service" ON public.order_items
  FOR ALL TO service_role USING (true);

-- 7. Expenses
CREATE POLICY IF NOT EXISTS "expenses_read" ON public.expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "expenses_insert" ON public.expenses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "expenses_service" ON public.expenses
  FOR ALL TO service_role USING (true);

-- 8. Add missing columns (safe to re-run)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gross_amount    numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount  numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS net_amount       numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method   text DEFAULT 'cash';
UPDATE public.orders SET net_amount = total WHERE net_amount IS NULL;
UPDATE public.orders SET gross_amount = total WHERE gross_amount IS NULL;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS pricing_type     text DEFAULT 'normal';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_percent  numeric(5,2) DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS line_total        numeric(10,2);
UPDATE public.order_items SET line_total = unit_price * quantity WHERE line_total IS NULL;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;
UPDATE public.products SET is_available = true WHERE is_available IS NULL;
    `.trim()
  })
}

export async function POST() {
  return NextResponse.json({ info: 'GET this endpoint to see the SQL to run' })
}

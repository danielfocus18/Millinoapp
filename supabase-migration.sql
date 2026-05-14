-- Run this in your Supabase SQL editor to support the new pricing features

-- Add new financial columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS gross_amount   numeric(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount     numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';

-- Backfill net_amount from total for existing rows
UPDATE public.orders SET net_amount = total WHERE net_amount IS NULL;
UPDATE public.orders SET gross_amount = total WHERE gross_amount IS NULL;
UPDATE public.orders SET discount_amount = 0 WHERE discount_amount IS NULL;

-- Add pricing columns to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS pricing_type    text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total      numeric(10,2);

-- Backfill line_total
UPDATE public.order_items
  SET line_total = unit_price * quantity
  WHERE line_total IS NULL;

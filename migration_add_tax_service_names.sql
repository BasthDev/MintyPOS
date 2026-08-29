-- ==============================================================================
-- Migration: Add tax_name and service_name columns to orders table
-- Purpose: Store actual tax and service charge names for better receipt display
-- Run this script in the Supabase SQL Editor (https://app.supabase.com)
-- ==============================================================================

-- Add tax_name column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tax_name TEXT;

-- Add service_name column to orders table  
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS service_name TEXT;

-- Verify the columns were added successfully
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('tax_name', 'service_name')
AND table_schema = 'public';

-- ==============================================================================
-- Note: This migration is backward compatible
-- - Existing orders will have NULL values for these new columns
-- - New orders will populate these fields with actual tax/service names
-- - The application logic handles NULL values gracefully
-- ==============================================================================
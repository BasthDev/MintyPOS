-- ==============================================================================
-- MintyPOS Supabase Clean Database Reset Script
-- Drops all tables, triggers, policies, and functions for a clean start.
-- Run this script in Supabase SQL Editor (https://app.supabase.com)
-- ==============================================================================

-- 1. DROP ALL TRIGGERS ON AUTH.USERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- 2. DROP ALL CUSTOM AUTH FUNCTIONS
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT 'DROP FUNCTION IF EXISTS ' || oid::regprocedure::text || ' CASCADE;' AS stmt
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND prokind = 'f'
          AND proname IN (
            'handle_auth_user_created',
            'handle_new_user_onboarding',
            'handle_new_user'
          )
    LOOP
        EXECUTE r.stmt;
    END LOOP;
END $$;

-- 3. DROP ALL APPLICATION TABLES (IN REVERSE DEPENDENCY ORDER WITH CASCADE)
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.customer_balance_transactions CASCADE;
DROP TABLE IF EXISTS public.customer_loyalty_transactions CASCADE;
DROP TABLE IF EXISTS public.order_splits CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.recipe_ingredients CASCADE;
DROP TABLE IF EXISTS public.recipe_definitions CASCADE;
DROP TABLE IF EXISTS public.semi_product_batches CASCADE;
DROP TABLE IF EXISTS public.semi_product_recipes CASCADE;
DROP TABLE IF EXISTS public.semi_products CASCADE;
DROP TABLE IF EXISTS public.inventory_batches CASCADE;
DROP TABLE IF EXISTS public.ingredient_units CASCADE;
DROP TABLE IF EXISTS public.ingredients CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.crm_configs CASCADE;
DROP TABLE IF EXISTS public.discounts CASCADE;
DROP TABLE IF EXISTS public.tax_configs CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.units CASCADE;
DROP TABLE IF EXISTS public.staff CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- 4. CONFIRMATION MESSAGE
SELECT 'MintyPOS database successfully cleaned and all tables dropped.' AS status;

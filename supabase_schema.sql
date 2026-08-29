-- ==============================================================================
-- MintyPOS Supabase PostgreSQL Schema (Individual 1-to-1 Tables)
-- Run this script in the Supabase SQL Editor (https://app.supabase.com)
-- ==============================================================================

-- 0. CLEAN RESET PREVIOUS TRIGGERS (Prevents 'Database error saving new user')
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

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

-- 1. Organizations Table (Business Profile per Owner)
CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY DEFAULT ('org_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 6)),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL,
    owner_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Stores Table (Multi-Store / Branch Support)
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY DEFAULT ('store_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 6)),
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    currency_code TEXT DEFAULT 'IDR',
    currency_symbol TEXT DEFAULT 'Rp',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Staff Accounts Table (Store Staff & Cashier Login)
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY DEFAULT ('staff_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 6)),
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Cashier' CHECK (role IN ('Manager', 'Cashier', 'Staff')),
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Units Table
CREATE TABLE IF NOT EXISTS public.units (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 5. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 6. Ingredients Table
CREATE TABLE IF NOT EXISTS public.ingredients (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    base_unit_id BIGINT NOT NULL,
    minimum_stock NUMERIC(12, 4) DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 7. Ingredient Units (Unit Conversions)
CREATE TABLE IF NOT EXISTS public.ingredient_units (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    ingredient_id BIGINT NOT NULL,
    unit_name TEXT NOT NULL,
    multiplier_to_base NUMERIC(12, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 8. Inventory Batches
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    ingredient_id BIGINT,
    supplier_id BIGINT,
    initial_quantity_base NUMERIC(12, 4) NOT NULL,
    remaining_quantity_base NUMERIC(12, 4) NOT NULL,
    cost_per_base_unit NUMERIC(12, 4) NOT NULL,
    received_date TEXT NOT NULL,
    expiration_date TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 9. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 10. Recipe Definitions Table
CREATE TABLE IF NOT EXISTS public.recipe_definitions (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 11. Recipe Ingredients Table
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    recipe_id BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    quantity_needed_base NUMERIC(12, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 12. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    category_id BIGINT,
    buy_price NUMERIC(12, 2),
    selling_price NUMERIC(12, 2) NOT NULL,
    recipe_definition_id BIGINT,
    current_stock NUMERIC(12, 4) DEFAULT 0,
    stock_deduction_method TEXT DEFAULT 'none',
    image_uri TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 13. Discounts Table
CREATE TABLE IF NOT EXISTS public.discounts (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'percentage',
    value NUMERIC(12, 2) NOT NULL,
    min_order_amount NUMERIC(12, 2) DEFAULT 0,
    max_discount_amount NUMERIC(12, 2),
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 14. Tax Configs Table
CREATE TABLE IF NOT EXISTS public.tax_configs (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rate NUMERIC(12, 2) NOT NULL,
    type TEXT DEFAULT 'percentage',
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 15. Payment Methods Table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    type_key TEXT NOT NULL,
    type_label TEXT NOT NULL,
    method_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    is_system INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 16. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    uuid TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    tier TEXT DEFAULT 'regular',
    loyalty_points BIGINT DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0,
    store_credit_balance NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 17. CRM Configs Table
CREATE TABLE IF NOT EXISTS public.crm_configs (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    loyalty_enabled INTEGER DEFAULT 1,
    points_per_currency NUMERIC(12, 4) DEFAULT 0.01,
    min_transaction_for_points NUMERIC(12, 2) DEFAULT 0,
    tier_upgrade_enabled INTEGER DEFAULT 1,
    tier_upgrade_period TEXT DEFAULT 'lifetime',
    bronze_threshold NUMERIC(12, 2) DEFAULT 1000000,
    silver_threshold NUMERIC(12, 2) DEFAULT 5000000,
    gold_threshold NUMERIC(12, 2) DEFAULT 10000000,
    redemption_enabled INTEGER DEFAULT 1,
    points_to_currency_ratio NUMERIC(12, 4) DEFAULT 0.01,
    min_points_to_redeem BIGINT DEFAULT 100,
    max_redemption_pct NUMERIC(12, 2) DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 18. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    discount_name TEXT,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    service_amount NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL,
    payment_type TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL,
    change_amount NUMERIC(12, 2) DEFAULT 0,
    items_count INTEGER DEFAULT 0,
    note TEXT,
    customer_id BIGINT,
    customer_name TEXT,
    is_split INTEGER DEFAULT 0,
    split_parent_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 19. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    order_id BIGINT NOT NULL,
    product_id BIGINT,
    product_name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 20. Order Splits Table
CREATE TABLE IF NOT EXISTS public.order_splits (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    parent_order_id BIGINT NOT NULL,
    split_index INTEGER NOT NULL,
    total_splits INTEGER NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_provider TEXT,
    customer_id BIGINT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 21. Customer Loyalty Transactions
CREATE TABLE IF NOT EXISTS public.customer_loyalty_transactions (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL,
    order_id BIGINT,
    order_number TEXT,
    type TEXT NOT NULL,
    points BIGINT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 22. Customer Balance Transactions
CREATE TABLE IF NOT EXISTS public.customer_balance_transactions (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL,
    order_id BIGINT,
    type TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- 23. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id BIGINT NOT NULL,
    entity_name TEXT NOT NULL,
    quantity NUMERIC(12, 4),
    unit TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, id)
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_owner ON public.stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_org ON public.stores(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_store ON public.staff(store_id);
CREATE INDEX IF NOT EXISTS idx_staff_username ON public.staff(username);
CREATE INDEX IF NOT EXISTS idx_products_store ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(store_id, order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_store ON public.inventory_batches(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store ON public.customers(store_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Owner organization policy
CREATE POLICY "Owner org policy" ON public.organizations FOR ALL USING (auth.uid() = owner_id);

-- Owner store policy
CREATE POLICY "Owner store policy" ON public.stores FOR ALL USING (auth.uid() = owner_id);

-- Staff lookup policy
CREATE POLICY "Staff all" ON public.staff FOR ALL USING (true);

-- Store entity policies (Allow full read/write for all store entities)
CREATE POLICY "Units access" ON public.units FOR ALL USING (true);
CREATE POLICY "Suppliers access" ON public.suppliers FOR ALL USING (true);
CREATE POLICY "Ingredients access" ON public.ingredients FOR ALL USING (true);
CREATE POLICY "Ingredient units access" ON public.ingredient_units FOR ALL USING (true);
CREATE POLICY "Inventory batches access" ON public.inventory_batches FOR ALL USING (true);
CREATE POLICY "Categories access" ON public.categories FOR ALL USING (true);
CREATE POLICY "Recipe defs access" ON public.recipe_definitions FOR ALL USING (true);
CREATE POLICY "Recipe ingr access" ON public.recipe_ingredients FOR ALL USING (true);
CREATE POLICY "Products access" ON public.products FOR ALL USING (true);
CREATE POLICY "Discounts access" ON public.discounts FOR ALL USING (true);
CREATE POLICY "Tax configs access" ON public.tax_configs FOR ALL USING (true);
CREATE POLICY "Payment methods access" ON public.payment_methods FOR ALL USING (true);
CREATE POLICY "Customers access" ON public.customers FOR ALL USING (true);
CREATE POLICY "CRM configs access" ON public.crm_configs FOR ALL USING (true);
CREATE POLICY "Orders access" ON public.orders FOR ALL USING (true);
CREATE POLICY "Order items access" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Order splits access" ON public.order_splits FOR ALL USING (true);
CREATE POLICY "Loyalty tx access" ON public.customer_loyalty_transactions FOR ALL USING (true);
CREATE POLICY "Balance tx access" ON public.customer_balance_transactions FOR ALL USING (true);
CREATE POLICY "Activity logs access" ON public.activity_logs FOR ALL USING (true);

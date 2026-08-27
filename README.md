# MintyPOS - Point of Sale & Inventory Management System

## EXPO SDK v54 React Native

A comprehensive React Native/Expo POS system with advanced inventory management, recipe tracking, dynamic HPP (Harga Pokok Penjualan) cost calculation, FEFO/FIFO stock control, multi-tax & discount management, customizable payment providers, responsive multi-device layouts (Tablet & Mobile), and real-time activity logging.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Design System](#-architecture--design-system)
- [Responsive Layout Architecture (Section & Payment)](#-responsive-layout-architecture)
- [Payment & Checkout Flow](#-payment--checkout-flow)
- [Tax, Service & Discount Engines](#-tax-service--discount-engines)
- [Dynamic HPP & Recipe Costing Engine](#-dynamic-hpp--recipe-costing-engine)
- [Database Schema & Migrations](#-database-schema--migrations)
- [Business Logic & Stock Deduction](#-business-logic--stock-deduction)
- [Built-In User Guide](#-built-in-user-guide)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation & Getting Started](#-installation--getting-started)
- [Recent Updates & Changelog](#-recent-updates--changelog)

---

## 🎯 Overview

MintyPOS is a production-grade Point of Sale (POS) and inventory control application built for coffee shops, cafes, restaurants, and retail businesses. It provides full recipe-based raw material deduction, multi-unit conversions (e.g. buying in kg/L and consuming in g/ml), dynamic FEFO/FIFO batch costing, configurable taxes/service fees/discounts, customizable payment methods (Cash, QRIS, Bank Transfer), and responsive tablet split-screen / mobile slide-over views.

### Key Capabilities

- **Dedicated Payment Checkout Screen (`app/pos/payment.tsx`)**: Responsive 2-column split-screen on tablet and full mobile view with live subtotal, discount modal selector, multi-tax breakdown, cash numpad, quick amount chips, and bank provider grids.
- **Strict 4-Layer Architecture**: Process + Validator + Service + DB layers applied across Products, Ingredients, Recipes, Inventory, Cart, Payments, Taxes, and Discounts.
- **Responsive Multi-Device Layout (`Section`)**: Side-by-side master-detail panels on Tablet, seamless slide-over navigation with BackButton on Mobile.
- **Dynamic HPP (Cost of Goods Sold)**: Real-time COGS and profit margin calculations derived from ingredient purchase batch prices (FEFO/FIFO).
- **Barcode & SKU Camera Scanner**: Camera barcode scanner with synchronous `useRef` lock to prevent duplicate scans, alongside keyboard Enter/OK trigger for SKU search.
- **Configurable Taxes & Service Charges**: Multi-tax system (percentage or flat amount) with active toggles and automatic order calculations.
- **Configurable Discounts & Promotions**: Percentage or flat discounts with minimum spend rules and maximum discount caps.
- **Custom Payment Methods**: Manage cash defaults, custom QRIS providers (DANA, GoPay, OVO, ShopeePay), bank transfers (BCA, Mandiri, BNI, BRI), and custom payment types.
- **Temporary Cart State Management**: Cart is maintained in Zustand + AsyncStorage without prematurely writing unfinalized orders to SQLite.
- **FEFO / FIFO Automated Deduction**: Perishable items deducted by nearest expiration date first (FEFO); non-perishables deducted by oldest received date (FIFO).
- **Nested Drawer Navigation**: Organized expandable dropdown menus for Payment Methods, Tax & Service, and Discounts.

---

## ✨ Key Features

### 1. Point of Sale & Payment Checkout
- **Intuitive Catalog Grid**: Filter by category chips, search by product name, or scan barcode / SKU.
- **Barcode Scanner with Anti-Duplicate Lock**: Camera scanning bypasses keyboard submit and adds 1 unit instantly without duplicate frame triggers.
- **SKU Search**: Typing SKU filters the product list; pressing Enter/OK on the keyboard auto-adds 1 unit to cart.
- **Dedicated Payment Screen (`/pos/payment`)**:
  - Itemized order review with dynamic quantity badges and subtotal calculations.
  - Header back navigation (`router.back()`) and Discount Tag icon button with active badge indicator.
  - Interactive Discount Bottom Sheet Modal with eligibility validation.
  - Real-time calculations for subtotal, active taxes, service charge, discounts, and Net Total.
  - Cash numpad with Quick Amount chips (*Uang Pas, Rp 10k, 20k, 50k, 100k, 150k, 200k, 500k*) and real-time Kembalian (change) indicator.
  - Bank & QRIS provider grid loaded dynamically from SQLite database.
  - Safety validation (`CheckoutProcess.processCheckout`) before stock deduction and order creation.
  - Receipt confirmation dialog with Change amount display and "Start New Sale" reset action.

### 2. Taxes, Service Charges & Discounts
- **Tax & Service Engine**:
  - Configure multiple taxes (e.g. PPN 11%, Service Charge 5%, PB1 10%).
  - Flat fee or percentage-based rates.
  - Real-time breakdown on payment and order summary.
  - Full CRUD management via responsive `TaxFormSheet` with `DripSheet`.
- **Discount Engine**:
  - Percentage or flat amount discounts.
  - Minimum order amount (`min_order_amount`) and maximum discount cap (`max_discount_amount`) rules.
  - Full CRUD management via responsive `DiscountFormSheet`.

### 3. Payment Methods Management
- **Cash**: Pre-configured default (protected from deactivation).
- **QRIS & Bank Transfers**: Add custom providers (e.g. BCA QRIS, DANA, GoPay, Mandiri, BRI).
- **Custom Types**: Support for custom payment channels.
- Full CRUD management via responsive `PaymentMethodFormSheet`.

### 4. Product Management & Dynamic HPP
- **Full CRUD Operations**: Create, edit, search, and delete catalog products.
- **Dynamic HPP & Profit Margins**: Live calculation of HPP and profit margin percentages displayed directly on each product card and detail panel.
- **Product Image Support**: Image picker with camera roll permissions, list thumbnails, and detail hero views.
- **Stock Deduction Modes**:
  - `product`: Deducts directly from retail product stock units.
  - `recipe`: Deducts raw ingredients from inventory batches upon checkout.
  - `none`: Service or non-inventory items.

### 5. Recipe Management
- **Full CRUD Support**: Create new recipes, edit existing ingredient compositions, and delete recipes.
- **Dynamic FEFO Costing**: Calculates exact production cost based on active inventory batch prices.
- **Ingredient Breakdown**: Displays unit quantity needed, current cost per base unit, and line item cost for every ingredient.

### 6. Inventory & Batch Restocking
- **Multi-Unit Restocking**: Buy in bulk units (e.g. 5 kg) with automatic conversion to base units (5000 g).
- **Batch Tracking & Expiration Dates**: Track received dates, supplier IDs, purchase costs, remaining quantities, and expiration dates.
- **FEFO/FIFO Deduction**:
  - **FEFO (First Expired, First Out)**: Prioritizes batches with nearest expiration dates.
  - **FIFO (First In, First Out)**: Prioritizes oldest received batches for items without expiration dates.
- **Direct Product Restocking**: Restock non-recipe retail products directly.

### 7. Activity Audit Stream & Navigation
- **Real-Time Audit Metrics**: Summary bar displaying Total Logs, Restocks, Deductions, and Orders.
- **Search & Filter Pills**: Filter by activity type (*All, Stock Added, Stock Deducted, Orders, Restocks*) or search by keyword.
- **Nested Drawer Navigation**: Clean role-based navigation drawer with expandable dropdowns for financial and payment settings.

### 8. Customer Relationship Management (CRM)
- **Full Customer Management**: Create, edit, search, and delete customer profiles with contact information.
- **Loyalty Points System**: Earn points from purchases, redeem for discounts, and track point history with order references.
- **Store Credit Management**: Deposit store credit to customer accounts, track balance, and view transaction history.
- **Customer Tiers**: Regular, Bronze, Silver, and Gold tiers based on spending thresholds.
- **Total Spend Tracking**: Automatic tracking of customer lifetime spending for analytics and tier upgrades.
- **KPI Dashboard**: Visual cards displaying loyalty points and store credit balance in customer details panel.
- **Transaction History**: Complete loyalty and balance transaction logs with order number references.

### 9. Reports & Analytics
- **Comprehensive Reporting System**: Sales, Inventory, and Profit reports with real-time data from SQLite database.
- **Time-Based Filtering**: Filter reports by Today, This Week, This Month, or All Time.
- **Sales Report**: Total revenue, orders, average order value, top selling products, payment method breakdown.
- **Inventory Report**: Total items, inventory value, low stock alerts, category breakdown, expiring items.
- **Profit Report**: Revenue, COGS, gross profit, profit margins, product profitability analysis, cost breakdown.
- **Responsive Detail Views**: Detailed breakdowns with tables, charts placeholders, and key insights.

---

## 🏗 Architecture & Design System

MintyPOS enforces a strict **4-tier clean architecture pattern** across every module:

```
UI Layer (app/ & components/)
    ↓
Form Sheet Layer (components/forms/*FormSheet.tsx) ── User Input & DripSheet Modals
    ↓
Process Layer (processes/*Process.ts) ─────────────── Validation + Business Logic + Error Handling
    ↓
Validator Layer (validators/*Validator.ts) ────────── Pure Data & Business Rule Validation
    ↓
Service Layer (services/*Service.ts) ──────────────── Direct Database / Store CRUD Operations
    ↓
Database Layer (lib/database.ts) ─────────────────── SQLite Tables, Transactions & FIFO Deductions
```

### Module Layer Map

| Module | Service Layer | Validator Layer | Process Layer | Form Sheet |
| :--- | :--- | :--- | :--- | :--- |
| **Products** | `productService.ts` | `productValidator.ts` | `productProcess.ts` | `ProductFormSheet.tsx` |
| **Ingredients** | `ingredientService.ts` | `ingredientValidator.ts` | `ingredientProcess.ts` | `IngredientFormSheet.tsx` |
| **Recipes** | `recipeService.ts` | `recipeValidator.ts` | `recipeProcess.ts` | `RecipeFormSheet.tsx` |
| **Inventory** | `inventoryService.ts` | `inventoryValidator.ts` | `inventoryProcess.ts` | `InventoryFormSheet.tsx` |
| **Customers** | `customerService.ts` | `customerValidator.ts` | `customerProcess.ts` | `CustomerFormSheet.tsx` |
| **Cart** | `cartService.ts` | `cartValidator.ts` | `cartProcess.ts` | Inline + `CartModal` |
| **Checkout** | `dbOperations` | `checkoutValidator.ts` | `checkoutProcess.ts` | `DiscountPickerModal` |
| **Payment Methods** | `paymentMethodService.ts` | `paymentMethodValidator.ts` | `paymentMethodProcess.ts` | `PaymentMethodFormSheet.tsx` |
| **Taxes & Service** | `taxService.ts` | `taxValidator.ts` | `taxProcess.ts` | `TaxFormSheet.tsx` |
| **Discounts** | `discountService.ts` | `discountValidator.ts` | `discountProcess.ts` | `DiscountFormSheet.tsx` |

---

## 📱 Responsive Layout Architecture

MintyPOS adapts seamlessly between Mobile and Tablet/Desktop screens using responsive breakpoints (`isWide = width >= 768`):

### 1. General Management Screens (`components/Section.tsx`)
- **Tablet / Desktop**: Side-by-side split screen with left catalog/list and right detail/inspector panel.
- **Mobile**: Full-width list view with smooth slide-over detail view and back navigation.

### 2. Payment Checkout Screen (`app/pos/payment.tsx`)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Tablet Payment (width >= 768px)                       │
├──────────────────────────────────────────────┬──────────────────────────────┤
│                  LEFT PANEL                  │         RIGHT PANEL          │
│   (Top Summary Grid + Method Col + Numpad)   │   (Item Review + Total + Pay)│
│                                              │                              │
│  - Summary Grid (Subtotal, Tax, Change, etc) │  - Cart Item List with Qtys  │
│  - Payment Method Selector (Cash/QRIS/Bank)  │  - Discounts & Taxes Detail  │
│  - Cash Numpad / Quick Chips / Bank Grid     │  - Net Total Tagihan         │
│                                              │  - Primary [Confirm Payment] │
└──────────────────────────────────────────────┴──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       Mobile Payment (width < 768px)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  - Top Summary Grid (Subtotal, Discount, Tax, Total, Paid, Change)         │
│  - Horizontal Payment Method Tabs (Cash / QRIS / Transfer)                  │
│  - Cash Keypad / Quick Chips / Bank Selector                                │
│  - Bottom Fixed Bar: [See Cart (Modal)] + [Confirm Payment]                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💳 Payment & Checkout Flow

```
1. Add Items to Cart (Catalog / SKU Search / Barcode Scan)
       ↓
2. Tap "Charge" on POS Screen ➔ Navigate to /pos/payment
       ↓
3. Select Discount (Optional: Header Tag Icon ➔ Discount Sheet Modal)
       ↓
4. Live Calculations (Subtotal - Discount + Tax + Service = Net Total)
       ↓
5. Select Payment Method:
   ├─► Cash: Tap Quick Chip or Keypad ➔ Live Change Calculation
   ├─► QRIS: Select QRIS Provider (e.g. GoPay, DANA, BCA QRIS)
   └─► Bank Transfer: Select Bank Provider (e.g. BCA, Mandiri, BNI)
       ↓
6. Tap [Confirm Payment]
       ↓
7. CheckoutProcess.processCheckout:
   ├─► 1. Safety Validation (Cart check, cash sufficiency, bank selection)
   ├─► 2. Execute FEFO/FIFO Stock Deduction in SQLite DB
   ├─► 3. Insert records into `orders` and `order_items` tables
   └─► 4. Clear temporary Zustand cart via CartProcess.clearCart()
       ↓
8. Show Receipt Dialog (Amount Paid, Change) ➔ Tap "Start New Sale" ➔ Return to /
```

---

## 🗄 Database Schema & Migrations

The local SQLite database (`expo-sqlite`) includes full schemas, foreign keys, indexes, and automatic schema migrations:

### Tables

#### 1. **`units`**
Base measurement units for the system.
- `id`: Primary key
- `name`: Unit name (e.g., "gram", "milliliter")
- `symbol`: Unit symbol (e.g., "g", "ml")
- `base_unit_id`: Self-reference for unit hierarchy
- `conversion_factor`: Conversion to base unit

#### 2. **`categories`**
Product organization categories.
- `id`: Primary key
- `name`: Category name
- `description`: Category description
- `created_at`, `updated_at`: Timestamps

#### 3. **`suppliers`**
Vendor and supplier contact records.
- `id`: Primary key
- `name`: Supplier name
- `contact_person`: Contact person name
- `phone`: Phone number
- `email`: Email address
- `address`: Physical address
- `notes`: Additional notes
- `created_at`, `updated_at`: Timestamps

#### 4. **`ingredients`**
Raw material definitions with base units and minimum stock alerts.
- `id`: Primary key
- `name`: Ingredient name
- `base_unit_id`: Foreign key to units
- `minimum_stock`: Minimum stock threshold for alerts
- `created_at`, `updated_at`: Timestamps

#### 5. **`ingredient_units`**
Conversion rates between purchase units and base units.
- `id`: Primary key
- `ingredient_id`: Foreign key to ingredients
- `unit_id`: Foreign key to units
- `conversion_factor`: Conversion to base unit
- `created_at`, `updated_at`: Timestamps

#### 6. **`inventory_batches`**
Stock batches with quantities, costs, received dates, and expiration dates.
- `id`: Primary key
- `ingredient_id`: Foreign key to ingredients (nullable for historical preservation)
- `supplier_id`: Foreign key to suppliers (nullable for historical preservation)
- `quantity`: Current quantity in base units
- `cost_per_unit`: Purchase cost per base unit
- `received_date`: Date batch was received
- `expiration_date`: Expiration date (nullable)
- `created_at`, `updated_at`: Timestamps

#### 7. **`products`**
Catalog items with pricing, deduction modes, SKUs, images, and linked recipes.
- `id`: Primary key
- `name`: Product name
- `sku`: Stock keeping unit
- `selling_price`: Retail selling price
- `buy_price`: Purchase price (for COGS calculation)
- `category_id`: Foreign key to categories (nullable for historical preservation)
- `recipe_definition_id`: Foreign key to recipes (nullable for unselect)
- `stock_deduction_method`: 'none', 'product', or 'recipe'
- `current_stock`: Current stock quantity
- `has_recipe`: Boolean flag for recipe usage
- `image_uri`: Product image path
- `created_at`, `updated_at`: Timestamps

#### 8. **`recipe_definitions`**
Named recipe headers.
- `id`: Primary key
- `name`: Recipe name
- `description`: Recipe description
- `created_at`, `updated_at`: Timestamps

#### 9. **`recipe_ingredients`**
Ingredient requirements per recipe in base units.
- `id`: Primary key
- `recipe_id`: Foreign key to recipe_definitions
- `ingredient_id`: Foreign key to ingredients
- `quantity_needed_base`: Quantity needed in base units
- `created_at`, `updated_at`: Timestamps

#### 10. **`payment_methods`**
Payment channels (Cash, QRIS, Bank Transfer, Custom).
- `id`: Primary key
- `name`: Payment method name
- `type`: 'cash', 'qris', 'transfer', 'ewallet', or 'split'
- `is_system`: Boolean flag for system defaults
- `is_active`: Boolean flag for active status
- `created_at`, `updated_at`: Timestamps

#### 11. **`tax_configs`**
Multi-tax and service charge configurations.
- `id`: Primary key
- `name`: Tax/service name
- `type`: 'percentage' or 'flat'
- `rate`: Tax rate or flat amount
- `is_active`: Boolean flag for active status
- `created_at`, `updated_at`: Timestamps

#### 12. **`discounts`**
Promotional discounts with eligibility rules.
- `id`: Primary key
- `name`: Discount name
- `type`: 'percentage' or 'flat'
- `value`: Discount value
- `min_order_amount`: Minimum order amount to qualify
- `max_discount_amount`: Maximum discount cap
- `is_active`: Boolean flag for active status
- `created_at`, `updated_at`: Timestamps

#### 13. **`orders`**
Transaction records with payment details and customer info.
- `id`: Primary key
- `order_number`: Unique order identifier (e.g., ORD-123456)
- `subtotal`: Order subtotal
- `discount_amount`: Total discount applied
- `discount_name`: Discount name used
- `tax_amount`: Total tax amount
- `service_amount`: Total service charge
- `total`: Final total
- `payment_type`: Payment type (cash, card, qris, etc.)
- `payment_method`: Payment method display name
- `amount_paid`: Amount paid by customer
- `change_amount`: Change returned
- `items_count`: Number of items
- `note`: Order notes
- `customer_id`: Foreign key to customers (nullable for historical preservation)
- `customer_name`: Customer name snapshot
- `is_split`: Boolean flag for split payments
- `split_parent_id`: Parent order ID for split payments
- `created_at`: Order timestamp

#### 14. **`order_items`**
Item breakdowns for orders.
- `id`: Primary key
- `order_id`: Foreign key to orders
- `product_id`: Foreign key to products (nullable for historical preservation)
- `product_name`: Product name snapshot
- `price`: Price per unit snapshot
- `quantity`: Quantity purchased
- `subtotal`: Line item subtotal
- `note`: Item notes
- `created_at`: Timestamp

#### 15. **`customers`**
Customer profiles with contact info, loyalty points, store credit, and tier status.
- `id`: Primary key
- `uuid`: Unique customer identifier
- `name`: Customer name
- `phone`: Phone number
- `email`: Email address
- `notes`: Additional notes
- `tier`: Customer tier ('regular', 'bronze', 'silver', 'gold')
- `loyalty_points`: Current loyalty points balance
- `total_spent`: Lifetime spending total
- `store_credit_balance`: Current store credit balance
- `created_at`, `updated_at`: Timestamps

#### 16. **`customer_loyalty_transactions`**
Loyalty point earn/redeem history with order references.
- `id`: Primary key
- `customer_id`: Foreign key to customers
- `order_id`: Foreign key to orders (nullable)
- `order_number`: Order number reference (e.g., ORD-123456)
- `type`: 'earn', 'redeem', or 'adjust'
- `points`: Points amount (positive for earn, negative for redeem)
- `notes`: Transaction notes
- `created_at`: Transaction timestamp

#### 17. **`customer_balance_transactions`**
Store credit deposit/spend history with order references.
- `id`: Primary key
- `customer_id`: Foreign key to customers
- `order_id`: Foreign key to orders (nullable)
- `type`: 'deposit', 'spend', or 'refund'
- `amount`: Amount transacted
- `notes`: Transaction notes
- `created_at`: Transaction timestamp

#### 18. **`crm_config`**
Loyalty program configuration.
- `id`: Primary key
- `loyalty_enabled`: Boolean flag for loyalty program
- `points_per_currency`: Points earned per currency unit
- `min_transaction_for_points`: Minimum transaction to earn points
- `tier_upgrade_enabled`: Boolean flag for tier upgrades
- `tier_upgrade_period`: Tier upgrade period
- `bronze_threshold`: Bronze tier spending threshold
- `silver_threshold`: Silver tier spending threshold
- `gold_threshold`: Gold tier spending threshold
- `redemption_enabled`: Boolean flag for point redemption
- `points_to_currency_ratio`: Points to currency conversion ratio
- `min_points_to_redeem`: Minimum points required for redemption
- `max_redemption_pct`: Maximum redemption percentage
- `created_at`, `updated_at`: Timestamps

#### 19. **`order_splits`**
Split payment records.
- `id`: Primary key
- `parent_order_id`: Parent order ID
- `split_index`: Split payment index
- `total_splits`: Total number of splits
- `amount`: Split amount
- `payment_method`: Payment method
- `payment_provider`: Payment provider (e.g., BCA, DANA)
- `customer_id`: Foreign key to customers (nullable for historical preservation)
- `status`: Payment status
- `created_at`: Timestamp

#### 20. **`activity_logs`**
System audit trail of all inventory and order events.
- `id`: Primary key
- `entity_type`: Type of entity (product, ingredient, order, etc.)
- `entity_id`: Entity ID
- `action`: Action performed (create, update, delete, etc.)
- `details`: JSON details of the action
- `created_at`: Timestamp

### Schema Migrations

The database uses automatic schema migrations based on `PRAGMA user_version`. Current target version is 8.

**Migration History:**
- **Version 1**: Initial schema with units, suppliers, ingredients, products, recipes, inventory
- **Version 2**: Added payment_methods table
- **Version 3**: Added tax_configs table
- **Version 4**: Added discounts table
- **Version 5**: Added orders and order_items tables
- **Version 6**: Added activity_logs table
- **Version 7**: Added CRM tables (customers, customer_loyalty_transactions, customer_balance_transactions, crm_config, order_splits)
- **Version 8**: Added order_number column to customer_loyalty_transactions

---

## � Service Layer Documentation

The Service Layer provides direct database CRUD operations without validation. All services follow a consistent pattern:

### Service Layer Pattern

```typescript
export class [Entity]Service {
  static async getAll(db: SQLite.SQLiteDatabase): Promise<Entity[]>
  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<Entity | null>
  static async create(db: SQLite.SQLiteDatabase, input: CreateInput): Promise<Entity>
  static async update(db: SQLite.SQLiteDatabase, id: number, input: UpdateInput): Promise<Entity>
  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<void>
  static async search(db: SQLite.SQLiteDatabase, query: string): Promise<Entity[]>
}
```

### Service Modules

#### **ProductService** (`services/productService.ts`)
- **getAll**: Fetches all products with category and recipe joins
- **getById**: Fetches single product by ID
- **create**: Creates new product with SKU, pricing, category, recipe assignment
- **update**: Updates product fields (name, price, category, recipe, stock method)
- **delete**: **Preserves historical data** - sets recipe_definition_id to NULL, sets product_id to NULL in order_items, then deletes product
- **search**: Searches products by name with LIKE query
- **getProductsWithRecipes**: Fetches products that have recipes assigned
- **getSimpleProducts**: Fetches products without recipes

#### **IngredientService** (`services/ingredientService.ts`)
- **getAll**: Fetches all ingredients with unit joins
- **getById**: Fetches single ingredient by ID
- **create**: Creates new ingredient with base unit and minimum stock
- **update**: Updates ingredient fields
- **delete**: **Preserves historical data** - deletes ingredient_units, sets ingredient_id to NULL in inventory_batches, deletes recipe_ingredients, then deletes ingredient
- **search**: Searches ingredients by name
- **getLowStock**: Fetches ingredients below minimum stock threshold
- **getWithUnits**: Fetches ingredients with all available units

#### **RecipeService** (`services/recipeService.ts`)
- **getAllDefinitions**: Fetches all recipe definitions
- **getDefinitionById**: Fetches single recipe definition
- **createDefinition**: Creates new recipe definition
- **updateDefinition**: Updates recipe definition
- **deleteDefinition**: **Preserves historical data** - sets recipe_definition_id to NULL in products, deletes recipe_ingredients, then deletes recipe
- **getRecipeIngredients**: Fetches ingredients for a recipe with unit symbols
- **addIngredient**: Adds ingredient to recipe
- **removeIngredient**: Removes ingredient from recipe
- **updateRecipeIngredients**: Batch updates recipe ingredients

#### **InventoryService** (`services/inventoryService.ts`)
- **getAllBatches**: Fetches all inventory batches with ingredient and supplier joins
- **getBatchById**: Fetches single batch by ID
- **createBatch**: Creates new inventory batch with quantity, cost, expiration
- **updateBatch**: Updates batch quantity and details
- **deleteBatch**: Deletes inventory batch
- **getLowStock**: Fetches ingredients with low stock
- **getExpiringSoon**: Fetches batches expiring within 7 days
- **getByIngredient**: Fetches batches for specific ingredient
- **getBySupplier**: Fetches batches for specific supplier

#### **CustomerService** (`services/customerService.ts`)
- **getAll**: Fetches all customers
- **getById**: Fetches single customer by ID
- **create**: Creates new customer with default tier (regular)
- **update**: Updates customer fields
- **delete**: **Preserves historical data** - sets customer_id to NULL in orders and order_splits, deletes loyalty/balance transactions, then deletes customer
- **updatePoints**: Updates customer loyalty points with transaction logging
- **depositStoreCredit**: Deposits store credit to customer account
- **spendStoreCredit**: Spends store credit from customer account
- **getLoyaltyLogs**: Fetches loyalty transaction history
- **getBalanceLogs**: Fetches balance transaction history
- **search**: Searches customers by name or phone

#### **CategoryService** (`services/categoryService.ts`)
- **getAll**: Fetches all categories
- **getById**: Fetches single category by ID
- **create**: Creates new category
- **update**: Updates category fields
- **delete**: **Preserves historical data** - sets category_id to NULL in products, then deletes category
- **search**: Searches categories by name

#### **SupplierService** (`services/supplierService.ts`)
- **getAll**: Fetches all suppliers
- **getById**: Fetches single supplier by ID
- **create**: Creates new supplier
- **update**: Updates supplier fields
- **delete**: **Preserves historical data** - sets supplier_id to NULL in inventory_batches, then deletes supplier
- **search**: Searches suppliers by name
- **getStats**: Fetches supplier statistics (total batches, total value)

#### **PaymentMethodService** (`services/paymentMethodService.ts`)
- **getAll**: Fetches all payment methods
- **getActive**: Fetches only active payment methods
- **getById**: Fetches single payment method by ID
- **create**: Creates new payment method
- **update**: Updates payment method fields
- **delete**: Deletes payment method (with system protection)
- **toggleActive**: Toggles active status

#### **TaxService** (`services/taxService.ts`)
- **getAll**: Fetches all tax configs
- **getActive**: Fetches only active tax configs
- **getById**: Fetches single tax config by ID
- **create**: Creates new tax config
- **update**: Updates tax config fields
- **delete**: Deletes tax config
- **toggleActive**: Toggles active status

#### **DiscountService** (`services/discountService.ts`)
- **getAll**: Fetches all discounts
- **getActive**: Fetches only active discounts
- **getById**: Fetches single discount by ID
- **create**: Creates new discount
- **update**: Updates discount fields
- **delete**: Deletes discount
- **toggleActive**: Toggles active status

#### **CartService** (`services/cartService.ts`)
- **addToCart**: Adds item to cart with quantity
- **updateQuantity**: Updates item quantity in cart
- **removeFromCart**: Removes item from cart
- **clearCart**: Clears all items from cart
- **getCartTotal**: Calculates cart subtotal
- **validateCart**: Validates cart items for checkout

---

## 🛡 Delete Function & Historical Data Preservation

All delete operations in MintyPOS are designed to preserve historical data by setting foreign key IDs to NULL instead of deleting related records. This ensures that:

1. **Orders remain intact** even if products, customers, or categories are deleted
2. **Inventory history is preserved** even if ingredients or suppliers are deleted
3. **Recipes remain available** even if products are deleted
4. **Audit trails are complete** for compliance and analytics

### Delete Function Implementation Pattern

```typescript
static async delete(db: SQLite.SQLiteDatabase, id: number) {
  // Temporarily disable foreign keys to allow cleanup
  await db.execAsync('PRAGMA foreign_keys = OFF;');

  try {
    // Preserve historical data - set foreign key IDs to NULL
    await db.runAsync('UPDATE related_table SET foreign_key_id = NULL WHERE foreign_key_id = ?', [id]);

    // Delete dependent records that don't need preservation
    await db.runAsync('DELETE FROM dependent_table WHERE foreign_key_id = ?', [id]);

    // Finally delete the entity
    await db.runAsync('DELETE FROM main_table WHERE id = ?', [id]);
  } finally {
    // Re-enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
```

### Delete Function Details

#### **Customer Delete** (`lib/database.ts`)
- Sets `customer_id` to NULL in `orders` (preserves historical order data)
- Sets `customer_id` to NULL in `order_splits` (preserves split payment records)
- Deletes `customer_loyalty_transactions` (customer-specific data)
- Deletes `customer_balance_transactions` (customer-specific data)
- Deletes customer record

#### **Product Delete** (`services/productService.ts`)
- Sets `recipe_definition_id` to NULL in `products` (unselects recipe, keeps recipe in database)
- Sets `product_id` to NULL in `order_items` (preserves历史 order records)
- Deletes product record

#### **Ingredient Delete** (`services/ingredientService.ts`)
- Deletes `ingredient_units` (conversion data)
- Sets `ingredient_id` to NULL in `inventory_batches` (preserves historical inventory data)
- Deletes `recipe_ingredients` (removes ingredient from recipes, recipes remain)
- Deletes ingredient record

#### **Supplier Delete** (`services/supplierService.ts`)
- Sets `supplier_id` to NULL in `inventory_batches` (preserves historical inventory data)
- Deletes supplier record

#### **Category Delete** (`services/categoryService.ts`)
- Sets `category_id` to NULL in `products` (preserves historical product data)
- Deletes category record

#### **Recipe Definition Delete** (`lib/database.ts`)
- Sets `recipe_definition_id` to NULL in `products` (unselects recipe from products)
- Deletes `recipe_ingredients` (recipe composition)
- Deletes recipe definition record

---

## 👥 CRM Implementation Details

### Customer Management Flow

```
Customer Creation
    ↓
Customer Profile (name, phone, email, notes)
    ↓
Default Tier: Regular
    ↓
Loyalty Points: 0
    ↓
Store Credit: 0
    ↓
Total Spent: 0
```

### Loyalty Points System

#### **Earning Points**
- Points are earned when a customer completes an order
- Calculation: `points = floor(order_total * points_per_currency)`
- Minimum transaction threshold applies (configurable)
- Transaction logged in `customer_loyalty_transactions` with order number
- Customer `loyalty_points` balance更新
- Customer `total_spent` incremented by order total

#### **Redeeming Points**
- Points can be redeemed for discounts during checkout
- Conversion: `discount_value = points * points_to_currency_ratio`
- Maximum redemption percentage applies (configurable)
- Minimum points threshold applies (configurable)
- Transaction logged in `customer_loyalty_transactions` with order number
- Customer `loyalty_points` balance decremented

#### **Point Adjustments**
- Manual point adjustments can be made (earn/redeem/adjust)
- Used for corrections, promotions, or refunds
- Transaction logged with notes

### Store Credit System

#### **Depositing Credit**
- Store credit can be deposited to customer accounts
- Transaction logged in `customer_balance_transactions`
- Customer `store_credit_balance` incremented
- Can be used for future purchases

#### **Spending Credit**
- Store credit can be used during checkout
- Transaction logged in `customer_balance_transactions` with order number
- Customer `store_credit_balance` decremented
- Remaining balance persists for future use

### Customer Tiers

#### **Tier Thresholds**
- **Regular**: Default tier (0 - bronze_threshold)
- **Bronze**: bronze_threshold - silver_threshold
- **Silver**: silver_threshold - gold_threshold
- **Gold**: Above gold_threshold

#### **Tier Upgrades**
- Automatic tier upgrade based on total_spent
- Configurable upgrade period (monthly, quarterly, yearly)
- Tier affects loyalty point multipliers (future feature)

### CRM Configuration

The `crm_config` table controls the entire loyalty program:

- **loyalty_enabled**: Enable/disable entire loyalty system
- **points_per_currency**: Points earned per currency unit (e.g., 1 point per 1000 currency)
- **min_transaction_for_points**: Minimum order value to earn points
- **tier_upgrade_enabled**: Enable/disable automatic tier upgrades
- **tier_upgrade_period**: Period for tier upgrade evaluation
- **bronze_threshold**: Spending threshold for bronze tier
- **silver_threshold**: Spending threshold for silver tier
- **gold_threshold**: Spending threshold for gold tier
- **redemption_enabled**: Enable/disable point redemption
- **points_to_currency_ratio**: Conversion rate for point redemption
- **min_points_to_redeem**: Minimum points required for redemption
- **max_redemption_pct**: Maximum percentage of order that can be paid with points

### Customer Dashboard UI

The customer screen displays:
- **Left Panel**: Customer list with search and filtering
- **Right Panel**: 
  - KPI Cards (Loyalty Points, Store Credit)
  - Deposit Store Credit Button
  - Customer Details (name, phone, email, tier, total spent)
  - Loyalty History (with order numbers)
  - Balance History (with order numbers)

---

## �🛠 Technology Stack

- **Framework**: React Native with **Expo SDK v54.0.0**
- **Navigation**: Expo Router (file-based routing)
- **Database**: `expo-sqlite` (Local SQLite engine with foreign keys)
- **State Management**: Zustand with `AsyncStorage` persistence
- **Financial Math**: `decimal.js`
- **Icons**: `lucide-react-native` & `@expo/vector-icons`
- **Camera & Barcode**: `expo-camera`
- **Image Picker**: `expo-image-picker`
- **Type Safety**: 100% TypeScript (Strict typing, 0 TS errors)

---

## 🚀 Installation & Getting Started

### Prerequisites
- **Node.js**: v18 or higher
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go App** (on physical device) or iOS/Android emulator

### Setup Steps
```bash
# 1. Clone the repository
git clone https://github.com/BasthDev/MintyPOS.git
cd MintyPOS

# 2. Install dependencies
npm install

# 3. Start Expo development server
npx expo start --clear
```

### Run on Specific Targets
```bash
# Run on Android Emulator / Device
npx expo start --android

# Run on iOS Simulator
npx expo start --ios

# Run on Web Browser
npx expo start --web
```

### Build for Production
```bash
# Bump version (increments patch version and updates versionCode)
npm run bump-version

# Build app (interactive menu with options)
npm run build
```

**Build Options:**
1. bundleRelease (Production App Bundle - auto version bump)
2. assembleRelease (Production APK - auto version bump)
3. assembleDebug (Debug APK)
4. installRelease (Install Production to device - auto version bump)
5. installDebug (Install Debug to device)

---

## 🔄 Recent Updates & Changelog

### Version 1.0.2 (Latest)
- 👥 **Customer Relationship Management (CRM)**: Full customer management system with loyalty points, store credit, and tier tracking.
- 🎯 **Loyalty Points System**: Earn points from purchases, redeem for discounts, with complete transaction history and order number references.
- 💳 **Store Credit Management**: Deposit store credit to customer accounts, track balance, and view transaction history.
- 📊 **Customer KPI Dashboard**: Visual cards displaying loyalty points and store credit balance in customer details panel.
- 🔢 **Order Number in Loyalty History**: Loyalty transactions now display order numbers (e.g., ORD-123456) for easy reference.
- 💰 **Total Spend Tracking**: Automatic tracking of customer lifetime spending for analytics and tier upgrades.
- 🛡 **Delete Function Fixes**: Fixed all delete operations to preserve historical data:
  - Customer delete: Nullifies customer_id in orders/splits, preserves historical order data
  - Product delete: Nullifies product_id in order_items, preserves historical order records
  - Ingredient delete: Nullifies ingredient_id in inventory batches, preserves historical inventory data
  - Supplier delete: Nullifies supplier_id in inventory batches, preserves historical inventory data
  - Category delete: Nullifies category_id in products, preserves historical product data
  - Recipe delete: Nullifies recipe_definition_id in products, preserves recipes
- 🏗 **4-Layer CRM Architecture**: Implemented customerService, customerValidator, customerProcess, and CustomerFormSheet.

### Version 1.0.1
- 📊 **Reports & Analytics System**: Added comprehensive Sales, Inventory, and Profit reports with real-time data from SQLite database.
- ⏱ **Time-Based Filtering**: Implemented Today, This Week, This Month, and All Time filters for all reports.
- 📈 **Sales Report Dashboard**: Total revenue, orders, average order value, top selling products, payment method breakdown.
- 📦 **Inventory Report Dashboard**: Total items, inventory value, low stock alerts, category breakdown, expiring items tracking.
- 💰 **Profit Report Dashboard**: Revenue, COGS, gross profit, profit margins, product profitability analysis, cost breakdown.
- 🏗 **Build Scripts**: Added version bump script (`npm run bump-version`) and build runner (`npm run build`) for Play Console releases.
- 🔒 **Data Persistence**: Disabled mock data reset to preserve user data between app reloads.
- 🎨 **UI Enhancements**: Updated drawer dropdown title colors to match single menu items for consistent styling.

### Version 1.0.0
- 💳 **Dedicated Payment Screen (`/pos/payment`)**: Converted payment flow into a responsive dedicated page with 2-column wide layout, subtotal breakdown, discount modal picker, cash numpad, quick chips, bank grid, and receipt confirmation.
- 🛡 **Checkout Process & Safety Validator (`checkoutProcess.ts` & `checkoutValidator.ts`)**: Built full checkout orchestration and pre-payment safety validation.
- 🧾 **Taxes & Service Charge System**: Created multi-tax configuration engine with active rate toggles and full 4-layer architecture.
- 🏷 **Discount System**: Created percentage and flat discount engine with minimum order rules, maximum discount caps, and full 4-layer architecture.
- 💰 **Custom Payment Methods**: Added support for customizable QRIS, Bank Transfer, and other payment provider channels with full 4-layer architecture.
- 🛒 **Cart 4-Tier Architecture**: Built `cartService.ts`, `cartValidator.ts`, and `cartProcess.ts` ensuring clean temporary state storage and separation of concerns.
- 📷 **Anti-Duplicate Camera Barcode Scanner**: Fixed camera frame duplication using synchronous `useRef` lock and auto-add bypass.
- ⌨️ **SKU Auto-Add on Keyboard Submit**: Integrated SKU matching on keyboard Enter/OK with instant toast notifications.
- 📂 **Drawer Dropdown Menu Reorganization**: Added expandable dropdown menus under Settings for Payment Methods, Tax & Service, and Discounts.
- 🛡 **100% Type Safety**: Verified full codebase with `npx tsc --noEmit` passing with 0 errors.

---

## 📝 License

This project is proprietary software developed for MintyPOS. All rights reserved.

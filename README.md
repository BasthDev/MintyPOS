# MintyPOS - Point of Sale & Inventory Management System

A comprehensive React Native/Expo POS system with advanced inventory management, recipe tracking, FEFO/FIFO stock control, and real-time activity logging.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Business Logic](#business-logic)
- [User Workflows](#user-workflows)
- [Component Structure](#component-structure)
- [Development Guidelines](#development-guidelines)
- [Recent Updates](#recent-updates)

---

## 🎯 Overview

MintyPOS is a full-featured Point of Sale system designed for restaurants, cafes, and retail businesses. It provides real-time inventory tracking, recipe-based stock management, FEFO/FIFO stock deduction, comprehensive supplier management, and complete activity logging.

### Key Capabilities

- **Multi-Unit Inventory Support**: Convert between purchase units (kg, L, boxes) and base units (g, ml, pcs)
- **Recipe-Based Products**: Create products from multiple ingredients with automatic stock deduction
- **FEFO/FIFO Stock Management**: First-Expired-First-Out for perishable items, First-In-First-Out for non-perishable
- **Dynamic Cost Calculation**: Recipe costs calculated based on current inventory prices (FEFO pricing)
- **Supplier Management**: Track suppliers, orders, and restock statistics
- **Category Management**: Organize products into categories
- **Barcode/QR Scanning**: Scan product SKUs for quick entry
- **Activity Logging**: Track all stock movements, restocks, and orders in real-time
- **Responsive Design**: Works seamlessly on mobile and tablet devices

---

## ✨ Features

### 1. Product Management
- **Create/Edit/Delete Products**: Full CRUD operations with validation
- **Category Assignment**: Organize products into categories
- **SKU/Barcode Support**: Manual entry or scanner integration
- **HPP (Harga Pokok Penjualan)**: Recipe-based cost calculation
  - Toggle "Use HPP / Recipe Cost" to enable
  - Select recipe from dropdown with cost display
  - Auto-calculates buy price based on current stock prices
  - Dynamic updates when inventory prices change
- **Stock Deduction Methods**:
  - `none`: No stock tracking (can sell without inventory)
  - `product`: Deduct from product inventory (requires current stock)
  - `recipe`: Deduct from recipe ingredients (requires recipe)
- **Initial Stock**: Set current stock when creating products
- **Product Images**: Optional image upload for products

### 2. Recipe Management
- **Multi-Ingredient Recipes**: Create recipes with multiple ingredients
- **Base Unit Quantities**: All quantities in smallest units (g, ml, pcs)
- **Dynamic Cost Calculation**: 
  - Recipe costs calculated using FEFO pricing
  - Per-ingredient cost breakdown
  - Cost per unit displayed for each ingredient
  - Updates based on current inventory stock prices
- **Recipe Detail View**: 
  - Total recipe cost display
  - Ingredient list with quantities
  - Individual ingredient costs
  - Cost per unit information

### 3. Inventory Management
- **Restocking Items**: Add inventory in purchase units with automatic conversion
  - Multi-item restock support for same supplier
  - Optional expiration dates for perishable items
  - Automatic base unit conversion
  - Helper text showing base equivalent: `(in base unit: 2000g)`
  - Cost per base unit calculation
- **Restocking Products**: Direct product stock addition
  - Only for products with HPP OFF and Use Product Stock ON
  - Updates product current_stock directly
  - Simple quantity input
- **Stock Deduction**: Automatic stock deduction using FEFO/FIFO
  - **FEFO (First Expired First Out)**: Items WITH expiration dates
    - Expired items deducted first (use before they go bad)
    - Nearest expiration date next
  - **FIFO (First In First Out)**: Items WITHOUT expiration dates
    - Oldest received date first
- **Base Unit Display**: All quantities shown in base units (g, ml, pcs)

### 4. Supplier Management
- **Create/Edit/Delete Suppliers**: Full CRUD operations
- **Contact Information**: Track supplier contact details
- **Supplier Statistics**:
  - Total orders placed
  - Total ingredients ordered
  - Total order value
  - Total quantity ordered
- **Link to Inventory**: Suppliers linked to inventory batches

### 5. Category Management
- **Create/Edit/Delete Categories**: Full CRUD operations
- **Product Organization**: Organize products for better navigation
- **Category Dropdown**: Category selection in product form
- **Unique Names**: Prevent duplicate category names

### 6. Ingredient Management
- **Create/Edit/Delete Ingredients**: Full CRUD operations
- **Base Unit Selection**: Define smallest unit (g, ml, pcs)
- **Minimum Stock Thresholds**: Set alerts for low stock
- **Current Stock Display**: View real-time stock levels
- **Unit Conversion**: Support for multiple units per ingredient

### 7. Activity Log
- **Real-Time Tracking**: All system activities logged automatically
- **Activity Types**:
  - **Restock**: Stock additions (inventory batches)
  - **Stock Deduct**: Stock consumption (sales/usage)
  - **Order**: Product sales
- **Activity Details**:
  - Entity name (ingredient/product)
  - Quantity and unit
  - Description
  - Timestamp
- **Filtering**: Filter by activity type (All, Restock, Deduct, Orders)
- **Activity Feed**: Chronological view of all activities

---

## 🛠 Technology Stack

### Core Framework
- **React Native**: Cross-platform mobile development
- **Expo SDK v54.0.0**: Development toolchain and managed runtime
- **Expo Router**: File-based routing system
- **TypeScript**: Type-safe development

### Database & State
- **expo-sqlite**: Local SQLite database
- **Zustand**: Lightweight state management
- **AsyncStorage**: Persistent storage for Zustand state

### Libraries
- **decimal.js**: Precise financial and inventory calculations
- **lucide-react-native**: Icon library
- **expo-camera**: Barcode/QR scanning
- **expo-image-picker**: Image upload functionality

### UI Components
- Custom design system with Drip* components
- Flat UI design (no gradients, no heavy shadows)
- Theme-based theming (light/dark mode support)

---

## 🏗 Architecture

### Layer Pattern

```
┌─────────────────────────────────────────┐
│         UI Layer (app/)                  │
│  - Screens (index.tsx)                   │
│  - Navigation (Router)                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│     Form Layer (components/forms/)       │
│  - ProductFormSheet                     │
│  - RecipeFormSheet                      │
│  - InventoryFormSheet                    │
│  - SupplierFormSheet                    │
│  - CategoryFormSheet                    │
│  - IngredientFormSheet                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Process Layer (processes/)             │
│  - Validation + Business Logic           │
│  - Error Handling                        │
│  - Orchestrates services                │
│  - Returns ProcessResult<T>              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Service Layer (services/)              │
│  - Direct Database Operations            │
│  - CRUD Operations                       │
│  - No validation                         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Database Layer (lib/database.ts)       │
│  - SQLite Operations                     │
│  - Schema Definition                     │
│  - Business Logic Functions              │
│  - Activity Logging                      │
└─────────────────────────────────────────┘
```

### Key Principles

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Validation First**: Validators catch errors before database operations
3. **Process Layer Orchestrates**: Business logic, validation, and services coordinated here
4. **Services for Raw Data**: Direct database access without validation
5. **Forms for UI**: User input handling with proper validation feedback
6. **Consistent Return Types**: All processes return `ProcessResult<T>` with success/error/data

### Layer Responsibilities

#### Validators Layer (`validators/`)
- **Purpose**: Input validation and sanitization
- **Files**:
  - `productValidator.ts` - Product input validation
  - `ingredientValidator.ts` - Ingredient input validation
  - `recipeValidator.ts` - Recipe input validation
  - `inventoryValidator.ts` - Inventory input validation
  - `categoryValidator.ts` - Category input validation
  - `supplierValidator.ts` - Supplier input validation
- **Usage**: Always validate data before operations
- **Output**: `{ isValid: boolean, errors: string[] }`

#### Services Layer (`services/`)
- **Purpose**: Direct database operations and CRUD
- **Files**:
  - `productService.ts` - Product CRUD operations
  - `ingredientService.ts` - Ingredient CRUD operations
  - `recipeService.ts` - Recipe CRUD operations
  - `inventoryService.ts` - Inventory batch CRUD operations
  - `categoryService.ts` - Category CRUD operations
  - `supplierService.ts` - Supplier CRUD operations
- **Usage**: Use services for direct database access without validation
- **No**: Business logic or validation

#### Process Layer (`processes/`)
- **Purpose**: Business logic orchestration with validation
- **Files**:
  - `productProcess.ts` - Product business operations
  - `ingredientProcess.ts` - Ingredient business operations
  - `recipeProcess.ts` - Recipe business operations
  - `inventoryProcess.ts` - Inventory business operations
  - `categoryProcess.ts` - Category business operations
  - `supplierProcess.ts` - Supplier business operations
- **Usage**: Use processes for complete business operations
- **Pattern**:
  1. Validate input using validator
  2. Call service for database operation
  3. Handle errors and return consistent result
- **Output**: `ProcessResult<T>` with success/error/data/errors

#### Forms Layer (`components/forms/`)
- **Purpose**: Responsive form sheets using DripSheet
- **Files**:
  - `ProductFormSheet.tsx` - Product create/edit form
  - `IngredientFormSheet.tsx` - Ingredient create/edit form
  - `RecipeFormSheet.tsx` - Recipe create form
  - `InventoryFormSheet.tsx` - Inventory restock form
  - `ProductRestockFormSheet.tsx` - Product stock addition form
  - `CategoryFormSheet.tsx` - Category create/edit form
  - `SupplierFormSheet.tsx` - Supplier create/edit form
- **Usage**: Use these forms for all CRUD operations with proper validation
- **Features**: Mobile/tablet responsive, error display, loading states

---

## 🗄 Database Schema

### Tables

#### 1. `units` - Base Units
Stores the smallest/base units for measurement.

```sql
CREATE TABLE units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL
);
```

**Base Units**:
- gram (g)
- milliliter (ml)
- piece (pcs)

#### 2. `suppliers` - Supplier Information
Stores supplier contact details.

```sql
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT
);
```

#### 3. `ingredients` - Raw Materials
Stores ingredient definitions with base unit.

```sql
CREATE TABLE ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  base_unit_id INTEGER NOT NULL,
  minimum_stock REAL DEFAULT 0,
  FOREIGN KEY (base_unit_id) REFERENCES units(id)
);
```

#### 4. `ingredient_units` - Conversion Units
Stores conversion rules from purchase units to base units.

```sql
CREATE TABLE ingredient_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id INTEGER NOT NULL,
  unit_name TEXT NOT NULL,
  multiplier_to_base REAL NOT NULL,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);
```

**Example**: 1 kg = 1000 g (multiplier_to_base = 1000)

#### 5. `inventory_batches` - Stock Batches
Stores inventory batches with FEFO/FIFO tracking.

```sql
CREATE TABLE inventory_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  initial_quantity_base REAL NOT NULL,
  remaining_quantity_base REAL NOT NULL,
  cost_per_base_unit REAL NOT NULL,
  received_date TEXT NOT NULL,
  expiration_date TEXT,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
```

**Key Features**:
- All quantities stored in base units
- Expiration date for FEFO (optional)
- Cost per base unit for COGS calculation
- FEFO/FIFO ordering based on expiration_date

#### 6. `categories` - Product Categories
Stores product categories.

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
```

#### 7. `products` - Products
Stores product definitions.

```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT,
  category_id INTEGER,
  buy_price REAL,
  selling_price REAL NOT NULL,
  recipe_definition_id INTEGER,
  stock_deduction_method TEXT DEFAULT 'none',
  current_stock REAL DEFAULT 0,
  image_uri TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (recipe_definition_id) REFERENCES recipe_definitions(id)
);
```

**Stock Deduction Methods**:
- `none`: No stock tracking (can sell without inventory)
- `product`: Deduct from product inventory (requires current_stock)
- `recipe`: Deduct from recipe ingredients (requires recipe_definition_id)

#### 8. `recipe_definitions` - Recipe Headers
Stores recipe definitions.

```sql
CREATE TABLE recipe_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);
```

#### 9. `recipe_ingredients` - Recipe Ingredients
Stores recipe composition.

```sql
CREATE TABLE recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  ingredient_id INTEGER NOT NULL,
  quantity_needed_base REAL NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipe_definitions(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);
```

#### 10. `activity_logs` - Activity Tracking
Stores all system activities for audit trail.

```sql
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  entity_name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Activity Types**:
- `restock`: Stock additions
- `stock_deduct`: Stock consumption
- `order`: Product sales

**Indexes**:
- `idx_activity_logs_created_at`: For chronological queries
- `idx_activity_logs_type`: For filtering by type

---

## 🧮 Business Logic

### 1. Base Unit Conversion

All inventory quantities are stored in base units (g, ml, pcs). Purchase units (kg, L, boxes) are converted automatically during restocking.

**Conversion Formula**:
```
base_quantity = purchase_quantity × multiplier_to_base
```

**Example**:
- Buy: 2 kg of sugar
- Multiplier: 1000 (1 kg = 1000 g)
- Base quantity stored: 2000 g

### 2. FEFO/FIFO Stock Deduction

Stock deduction follows this priority order:

**FEFO (First Expired First Out)** - Items WITH expiration dates:
1. Expired items first (expiration_date < current time)
2. Nearest expiration date next (expiration_date sorted ASC)

**FIFO (First In First Out)** - Items WITHOUT expiration dates:
1. Oldest received date first (received_date sorted ASC)

**Implementation**:
```sql
SELECT * FROM inventory_batches 
WHERE ingredient_id = ? AND remaining_quantity_base > 0 
ORDER BY 
  CASE 
    WHEN expiration_date IS NOT NULL AND expiration_date < datetime('now') THEN 0
    ELSE 1
  END,
  expiration_date ASC,
  received_date ASC
```

**Key Logic**:
- If item has `expiration_date`: Uses FEFO (prioritizes expiring stock)
- If item has NO `expiration_date`: Uses FIFO (prioritizes oldest received)
- This ensures perishable items are used before they expire while non-perishable items follow standard FIFO

### 3. Recipe-Based Stock Deduction

When a recipe-based product is sold:

1. Load recipe ingredients and quantities
2. Calculate total deduction for each ingredient:
   ```
   total_deduction = ingredient_quantity × products_sold
   ```
3. Deduct from inventory batches using FEFO/FIFO
4. Update remaining quantities
5. Log stock deduction activity

### 4. Dynamic Recipe Cost Calculation

Recipe costs are calculated using FEFO pricing logic:

1. For each ingredient in recipe:
   - Find active inventory batch using FEFO/FIFO ordering
   - Get cost_per_base_unit from that batch
   - Calculate ingredient cost: `quantity_needed_base × cost_per_base_unit`
2. Sum all ingredient costs for total recipe cost
3. Updates dynamically when inventory prices change

**Implementation**:
```sql
SELECT cost_per_base_unit FROM inventory_batches 
WHERE ingredient_id = ? AND remaining_quantity_base > 0 
ORDER BY 
  CASE 
    WHEN expiration_date IS NOT NULL AND expiration_date < datetime('now') THEN 0
    ELSE 1
  END,
  expiration_date ASC,
  received_date ASC
LIMIT 1
```

### 5. Cost Calculation

**Cost Per Base Unit**:
```
cost_per_base_unit = total_cost_paid / total_quantity_in_base
```

**COGS (Cost of Goods Sold)**:
- Calculated using cost_per_base_unit from each batch
- Based on actual batches used (FEFO/FIFO)
- Updates as inventory prices change

### 6. Activity Logging

All stock movements and orders are automatically logged:

**Restock Activity**:
- Logged when inventory batch is created
- Includes ingredient name, quantity, unit, cost
- Description: "Restocked X unit at Rp Y/unit"

**Stock Deduction Activity**:
- Logged when ingredients are used (FEFO deduction)
- Includes ingredient name, quantity, unit
- Description: "Deducted X unit from stock"

**Order Activity**:
- Logged when products are sold
- Includes product name, quantity sold
- Description: "Sold X units of ProductName"

---

## 📝 User Workflows

### 1. Creating a Product with Recipe

**Steps**:
1. Navigate to Products screen
2. Click "Add New Product"
3. Fill in product name and SKU (optional scan)
4. Select category (required)
5. **Toggle "Use HPP / Recipe Cost" to ON**
6. Select recipe from dropdown (shows cost in label)
7. View calculated HPP in info box
8. Set selling price
9. **Toggle "Use Ingredient Stock"** (optional, default OFF)
   - ON: Stock deducted from recipe ingredients
   - OFF: Stock not deducted
10. Set initial current stock (if using product stock)
11. Optionally upload product image
12. Click "Create Product"

**Result**: Product created with recipe-based cost calculation and stock tracking configuration.

### 2. Restocking Inventory (Multi-Item)

**Steps**:
1. Navigate to Inventory screen
2. Click "Restock Items"
3. Add multiple items (click "Add Another Item")
4. For each item:
   - Select ingredient
   - Select supplier
   - Enter quantity bought (e.g., 2 kg)
   - Unit auto-selects to base unit
   - Helper text shows base equivalent: `(in base unit: 2000g)`
   - Enter total cost
   - Optionally set expiration date
5. Click "Restock Items"
6. System converts to base units and creates inventory batches
7. Activity logged automatically

**Result**: Inventory restocked with proper batch tracking and activity logging.

### 3. Restocking Products

**Steps**:
1. Navigate to Inventory screen
2. Click "Restock Products"
3. Select product (only shows products with HPP OFF and Use Product Stock ON)
4. Enter quantity to add
5. Click "Restock Product"
6. Product current_stock is updated directly

**Result**: Product stock increased directly (no inventory batches created).

### 4. Creating a Recipe

**Steps**:
1. Navigate to Recipes screen
2. Click "Add New Recipe"
3. Enter recipe name
4. Optionally enter description
5. Add multiple ingredients:
   - Select ingredient
   - Enter quantity in base unit (e.g., 500 g)
   - Unit label shows ingredient's base unit
6. Click "Create Recipe"
7. View recipe cost in list (calculated from current inventory)

**Result**: Recipe created with dynamic cost calculation based on current stock prices.

### 5. Adding a Supplier

**Steps**:
1. Navigate to Suppliers screen
2. Click "Add New Supplier"
3. Enter supplier name
4. Enter contact information (optional)
5. Click "Create Supplier"

**Result**: Supplier created and available for inventory restocking.

### 6. Creating a Category

**Steps**:
1. Navigate to Categories screen
2. Click "Add New Category"
3. Enter category name
4. Click "Create Category"

**Result**: Category created and available for product assignment.

### 7. Viewing Activity Log

**Steps**:
1. Navigate to Activity screen
2. View all activities in chronological order
3. Filter by type:
   - All: Show all activities
   - Restock: Show stock additions only
   - Deduct: Show stock consumption only
   - Orders: Show product sales only
4. View activity details:
   - Entity name
   - Quantity and unit
   - Description
   - Timestamp

**Result**: Complete audit trail of all system activities.

---

## 🧩 Component Structure

### Shared Components (`components/`)

#### Input Components
- **DripInput**: Single-line text input with label, error, helper text
- **DeskInput**: Multi-line text input (3-4 lines)
- **DripDropdown**: Dropdown selector with options
- **DripDatePicker**: Date picker with calendar modal
- **DripSwitch**: Toggle switch with animation
- **InlineScanner**: Inline barcode/QR scanner for SKU input

#### Layout Components
- **DripContainer**: Responsive container with mobile/tablet support
- **DripSheet**: Modal sheet for forms
- **Header**: Screen header with drawer trigger
- **DripButton**: Primary/secondary buttons

#### Navigation
- **DripDrawer**: Navigation drawer with role-based menu

#### Specialized
- **ImagePicker**: Product image upload component

### Form Sheets (`components/forms/`)

- **ProductFormSheet**: Product create/edit with HPP toggle, recipe selection, image upload
- **RecipeFormSheet**: Multi-ingredient recipe creation with DeskInput for description
- **InventoryFormSheet**: Multi-item restock with expiration dates and FEFO logic
- **ProductRestockFormSheet**: Direct product stock addition
- **SupplierFormSheet**: Supplier create/edit
- **CategoryFormSheet**: Category create/edit
- **IngredientFormSheet**: Ingredient create/edit

### Screens (`app/`)

- **products**: Product list with CRUD and HPP integration
- **recipes**: Recipe list with cost breakdown and ingredient details
- **inventory**: Inventory management with restock options
- **ingredients**: Ingredient list with CRUD
- **suppliers**: Supplier list with statistics
- **categories**: Category list with CRUD
- **orders**: Order/checkout screen
- **activity**: Activity log showing all stock movements and orders
- **reports**: Analytics and reports
- **settings**: App settings

---

## 🔧 Development Guidelines

### File Organization
```
MintyPOS/
├── app/              # Screens and routing
│   ├── activity/     # Activity log screen
│   ├── categories/   # Category management
│   ├── ingredients/  # Ingredient management
│   ├── inventory/    # Inventory management
│   ├── orders/       # Order/checkout
│   ├── products/     # Product management
│   ├── recipes/      # Recipe management
│   ├── reports/      # Analytics
│   ├── settings/     # App settings
│   ├── staff/        # Staff management
│   └── suppliers/    # Supplier management
├── components/       # Reusable components
│   ├── forms/       # Form sheets
│   ├── drawer/      # Navigation drawer
│   ├── Button.tsx
│   ├── Container.tsx
│   ├── DatePicker.tsx
│   ├── DeskInput.tsx
│   ├── Dropdown.tsx
│   ├── Header.tsx
│   ├── ImagePicker.tsx
│   ├── Input.tsx
│   ├── InlineScanner.tsx
│   ├── Sheet.tsx
│   └── Switch.tsx
├── constants/       # Constants and contexts
│   ├── auth.tsx      # Authentication context
│   ├── colorTheme.tsx # Theme provider
│   ├── drawerContext.tsx # Navigation state
│   └── menu.tsx      # Menu configuration
├── lib/             # Core libraries
│   ├── database.ts   # Database operations & business logic
│   ├── businessLogic.ts # Additional business logic
│   ├── examples.ts   # Usage examples
│   ├── supabase.ts   # Supabase integration (deprecated)
│   └── utils.ts      # Utility functions
├── processes/       # Business logic layer
│   ├── categoryProcess.ts
│   ├── ingredientProcess.ts
│   ├── inventoryProcess.ts
│   ├── productProcess.ts
│   ├── recipeProcess.ts
│   └── supplierProcess.ts
├── services/        # Data access layer
│   ├── categoryService.ts
│   ├── ingredientService.ts
│   ├── inventoryService.ts
│   ├── productService.ts
│   ├── recipeService.ts
│   └── supplierService.ts
├── validators/      # Validation layer
│   ├── categoryValidator.ts
│   ├── ingredientValidator.ts
│   ├── inventoryValidator.ts
│   ├── productValidator.ts
│   ├── recipeValidator.ts
│   └── supplierValidator.ts
├── store/           # State management
│   └── useStore.ts   # Zustand store
└── AGENTS.md        # Development guidelines
```

### Code Style
- TypeScript strict mode
- Use process layer for business operations
- Use services for direct database access
- Use validators for input validation
- Use form sheets for all CRUD operations
- Follow layer pattern strictly
- Consistent return types: `ProcessResult<T>`

### Validation Pattern
```typescript
// Validator returns { isValid: boolean, errors: string[] }
const validation = Validator.validateCreate(input);
if (!validation.isValid) {
  return { success: false, errors: validation.errors };
}
```

### Process Pattern
```typescript
// Process orchestrates validation + service + error handling
static async create(db, input) {
  const validation = Validator.validateCreate(input);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }
  
  try {
    const result = await Service.create(db, input);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Service Pattern
```typescript
// Service provides direct database access (no validation)
static async create(db, input) {
  const result = await db.runAsync('INSERT INTO table (...) VALUES (...)', [...]);
  return result.lastInsertRowId;
}
```

---

## 🚀 Recent Updates

### v5.0 - Activity Log & Dynamic Recipe Costs

#### Activity Tracking System
- ✅ **Activity Log Table**: New database table for tracking all system activities
  - `activity_logs` table with activity type, entity info, quantity, description, timestamp
  - Automatic logging in restock, deduction, and checkout processes
  - Indexes for efficient querying
- ✅ **Activity Screen**: New screen at `/activity` 
  - Filter by activity type (All, Restock, Deduct, Orders)
  - Real-time activity feed with timestamps
  - Entity details and quantities
  - Color-coded activity types (success/error/primary/warning)
  - Icons for each activity type
- ✅ **Menu Integration**: Activity added to navigation drawer (Admin/Manager access)

#### Dynamic Recipe Cost Calculation
- ✅ **FEFO-Based Pricing**: Recipe costs calculated using FEFO logic
  - Prioritizes expiring stock for cost calculation
  - Nearest expiration next
  - FIFO fallback for non-perishable items
- ✅ **Recipe Cost Display**: 
  - Recipe list shows total cost per recipe
  - Recipe detail modal shows per-ingredient cost breakdown
  - Individual ingredient costs with quantity and unit
  - Cost per unit displayed for each ingredient
- ✅ **Product Form HPP Auto-Calculation**:
  - Recipe dropdown shows cost in option label
  - Calculated HPP displayed in info box with styling
  - Auto-fills buy price with calculated HPP
  - Updates dynamically when stock prices change
  - Clear description of FEFO pricing logic

#### FEFO/FIFO Clarification
- ✅ **Clear FEFO/FIFO Logic**:
  - Items WITH expiration dates: Use FEFO (prioritize expiring stock)
  - Items WITHOUT expiration dates: Use FIFO (prioritize oldest received)
  - Documented in README with implementation details
  - Database queries updated with proper ordering

#### Product Stock Addition Fix
- ✅ **Current Stock Actually Added**: Product form now properly saves current_stock
  - Database insert includes current_stock value
  - Service layer passes current_stock parameter
  - Form data properly includes current_stock
  - Initial stock now actually stored in database

#### Database Migration
- ✅ **Schema Version 5**: Added activity_logs table
  - Incremental migration preserves existing data
  - Indexes for performance
  - No data loss on app restart

### v4.1 - Previous Updates

#### Inventory Enhancements
- ✅ **Product Restock**: Added separate product restock functionality
  - Only for products with HPP OFF and Use Product Stock ON
  - Direct product stock update (no inventory batches)
  - Simple quantity input
- ✅ **Two Restock Options**: "Restock Items" and "Restock Products" buttons
  - Items: Multi-ingredient restock with batches
  - Products: Direct product stock addition

#### Product Form Logic Update
- ✅ **Three Stock Deduction Methods**: `none`, `product`, `recipe`
  - `none`: No stock tracking (can sell without inventory)
  - `product`: Deduct from product inventory (requires current stock)
  - `recipe`: Deduct from recipe ingredients (requires recipe)
- ✅ **HPP Toggle Behavior**:
  - ON: Shows recipe dropdown and "Use Ingredient Stock" toggle
  - OFF: Shows buy price and "Use Product Stock" toggle
- ✅ **Current Stock Visibility**: Only shown when "Use Product Stock" is ON
- ✅ **Independent Stock Toggle**: Stock tracking is independent of HPP toggle
- ✅ **Validation Updates**: Recipe required for `recipe` method, stock required for `product` method

#### Database Migration
- ✅ **Incremental Migration**: No more data loss on app restart
  - Adds `expiration_date` column if missing
  - Updates existing products to `none` method if no stock
  - Preserves all existing data

### v4.0 - Core Features

#### Product Form Enhancements
- ✅ **HPP Toggle**: Added "Use HPP / Recipe Cost" toggle
  - OFF: Shows buy price and selling price
  - ON: Shows recipe dropdown and selling price
- ✅ **Recipe Dropdown**: Changed from modal to dropdown for better UX
- ✅ **Stock Deduction Toggle**: Independent toggle for stock tracking
  - Label changes based on HPP: "Use Product Stock" or "Use Ingredient Stock"
  - Default OFF regardless of HPP state
- ✅ **DripSwitch Component**: Using native DripSwitch instead of custom toggle

#### Inventory Enhancements
- ✅ **Multi-Item Restock**: Support for restocking multiple items in one batch
  - Same supplier requirement for batch restock
  - Add/remove items dynamically
- ✅ **Auto-Select Unit**: Base unit auto-selected when ingredient chosen
- ✅ **Base Unit Helper Text**: Shows `(in base unit: 2000g)` below quantity input
- ✅ **Expiration Date**: Optional expiration date for perishable items
- ✅ **FEFO Implementation**: First Expired First Out stock deduction

#### Category Management
- ✅ **Category Screen**: Full CRUD for product categories
- ✅ **Category Dropdown**: Category selection in product form
- ✅ **Menu Integration**: Categories added to navigation menu

#### Component Library
- ✅ **DeskInput**: Multi-line input component (3-4 lines)
- ✅ **DripInput Helper Text**: Added helperText prop for contextual information
- ✅ **DripDatePicker Placeholder**: Added placeholder prop

#### Database
- ✅ **Schema Version 4**: Added expiration_date to inventory_batches
- ✅ **FEFO Ordering**: Updated batch queries with expiration logic

---

## 📱 Responsive Design

### Mobile (< 768px)
- Stacked layout: Action panel above list panel
- Lists appear below add buttons
- Optimized for touch interaction
- Full-width modals

### Tablet (≥ 768px)
- Side-by-side layout: Action panel left, list panel right
- Utilizes wider screen real estate
- Improved information density
- Centered modals

---

## 🎨 Design System

### Flat UI Principles
- No gradients
- No heavy drop shadows
- Solid colors from theme
- Clean, minimal aesthetic
- Consistent spacing and typography

### Theme Support
- Light/dark mode via ThemeProvider
- Dynamic color references
- Consistent spacing and typography
- Color-coded activity types

### Component Guidelines
- Always use Drip* components instead of raw React Native components
- Use DripContainer for screen layouts
- Use DripInput for all text inputs
- Use DripDropdown for selectors
- Use DripButton for actions
- Use DripSheet for modals
- Use Header for screen headers

---

## 📊 Data Flow Examples

### Restock Flow
```
User Input (2 kg, Rp 600.000)
    ↓
Validator (checks all fields)
    ↓
Process Layer (validation + error handling)
    ↓
Service Layer (database operation)
    ↓
Business Logic (conversion: 2kg × 1000 = 2000g)
    ↓
Database (stores in base units)
    ↓
Activity Logging (logs restock activity)
```

### Checkout Flow
```
Order (Product A × 3)
    ↓
Check Product (has recipe?)
    ↓
Load Recipe (ingredients, quantities)
    ↓
Calculate Deduction (ingredient_qty × 3)
    ↓
FEFO/FIFO Deduction (from inventory batches)
    ↓
Update Remaining Quantities
    ↓
Activity Logging (logs order and stock deduction)
    ↓
Record Sale
```

### Recipe Cost Calculation Flow
```
Recipe Selected
    ↓
Load Recipe Ingredients
    ↓
For Each Ingredient:
    ↓
Get Active Batch (FEFO/FIFO ordering)
    ↓
Get Cost Per Base Unit
    ↓
Calculate Ingredient Cost (qty × cost)
    ↓
Sum All Ingredient Costs
    ↓
Return Total Recipe Cost
```

---

## 🔄 State Management

### Zustand Stores
- **useStore**: Cart, products, ingredients, inventory, recipes
- **AsyncStorage**: Persistent storage for Zustand state
- **Drawer Context**: Navigation drawer state
- **Theme Context**: Theme preference
- **Auth Context**: User authentication

---

## 📦 Dependencies

### Core
- expo: ~54.0.36
- react: 19.1.0
- react-native: 0.81.5
- expo-router: ~6.0.24

### Database & State
- expo-sqlite: ~16.0.10
- zustand: ^5.0.15
- @react-native-async-storage/async-storage: 2.2.0

### Libraries
- decimal.js: ^10.6.0
- lucide-react-native: ^1.34.0
- expo-camera: ~17.0.10
- expo-image-picker: ~17.0.11
- expo-file-system: ~19.0.23

### UI & Navigation
- @react-navigation/native: ^7.1.8
- @react-navigation/bottom-tabs: ^7.4.0
- react-native-gesture-handler: ~2.28.0
- react-native-reanimated: ~4.1.1

---

## 🔐 Authentication

### Default User
- **Username**: admin
- **Password**: admin123
- **Role**: Admin (full access)

### Role-Based Access
- **Admin**: Full access to all features
- **Manager**: Most features except staff management
- **Staff**: POS and orders only

---

## 🎯 Key Features Summary

### Inventory Management
- ✅ Multi-unit support with automatic conversion
- ✅ FEFO/FIFO stock deduction based on expiration dates
- ✅ Batch tracking with expiration dates
- ✅ Dynamic cost calculation based on current stock
- ✅ Multi-item restock support

### Recipe Management
- ✅ Multi-ingredient recipes
- ✅ Dynamic cost calculation (FEFO pricing)
- ✅ Per-ingredient cost breakdown
- ✅ Integration with product HPP

### Product Management
- ✅ Recipe-based products with HPP
- ✅ Category organization
- ✅ SKU/barcode scanning
- ✅ Stock tracking options
- ✅ Product images

### Activity Tracking
- ✅ Real-time activity logging
- ✅ Stock additions/deductions
- ✅ Order tracking
- ✅ Filterable activity feed
- ✅ Complete audit trail

---

## 🛠 Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (for mobile testing)

### Installation
```bash
cd MintyPOS
npm install
npx expo start
```

### Development Server
```bash
npx expo start --clear
```

### iOS
```bash
npx expo start --ios
```

### Android
```bash
npx expo start --android
```

---

## 📝 License

This project is proprietary software. All rights reserved.

---

## 🤝 Support

For support and issues, please contact the development team.

---

**Last Updated**: 2026-08-25
**Version**: 5.0

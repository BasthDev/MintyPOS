# MintyPOS - Point of Sale & Inventory Management System

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
1. **`units`**: Base units (`g`, `ml`, `pcs`, `kg`, `L`).
2. **`categories`**: Product organization categories.
3. **`suppliers`**: Vendor and supplier contact records.
4. **`ingredients`**: Raw material definitions, base units, and minimum stock alerts.
5. **`ingredient_units`**: Conversion rates between purchase units and base units.
6. **`inventory_batches`**: Stock batches with quantities, costs, received dates, and expiration dates.
7. **`products`**: Catalog items with pricing, deduction modes, SKUs, `image_uri`, and linked recipes.
8. **`recipe_definitions`**: Named recipe headers.
9. **`recipe_ingredients`**: Ingredient requirements per recipe in base units.
10. **`payment_methods`**: Payment channels (Cash, QRIS, Bank Transfer, Custom).
11. **`tax_configs`**: Multi-tax and service charge configurations.
12. **`discounts`**: Promotional discounts with eligibility rules.
13. **`orders` & `order_items`**: Transaction records, payment details, and item breakdowns.
14. **`activity_logs`**: System audit trail of all inventory and order events.

---

## 🛠 Technology Stack

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

---

## 🔄 Recent Updates & Changelog

### Version 6.0 (Latest)
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

# MintyPOS - Point of Sale & Inventory Management System

A comprehensive React Native/Expo POS system with advanced inventory management, recipe tracking, dynamic HPP (Harga Pokok Penjualan) cost calculation, FEFO/FIFO stock control, responsive multi-device layouts (Tablet & Mobile), and real-time activity logging.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Design System](#-architecture--design-system)
- [Responsive Layout Architecture (Section)](#-responsive-layout-architecture-section)
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

MintyPOS is a production-grade Point of Sale (POS) and inventory control application built for coffee shops, cafes, restaurants, and retail businesses. It provides full recipe-based raw material deduction, multi-unit conversions (e.g. buying in kg/L and consuming in g/ml), dynamic FEFO/FIFO batch costing, and responsive tablet split-screen / mobile slide-over views.

### Key Capabilities

- **Responsive Multi-Device Layout (`Section`)**: Side-by-side master-detail panels on Tablet, seamless slide-over navigation with BackButton on Mobile.
- **Dynamic HPP (Cost of Goods Sold)**: Real-time COGS and profit margin calculations derived from ingredient purchase batch prices (FEFO/FIFO).
- **Product Images & Barcode Scanning**: Full thumbnail and hero image support with automatic database persistence and camera barcode scanner.
- **Full Recipe Management (CRUD)**: Create, view, edit/modify ingredient proportions, and delete composite recipes with live ingredient pricing breakdowns.
- **Multi-Unit Inventory System**: Automatic conversions between purchase units (kg, L, boxes) and base recipe units (g, ml, pcs).
- **FEFO / FIFO Automated Deduction**: Perishable items deducted by nearest expiration date first (FEFO); non-perishables deducted by oldest received date (FIFO).
- **Clean List Navigation**: List cards feature sleek `ChevronRight` indicators, with comprehensive Edit and Delete controls inside the detail panel.
- **Real-Time Activity Audit Stream**: Comprehensive audit logging with statistics, filter pills, search, and detailed record inspections.
- **Integrated User Guide**: Step-by-step operating instructions built directly into the Settings screen.

---

## ✨ Key Features

### 1. Product Management
- **Full CRUD Operations**: Create, edit, search, and delete catalog products.
- **Dynamic HPP & Profit Margins**: 
  - Live calculation of HPP and profit margin percentages displayed directly on each product card and detail panel.
  - Choose between recipe ingredient costing or direct retail buy price.
- **Product Image Support**: Image picker with camera roll permissions, list thumbnails, and detail hero views.
- **Stock Deduction Modes**:
  - `product`: Deducts directly from retail product stock units.
  - `recipe`: Deducts raw ingredients from inventory batches upon checkout.
  - `none`: Service or non-inventory items.
- **SKU & Barcode Support**: Integrated camera barcode scanner and manual SKU inputs.

### 2. Recipe Management
- **Full CRUD Support**: Create new recipes, edit existing ingredient compositions, and delete recipes.
- **Dynamic FEFO Costing**: Calculates exact production cost based on active inventory batch prices.
- **Ingredient Breakdown**: Displays unit quantity needed, current cost per base unit, and line item cost for every ingredient.

### 3. Inventory & Batch Restocking
- **Multi-Unit Restocking**: Buy in bulk units (e.g. 5 kg) with automatic conversion to base units (5000 g).
- **Batch Tracking & Expiration Dates**: Track received dates, supplier IDs, purchase costs, remaining quantities, and expiration dates.
- **FEFO/FIFO Deduction**:
  - **FEFO (First Expired, First Out)**: Prioritizes batches with nearest expiration dates.
  - **FIFO (First In, First Out)**: Prioritizes oldest received batches for items without expiration dates.
- **Direct Product Restocking**: Restock non-recipe retail products directly.

### 4. Point of Sale & Checkout
- **Intuitive Catalog Grid**: Filter by category, search by product name or SKU.
- **Cart Management**: Add items, adjust quantities, calculate totals with tax/discounts.
- **Automatic Multi-Batch Deduction**: Checkout automatically executes database transactions to deduct raw ingredients and product units across active batches.

### 5. Activity Audit Stream
- **Real-Time Audit Metrics**: Summary bar displaying Total Logs, Restocks, Deductions, and Orders.
- **Search & Filter Pills**: Filter by activity type (*All, Stock Added, Stock Deducted, Orders, Restocks*) or search by keyword.
- **Audit Detail Inspector**: View entity category, target ID, quantity impact, and exact timestamps.

### 6. Suppliers & Categories
- **Suppliers**: Full CRUD, order value tracking, and linked batch histories.
- **Categories**: Organize products into customizable categories with quick filtering.

### 7. Settings & Built-In User Guide
- **User Guide**: Comprehensive user manual with 6 structured guide modules.
- **Appearance**: Light / Dark mode toggle.
- **Business Info**: Store name, currency formatting (Rp), and system details.

---

## 📱 Responsive Layout Architecture (`Section`)

MintyPOS utilizes a unified layout component ([`components/Section.tsx`](file:///d:/MintyPOS/components/Section.tsx)) designed for responsive cross-device consistency:

```
┌─────────────────────────────────────────────────────────────┐
│                    Tablet (width >= 768px)                  │
├──────────────────────────────┬──────────────────────────────┤
│          LEFT PANEL          │         RIGHT PANEL          │
│   (List, Search, Filters)    │  (Details, Actions, Close)   │
│                              │                              │
│  - Item Cards with Chevron   │  - Hero Info & Stats         │
│  - FAB Action Button         │  - Edit / Delete Actions     │
│  - Real-time summaries       │  - BackButton (Close Detail) │
└──────────────────────────────┴──────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Mobile (width < 768px)                   │
├──────────────────────────────┬──────────────────────────────┤
│         MAIN SCREEN          │         NEXT SCREEN          │
│   (Default list view)        │  (Slide-over detail screen)  │
│                              │                              │
│  - Item Cards with Chevron   │  - Top BackButton (Go Back)  │
│  - Bottom Right FAB          │  - Full Details & Actions    │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 💡 Dynamic HPP & Recipe Costing Engine

The HPP (Cost of Goods Sold) calculation dynamically traverses inventory batches using FEFO/FIFO ordering:

```
Product Selected / Loaded
    ↓
Has Recipe Definition ID?
    ├─► YES: Query recipe_ingredients
    │         ↓
    │       For each ingredient:
    │         ↓
    │       Fetch active inventory_batch (ordered by expiration_date ASC, received_date ASC)
    │         ↓
    │       Ingredient Cost = quantity_needed_base × cost_per_base_unit
    │         ↓
    │       Sum all ingredients = Total Dynamic HPP
    │
    └─► NO: Direct buy_price = Total Dynamic HPP
    ↓
Profit Margin = selling_price - Dynamic HPP
Profit Margin % = (Profit Margin / selling_price) × 100
```

---

## 🗄 Database Schema & Migrations

The local SQLite database (`expo-sqlite`) includes full schemas, foreign keys, indexes, and automatic schema migrations:

### Tables
1. **`units`**: Base units (`g`, `ml`, `pcs`, `kg`, `L`).
2. **`categories`**: Product organization categories.
3. **`suppliers`**: Vendor and supplier contact records.
4. **`ingredients`**: Raw material definitions, base units, and minimum stock alerts.
5. **`ingredient_units`**: Conversion rates between purchase units and base units (e.g. `1 kg = 1000 g`).
6. **`inventory_batches`**: Stock batches with quantities, costs, received dates, and expiration dates.
7. **`products`**: Catalog items with pricing, deduction modes, SKUs, `image_uri`, and linked recipes.
8. **`recipe_definitions`**: Named recipe headers.
9. **`recipe_ingredients`**: Ingredient requirements per recipe in base units.
10. **`orders` & `order_items`**: Transaction records, payment details, and item breakdowns.
11. **`activity_logs`**: System audit trail of all inventory and order events.

### Automatic Migrations
- The database initialization automatically executes safe column migrations (e.g. `ALTER TABLE products ADD COLUMN image_uri TEXT;`) ensuring seamless backward compatibility without data loss.

---

## 🏗 Architecture & Design System

MintyPOS follows a strict 4-tier clean architecture:

```
UI Layer (app/)
    ↓
Form Sheet Layer (components/forms/) ── User Inputs & Responsive Modals
    ↓
Process Layer (processes/) ──────────── Validation, Business Logic & Error Handling
    ↓
Service Layer (services/) ───────────── Direct Database CRUD
    ↓
Database Layer (lib/database.ts) ────── SQLite Tables, Transactions & FIFO Deductions
```

### Design Principles
- **No Inline Button Clutter**: List cards use `ChevronRight` indicators; primary edit and delete actions live inside the detail inspector.
- **Flat UI Theme**: Clean, accessible palette with high-contrast text and dark/light mode compatibility.
- **Financial Precision**: All monetary and quantity calculations use `decimal.js` to avoid floating-point inaccuracies.

---

## 📖 Built-In User Guide

A complete, interactive user guide is accessible directly inside **Settings ➔ User Guide**:

1. **Point of Sale & Checkout**: Browsing products, managing the active cart, and executing sales with automatic stock deduction.
2. **Products & Dynamic HPP**: Creating products, uploading images, scanning barcodes, and understanding live profit margins.
3. **Ingredients & Inventory Batches**: Setting up base units, configuring conversion multipliers, and restocking batches with FEFO tracking.
4. **Recipes & Cost Estimation**: Composing multi-ingredient recipes and modifying ingredient proportions.
5. **Orders, Receipts & Activity Audit**: Reviewing historical receipts and inspecting real-time audit logs.
6. **Mobile & Tablet Navigation**: Utilizing side-by-side tablet panels and mobile slide-over detail screens.

---

## 🛠 Technology Stack

- **Framework**: React Native with **Expo SDK v54.0.0**
- **Navigation**: Expo Router (file-based routing)
- **Database**: `expo-sqlite` (Local SQLite engine)
- **State Management**: Zustand with `AsyncStorage` persistence
- **Financial Math**: `decimal.js`
- **Icons**: `lucide-react-native`
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

### Version 5.2 (Latest)
- 🚀 **Full Recipe Editing**: Added complete update support (`RecipeProcess.updateCompleteRecipe`) allowing users to edit recipe details and modify ingredient compositions from `RecipeFormSheet`.
- 🖼 **Product Image Persistence & Upload Fix**: Resolved SQLite update queries and added automatic schema migration for `image_uri` alongside media library permission checks.
- 💰 **Dynamic HPP & Margin Display**: Added real-time HPP and profit margin percentages to product cards and detail views.
- 📱 **App-Wide Section Layout**: Migrated all 12 screens to `Section.tsx` with tablet Right Panel close support and mobile slide-over navigation.
- 🧭 **Clean List Navigation**: Replaced inline edit/delete buttons on list items with elegant `ChevronRight` icons across all management lists.
- 📜 **Remade Activity Audit Screen**: Enhanced with real-time audit metrics summary bar, filter pills, search, and audit inspector.
- 📚 **Integrated User Guide**: Added complete 6-part operational documentation inside Settings.
- 🛡 **Type Check**: Verified 100% type safety (`npx tsc --noEmit` clean with 0 errors).

---

## 📝 License

This project is proprietary software developed for MintyPOS. All rights reserved.

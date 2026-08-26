# MintyPOS User Guide

## Welcome to MintyPOS

MintyPOS is a comprehensive Point of Sale (POS) and inventory management system designed for cafés, restaurants, coffee shops, and retail businesses. This guide will help you understand all features and functionality.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [System Architecture](#system-architecture)
3. [Core Features](#core-features)
4. [Navigation & Menu](#navigation--menu)
5. [Point of Sale (POS)](#point-of-sale-pos)
6. [Inventory Management](#inventory-management)
7. [Product Management](#product-management)
8. [Recipe Management](#recipe-management)
9. [Orders & Transactions](#orders--transactions)
10. [Reports & Analytics](#reports--analytics)
11. [Settings & Configuration](#settings--configuration)
12. [Payment Methods](#payment-methods)
13. [Tax & Discounts](#tax--discountes)
14. [Cart Notes Feature](#cart-notes-feature)
15. [Data & Pricing](#data--pricing)
16. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Launch
- The app automatically records your installation date
- A 30-day trial period begins (for testing purposes)
- Database is initialized with sample data
- All core features are ready to use immediately

### System Requirements
- **Platform:** iOS, Android, Web (React Native/Expo)
- **Storage:** Local SQLite database
- **Network:** Offline-capable (no internet required for basic operations)

---

## System Architecture

MintyPOS uses a layered architecture for scalability and maintainability:

```
UI Components (app/)
    ↓
Form Sheets (components/forms/) - User Input
    ↓
Process Layer (processes/) - Validation + Business Logic
    ↓
Service Layer (services/) - Database Operations
    ↓
Database (lib/database.ts) - SQLite Operations
```

### Key Components
- **Zustand Store:** State management with AsyncStorage persistence
- **Process Layer:** Business logic with validation
- **Service Layer:** Direct database access
- **Validators:** Data integrity checks
- **Theme System:** Light/dark mode support

---

## Core Features

### 1. Point of Sale (POS)
- Product catalog with category filtering
- Search by product name or SKU
- Barcode scanning support
- Cart management with quantity controls
- Item notes for special requests
- Multi-payment method support
- Tax and discount calculations
- Receipt generation

### 2. Inventory Management
- Stock tracking with FIFO/FEFO deduction
- Supplier management
- Batch tracking with expiration dates
- Unit conversion system
- Low stock alerts
- Restock processing
- Activity logging

### 3. Product Management
- Full CRUD operations
- Recipe-based products (with ingredients)
- Simple products (with stock tracking)
- Category organization
- SKU management
- Image support
- Stock deduction methods

### 4. Recipe Management
- Recipe definitions for complex products
- Ingredient quantity management
- Unit conversions
- Recipe validation
- Automatic stock deduction

### 5. Order Management
- Complete order history
- Item-level notes tracking
- Payment method recording
- Tax and discount breakdown
- Change calculation for cash payments
- Detailed receipts

### 6. Reports & Analytics
- Sales statistics
- Order history
- Activity logs
- Financial summaries
- Performance metrics

---

## Navigation & Menu

### Main Menu Structure
- **POS** - Point of sale interface
- **Products** - Product management
- **Ingredients** - Ingredient inventory
- **Recipes** - Recipe definitions
- **Inventory** - Stock management & restocking
- **Orders** - Order history & transactions
- **Reports** - Analytics & performance
- **Settings** - System configuration

### Navigation Features
- Responsive design (mobile/tablet/desktop)
- Drawer navigation menu
- Back button support
- Screen-specific actions

---

## Point of Sale (POS)

### Product Catalog
- **Layout:** 2 columns (mobile), 4 columns (tablet/desktop)
- **Categories:** Beverages, Food, Snacks, Merchandise
- **Search:** Filter by name or SKU
- **Barcode:** Scan to add products quickly

### Cart Management
- **Quantity Controls:** Stepper component for easy adjustment
- **Item Notes:** Add special instructions per item
- **Real-time Totals:** Automatic calculation of subtotal, tax, discounts
- **Remove Items:** Delete from cart or set quantity to 0

### Payment Process
1. **Review Cart:** Check items, quantities, and notes
2. **Apply Discounts:** Select from available discounts
3. **Choose Payment Method:** Cash, Card, Transfer, Digital Wallet
4. **Complete Payment:** Enter amount (cash) or confirm (other methods)
5. **Generate Receipt:** Automatic receipt with all details

### Cart Notes Feature
- **Purpose:** Add special instructions for individual items
- **Location:** Under item price in cart
- **Display:** Shows as back overlay below item card
- **Persistence:** Saved with order in database
- **Examples:** "No sugar", "Extra hot", "Dairy-free milk"

---

## Inventory Management

### Stock Tracking
- **Methods:** FIFO (First-In-First-Out), FEFO (First-Expired-First-Out)
- **Units:** Base units with conversion support
- **Batches:** Track individual inventory batches
- **Expiration:** Date-based stock rotation

### Restocking
- **Supplier Management:** Track multiple suppliers
- **Batch Creation:** Create new inventory batches
- **Cost Tracking:** Record cost per base unit
- **Quantity Management:** Accurate stock levels

### Activity Logging
- **Stock Additions:** Restock operations
- **Stock Deductions:** Sales and usage
- **Orders:** Transaction records
- **Audit Trail:** Complete history of changes

---

## Product Management

### Product Types
1. **Recipe-Based Products:** Complex items with ingredient costs
   - Example: Caffe Latte (coffee, milk, syrup, cup)
   - Automatic stock deduction from ingredients
   - Dynamic HPP calculation

2. **Simple Products:** Items with direct stock tracking
   - Example: Mineral Water, packaged snacks
   - Manual stock management
   - Fixed buy price

### Product Information
- **Name:** Product display name
- **SKU:** Stock Keeping Unit identifier
- **Category:** Product categorization
- **Buy Price:** Cost of goods sold (HPP)
- **Selling Price:** Retail price
- **Stock Method:** 'recipe', 'product', or 'none'
- **Current Stock:** Available quantity
- **Image:** Product photo support

---

## Recipe Management

### Recipe Structure
- **Recipe Definition:** Name and description
- **Recipe Ingredients:** Component ingredients with quantities
- **Unit Conversions:** Support for different measurement units
- **Cost Calculation:** Automatic HPP from ingredient costs

### Recipe Examples
- **Classic Caffe Latte:** 18g coffee + 150ml milk + 20ml syrup + 1 cup
- **Iced Caramel Latte:** 20g espresso + 180ml milk + 25ml caramel + 1 cup
- **Oat Milk Latte:** 18g coffee + 150ml oat milk + 20ml syrup + 1 cup

---

## Orders & Transactions

### Order Information
- **Order Number:** Unique identifier
- **Date & Time:** Transaction timestamp
- **Items:** Complete list with quantities and notes
- **Payment Method:** How customer paid
- **Financials:** Subtotal, discounts, taxes, total
- **Change:** For cash payments

### Order Types
- **Cash:** Manual amount entry, change calculation
- **Card:** Fixed amount payment
- **Transfer:** Bank transfer recording
- **Digital Wallet:** Mobile payment methods

---

## Reports & Analytics

### Available Reports
- **Sales Statistics:** Today's sales and order count
- **Order History:** Complete transaction records
- **Activity Logs:** Stock changes and operations
- **Financial Reports:** Revenue breakdown

### Report Features
- **Date Filtering:** Custom date ranges
- **Visual Charts:** Line charts for trends
- **Detailed Breakdowns:** Item-level analysis
- **Export Options:** Data export capabilities

---

## Settings & Configuration

### Payment Methods
- **Cash:** Basic cash payments
- **Card:** Visa, Mastercard, American Express, Discover
- **Bank Transfer:** Chase, Bank of America, Wells Fargo, Citibank
- **Digital Wallet:** Apple Pay, Google Pay, PayPal, Samsung Pay, Venmo

### Tax Configuration
- **VAT/GST:** 10% sales tax
- **Service Charge:** 5% service fee
- **Custom Rates:** Configurable tax rates
- **Tax Types:** Percentage or flat amounts

### Discount Management
- **Loyalty Member Discount:** 10% off, minimum 50k
- **Happy Hour Special:** 15% off, minimum 30k
- **Bulk Order Discount:** 5% off, minimum 100k
- **First Time Customer:** Flat 5k off, minimum 20k
- **Weekend Promo:** Flat 10k off, minimum 50k

---

## Payment Methods

### Supported Methods
1. **Cash**
   - Manual amount entry
   - Change calculation
   - Real-time validation

2. **Card Payments**
   - Visa, Mastercard, American Express, Discover
   - Fixed amount processing
   - Card type recording

3. **Bank Transfer**
   - Multiple bank options
   - Transaction recording
   - Bank selection

4. **Digital Wallets**
   - Apple Pay, Google Pay, PayPal
   - Samsung Pay, Venmo
   - Mobile payment processing

---

## Tax & Discounts

### Tax System
- **VAT/GST:** 10% standard rate
- **Service Charge:** 5% additional fee
- **Tax Calculation:** Applied after discounts
- **Tax Display:** Breakdown in receipts

### Discount System
- **Percentage Discounts:** Based on order amount
- **Flat Discounts:** Fixed amount reduction
- **Conditional:** Minimum order requirements
- **Maximum Limits:** Cap on discount amounts
- **Multiple Options:** Choose from available discounts

---

## Cart Notes Feature

### Purpose
Add special instructions for individual items in the cart. This is useful for:
- Dietary restrictions (no sugar, dairy-free)
- Custom requests (extra hot, light ice)
- Special preparation instructions
- Customer preferences

### How to Use
1. In the POS cart, locate the item
2. Tap "Add Note" button under the price
3. Enter your instruction in the note form
4. Tap "Save Note" to confirm
5. Note appears as back overlay below the item

### Note Features
- **Persistent:** Saved with cart items
- **Visible:** Shows in cart, payment, and order history
- **Editable:** Can be modified anytime before checkout
- **Removable:** Clear notes by editing to empty

---

## Data & Pricing

### Sample Data Overview

#### Beverages (14 items)
- **Recipe-Based:**
  - Classic Caffe Latte: HPP 9,490 → Sell 28,000
  - Iced Caramel Latte: HPP 11,100 → Sell 32,000
  - Oat Milk Latte: HPP 10,490 → Sell 30,000

- **Simple Products:**
  - Mineral Water 500ml: Buy 2,000 → Sell 5,000
  - Sparkling Water 330ml: Buy 2,500 → Sell 6,000
  - Diet Cola 330ml: Buy 3,000 → Sell 7,000
  - Orange Juice 250ml: Buy 3,500 → Sell 8,000
  - Iced Tea 300ml: Buy 2,200 → Sell 5,500
  - Lemonade 300ml: Buy 2,400 → Sell 6,000

#### Food (5 items)
- Butter Croissant: Buy 5,200 → Sell 15,000
- Chocolate Muffin: Buy 4,500 → Sell 12,000
- Blueberry Danish: Buy 4,800 → Sell 14,000
- Cinnamon Roll: Buy 5,000 → Sell 13,000
- Apple Pie Slice: Buy 4,000 → Sell 11,000
- Cheese Danish: Buy 4,600 → Sell 13,500

#### Merchandise (10 items)
- MintyPOS T-Shirt: Buy 45,000 → Sell 99,000
- MintyPOS Cap: Buy 25,000 → Sell 55,000
- MintyPOS Tote Bag: Buy 18,000 → Sell 35,000
- Coffee Mug: Buy 22,000 → Sell 45,000
- Espresso Shot Glass: Buy 15,000 → Sell 30,000
- Barista Apron: Buy 65,000 → Sell 120,000
- Coffee Beans Bag 250g: Buy 35,000 → Sell 75,000
- Lunch Box: Buy 38,000 → Sell 85,000
- Travel Tumbler: Buy 55,000 → Sell 110,000
- Keychain: Buy 8,000 → Sell 15,000

### Inventory Batches
- **Coffee Beans:** Multiple batches with different costs
- **Dairy Products:** Fresh milk, oat milk with FIFO tracking
- **Syrups:** Vanilla, caramel with proper cost tracking
- **Packaging:** Multiple cup sizes with batch management
- **Food Ingredients:** Dough, butter with stock rotation

### HPP Calculations
- **Recipe-Based:** Calculated from ingredient costs
- **Simple Products:** Direct buy price
- **Merchandise:** Wholesale to retail pricing
- **Accurate Margins:** Proper profit calculations

---

## Troubleshooting

### Common Issues

#### Database Migration Errors
- **Issue:** Migration errors on app update
- **Solution:** Check for duplicate columns, reset if needed
- **Note:** Version 6 migration handles note column safely

#### Stock Deduction Issues
- **Issue:** Stock not deducting correctly
- **Solution:** Check recipe definitions, ingredient quantities
- **Verify:** Ensure proper stock deduction method selected

#### Payment Processing
- **Issue:** Payment validation errors
- **Solution:** Check payment method configuration
- **Verify:** Ensure sufficient amount for cash payments

#### UI Responsiveness
- **Issue:** Layout issues on different screen sizes
- **Solution:** Check breakpoints (768px for tablet)
- **Verify:** Responsive components are properly configured

### Performance Tips
- **Regular Restocking:** Maintain adequate stock levels
- **Batch Management:** Use FIFO/FEFO for stock rotation
- **Database Maintenance:** Clear old activity logs periodically
- **Payment Methods:** Keep only active methods configured

---

## Getting Help

### Support Resources
- **Documentation:** This user guide
- **Error Messages:** Read system notifications for guidance
- **Activity Logs:** Check for detailed operation history
- **Database:** SQLite for direct data inspection

### Development Notes
- **Architecture:** Layered system for scalability
- **Extensibility:** Easy to add new features
- **Maintenance:** Clear separation of concerns
- **Testing:** Comprehensive mock data for validation

---

## Version Information

- **Current Version:** 1.0.0
- **Database Version:** 6
- **Trial Period:** 30 days
- **Platform:** React Native/Expo
- **Database:** SQLite with AsyncStorage persistence

---

## Best Practices

### Daily Operations
1. **Start Day:** Check stock levels and low stock alerts
2. **During Shift:** Use cart notes for special requests
3. **End of Day:** Review order history and sales statistics
4. **Regular Tasks:** Restock inventory, update prices as needed

### Inventory Management
1. **Stock Rotation:** Use FIFO/FEFO methods
2. **Batch Tracking:** Maintain accurate batch records
3. **Supplier Relations:** Keep supplier information updated
4. **Cost Monitoring:** Track ingredient cost changes

### Customer Service
1. **Special Requests:** Use cart notes for customization
2. **Payment Options:** Offer multiple payment methods
3. **Receipt Accuracy:** Verify all order details
4. **Issue Resolution:** Use order history for disputes

---

## Future Enhancements

The system is designed for future expansion:
- **Additional Payment Methods:** Easy to add new options
- **Advanced Reporting:** Enhanced analytics capabilities
- **Multi-Location Support:** Inventory across locations
- **Employee Management:** Staff tracking and permissions
- **Integration APIs:** External system connections
- **Advanced Recipes:** Complex product formulations

---

## Conclusion

MintyPOS provides a complete solution for modern retail and food service operations. The layered architecture ensures scalability, while the comprehensive feature set covers all essential POS and inventory management needs.

For technical questions or development guidance, refer to the system architecture documentation and code comments throughout the application.

---

*Last Updated: 2026-08-26*
*Version: 1.0.0*

# MintyPOS Development Guidelines

## Expo Version
Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Core Functionality Setup

### Database & State Management
- **Database**: SQLite (`expo-sqlite`) with full schema implementation
  - Tables: `units`, `suppliers`, `ingredients`, `ingredient_units`, `inventory_batches`, `products`, `recipes`
  - FIFO stock deduction logic
  - Unit conversion system
  - Located in: `lib/database.ts`

- **State Management**: Zustand with AsyncStorage persistence
  - Cart management, products, ingredients, inventory, recipes
  - UI state (drawer, theme preferences)
  - Located in: `store/useStore.ts`

- **Business Logic**: Core POS operations
  - FIFO stock deduction, restock processing, checkout handling
  - COGS calculation, profit margins, low stock alerts
  - Recipe validation and stock checking
  - Located in: `lib/businessLogic.ts`

### Architecture Layers (UPDATED)

#### 1. **Services Layer** (`services/`)
- **Purpose**: Direct database operations and CRUD
- **Files**:
  - `productService.ts` - Product CRUD operations
  - `ingredientService.ts` - Ingredient CRUD operations
  - `recipeService.ts` - Recipe CRUD operations
  - `inventoryService.ts` - Inventory batch CRUD operations
- **Usage**: Use services for direct database access without validation

#### 2. **Validators Layer** (`validators/`)
- **Purpose**: Data validation and sanitization
- **Files**:
  - `productValidator.ts` - Product input validation
  - `ingredientValidator.ts` - Ingredient input validation
  - `recipeValidator.ts` - Recipe input validation
  - `inventoryValidator.ts` - Inventory input validation
- **Usage**: Always validate data before operations

#### 3. **Process Layer** (`processes/`)
- **Purpose**: Business logic orchestration with validation
- **Files**:
  - `productProcess.ts` - Product business operations
  - `ingredientProcess.ts` - Ingredient business operations
  - `recipeProcess.ts` - Recipe business operations
  - `inventoryProcess.ts` - Inventory business operations
- **Usage**: Use processes for complete business operations (validation + service + error handling)

#### 4. **Forms Layer** (`components/forms/`)
- **Purpose**: Responsive form sheets using DripSheet
- **Files**:
  - `ProductFormSheet.tsx` - Product create/edit form
  - `IngredientFormSheet.tsx` - Ingredient create/edit form
  - `RecipeFormSheet.tsx` - Recipe create form
  - `InventoryFormSheet.tsx` - Inventory restock form
- **Usage**: Use these forms for all CRUD operations with proper validation

### Architecture Pattern
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

### Component Usage Guidelines
- **Forms**: Always use form sheets from `components/forms/` for CRUD operations
- **Inputs**: Use `DripInput` for all text input fields
- **Dropdowns**: Use `DripDropdown` for select fields with options
- **Date Pickers**: Use `DripDatePicker` for date selection
- **Buttons**: Use `DripButton` for all actions
- **Sheets**: Use `DripSheet` for all modal overlays
- **Containers**: Use `DripContainer` for all screen layouts
- **Headers**: Use `Header` component for all screen headers

### Authentication & Drawer
- **Default User**: Admin user is automatically created for development
- **Role-Based Access**: Menu items are filtered by user role (Admin, Manager, Staff)
- **Drawer Integration**: Drawer is properly integrated with all menu items visible

### Context Providers
- **ThemeProvider**: Light/dark mode management (`constants/colorTheme.tsx`)
- **AuthProvider**: User authentication and session management (`constants/auth.tsx`)
- **DrawerProvider**: Navigation drawer state (`constants/drawerContext.tsx`)

### Utility Functions
- Currency formatting, number precision (using Decimal.js)
- Date/time formatting, relative time
- Array operations, data validation
- Located in: `lib/utils.ts`

### Database Initialization
- Database is automatically initialized on app startup via `DatabaseInitializer` component in `_layout.tsx`
- Default units are pre-populated (gram, ml, pcs, kg, L)
- All tables include proper foreign key relationships and indexes

### Drawer Integration
- Drawer is properly integrated in `_layout.tsx` with `DripDrawer` component
- Uses `DrawerProvider` context for state management
- Header component automatically connects to drawer for navigation
- All menu items are visible based on user role (default: Admin)

### Usage Examples
- See `lib/examples.ts` for complete workflow examples
- Shows ingredient creation, restocking, product/recipe management, checkout processing, and analytics

## Important Notes
- All database operations use Decimal.js for precise financial calculations
- The drawer component has been updated to work with local state instead of Supabase
- Menu items are defined in `constants/menu.tsx` with role-based access control
- **Always use Process layer for business operations** - it includes validation and error handling
- **Services are for direct database access only** - use when you need raw data access
- **Validators ensure data integrity** - they catch errors before database operations
- **Forms use DripSheet for responsive modal UI** - works on both mobile and tablet
- **All CRUD operations are fully functional** with create, read, update, delete capabilities
- The app is ready for screen development following the component guidelines in AGENT.md

## Completed Features
✅ **Products Page**: Full CRUD with form sheet
✅ **Ingredients Page**: Full CRUD with form sheet  
✅ **Recipes Page**: Create and delete with form sheet
✅ **Inventory Page**: Restock functionality with form sheet
✅ **Drawer**: All menu items visible and functional
✅ **Authentication**: Default admin user for development
✅ **Responsive Forms**: All forms use DripSheet for mobile/tablet compatibility

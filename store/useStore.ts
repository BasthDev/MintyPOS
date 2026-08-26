import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Types
export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  hasRecipe: boolean;
  note?: string;
}

export interface Product {
  id: number;
  name: string;
  sellingPrice: number;
  hasRecipe: boolean;
}

export interface Ingredient {
  id: number;
  name: string;
  baseUnitId: number;
  minimumStock: number;
  currentStock: number;
}

export interface RecipeItem {
  productId: number;
  ingredientId: number;
  quantityNeededBase: number;
}

export interface InventoryBatch {
  id: number;
  ingredientId: number;
  supplierId: number;
  initialQuantityBase: number;
  remainingQuantityBase: number;
  costPerBaseUnit: number;
  receivedDate: string;
}

export interface Unit {
  id: number;
  name: string;
  symbol: string;
}

export interface IngredientUnit {
  id: number;
  ingredientId: number;
  unitName: string;
  multiplierToBase: number;
}

interface StoreState {
  // Cart state
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: number) => void;
  updateCartQuantity: (productId: number, quantity: number) => void;
  updateCartNote: (productId: number, note: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;

  // Products state
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: number, product: Partial<Product>) => void;
  deleteProduct: (id: number) => void;

  // Ingredients state
  ingredients: Ingredient[];
  setIngredients: (ingredients: Ingredient[]) => void;
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (id: number, ingredient: Partial<Ingredient>) => void;
  deleteIngredient: (id: number) => void;

  // Inventory state
  inventoryBatches: InventoryBatch[];
  setInventoryBatches: (batches: InventoryBatch[]) => void;
  addInventoryBatch: (batch: InventoryBatch) => void;
  updateInventoryBatch: (id: number, batch: Partial<InventoryBatch>) => void;

  // Units state
  units: Unit[];
  setUnits: (units: Unit[]) => void;
  addUnit: (unit: Unit) => void;

  // Ingredient units state
  ingredientUnits: IngredientUnit[];
  setIngredientUnits: (units: IngredientUnit[]) => void;
  addIngredientUnit: (unit: IngredientUnit) => void;

  // Recipe state
  recipes: RecipeItem[];
  setRecipes: (recipes: RecipeItem[]) => void;
  addRecipe: (recipe: RecipeItem) => void;
  deleteRecipe: (productId: number, ingredientId: number) => void;

  // UI state
  isDrawerOpen: boolean;
  setDrawerOpen: (isOpen: boolean) => void;
  toggleDrawer: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial cart state
      cart: [],
      addToCart: (item) => {
        const cart = get().cart;
        const existingItem = cart.find((i) => i.productId === item.productId);
        
        if (existingItem) {
          set({
            cart: cart.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ cart: [...cart, item] });
        }
      },
      removeFromCart: (productId) => {
        set({ cart: get().cart.filter((item) => item.productId !== productId) });
      },
      updateCartQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
        } else {
          set({
            cart: get().cart.map((item) =>
              item.productId === productId ? { ...item, quantity } : item
            ),
          });
        }
      },
      updateCartNote: (productId, note) => {
        set({
          cart: get().cart.map((item) =>
            item.productId === productId ? { ...item, note } : item
          ),
        });
      },
      clearCart: () => set({ cart: [] }),
      getCartTotal: () => {
        return get().cart.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      // Products state
      products: [],
      setProducts: (products) => set({ products }),
      addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
      updateProduct: (id, product) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...product } : p)),
        })),
      deleteProduct: (id) =>
        set((state) => ({ products: state.products.filter((p) => p.id !== id) })),

      // Ingredients state
      ingredients: [],
      setIngredients: (ingredients) => set({ ingredients }),
      addIngredient: (ingredient) => set((state) => ({ ingredients: [...state.ingredients, ingredient] })),
      updateIngredient: (id, ingredient) =>
        set((state) => ({
          ingredients: state.ingredients.map((i) => (i.id === id ? { ...i, ...ingredient } : i)),
        })),
      deleteIngredient: (id) =>
        set((state) => ({ ingredients: state.ingredients.filter((i) => i.id !== id) })),

      // Inventory state
      inventoryBatches: [],
      setInventoryBatches: (batches) => set({ inventoryBatches: batches }),
      addInventoryBatch: (batch) => set((state) => ({ inventoryBatches: [...state.inventoryBatches, batch] })),
      updateInventoryBatch: (id, batch) =>
        set((state) => ({
          inventoryBatches: state.inventoryBatches.map((b) => (b.id === id ? { ...b, ...batch } : b)),
        })),

      // Units state
      units: [],
      setUnits: (units) => set({ units }),
      addUnit: (unit) => set((state) => ({ units: [...state.units, unit] })),

      // Ingredient units state
      ingredientUnits: [],
      setIngredientUnits: (units) => set({ ingredientUnits: units }),
      addIngredientUnit: (unit) => set((state) => ({ ingredientUnits: [...state.ingredientUnits, unit] })),

      // Recipe state
      recipes: [],
      setRecipes: (recipes) => set({ recipes }),
      addRecipe: (recipe) => set((state) => ({ recipes: [...state.recipes, recipe] })),
      deleteRecipe: (productId, ingredientId) =>
        set((state) => ({
          recipes: state.recipes.filter(
            (r) => !(r.productId === productId && r.ingredientId === ingredientId)
          ),
        })),

      // UI state
      isDrawerOpen: false,
      setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
    }),
    {
      name: 'mintypos-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist cart and UI state, exclude database-loaded data
      partialize: (state) => ({
        cart: state.cart,
        isDrawerOpen: state.isDrawerOpen,
      }),
    }
  )
);
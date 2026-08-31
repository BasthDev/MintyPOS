/**
 * MintyPOS Sync Entity Definitions
 * Ordered strictly by foreign-key dependencies to ensure smooth pull & push.
 */
export const SYNC_ENTITIES = [
  { type: 'unit', table: 'units', label: 'Units' },
  { type: 'supplier', table: 'suppliers', label: 'Suppliers' },
  { type: 'category', table: 'categories', label: 'Categories' },
  { type: 'payment_method', table: 'payment_methods', label: 'Payment Methods' },
  { type: 'tax_config', table: 'tax_configs', label: 'Tax Configs' },
  { type: 'discount', table: 'discounts', label: 'Discounts' },
  { type: 'crm_config', table: 'crm_configs', label: 'CRM Configs' },
  { type: 'customer', table: 'customers', label: 'Customers' },
  { type: 'ingredient', table: 'ingredients', label: 'Ingredients' },
  { type: 'ingredient_unit', table: 'ingredient_units', label: 'Ingredient Units' },
  { type: 'inventory_batch', table: 'inventory_batches', label: 'Inventory Batches' },
  { type: 'semi_product', table: 'semi_products', label: 'Semi Products' },
  { type: 'semi_product_recipe', table: 'semi_product_recipes', label: 'Semi Product Recipes' },
  { type: 'semi_product_batch', table: 'semi_product_batches', label: 'Semi Product Batches' },
  { type: 'recipe_definition', table: 'recipe_definitions', label: 'Recipe Definitions' },
  { type: 'recipe_ingredient', table: 'recipe_ingredients', label: 'Recipe Ingredients' },
  { type: 'product', table: 'products', label: 'Products' },
  { type: 'purchase_order', table: 'purchase_orders', label: 'Purchase Orders' },
  { type: 'purchase_order_item', table: 'purchase_order_items', label: 'Purchase Order Items' },
  { type: 'order', table: 'orders', label: 'Orders' },
  { type: 'order_item', table: 'order_items', label: 'Order Items' },
  { type: 'order_split', table: 'order_splits', label: 'Order Splits' },
  { type: 'loyalty_transaction', table: 'customer_loyalty_transactions', label: 'Loyalty Transactions' },
  { type: 'balance_transaction', table: 'customer_balance_transactions', label: 'Balance Transactions' },
  { type: 'activity_log', table: 'activity_logs', label: 'Activity Logs' },
] as const;

export type SyncEntityType = (typeof SYNC_ENTITIES)[number]['type'];

export function quoteTable(table: string): string {
  return table === 'order' || table === 'table' ? `"${table}"` : table;
}

export function buildInsertSQL(
  table: string,
  data: Record<string, unknown>
): { sql: string; values: unknown[] } {
  const cols = Object.keys(data);
  const placeholders = cols.map(() => '?').join(', ');
  const quoted = quoteTable(table);
  return {
    sql: `INSERT OR REPLACE INTO ${quoted} (${cols.join(', ')}) VALUES (${placeholders})`,
    values: cols.map((c) => (data[c] !== undefined ? data[c] : null)),
  };
}

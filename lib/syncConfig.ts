/**
 * MintyPOS Sync Entity Definitions
 * Ordered strictly by foreign-key dependencies to ensure smooth pull & push.
 */
export const SYNC_ENTITIES = [
  { type: 'unit', table: 'units' },
  { type: 'supplier', table: 'suppliers' },
  { type: 'ingredient', table: 'ingredients' },
  { type: 'ingredient_unit', table: 'ingredient_units' },
  { type: 'inventory_batch', table: 'inventory_batches' },
  { type: 'category', table: 'categories' },
  { type: 'recipe_definition', table: 'recipe_definitions' },
  { type: 'recipe_ingredient', table: 'recipe_ingredients' },
  { type: 'product', table: 'products' },
  { type: 'discount', table: 'discounts' },
  { type: 'tax_config', table: 'tax_configs' },
  { type: 'payment_method', table: 'payment_methods' },
  { type: 'customer', table: 'customers' },
  { type: 'crm_config', table: 'crm_configs' },
  { type: 'order', table: 'orders' },
  { type: 'order_item', table: 'order_items' },
  { type: 'order_split', table: 'order_splits' },
  { type: 'loyalty_transaction', table: 'customer_loyalty_transactions' },
  { type: 'balance_transaction', table: 'customer_balance_transactions' },
  { type: 'activity_log', table: 'activity_logs' },
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

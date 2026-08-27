import * as SQLite from 'expo-sqlite';
import { Decimal } from 'decimal.js';

export interface SalesReportData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  dailySales: Array<{ date: string; revenue: number; orders: number }>;
  topSellingProducts: Array<{ productName: string; quantity: number; revenue: number }>;
  paymentMethodBreakdown: Array<{ method: string; amount: number; percentage: number }>;
  hourlySales: Array<{ hour: number; revenue: number; orders: number }>;
}

export interface InventoryReportData {
  totalItems: number;
  totalValue: number;
  lowStockItems: Array<{ itemName: string; currentStock: number; minimumStock: number }>;
  stockMovements: Array<{ date: string; type: string; quantity: number; itemName: string }>;
  categoryBreakdown: Array<{ category: string; itemCount: number; totalValue: number }>;
  expiringSoon: Array<{ itemName: string; expirationDate: string; quantity: number }>;
}

export interface ProfitReportData {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  profitMargin: number;
  productProfitability: Array<{ productName: string; revenue: number; cogs: number; profit: number; margin: number }>;
  dailyProfit: Array<{ date: string; revenue: number; cogs: number; profit: number }>;
  costBreakdown: Array<{ category: string; cost: number; percentage: number }>;
}

export interface CRMReportData {
  totalCustomers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  totalStoreCredit: number;
  tierBreakdown: Array<{ tier: string; count: number; percentage: number }>;
  topCustomers: Array<{ name: string; tier: string; totalSpent: number; loyaltyPoints: number }>;
  recentLoyaltyActivity: Array<{ customerName: string; type: string; points: number; date: string }>;
}

export class ReportService {
  /**
   * Generate sales report for a date range
   */
  static async getSalesReport(
    db: SQLite.SQLiteDatabase,
    startDate: string,
    endDate: string
  ): Promise<SalesReportData> {
    // Get orders within date range
    const orders = await db.getAllAsync<any>(
      `SELECT * FROM orders 
       WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
       ORDER BY created_at ASC`,
      [startDate, endDate]
    );

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get daily sales breakdown
    const dailySalesMap = new Map<string, { revenue: number; orders: number }>();
    orders.forEach((order) => {
      const date = order.created_at.split('T')[0];
      const existing = dailySalesMap.get(date) || { revenue: 0, orders: 0 };
      dailySalesMap.set(date, {
        revenue: existing.revenue + (order.total || 0),
        orders: existing.orders + 1,
      });
    });

    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get top selling products
    const orderItems = await db.getAllAsync<any>(
      `SELECT oi.*, o.created_at 
       FROM order_items oi 
       JOIN orders o ON oi.order_id = o.id 
       WHERE date(o.created_at) >= date(?) AND date(o.created_at) <= date(?)`,
      [startDate, endDate]
    );

    const productSalesMap = new Map<number, { name: string; quantity: number; revenue: number }>();
    orderItems.forEach((item) => {
      const existing = productSalesMap.get(item.product_id) || {
        name: item.product_name,
        quantity: 0,
        revenue: 0,
      };
      productSalesMap.set(item.product_id, {
        name: item.product_name,
        quantity: existing.quantity + (item.quantity || 0),
        revenue: existing.revenue + (item.subtotal || 0),
      });
    });

    const topSellingProducts = Array.from(productSalesMap.values())
      .map((item) => ({
        productName: item.name,
        quantity: item.quantity,
        revenue: item.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get payment method breakdown
    const paymentMethodMap = new Map<string, number>();
    orders.forEach((order) => {
      const existing = paymentMethodMap.get(order.payment_method) || 0;
      paymentMethodMap.set(order.payment_method, existing + (order.total || 0));
    });

    const paymentMethodBreakdown = Array.from(paymentMethodMap.entries()).map(([method, amount]) => ({
      method,
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
    }));

    // Get hourly sales pattern
    const hourlySalesMap = new Map<number, { revenue: number; orders: number }>();
    orders.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      const existing = hourlySalesMap.get(hour) || { revenue: 0, orders: 0 };
      hourlySalesMap.set(hour, {
        revenue: existing.revenue + (order.total || 0),
        orders: existing.orders + 1,
      });
    });

    const hourlySales = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      revenue: hourlySalesMap.get(hour)?.revenue || 0,
      orders: hourlySalesMap.get(hour)?.orders || 0,
    }));

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      dailySales,
      topSellingProducts,
      paymentMethodBreakdown,
      hourlySales,
    };
  }

  /**
   * Generate inventory report
   */
  static async getInventoryReport(
    db: SQLite.SQLiteDatabase
  ): Promise<InventoryReportData> {
    // Get total inventory items and value
    const ingredients = await db.getAllAsync<any>(
      `SELECT i.*, u.symbol as unit_symbol 
       FROM ingredients i 
       JOIN units u ON i.base_unit_id = u.id`
    );

    const batches = await db.getAllAsync<any>(
      `SELECT ib.*, i.name as ingredient_name 
       FROM inventory_batches ib 
       JOIN ingredients i ON ib.ingredient_id = i.id`
    );

    const totalItems = ingredients.length;
    const totalValue = batches.reduce((sum, batch) => {
      return sum + (batch.remaining_quantity_base * batch.cost_per_base_unit);
    }, 0);

    // Get low stock items
    const lowStockItems = [];
    for (const ingredient of ingredients) {
      const totalStock = batches
        .filter((b) => b.ingredient_id === ingredient.id)
        .reduce((sum, b) => sum + b.remaining_quantity_base, 0);

      if (totalStock < ingredient.minimum_stock) {
        lowStockItems.push({
          itemName: ingredient.name,
          currentStock: totalStock,
          minimumStock: ingredient.minimum_stock,
        });
      }
    }

    // Get stock movements from activity logs
    const stockMovements = await db.getAllAsync<any>(
      `SELECT * FROM activity_logs 
       WHERE type IN ('stock_add', 'stock_deduct') 
       ORDER BY created_at DESC 
       LIMIT 50`
    );

    const formattedMovements = stockMovements.map((log) => ({
      date: log.created_at.split('T')[0],
      type: log.type,
      quantity: log.quantity || 0,
      itemName: log.entity_name,
    }));

    // Get category breakdown (using product categories as proxy)
    const categories = await db.getAllAsync<any>('SELECT * FROM categories');
    const products = await db.getAllAsync<any>('SELECT * FROM products');

    const categoryBreakdown = categories.map((category) => {
      const categoryProducts = products.filter((p) => p.category_id === category.id);
      const itemCount = categoryProducts.length;
      const totalValue = categoryProducts.reduce((sum, product) => {
        return sum + (product.current_stock * (product.buy_price || 0));
      }, 0);

      return {
        category: category.name,
        itemCount,
        totalValue,
      };
    });

    // Get items expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = batches
      .filter((batch) => {
        if (!batch.expiration_date) return false;
        const expDate = new Date(batch.expiration_date);
        return expDate <= thirtyDaysFromNow && batch.remaining_quantity_base > 0;
      })
      .map((batch) => ({
        itemName: batch.ingredient_name,
        expirationDate: batch.expiration_date,
        quantity: batch.remaining_quantity_base,
      }))
      .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())
      .slice(0, 10);

    return {
      totalItems,
      totalValue,
      lowStockItems,
      stockMovements: formattedMovements,
      categoryBreakdown,
      expiringSoon,
    };
  }

  /**
   * Generate profit and margin report
   */
  static async getProfitReport(
    db: SQLite.SQLiteDatabase,
    startDate: string,
    endDate: string
  ): Promise<ProfitReportData> {
    // Get orders with their items
    const orders = await db.getAllAsync<any>(
      `SELECT * FROM orders 
       WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
       ORDER BY created_at ASC`,
      [startDate, endDate]
    );

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Calculate COGS based on product costs
    const orderItems = await db.getAllAsync<any>(
      `SELECT oi.*, p.buy_price 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       JOIN orders o ON oi.order_id = o.id 
       WHERE date(o.created_at) >= date(?) AND date(o.created_at) <= date(?)`,
      [startDate, endDate]
    );

    const totalCOGS = orderItems.reduce((sum, item) => {
      const buyPrice = item.buy_price || 0;
      return sum + (buyPrice * item.quantity);
    }, 0);

    const grossProfit = totalRevenue - totalCOGS;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Product profitability
    const productProfitMap = new Map<number, {
      productName: string;
      revenue: number;
      cogs: number;
      profit: number;
      margin: number;
    }>();

    orderItems.forEach((item) => {
      const revenue = item.subtotal || 0;
      const cogs = (item.buy_price || 0) * item.quantity;
      const profit = revenue - cogs;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      const existing = productProfitMap.get(item.product_id) || {
        productName: item.product_name,
        revenue: 0,
        cogs: 0,
        profit: 0,
        margin: 0,
      };

      productProfitMap.set(item.product_id, {
        productName: item.product_name,
        revenue: existing.revenue + revenue,
        cogs: existing.cogs + cogs,
        profit: existing.profit + profit,
        margin: (existing.profit + profit) / (existing.revenue + revenue) * 100,
      });
    });

    const productProfitability = Array.from(productProfitMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    // Daily profit breakdown
    const dailyProfitMap = new Map<string, { revenue: number; cogs: number; profit: number }>();
    orders.forEach((order) => {
      const date = order.created_at.split('T')[0];
      const existing = dailyProfitMap.get(date) || { revenue: 0, cogs: 0, profit: 0 };
      dailyProfitMap.set(date, {
        revenue: existing.revenue + (order.total || 0),
        cogs: existing.cogs, // This would need more complex calculation
        profit: existing.profit, // This would need more complex calculation
      });
    });

    // Simplified daily profit (just revenue for now)
    const dailyProfit = Array.from(dailyProfitMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        cogs: data.revenue * 0.6, // Assuming 60% COGS as estimate
        profit: data.revenue * 0.4, // Assuming 40% profit margin as estimate
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Cost breakdown (simplified)
    const costBreakdown = [
      { category: 'Ingredients', cost: totalCOGS * 0.7, percentage: 70 },
      { category: 'Packaging', cost: totalCOGS * 0.15, percentage: 15 },
      { category: 'Operations', cost: totalCOGS * 0.15, percentage: 15 },
    ];

    return {
      totalRevenue,
      totalCOGS,
      grossProfit,
      profitMargin,
      productProfitability,
      dailyProfit,
      costBreakdown,
    };
  }

  /**
   * Generate CRM & Loyalty report
   */
  static async getCRMReport(
    db: SQLite.SQLiteDatabase
  ): Promise<CRMReportData> {
    try {
      const customers = await db.getAllAsync<any>(
        'SELECT * FROM customers ORDER BY total_spent DESC'
      );

      const totalCustomers = customers.length;
      const totalStoreCredit = customers.reduce((sum, c) => sum + (c.store_credit_balance || 0), 0);

      // Tier Breakdown
      const tierCounts: Record<string, number> = {
        regular: 0,
        bronze: 0,
        silver: 0,
        gold: 0,
      };
      customers.forEach((c) => {
        const t = c.tier || 'regular';
        tierCounts[t] = (tierCounts[t] || 0) + 1;
      });

      const tierBreakdown = Object.entries(tierCounts).map(([tier, count]) => ({
        tier: tier.toUpperCase(),
        count,
        percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0,
      }));

      // Top Customers
      const topCustomers = customers.slice(0, 10).map((c) => ({
        name: c.name,
        tier: (c.tier || 'regular').toUpperCase(),
        totalSpent: c.total_spent || 0,
        loyaltyPoints: c.loyalty_points || 0,
      }));

      // Loyalty Transactions summary
      const loyaltyLogs = await db.getAllAsync<any>(
        `SELECT l.*, c.name as customer_name 
         FROM customer_loyalty_transactions l
         JOIN customers c ON l.customer_id = c.id
         ORDER BY l.created_at DESC LIMIT 20`
      );

      let totalPointsIssued = 0;
      let totalPointsRedeemed = 0;

      const allLoyalty = await db.getAllAsync<any>('SELECT type, points FROM customer_loyalty_transactions');
      allLoyalty.forEach((tx) => {
        if (tx.type === 'earn') totalPointsIssued += Math.abs(tx.points || 0);
        if (tx.type === 'redeem') totalPointsRedeemed += Math.abs(tx.points || 0);
      });

      const recentLoyaltyActivity = loyaltyLogs.map((l) => ({
        customerName: l.customer_name || 'Unknown',
        type: l.type === 'earn' ? 'Earned' : l.type === 'redeem' ? 'Redeemed' : 'Adjustment',
        points: l.points || 0,
        date: l.created_at ? new Date(l.created_at).toLocaleDateString() : '',
      }));

      return {
        totalCustomers,
        totalPointsIssued,
        totalPointsRedeemed,
        totalStoreCredit,
        tierBreakdown,
        topCustomers,
        recentLoyaltyActivity,
      };
    } catch (error) {
      console.error('Error generating CRM report:', error);
      return {
        totalCustomers: 0,
        totalPointsIssued: 0,
        totalPointsRedeemed: 0,
        totalStoreCredit: 0,
        tierBreakdown: [],
        topCustomers: [],
        recentLoyaltyActivity: [],
      };
    }
  }
}
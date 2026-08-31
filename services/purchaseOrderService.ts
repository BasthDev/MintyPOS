import * as SQLite from 'expo-sqlite';
import { dbOperations, PurchaseOrder } from '../lib/database';

export interface CreatePurchaseOrderItemInput {
  ingredientId: number;
  quantityOrdered: number;
  unitName: string;
  multiplierToBase: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreatePurchaseOrderInput {
  poNumber: string;
  supplierId: number;
  orderDate: string;
  expectedDate?: string | null;
  notes?: string | null;
  items: CreatePurchaseOrderItemInput[];
}

export interface ReceivePurchaseOrderItemInput {
  itemId: number;
  quantityReceived: number;
  actualCost?: number;
  expirationDate?: string | null;
}

export class PurchaseOrderService {
  static async getAll(db: SQLite.SQLiteDatabase): Promise<PurchaseOrder[]> {
    return await dbOperations.getAllPurchaseOrders(db);
  }

  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<PurchaseOrder | null> {
    return await dbOperations.getPurchaseOrderById(db, id);
  }

  static async create(db: SQLite.SQLiteDatabase, input: CreatePurchaseOrderInput): Promise<PurchaseOrder | null> {
    const poId = await dbOperations.createPurchaseOrder(db, input);
    return await this.getById(db, poId);
  }

  static async updateStatus(
    db: SQLite.SQLiteDatabase,
    id: number,
    status: 'draft' | 'ordered' | 'received' | 'cancelled'
  ): Promise<void> {
    await dbOperations.updatePurchaseOrderStatus(db, id, status);
  }

  static async receive(
    db: SQLite.SQLiteDatabase,
    id: number,
    receivedItems?: ReceivePurchaseOrderItemInput[]
  ): Promise<PurchaseOrder | null> {
    await dbOperations.receivePurchaseOrder(db, id, receivedItems);
    return await this.getById(db, id);
  }

  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await dbOperations.deletePurchaseOrder(db, id);
  }
}

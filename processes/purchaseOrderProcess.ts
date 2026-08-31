import * as SQLite from 'expo-sqlite';
import {
  CreatePurchaseOrderInput,
  PurchaseOrderService,
  ReceivePurchaseOrderItemInput
} from '../services/purchaseOrderService';
import { PurchaseOrderValidator } from '../validators/purchaseOrderValidator';

export class PurchaseOrderProcess {
  static async getAll(db: SQLite.SQLiteDatabase) {
    try {
      const data = await PurchaseOrderService.getAll(db);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch purchase orders' };
    }
  }

  static async getById(db: SQLite.SQLiteDatabase, id: number) {
    try {
      const data = await PurchaseOrderService.getById(db, id);
      if (!data) {
        return { success: false, error: 'Purchase order not found' };
      }
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch purchase order' };
    }
  }

  static async create(db: SQLite.SQLiteDatabase, input: CreatePurchaseOrderInput) {
    const validation = PurchaseOrderValidator.validateCreate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const data = await PurchaseOrderService.create(db, input);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create purchase order' };
    }
  }

  static async updateStatus(
    db: SQLite.SQLiteDatabase,
    id: number,
    status: 'draft' | 'ordered' | 'received' | 'cancelled'
  ) {
    try {
      await PurchaseOrderService.updateStatus(db, id, status);
      const data = await PurchaseOrderService.getById(db, id);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update status' };
    }
  }

  static async receive(
    db: SQLite.SQLiteDatabase,
    id: number,
    receivedItems?: ReceivePurchaseOrderItemInput[]
  ) {
    try {
      const data = await PurchaseOrderService.receive(db, id, receivedItems);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to receive goods' };
    }
  }

  static async delete(db: SQLite.SQLiteDatabase, id: number) {
    try {
      await PurchaseOrderService.delete(db, id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete purchase order' };
    }
  }
}

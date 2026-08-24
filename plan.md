# A. Technical Blueprint: POS & Inventory Management System (FIFO, Recipes, & Unit Conversion)
**Tech Stack Target:** Expo / React Native, SQLite (`expo-sqlite`), TypeScript

---

## 1. Relational Database Schema (SQLite)

Arsitektur database dirancang relasional untuk mendukung multi-unit, manajemen resep (*Bill of Materials*), dan pelacakan *Batch* FIFO.

### A. Tabel `units` (Master Satuan)
Menyimpan definisi satuan dasar (*Base Unit*) yang terkecil.
*   `id` (INTEGER, PK, AutoIncrement)
*   `name` (TEXT) — Contoh: `gram`, `ml`, `pcs`
*   `symbol` (TEXT) — Contoh: `g`, `ml`, `pcs`

### B. Tabel `ingredient_units` (Aturan Konversi Satuan)
Menjembatani konversi dari satuan pembelian suplier ke satuan terkecil.
*   `id` (INTEGER, PK, AutoIncrement)
*   `ingredient_id` (INTEGER, FK)
*   `unit_name` (TEXT) — Contoh: `dus`, `kg`, `liter`, `pack`
*   `multiplier_to_base` (REAL) — Faktor pengali ke satuan dasar (Contoh: 1 kg = `1000` gram)

### C. Tabel `ingredients` (Master Bahan Baku)
*   `id` (INTEGER, PK, AutoIncrement)
*   `name` (TEXT) — Contoh: `Kopi Bubuk Arabica`, `Susu UHT`
*   `base_unit_id` (INTEGER, FK ke `units`)
*   `minimum_stock` (REAL) — Batas ambang untuk peringatan stok menipis

### D. Tabel `inventory_batches` (Pencatatan Stok Masuk / FIFO)
Setiap restock wajib masuk ke tabel ini untuk mencatat tanggal masuk dan harga modal spesifik.
*   `id` (INTEGER, PK, AutoIncrement)
*   `ingredient_id` (INTEGER, FK)
*   `supplier_id` (INTEGER, FK)
*   `initial_quantity_base` (REAL) — Total kuantitas dalam satuan terkecil saat dibeli
*   `remaining_quantity_base` (REAL) — Sisa kuantitas berjalan dalam satuan terkecil
*   `cost_per_base_unit` (REAL) — Harga modal per 1 satuan terkecil (Total Bayar / `initial_quantity_base`)
*   `received_date` (TEXT / ISO8601) — Timestamp barang masuk

### E. Tabel `products` (Barang Dagangan POS)
*   `id` (INTEGER, PK, AutoIncrement)
*   `name` (TEXT) — Contoh: `Kopi Susu Gula Aren`
*   `selling_price` (REAL) — Harga jual ke pelanggan
*   `has_recipe` (INTEGER / BOOLEAN) — `0` (Produk Jadi/Langsung Jual), `1` (Produk Olahan/Resep)

### F. Tabel `recipes` (Komposisi Resep Produk)
*   `id` (INTEGER, PK, AutoIncrement)
*   `product_id` (INTEGER, FK ke `products`)
*   `ingredient_id` (INTEGER, FK ke `ingredients`)
*   `quantity_needed_base` (REAL) — Jumlah bahan yang dikurangkan dalam **satuan terkecil** per 1 produk terjual

---

## 2. Core Business Logic & Algorithms (TypeScript)

### A. Logika Restock & Konversi Otomatis ke Base Unit
Memastikan semua input variasi suplier langsung dilebur menjadi satuan terkecil.

```typescript
interface RestockPayload {
  ingredientId: number;
  supplierId: number;
  quantityBought: number;      // Contoh: 2 (dus)
  boughtUnit: string;          // Contoh: "dus"
  unitMultiplier: number;      // Contoh: 12000 (1 dus = 12000 gram)
  totalCostPaid: number;       // Contoh: Rp 600.000
}

export function processRestockToSmallestUnit(payload: RestockPayload) {
  // 1. Konversi instan ke satuan terkecil (Base Unit)
  const totalQuantityInBase = payload.quantityBought * payload.unitMultiplier; 

  // 2. Hitung harga modal akurat per satuan terkecil (HPP)
  const costPerBaseUnit = payload.totalCostPaid / totalQuantityInBase;

  // 3. Output siap dimasukkan ke tabel `inventory_batches`
  return {
    ingredient_id: payload.ingredientId,
    supplier_id: payload.supplierId,
    initial_quantity_base: totalQuantityInBase,
    remaining_quantity_base: totalQuantityInBase,
    cost_per_base_unit: costPerBaseUnit,
    received_date: new Date().toISOString()
  };
}

#B. Algoritma Pemotongan Stok FIFO (First-In, First-Out)
Mengurangi stok dari batch inventaris yang masuk paling awal berdasarkan received_date.


export function deductStockFIFO(tx: any, ingredientId: number, totalRequiredBaseQty: number) {
  // Ambil batch aktif, urutkan dari tanggal masuk terlama
  const activeBatches = tx.executeSql(
    `SELECT * FROM inventory_batches 
     WHERE ingredient_id = ? AND remaining_quantity_base > 0 
     ORDER BY received_date ASC`,
    [ingredientId]
  ).rows._array;

  let remainingToDeduct = totalRequiredBaseQty;

  for (const batch of activeBatches) {
    if (remainingToDeduct <= 0) break;

    if (batch.remaining_quantity_base >= remainingToDeduct) {
      const newRemaining = batch.remaining_quantity_base - remainingToDeduct;
      tx.executeSql(
        `UPDATE inventory_batches SET remaining_quantity_base = ? WHERE id = ?`,
        [newRemaining, batch.id]
      );
      remainingToDeduct = 0;
    } else {
      remainingToDeduct -= batch.remaining_quantity_base;
      tx.executeSql(
        `UPDATE inventory_batches SET remaining_quantity_base = 0 WHERE id = ?`,
        [batch.id]
      );
    }
  }

  if (remainingToDeduct > 0) {
    throw new Error(`Stok bahan baku ID ${ingredientId} tidak mencukupi! Kurang ${remainingToDeduct} satuan dasar.`);
  }
}

# C. Alur Checkout Pesanan Kasir (Order & Recipe Processing)

interface CartItem {
  productId: number;
  quantitySold: number;
}

export function handleCheckoutOrder(cartItems: CartItem[], dbConnection: any) {
  dbConnection.transaction((tx: any) => {
    for (const item of cartItems) {
      // Cek apakah produk memiliki resep
      const productResult = tx.executeSql(
        `SELECT has_recipe FROM products WHERE id = ?`, 
        [item.productId]
      );
      const productInfo = productResult.rows._array[0];

      if (productInfo && productInfo.has_recipe === 1) {
        // Ambil komponen resep
        const recipeResult = tx.executeSql(
          `SELECT ingredient_id, quantity_needed_base FROM recipes WHERE product_id = ?`,
          [item.productId]
        );
        const recipeItems = recipeResult.rows._array;

        // Kurangi stok masing-masing bahan menggunakan FIFO
        for (const recipe of recipeItems) {
          const totalDeductionNeeded = recipe.quantity_needed_base * item.quantitySold;
          deductStockFIFO(tx, recipe.ingredient_id, totalDeductionNeeded);
        }
      }
    }
  });
}



 Strategi Penyimpanan Integer (Recommended & Paling Ringan)Alih-alih menyimpan stok dalam satuan gram (misal: 10.5 gram), Anda bisa menetapkan aturan bahwa satuan dasar terkecil di database selalu disimpan dalam miligram (mg) atau dikalikan 1000 sebagai integer.Contoh Kasus:1 gram gula $\rightarrow$ Disimpan sebagai 1000 di database.0.5 gram garam $\rightarrow$ Disimpan sebagai 500 di database.Keuntungan: Tidak akan pernah ada masalah selisih desimal karena operasi matematika menggunakan bilangan bulat murni (integer).3. Solusi B: Menggunakan Library decimal.js (Jika Harus Pakai Desimal)Jika Anda tetap ingin menyimpan data dalam bentuk angka desimal biasa (misalnya 10.5), gunakan library pihak ketiga yang aman untuk kalkulasi finansial dan inventaris, yaitu decimal.js


 Cara Implementasi:

Install library di proyek Expo React Native Anda:

Bash
npm install decimal.js
# atau
yarn add decimal.js
Gunakan saat melakukan perhitungan stok, resep, atau harga:

TypeScript
import { Decimal } from 'decimal.js';

// Contoh saat menghitung pengurangan stok resep
function calculateDeduction(recipeQty: number, itemsSold: number): number {
  // Menggunakan Decimal.js untuk menghindari error pembulatan desimal
  const qty = new Decimal(recipeQty);
  const sold = new Decimal(itemsSold);
  
  // Hasil perkalian dijamin presisi secara matematis
  return qty.mul(sold.toNumber()); 
}

// Simulasi: 1.5 gram x 3 porsi
const result = calculateDeduction(1.5, 3); 
console.log(result); // Output bersih: 4.5 (bukan 4.500000000000001)
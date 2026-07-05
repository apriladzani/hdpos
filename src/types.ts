export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'admin' | 'cashier' | 'gudang';
}

export interface Category {
  id: number;
  name: string;
  enable_stok_awal?: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category_id: number;
  category_name?: string;
  barcode: string;
}

export interface TransactionItem extends Product {
  quantity: number;
  discount_type?: 'none' | 'percent' | 'fixed' | 'voucher';
  discount_value?: number;
  voucher_id?: number | null;
}

export interface Transaction {
  id: number;
  user_id: number;
  cashier_name: string;
  total_amount: number;
  discount_type: 'none' | 'percent' | 'fixed';
  discount_value: number;
  payment_method: string;
  cash_received: number;
  change_amount: number;
  created_at: string;
}

export interface CashFlowItem {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  payment_method?: string;
}

export interface OpenBill {
  id: number;
  table_name: string;
  customer_name: string;
  items: TransactionItem[];
  created_at: string;
}

export interface ExpenseItem {
  id: number;
  name: string;
}

export interface Discount {
  id: number;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
}

export interface StockRequest {
  id: number;
  material_id: number;
  material_name?: string;
  quantity: number;
  approved_quantity?: number | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_id?: number | null;
  cashier_name?: string;
  price?: number;
  total_price?: number;
  payment_method?: 'cash' | 'transfer';
}

export interface CashierStock {
  id: number;
  user_id: number;
  cash_register_id: number;
  material_id: number;
  material_name?: string;
  stock_awal: number;
  masuk: number;
  terpakai: number;
  terbuang: number;
  sisa_stock: number;
  created_at: string;
  cashier_name?: string;
}

export interface InventoryMaterial {
  id: number;
  name: string;
  stock: number;
  unit: string;
  price?: number;
  category_id?: number | null;
  category_name?: string;
  enable_stok_awal?: number;
}

export interface InventoryLog {
  id: number;
  material_id: number;
  material_name?: string;
  type: 'awal' | 'akhir';
  quantity: number;
  price: number;
  created_at: string;
}

export interface WarehouseStock {
  id: number;
  material_id: number;
  material_name?: string;
  stock_awal: number;
  masuk: number;
  terpakai: number;
  terbuang: number;
  terjual: number;
  retur: number;
  sisa_stock: number;
  created_at: string;
}

export interface VendorStockRequest {
  id: number;
  material_id: number;
  vendor_item_id?: number | null;
  vendor_item_name?: string;
  vendor_code?: string;
  material_name?: string;
  quantity: number;
  price: number;
  total_price: number;
  payment_method: 'cash' | 'transfer';
  created_at: string;
}

export interface Vendor {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export interface VendorItem {
  id: number;
  vendor_id: number;
  vendor_code?: string;
  vendor_name?: string;
  name: string;
  material_id?: number | null;
  material_name?: string;
  unit?: string;
}

export interface OfflineReturn {
  id: number;
  material_id: number;
  material_name?: string;
  cashier_id: number;
  cashier_name?: string;
  quantity: number;
  condition_status: 'layak' | 'tidak_layak';
  added_to_input: number;
  created_at: string;
}

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Adzani0204@',
  database: process.env.DB_NAME || 'hd_pos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+07:00'");
});

export async function initDb() {
  // First connect without database to create it if not exists
  const setupPool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Adzani0204@',
  });
  await setupPool.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'hd_pos'}\``);
  await setupPool.end();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      role ENUM('admin', 'cashier', 'gudang')
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS material_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE
    )
  `);

  try { await pool.query("ALTER TABLE categories ADD COLUMN sort_order INT DEFAULT 0"); } catch (e) { }
  try { await pool.query("ALTER TABLE material_categories ADD COLUMN sort_order INT DEFAULT 0"); } catch (e) { }
  try { await pool.query("ALTER TABLE material_categories ADD COLUMN enable_stok_awal TINYINT(1) DEFAULT 1"); } catch (e) { }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      price DECIMAL(10, 2),
      stock INT DEFAULT 0,
      category_id INT,
      barcode VARCHAR(255),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      total_amount DECIMAL(10, 2),
      discount_type VARCHAR(50) DEFAULT 'none',
      discount_value DECIMAL(10, 2) DEFAULT 0,
      payment_method VARCHAR(100),
      cash_received DECIMAL(10, 2),
      change_amount DECIMAL(10, 2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_id INT,
      product_id INT,
      quantity INT,
      price_at_transaction DECIMAL(10, 2),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      description TEXT,
      amount DECIMAL(10, 2),
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS open_bills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_name VARCHAR(255),
      customer_name VARCHAR(255),
      items TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cash_registers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cashier_id INT,
      cashier_name VARCHAR(255),
      opening_balance DECIMAL(15,2),
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closing_balance DECIMAL(15,2) DEFAULT NULL,
      expected_balance DECIMAL(15,2) DEFAULT NULL,
      closed_at DATETIME DEFAULT NULL,
      status ENUM('open', 'closed') DEFAULT 'open'
    )
  `);

  try { await pool.query("ALTER TABLE cash_registers ADD COLUMN closing_balance DECIMAL(15,2) DEFAULT NULL"); } catch (e) { }
  try { await pool.query("ALTER TABLE cash_registers ADD COLUMN expected_balance DECIMAL(15,2) DEFAULT NULL"); } catch (e) { }
  try { await pool.query("ALTER TABLE cash_registers ADD COLUMN closed_at DATETIME DEFAULT NULL"); } catch (e) { }
  try { await pool.query("ALTER TABLE cash_registers ADD COLUMN status ENUM('open', 'closed') DEFAULT 'open'"); } catch (e) { }
  try { await pool.query("ALTER TABLE transaction_items ADD COLUMN discount_type VARCHAR(50) DEFAULT 'none'"); } catch (e) { }
  try { await pool.query("ALTER TABLE transaction_items ADD COLUMN discount_value DECIMAL(10,2) DEFAULT 0"); } catch (e) { }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expense_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE,
      price DECIMAL(10, 2) DEFAULT 0
    )
  `);
  try { await pool.query("ALTER TABLE expense_items ADD COLUMN price DECIMAL(10, 2) DEFAULT 0"); } catch (e) { }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS discounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      type ENUM('percent', 'fixed'),
      value DECIMAL(10, 2)
    )
  `);

  // Create inventory_materials first so other tables can reference it
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      stock INT DEFAULT 0,
      unit VARCHAR(50) DEFAULT 'pcs',
      price DECIMAL(10, 2) DEFAULT 0
    )
  `);
  try { await pool.query("ALTER TABLE inventory_materials ADD COLUMN price DECIMAL(10, 2) DEFAULT 0"); } catch (e) { }
  try { await pool.query("ALTER TABLE inventory_materials ADD COLUMN category_id INT"); } catch (e) { }
  try { await pool.query("ALTER TABLE inventory_materials DROP FOREIGN KEY inventory_materials_ibfk_1"); } catch (e) { }
  try { await pool.query("ALTER TABLE inventory_materials ADD CONSTRAINT fk_inventory_materials_category FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE SET NULL"); } catch (e) { }
  try { await pool.query("ALTER TABLE products ADD COLUMN sort_order INT DEFAULT 0"); } catch (e) { }
  try { await pool.query("ALTER TABLE inventory_materials ADD COLUMN sort_order INT DEFAULT 0"); } catch (e) { }

  try {
    // Drop cashier_stocks first because it references stock_requests or register/user
    await pool.query("DROP TABLE IF EXISTS cashier_stocks");
    await pool.query("DROP TABLE IF EXISTS stock_requests");
  } catch (e) { }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      material_id INT,
      quantity INT,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INT DEFAULT NULL,
      price DECIMAL(10, 2) DEFAULT 0,
      total_price DECIMAL(10, 2) DEFAULT 0,
      payment_method VARCHAR(50) DEFAULT 'cash',
      approved_quantity INT DEFAULT NULL,
      FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  try { await pool.query("ALTER TABLE stock_requests ADD COLUMN price DECIMAL(10, 2) DEFAULT 0"); } catch (e) { }
  try { await pool.query("ALTER TABLE stock_requests ADD COLUMN total_price DECIMAL(10, 2) DEFAULT 0"); } catch (e) { }
  try { await pool.query("ALTER TABLE stock_requests ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash'"); } catch (e) { }
  try { await pool.query("ALTER TABLE stock_requests ADD COLUMN approved_quantity INT DEFAULT NULL"); } catch (e) { }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      material_id INT,
      type ENUM('awal', 'akhir'),
      quantity INT,
      price DECIMAL(10, 2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cashier_stocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      cash_register_id INT,
      material_id INT,
      stock_awal INT DEFAULT 0,
      masuk INT DEFAULT 0,
      tosser_in INT DEFAULT 0,
      tosser_out INT DEFAULT 0,
      terpakai INT DEFAULT 0,
      terbuang INT DEFAULT 0,
      sisa_stock INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE,
      FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE SET NULL
    )
  `);

  try { await pool.query("ALTER TABLE cashier_stocks ADD COLUMN tosser_in INT DEFAULT 0"); } catch (e) { }
  try { await pool.query("ALTER TABLE cashier_stocks ADD COLUMN tosser_out INT DEFAULT 0"); } catch (e) { }

  try { await pool.query("ALTER TABLE expenses ADD COLUMN expense_item_id INT DEFAULT NULL"); } catch (e) { }
  try { await pool.query("ALTER TABLE expenses ADD COLUMN quantity INT DEFAULT 1"); } catch (e) { }
  try { await pool.query("ALTER TABLE expenses ADD COLUMN price DECIMAL(10, 2) DEFAULT 0"); } catch (e) { }
  try { await pool.query("ALTER TABLE expenses ADD COLUMN discount DECIMAL(10, 2) DEFAULT 0"); } catch (e) { }
  try { await pool.query("ALTER TABLE expenses ADD COLUMN user_id INT DEFAULT NULL"); } catch (e) { }
  try { await pool.query("ALTER TABLE expenses ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash'"); } catch (e) { }

  // Ensure discount columns exist for existing databases
  try { await pool.query("ALTER TABLE transactions ADD COLUMN discount_type VARCHAR(50) DEFAULT 'none'"); } catch (e) { }
  try { await pool.query("ALTER TABLE transactions ADD COLUMN discount_value DECIMAL(10, 2) DEFAULT 0"); } catch (e) { }

  // Add discount columns to transaction_items for per-item discounts
  try { await pool.query("ALTER TABLE transaction_items ADD COLUMN discount_type VARCHAR(50) DEFAULT 'none'"); } catch (e) { }
  try { await pool.query("ALTER TABLE transaction_items ADD COLUMN discount_value DECIMAL(10, 2) DEFAULT 0"); } catch (e) { }
  try { await pool.query("ALTER TABLE transaction_items ADD COLUMN voucher_id INT DEFAULT NULL"); } catch (e) { }

  // Update role enum for existing users table
  try { await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'cashier', 'gudang')"); } catch (e) { }

  // Add email column for existing users table
  try { await pool.query("ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE"); } catch (e) { }

  // Create user_material_stocks table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_material_stocks (
      user_id INT,
      material_id INT,
      stock INT DEFAULT 0,
      PRIMARY KEY (user_id, material_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE
    )
  `);

  try { await pool.query("ALTER TABLE warehouse_cash_flow MODIFY COLUMN type ENUM('income', 'expense', 'loss') NOT NULL"); } catch (e) { }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS warehouse_cash_flow (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('income', 'expense', 'loss') NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT,
      payment_method VARCHAR(50) DEFAULT 'cash',
      ref_id INT DEFAULT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vendor_id INT,
      name VARCHAR(255) NOT NULL,
      material_id INT,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS warehouse_stocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      material_id INT,
      stock_awal INT DEFAULT 0,
      masuk INT DEFAULT 0,
      terpakai INT DEFAULT 0,
      terbuang INT DEFAULT 0,
      terjual INT DEFAULT 0,
      retur INT DEFAULT 0,
      sisa_stock INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_stock_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      material_id INT,
      vendor_item_id INT DEFAULT NULL,
      quantity INT,
      price DECIMAL(10, 2) DEFAULT 0,
      total_price DECIMAL(10, 2) DEFAULT 0,
      payment_method VARCHAR(50) DEFAULT 'cash',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_item_id) REFERENCES vendor_items(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS offline_returns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      material_id INT,
      cashier_id INT,
      quantity INT,
      condition_status ENUM('layak', 'tidak_layak') NOT NULL,
      added_to_input TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE,
      FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migration try-catches for existing tables
  try {
    await pool.query("ALTER TABLE warehouse_stocks ADD COLUMN terjual INT DEFAULT 0");
  } catch (err) { }
  try {
    await pool.query("ALTER TABLE warehouse_stocks ADD COLUMN retur INT DEFAULT 0");
  } catch (err) { }
  try {
    await pool.query("ALTER TABLE vendor_stock_requests ADD COLUMN vendor_item_id INT DEFAULT NULL");
  } catch (err) { }
  try {
    await pool.query("ALTER TABLE vendor_stock_requests ADD FOREIGN KEY (vendor_item_id) REFERENCES vendor_items(id) ON DELETE SET NULL");
  } catch (err) { }
  try {
    await pool.query("ALTER TABLE vendor_items ADD COLUMN vendor_id INT DEFAULT NULL");
  } catch (err) { }
  try {
    await pool.query("ALTER TABLE vendor_items ADD FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE");
  } catch (err) { }
  try {
    await pool.query("ALTER TABLE vendor_items MODIFY COLUMN vendor_code VARCHAR(100) NULL DEFAULT NULL");
  } catch (err) { }
  try {
    await pool.query("ALTER TABLE vendor_items DROP COLUMN vendor_code");
  } catch (err) { }

  // Create receipt_sub_headlines table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS receipt_sub_headlines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      text VARCHAR(255) NOT NULL UNIQUE
    )
  `);

  // Create receipt_settings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS receipt_settings (
      id INT PRIMARY KEY,
      headline VARCHAR(255) DEFAULT '@HD fried chicken',
      address VARCHAR(255) DEFAULT 'Jl. Raya Utama No. 45',
      phone VARCHAR(255) DEFAULT '0812-3456-7890',
      footer_text VARCHAR(255) DEFAULT 'Terima Kasih atas Kunjungan Anda!'
    )
  `);

  // Seed default receipt settings if not exists
  await pool.query(`
    INSERT IGNORE INTO receipt_settings (id, headline, address, phone, footer_text) 
    VALUES (1, '@HD fried chicken', 'Jl. Raya Utama No. 45', '0812-3456-7890', 'Terima Kasih atas Kunjungan Anda!')
  `);

  // Seed default subheadline if not exists
  await pool.query("INSERT IGNORE INTO receipt_sub_headlines (id, text) VALUES (1, 'Cabang Utama')");

  // Create stock_transfers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT,
      receiver_id INT,
      material_id INT,
      quantity INT,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE
    )
  `);
  try {
    await pool.query("ALTER TABLE stock_transfers ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");
  } catch (err) { }

  // Seed Admin if not exists
  const [adminRows]: any = await pool.query("SELECT * FROM users WHERE username = ?", ["admin"]);
  if (adminRows.length === 0) {
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    await pool.query("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ["admin", hashedPassword, "admin"]);
  }

  // Automatic Migration: Link existing transactions and expenses without a specific cashier to their sessions
  try {
    await pool.query(`
      UPDATE transactions t
      JOIN cash_registers cr ON t.created_at >= cr.opened_at 
        AND (t.created_at <= cr.closed_at OR cr.closed_at IS NULL OR cr.status = 'open')
      SET t.user_id = cr.cashier_id
      WHERE t.user_id = 1 OR t.user_id IS NULL
    `);
    await pool.query(`
      UPDATE expenses e
      JOIN cash_registers cr ON e.date >= cr.opened_at 
        AND (e.date <= cr.closed_at OR cr.closed_at IS NULL OR cr.status = 'open')
      SET e.user_id = cr.cashier_id
      WHERE e.user_id IS NULL
    `);
  } catch (e) {
    console.error("Auto migration warning:", e);
  }
}

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { pool, initDb } from "./db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "vibepos-secret-key-2026";

async function startServer() {
  try {
    await initDb();
    console.log("Database connected & initialized.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
      if (!username || !email || !password || !role) {
        return res.status(400).json({ message: "Semua field harus diisi" });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const [result]: any = await pool.query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        [username, email, hashedPassword, role]
      );

      res.json({ message: "Akun berhasil dibuat", id: result.insertId });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ message: "Username atau Email sudah digunakan" });
      } else {
        res.status(500).json({ message: e.message });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { identifier, password } = req.body;
    try {
      const [rows]: any = await pool.query("SELECT * FROM users WHERE username = ? OR email = ?", [identifier, identifier]);
      const user = rows[0];

      if (!user) {
        return res.status(401).json({ message: "Username atau password salah" });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Username atau password salah" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role }
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, newPassword } = req.body;
    try {
      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email dan Password Baru harus diisi" });
      }

      const [rows]: any = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Email tidak terdaftar di sistem" });
      }

      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      await pool.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);

      res.json({ message: "Password berhasil diubah" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Product Routes
  app.get("/api/products", async (req, res) => {
    try {
      const [products] = await pool.query(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.sort_order ASC, p.id DESC
      `);
      res.json(products);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/products/reorder", async (req, res) => {
    const { order } = req.body;
    try {
      if (!Array.isArray(order)) return res.status(400).json({ message: "Invalid order array" });
      const queries = order.map((id, index) => 
        pool.query("UPDATE products SET sort_order = ? WHERE id = ?", [index, id])
      );
      await Promise.all(queries);
      res.json({ message: "Order updated" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/products", async (req, res) => {
    const { name, price, stock, category_id, barcode } = req.body;
    try {
      const catId = category_id === "" || category_id === null || category_id === undefined ? null : Number(category_id);
      const [result]: any = await pool.query("INSERT INTO products (name, price, stock, category_id, barcode) VALUES (?, ?, ?, ?, ?)", [
        name,
        price,
        stock === "" || stock === null ? 0 : stock,
        catId,
        barcode || null
      ]);
      res.json({ id: result.insertId });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    const { name, price, stock, category_id, barcode } = req.body;
    try {
      const catId = category_id === "" || category_id === null || category_id === undefined ? null : Number(category_id);
      await pool.query("UPDATE products SET name = ?, price = ?, stock = ?, category_id = ?, barcode = ? WHERE id = ?", [
        name,
        price,
        stock === "" || stock === null ? 0 : stock,
        catId,
        barcode || null,
        req.params.id
      ]);
      res.json({ message: "Updated" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
      res.json({ message: "Deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Category Routes
  app.get("/api/categories", async (req, res) => {
    try {
      const [categories] = await pool.query("SELECT * FROM categories ORDER BY sort_order ASC, id ASC");
      res.json(categories);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/categories/reorder", async (req, res) => {
    const { order } = req.body;
    try {
      if (!Array.isArray(order)) return res.status(400).json({ message: "Invalid order array" });
      const queries = order.map((id, index) => 
        pool.query("UPDATE categories SET sort_order = ? WHERE id = ?", [index, id])
      );
      await Promise.all(queries);
      res.json({ message: "Order updated" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/categories", async (req, res) => {
    const { name } = req.body;
    try {
      const [result]: any = await pool.query("INSERT INTO categories (name) VALUES (?)", [name]);
      res.json({ id: result.insertId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      await pool.query("UPDATE categories SET name = ? WHERE id = ?", [req.body.name, req.params.id]);
      res.json({ message: "Category updated" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
      res.json({ message: "Category deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Material Category Routes
  app.get("/api/material-categories", async (req, res) => {
    try {
      const [categories] = await pool.query("SELECT * FROM material_categories ORDER BY sort_order ASC, id ASC");
      res.json(categories);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/material-categories/reorder", async (req, res) => {
    const { order } = req.body;
    try {
      if (!Array.isArray(order)) return res.status(400).json({ message: "Invalid order array" });
      const queries = order.map((id, index) => 
        pool.query("UPDATE material_categories SET sort_order = ? WHERE id = ?", [index, id])
      );
      await Promise.all(queries);
      res.json({ message: "Order updated" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/material-categories", async (req, res) => {
    const { name, enable_stok_awal } = req.body;
    try {
      const [result]: any = await pool.query(
        "INSERT INTO material_categories (name, enable_stok_awal) VALUES (?, ?)", 
        [name, enable_stok_awal !== undefined ? enable_stok_awal : 1]
      );
      res.json({ id: result.insertId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/material-categories/:id", async (req, res) => {
    const { name, enable_stok_awal } = req.body;
    try {
      const fields = [];
      const params = [];
      if (name !== undefined) {
        fields.push("name = ?");
        params.push(name);
      }
      if (enable_stok_awal !== undefined) {
        fields.push("enable_stok_awal = ?");
        params.push(enable_stok_awal);
      }
      params.push(req.params.id);
      await pool.query(`UPDATE material_categories SET ${fields.join(", ")} WHERE id = ?`, params);
      res.json({ message: "Category updated" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/material-categories/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM material_categories WHERE id = ?", [req.params.id]);
      res.json({ message: "Category deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Transaction Routes
  app.post("/api/transactions", async (req: any, res) => {
    const { items, total_amount, discount_type, discount_value, payment_method, cash_received, change_amount, user_id } = req.body;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [transResult]: any = await connection.query(`
        INSERT INTO transactions (user_id, total_amount, discount_type, discount_value, payment_method, cash_received, change_amount) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [user_id || 1, total_amount, discount_type || 'none', discount_value || 0, payment_method, cash_received, change_amount]);

      const transactionId = transResult.insertId;

      let subtotal = 0;
      for (const item of items) {
        await connection.query(`
          INSERT INTO transaction_items (transaction_id, product_id, quantity, price_at_transaction, discount_type, discount_value) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          transactionId,
          item.id,
          item.quantity,
          item.price,
          item.discount_type || 'none',
          item.discount_value || 0
        ]);

        await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.id]);

        // Calculate the item price after per-item discount
        const hasDiscount = item.discount_type && item.discount_type !== 'none';
        const priceAfterDiscount = hasDiscount
          ? (item.discount_type === 'percent'
            ? Math.max(0, item.price - (item.price * (item.discount_value || 0)) / 100)
            : Math.max(0, item.price - (item.discount_value || 0)))
          : item.price;
        subtotal += (priceAfterDiscount * item.quantity);
      }

      // Calculate and record discount as expense
      let discountAmt = 0;
      if (discount_type === 'percent') {
        discountAmt = (subtotal * (discount_value || 0)) / 100;
      } else if (discount_type === 'fixed') {
        discountAmt = discount_value || 0;
      }

      if (discountAmt > 0) {
        await connection.query("INSERT INTO expenses (description, amount) VALUES (?, ?)", [
          `Diskon Penjualan (#ORD-${1000 + Number(transactionId)})`,
          discountAmt
        ]);
      }

      await connection.commit();
      res.json({ id: transactionId });
    } catch (e: any) {
      await connection.rollback();
      res.status(500).json({ message: e.message });
    } finally {
      connection.release();
    }
  });

  app.get("/api/transactions", async (req, res) => {
    const { user_id, date, startDate, endDate } = req.query;
    try {
      let query = `
        SELECT t.*, u.username as cashier_name 
        FROM transactions t 
        LEFT JOIN users u ON t.user_id = u.id
      `;
      const conditions: string[] = [];
      const params: any[] = [];

      if (user_id) {
        conditions.push("t.user_id = ?");
        params.push(user_id);
      }
      if (date) {
        conditions.push("DATE(t.created_at) = ?");
        params.push(date);
      }
      if (startDate && endDate) {
        conditions.push("DATE(t.created_at) BETWEEN ? AND ?");
        params.push(startDate, endDate);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
      query += " ORDER BY t.created_at DESC";

      const [transactions] = await pool.query(query, params);
      res.json(transactions);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const [transRows]: any = await pool.query(`
        SELECT t.*, u.username as cashier_name 
        FROM transactions t 
        LEFT JOIN users u ON t.user_id = u.id 
        WHERE t.id = ?
      `, [req.params.id]);

      const transaction = transRows[0];
      if (!transaction) return res.status(404).json({ message: "Not found" });

      const [items]: any = await pool.query(`
        SELECT ti.quantity, ti.price_at_transaction as price, p.name, ti.discount_type, ti.discount_value
        FROM transaction_items ti
        LEFT JOIN products p ON ti.product_id = p.id
        WHERE ti.transaction_id = ?
      `, [req.params.id]);

      // Calculate subtotal
      const subtotal = items.reduce((sum: number, item: any) => {
        const itemPrice = Number(item.price);
        const hasDiscount = item.discount_type && item.discount_type !== 'none';
        const priceAfterDiscount = hasDiscount
          ? (item.discount_type === 'percent'
            ? Math.max(0, itemPrice - (itemPrice * Number(item.discount_value || 0)) / 100)
            : Math.max(0, itemPrice - Number(item.discount_value || 0)))
          : itemPrice;
        return sum + (priceAfterDiscount * item.quantity);
      }, 0);

      // Calculate discount amount for receipt consistency
      let discountAmount = 0;
      const tDiscountValue = Number(transaction.discount_value);
      if (transaction.discount_type === 'percent') {
        discountAmount = (subtotal * tDiscountValue) / 100;
      } else if (transaction.discount_type === 'fixed') {
        discountAmount = tDiscountValue;
      }

      res.json({
        ...transaction,
        items,
        subtotal,
        discount_amount: discountAmount,
        date: transaction.created_at
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    const transactionId = req.params.id;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Get items to restore stock
      const [items]: any = await connection.query("SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ?", [transactionId]);

      for (const item of items) {
        if (item.product_id) {
          await connection.query("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
        }
      }

      // 2. Delete transaction items
      await connection.query("DELETE FROM transaction_items WHERE transaction_id = ?", [transactionId]);

      // 3. Delete transaction
      await connection.query("DELETE FROM transactions WHERE id = ?", [transactionId]);

      await connection.commit();
      res.json({ message: "Transaction cancelled and stock restored" });
    } catch (e: any) {
      await connection.rollback();
      res.status(500).json({ message: e.message });
    } finally {
      connection.release();
    }
  });

  // Report Routes
  app.get("/api/reports/summary", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [[salesToday]]: any = await pool.query("SELECT SUM(total_amount) as total FROM transactions WHERE DATE(created_at) = ?", [today]);
      const [[totalTransactions]]: any = await pool.query("SELECT COUNT(*) as count FROM transactions");
      const [[lowStock]]: any = await pool.query("SELECT COUNT(*) as count FROM products WHERE stock < 10");
      const [[totalExpenses]]: any = await pool.query("SELECT SUM(amount) as total FROM expenses");

      res.json({
        salesToday: Number(salesToday?.total || 0),
        totalTransactions: Number(totalTransactions?.count || 0),
        lowStockCount: Number(lowStock?.count || 0),
        totalExpenses: Number(totalExpenses?.total || 0)
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/reports/sales-chart", async (req, res) => {
    try {
      const { period = 'day' } = req.query;
      let query = "";

      switch (period) {
        case 'week':
          query = "SELECT DATE_FORMAT(created_at, '%Y-%u') as date, SUM(total_amount) as total FROM transactions GROUP BY date ORDER BY date DESC LIMIT 12";
          break;
        case 'month':
          query = "SELECT DATE_FORMAT(created_at, '%Y-%m') as date, SUM(total_amount) as total FROM transactions GROUP BY date ORDER BY date DESC LIMIT 12";
          break;
        case 'year':
          query = "SELECT DATE_FORMAT(created_at, '%Y') as date, SUM(total_amount) as total FROM transactions GROUP BY date ORDER BY date DESC LIMIT 5";
          break;
        case 'day':
        default:
          query = "SELECT DATE(created_at) as date, SUM(total_amount) as total FROM transactions GROUP BY date ORDER BY date DESC LIMIT 30";
          break;
      }

      const [data]: any = await pool.query(query);
      res.json(data.reverse());
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/reports/sales-performance", async (req, res) => {
    try {
      const { startDate, endDate, user_id } = req.query;

      let summaryQuery = `
        SELECT 
          SUM(total_amount) as totalSales,
          COUNT(*) as transactionCount
        FROM transactions 
        WHERE DATE(created_at) BETWEEN ? AND ?
      `;
      let bestSellersQuery = `
        SELECT 
          p.name,
          ti.quantity,
          ti.price_at_transaction,
          ti.discount_type,
          ti.discount_value
        FROM transaction_items ti
        JOIN products p ON ti.product_id = p.id
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE DATE(t.created_at) BETWEEN ? AND ?
      `;
      let chartDataQuery = `
        SELECT 
          DATE(created_at) as date,
          SUM(total_amount) as total
        FROM transactions
        WHERE DATE(created_at) BETWEEN ? AND ?
      `;

      const summaryParams = [startDate, endDate];
      const bestSellersParams = [startDate, endDate];
      const chartParams = [startDate, endDate];

      if (user_id) {
        summaryQuery += " AND user_id = ?";
        summaryParams.push(user_id);

        bestSellersQuery += " AND t.user_id = ?";
        bestSellersParams.push(user_id);

        chartDataQuery += " AND user_id = ?";
        chartParams.push(user_id);
      }

      chartDataQuery += " GROUP BY date ORDER BY date ASC";

      const [[summary]]: any = await pool.query(summaryQuery, summaryParams);
      const [bestSellersRows]: any = await pool.query(bestSellersQuery, bestSellersParams);
      const [chartData] = await pool.query(chartDataQuery, chartParams);

      const categoriesMap: Record<string, { name: string; totalSold: number; revenue: number }> = {
        'Ayam PK': { name: 'Ayam PK', totalSold: 0, revenue: 0 },
        'Ayam PB': { name: 'Ayam PB', totalSold: 0, revenue: 0 },
        'Nasi': { name: 'Nasi', totalSold: 0, revenue: 0 },
        'Kulit': { name: 'Kulit', totalSold: 0, revenue: 0 },
        'Chili Oil': { name: 'Chili Oil', totalSold: 0, revenue: 0 },
        'Saus Geprek': { name: 'Saus Geprek', totalSold: 0, revenue: 0 }
      };

      bestSellersRows.forEach((row: any) => {
        const name = (row.name || '').trim().toLowerCase();
        const qty = Number(row.quantity || 0);
        const price = Number(row.price_at_transaction || 0);
        const distType = row.discount_type;
        const distVal = Number(row.discount_value || 0);

        let discountAmt = 0;
        if (distType === 'percent') {
          discountAmt = (price * distVal / 100) * qty;
        } else if (distType === 'fixed') {
          discountAmt = distVal * qty;
        }
        const revenue = (price * qty) - discountAmt;

        if (name === 'sayap' || name === 'paha bawah') {
          categoriesMap['Ayam PK'].totalSold += qty;
          categoriesMap['Ayam PK'].revenue += revenue;
        } else if (name === 'paha atas' || name === 'dada mentok' || name === 'dada tulang') {
          categoriesMap['Ayam PB'].totalSold += qty;
          categoriesMap['Ayam PB'].revenue += revenue;
        } else if (name === 'nasi') {
          categoriesMap['Nasi'].totalSold += qty;
          categoriesMap['Nasi'].revenue += revenue;
        } else if (name === 'kulit') {
          categoriesMap['Kulit'].totalSold += qty;
          categoriesMap['Kulit'].revenue += revenue;
        } else if (name === 'chili oil') {
          categoriesMap['Chili Oil'].totalSold += qty;
          categoriesMap['Chili Oil'].revenue += revenue;
        } else if (name === 'saus geprek') {
          categoriesMap['Saus Geprek'].totalSold += qty;
          categoriesMap['Saus Geprek'].revenue += revenue;
        }
      });

      const bestSellers = Object.values(categoriesMap);

      // 1. opening_balance from cash_registers
      let openingQuery = "SELECT SUM(opening_balance) as totalOpening FROM cash_registers WHERE DATE(opened_at) BETWEEN ? AND ?";
      const openingParams = [startDate, endDate];
      if (user_id) {
        openingQuery += " AND cashier_id = ?";
        openingParams.push(user_id);
      }
      const [[openingRow]]: any = await pool.query(openingQuery, openingParams);
      const openingBalance = Number(openingRow?.totalOpening || 0);

      // 2. total_expenses from expenses
      let expensesQuery = "SELECT SUM(amount) as totalExpenses FROM expenses WHERE DATE(date) BETWEEN ? AND ?";
      const expensesParams = [startDate, endDate];
      if (user_id) {
        expensesQuery += " AND user_id = ?";
        expensesParams.push(user_id);
      }
      const [[expensesRow]]: any = await pool.query(expensesQuery, expensesParams);
      const totalExpenses = Number(expensesRow?.totalExpenses || 0);

      // 3. total_promo (order-level + item-level)
      // a) order-level discount_amount
      let orderPromoQuery = "SELECT total_amount, discount_type, discount_value FROM transactions WHERE DATE(created_at) BETWEEN ? AND ?";
      const orderPromoParams = [startDate, endDate];
      if (user_id) {
        orderPromoQuery += " AND user_id = ?";
        orderPromoParams.push(user_id);
      }
      const [orderPromoRows]: any = await pool.query(orderPromoQuery, orderPromoParams);
      let totalPromo = 0;
      orderPromoRows.forEach((t: any) => {
        const total = Number(t.total_amount || 0);
        const distType = t.discount_type;
        const distVal = Number(t.discount_value || 0);
        if (distType === 'fixed') {
          totalPromo += distVal;
        } else if (distType === 'percent') {
          if (distVal > 0 && distVal < 100) {
            totalPromo += total * (distVal / (100 - distVal));
          }
        }
      });

      // b) item-level discounts
      let itemPromoQuery = `
        SELECT 
          ti.quantity, 
          ti.price_at_transaction, 
          ti.discount_type, 
          ti.discount_value 
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE DATE(t.created_at) BETWEEN ? AND ?
      `;
      const itemPromoParams = [startDate, endDate];
      if (user_id) {
        itemPromoQuery += " AND t.user_id = ?";
        itemPromoParams.push(user_id);
      }
      const [itemPromoRows]: any = await pool.query(itemPromoQuery, itemPromoParams);
      itemPromoRows.forEach((item: any) => {
        const qty = Number(item.quantity || 0);
        const price = Number(item.price_at_transaction || 0);
        const distType = item.discount_type;
        const distVal = Number(item.discount_value || 0);

        let itemPromo = 0;
        if (distType === 'percent') {
          itemPromo = (price * distVal / 100) * qty;
        } else if (distType === 'fixed') {
          itemPromo = distVal * qty;
        }
        totalPromo += itemPromo;
      });

      // 4. cashier_stocks (starting, terjual, retur, ending stock of key materials in range)
      let cashierStocks: any[] = [];
      if (user_id) {
        const [regRows]: any = await pool.query(
          "SELECT id, DATE(opened_at) as reg_date FROM cash_registers WHERE cashier_id = ? AND DATE(opened_at) BETWEEN ? AND ? ORDER BY opened_at DESC",
          [user_id, startDate, endDate]
        );

        if (regRows.length > 0) {
          const regIds = regRows.map((r: any) => r.id);
          const [stockRows]: any = await pool.query(`
            SELECT 
              m.name as material_name,
              cs.stock_awal,
              cs.terpakai as terjual,
              cs.terbuang as retur,
              cs.sisa_stock as stock_akhir,
              DATE(cs.created_at) as stock_date
            FROM cashier_stocks cs
            JOIN inventory_materials m ON cs.material_id = m.id
            WHERE cs.cash_register_id IN (?)
          `, [regIds]);

          const targetMaterials = [
            'Ayam Mentah',
            'Kulit Mentah',
            'Beras',
            'Ayam PK',
            'Ayam PB',
            'Nasi',
            'Saus Oil',
            'Saus Geprek'
          ];

          const groupedByDate: Record<string, any[]> = {};

          regRows.forEach((reg: any) => {
            const dateStr = new Date(reg.reg_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            groupedByDate[dateStr] = targetMaterials.map(matName => ({
              material_name: matName === 'Saus Oil' ? 'Chili Oil' : matName,
              stock_awal: 0,
              terjual: 0,
              retur: 0,
              stock_akhir: 0
            }));
          });

          stockRows.forEach((row: any) => {
            const dateStr = new Date(row.stock_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            if (!groupedByDate[dateStr]) {
              groupedByDate[dateStr] = targetMaterials.map(matName => ({
                material_name: matName === 'Saus Oil' ? 'Chili Oil' : matName,
                stock_awal: 0,
                terjual: 0,
                retur: 0,
                stock_akhir: 0
              }));
            }
            const matName = (row.material_name || '').trim().toLowerCase();
            const list = groupedByDate[dateStr];
            const item = list.find((x: any) => {
              const checkName = matName === 'saus oil' ? 'chili oil' : matName;
              return x.material_name.toLowerCase().trim() === checkName;
            });
            if (item) {
              item.stock_awal = row.stock_awal || 0;
              item.terjual = row.terjual || 0;
              item.retur = row.retur || 0;
              item.stock_akhir = row.stock_akhir || 0;
            }
          });

          Object.keys(groupedByDate).forEach((dateStr) => {
            cashierStocks.push({
              date: dateStr,
              items: groupedByDate[dateStr]
            });
          });
        }
      }

      if (user_id && cashierStocks.length === 0) {
        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const targetMaterials = [
          'Ayam Mentah',
          'Kulit Mentah',
          'Beras',
          'Ayam PK',
          'Ayam PB',
          'Nasi',
          'Chili Oil',
          'Saus Geprek'
        ];
        cashierStocks.push({
          date: dateStr,
          items: targetMaterials.map(matName => ({
            material_name: matName,
            stock_awal: 0,
            terjual: 0,
            retur: 0,
            stock_akhir: 0
          }))
        });
      }

      res.json({
        totalSales: Number(summary?.totalSales || 0),
        transactionCount: Number(summary?.transactionCount || 0),
        averageOrderValue: Number(summary?.transactionCount > 0 ? (summary.totalSales / summary.transactionCount) : 0),
        openingBalance,
        totalExpenses,
        totalPromo,
        bestSellers,
        chartData,
        cashierStocks
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/reports/warehouse-performance", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // 1. Total purchases from vendor
      const [[summary]]: any = await pool.query(`
        SELECT 
          SUM(total_price) as totalPurchases,
          COUNT(*) as purchaseCount
        FROM vendor_stock_requests
        WHERE DATE(created_at) BETWEEN ? AND ?
      `, [startDate, endDate]);

      // 1b. Total income from approved stock requests (from warehouse cash flow)
      const [[incomeSummary]]: any = await pool.query(`
        SELECT 
          SUM(amount) as totalIncome
        FROM warehouse_cash_flow
        WHERE type = 'income' AND DATE(date) BETWEEN ? AND ?
      `, [startDate, endDate]);

      // 1c. Total loss from broken items (from warehouse cash flow)
      const [[lossSummary]]: any = await pool.query(`
        SELECT 
          SUM(amount) as totalLoss
        FROM warehouse_cash_flow
        WHERE type = 'loss' AND DATE(date) BETWEEN ? AND ?
      `, [startDate, endDate]);

      // 2. Low stock and total materials
      const [[materialSummary]]: any = await pool.query(`
        SELECT 
          COUNT(*) as totalMaterials,
          SUM(CASE WHEN stock < 10 THEN 1 ELSE 0 END) as lowStockCount
        FROM inventory_materials
      `);

      // 3. Chart data: Daily cash flow trend (income & expense & loss)
      const [chartData]: any = await pool.query(`
        SELECT 
          DATE(date) as date,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
          SUM(CASE WHEN type = 'loss' THEN amount ELSE 0 END) as loss
        FROM warehouse_cash_flow
        WHERE DATE(date) BETWEEN ? AND ?
        GROUP BY date
        ORDER BY date ASC
      `, [startDate, endDate]);

      // 4. Daily warehouse stock check items
      const [stockRows]: any = await pool.query(`
        SELECT 
          m.name as material_name,
          ws.stock_awal,
          ws.terjual,
          ws.retur,
          ws.sisa_stock,
          DATE(ws.created_at) as stock_date
        FROM warehouse_stocks ws
        JOIN inventory_materials m ON ws.material_id = m.id
        WHERE DATE(ws.created_at) BETWEEN ? AND ?
        ORDER BY ws.created_at DESC
      `, [startDate, endDate]);

      const groupedByDate: Record<string, any[]> = {};
      stockRows.forEach((row: any) => {
        const dateStr = new Date(row.stock_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        if (!groupedByDate[dateStr]) {
          groupedByDate[dateStr] = [];
        }
        groupedByDate[dateStr].push({
          material_name: row.material_name,
          stock_awal: row.stock_awal || 0,
          terjual: row.terjual || 0,
          retur: row.retur || 0,
          stock_akhir: row.sisa_stock || 0
        });
      });

      const warehouseStocks: any[] = [];
      Object.keys(groupedByDate).forEach((dateStr) => {
        warehouseStocks.push({
          date: dateStr,
          items: groupedByDate[dateStr]
        });
      });

      // 5. Most consumed materials in warehouse (based on terjual in warehouse_stocks)
      const [consumedMaterials]: any = await pool.query(`
        SELECT 
          m.name,
          m.category_id,
          c.name as category_name,
          SUM(ws.terjual) as totalSold,
          SUM(ws.terjual * COALESCE(m.price, 0)) as revenue
        FROM warehouse_stocks ws
        JOIN inventory_materials m ON ws.material_id = m.id
        LEFT JOIN material_categories c ON m.category_id = c.id
        WHERE DATE(ws.created_at) BETWEEN ? AND ?
        GROUP BY m.id, m.name, m.category_id, c.name
        ORDER BY totalSold DESC
      `, [startDate, endDate]);

      res.json({
        totalPurchases: Number(summary?.totalPurchases || 0),
        purchaseCount: Number(summary?.purchaseCount || 0),
        totalIncome: Number(incomeSummary?.totalIncome || 0),
        totalLoss: Number(lossSummary?.totalLoss || 0),
        totalMaterials: Number(materialSummary?.totalMaterials || 0),
        lowStockCount: Number(materialSummary?.lowStockCount || 0),
        chartData,
        warehouseStocks,
        bestSellers: consumedMaterials || []
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/reports/cash-flow", async (req, res) => {
    try {
      const [latest_register]: any = await pool.query("SELECT * FROM cash_registers WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1");

      if (!latest_register || latest_register.length === 0) {
        return res.json([]);
      }

      const reg = latest_register[0];
      const [sales]: any = await pool.query("SELECT id, 'income' as type, total_amount as amount, created_at as date, 'Penjualan' as description, payment_method FROM transactions WHERE created_at >= ?", [reg.opened_at]);
      const [expenses]: any = await pool.query("SELECT id, 'expense' as type, amount, date, description, payment_method FROM expenses WHERE date >= ?", [reg.opened_at]);
      const registersData = [
        { id: reg.id, type: 'income', amount: reg.opening_balance, date: reg.opened_at, description: `Saldo Awal Kasir - ${reg.cashier_name}`, payment_method: 'cash' }
      ];

      const combined = [...sales, ...expenses, ...registersData].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(combined);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/reports/cash-flow-admin", async (req, res) => {
    try {
      const { user_id, date, month, year, startDate, endDate } = req.query;
      let paramsTrans: any[] = [];
      let paramsExp: any[] = [];
      let paramsReg: any[] = [];

      let condTrans: string[] = ["1=1"];
      let condExp: string[] = ["1=1"];
      let condReg: string[] = ["1=1"];

      if (user_id) {
        condTrans.push("user_id = ?");
        paramsTrans.push(user_id);

        condExp.push("user_id = ?");
        paramsExp.push(user_id);

        condReg.push("cashier_id = ?");
        paramsReg.push(user_id);
      }

      if (date) {
        condTrans.push("DATE(created_at) = ?");
        paramsTrans.push(date);

        condExp.push("DATE(date) = ?");
        paramsExp.push(date);

        condReg.push("DATE(opened_at) = ?");
        paramsReg.push(date);
      } else {
        if (month) {
          condTrans.push("MONTH(created_at) = ?");
          paramsTrans.push(month);

          condExp.push("MONTH(date) = ?");
          paramsExp.push(month);

          condReg.push("MONTH(opened_at) = ?");
          paramsReg.push(month);
        }
        if (year) {
          condTrans.push("YEAR(created_at) = ?");
          paramsTrans.push(year);

          condExp.push("YEAR(date) = ?");
          paramsExp.push(year);

          condReg.push("YEAR(opened_at) = ?");
          paramsReg.push(year);
        }
      }

      if (startDate && endDate) {
        condTrans.push("DATE(created_at) BETWEEN ? AND ?");
        paramsTrans.push(startDate, endDate);

        condExp.push("DATE(date) BETWEEN ? AND ?");
        paramsExp.push(startDate, endDate);

        condReg.push("DATE(opened_at) BETWEEN ? AND ?");
        paramsReg.push(startDate, endDate);
      }

      const qTrans = `SELECT id, 'income' as type, total_amount as amount, created_at as date, 'Penjualan' as description, payment_method FROM transactions WHERE ${condTrans.join(" AND ")}`;
      const qExp = `SELECT id, 'expense' as type, amount, date, description, payment_method FROM expenses WHERE ${condExp.join(" AND ")}`;
      const qReg = `SELECT id, 'income' as type, opening_balance as amount, opened_at as date, CONCAT('Saldo Awal Kasir - ', cashier_name) as description, 'cash' as payment_method FROM cash_registers WHERE ${condReg.join(" AND ")}`;

      const [sales]: any = await pool.query(qTrans, paramsTrans);
      const [expenses]: any = await pool.query(qExp, paramsExp);
      const [registersData]: any = await pool.query(qReg, paramsReg);

      const combined = [...sales, ...expenses, ...registersData].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(combined);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Cash Register Routes
  app.get("/api/cash-registers/active/:cashier_id", async (req, res) => {
    try {
      const [rows]: any = await pool.query(
        "SELECT * FROM cash_registers WHERE cashier_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
        [req.params.cashier_id]
      );
      res.json(rows[0] || null);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/cash-registers/history", async (req, res) => {
    const { cashier_id, date, startDate, endDate } = req.query;
    try {
      let query = "SELECT * FROM cash_registers";
      const conditions: string[] = [];
      const params: any[] = [];

      if (cashier_id) {
        conditions.push("cashier_id = ?");
        params.push(cashier_id);
      }
      if (date) {
        conditions.push("DATE(opened_at) = ?");
        params.push(date);
      }
      if (startDate && endDate) {
        conditions.push("DATE(opened_at) BETWEEN ? AND ?");
        params.push(startDate, endDate);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
      query += " ORDER BY opened_at DESC";

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/cash-registers/open", async (req, res) => {
    try {
      const { cashier_id, cashier_name, opening_balance } = req.body;
      const [existing]: any = await pool.query(
        "SELECT id FROM cash_registers WHERE cashier_id = ? AND status = 'open'",
        [cashier_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: "Kasir masih terbuka" });
      }

      await pool.query(
        "INSERT INTO cash_registers (cashier_id, cashier_name, opening_balance, status) VALUES (?, ?, ?, 'open')",
        [cashier_id, cashier_name, opening_balance]
      );
      res.json({ message: "Kasir berhasil dibuka" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/cash-registers/expected/:id", async (req, res) => {
    try {
      const [regRows]: any = await pool.query("SELECT * FROM cash_registers WHERE id = ?", [req.params.id]);
      if (regRows.length === 0) return res.status(404).json({ message: "Register not found" });
      const reg = regRows[0];

      const [sales]: any = await pool.query("SELECT SUM(total_amount) as total FROM transactions WHERE user_id = ? AND payment_method = 'cash' AND created_at >= ?", [reg.cashier_id, reg.opened_at]);
      const [expenses]: any = await pool.query("SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND payment_method = 'cash' AND date >= ?", [reg.cashier_id, reg.opened_at]);

      const expected_balance = Number(reg.opening_balance) + Number(sales[0].total || 0) - Number(expenses[0].total || 0);
      res.json({ expected_balance });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/cash-registers/:id/summary", async (req, res) => {
    try {
      const [regRows]: any = await pool.query("SELECT * FROM cash_registers WHERE id = ?", [req.params.id]);
      if (regRows.length === 0) return res.status(404).json({ message: "Register not found" });
      const reg = regRows[0];

      const endTime = reg.closed_at || new Date();

      // Fetch all transactions in the session to calculate gross, net, and promo
      const [txs]: any = await pool.query(
        "SELECT id, total_amount, discount_type, discount_value, payment_method FROM transactions WHERE user_id = ? AND created_at >= ? AND created_at <= ?",
        [reg.cashier_id, reg.opened_at, endTime]
      );

      let total_promo = 0;
      let total_pemasukan_net = 0;
      let total_tunai_sales = 0;
      let total_qris_sales = 0;
      let total_transfer_sales = 0;

      txs.forEach((tx: any) => {
        const total_amount = Number(tx.total_amount || 0);
        total_pemasukan_net += total_amount;

        if (tx.payment_method === 'cash') total_tunai_sales += total_amount;
        if (tx.payment_method === 'qris') total_qris_sales += total_amount;
        if (tx.payment_method === 'transfer') total_transfer_sales += total_amount;

        // Calculate order-level promo
        let promo = 0;
        if (tx.discount_type === 'fixed') {
          promo = Number(tx.discount_value || 0);
        } else if (tx.discount_type === 'percent') {
          const pct = Number(tx.discount_value || 0);
          if (pct > 0 && pct < 100) {
            promo = (total_amount * pct) / (100 - pct);
          }
        }
        total_promo += promo;
      });

      // Calculate item-level promo
      if (txs.length > 0) {
        const txIds = txs.map((t: any) => t.id);
        const [items]: any = await pool.query(
          "SELECT quantity, price_at_transaction, discount_type, discount_value FROM transaction_items WHERE transaction_id IN (?)",
          [txIds]
        );

        items.forEach((item: any) => {
          const qty = Number(item.quantity || 0);
          const price = Number(item.price_at_transaction || 0);
          const distType = item.discount_type;
          const distVal = Number(item.discount_value || 0);

          let itemPromo = 0;
          if (distType === 'percent') {
            itemPromo = (price * distVal / 100) * qty;
          } else if (distType === 'fixed') {
            itemPromo = distVal * qty;
          }
          total_promo += itemPromo;
        });
      }

      // Fetch all expenses in the session
      const [expenses]: any = await pool.query(
        "SELECT payment_method, SUM(amount) as total FROM expenses WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY payment_method",
        [reg.cashier_id, reg.opened_at, endTime]
      );

      let total_expenses = 0;
      let total_tunai_expenses = 0;
      let total_transfer_expenses = 0;

      expenses.forEach((e: any) => {
        const amt = Number(e.total || 0);
        total_expenses += amt;
        if (e.payment_method === 'cash') total_tunai_expenses += amt;
        if (e.payment_method === 'transfer') total_transfer_expenses += amt;
      });

      // Total Pemasukan = tunai + qris + transfer (Net payment amount after promo but before expenses)
      const total_pemasukan = total_tunai_sales + total_qris_sales + total_transfer_sales;

      const total_tunai = total_tunai_sales - total_tunai_expenses;
      const total_qris = total_qris_sales;
      const total_transfer = total_transfer_sales - total_transfer_expenses;

      // Total Keseluruhan = Saldo Awal + Pemasukan - Pengeluaran - Promo
      const total_keseluruhan = Number(reg.opening_balance || 0) + total_pemasukan - total_expenses - total_promo;

      res.json({
        register: reg,
        total_pemasukan,
        total_pengeluaran: total_expenses,
        total_promo,
        total_keseluruhan,
        saldo_bersih: total_keseluruhan,
        total_tunai,
        total_qris,
        total_transfer
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/cash-registers/close", async (req, res) => {
    try {
      const { id, closing_balance } = req.body;

      const [regRows]: any = await pool.query("SELECT * FROM cash_registers WHERE id = ?", [id]);
      if (regRows.length === 0) return res.status(404).json({ message: "Register not found" });
      const reg = regRows[0];

      const [sales]: any = await pool.query("SELECT SUM(total_amount) as total FROM transactions WHERE user_id = ? AND payment_method = 'cash' AND created_at >= ?", [reg.cashier_id, reg.opened_at]);
      const [expenses]: any = await pool.query("SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND payment_method = 'cash' AND date >= ?", [reg.cashier_id, reg.opened_at]);

      const expected_balance = Number(reg.opening_balance) + Number(sales[0].total || 0) - Number(expenses[0].total || 0);

      await pool.query(
        "UPDATE cash_registers SET closing_balance = ?, expected_balance = ?, closed_at = NOW(), status = 'closed' WHERE id = ?",
        [closing_balance, expected_balance, id]
      );
      res.json({ message: "Kasir berhasil ditutup" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Expense Routes
  app.post("/api/expenses", async (req, res) => {
    const { description, amount, expense_item_id, quantity, price, discount, user_id, payment_method } = req.body;
    try {
      const [result]: any = await pool.query(
        "INSERT INTO expenses (description, amount, expense_item_id, quantity, price, discount, user_id, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [description, amount, expense_item_id || null, quantity || 1, price || amount, discount || 0, user_id || null, payment_method || 'cash']
      );
      res.json({ id: result.insertId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM expenses WHERE id = ?", [req.params.id]);
      res.json({ message: "Expense deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Expense Items Routes
  app.get("/api/expense-items", async (req, res) => {
    try {
      const [items] = await pool.query("SELECT * FROM expense_items");
      res.json(items);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/expense-items", async (req, res) => {
    try {
      const [result]: any = await pool.query("INSERT INTO expense_items (name, price) VALUES (?, ?)", [
        req.body.name,
        req.body.price || 0
      ]);
      res.json({ id: result.insertId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.delete("/api/expense-items/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM expense_items WHERE id = ?", [req.params.id]);
      res.json({ message: "Deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Discounts Routes
  app.get("/api/discounts", async (req, res) => {
    try {
      const [discounts] = await pool.query("SELECT * FROM discounts");
      res.json(discounts);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/discounts", async (req, res) => {
    try {
      const [result]: any = await pool.query("INSERT INTO discounts (name, type, value) VALUES (?, ?, ?)", [req.body.name, req.body.type, req.body.value]);
      res.json({ id: result.insertId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.delete("/api/discounts/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM discounts WHERE id = ?", [req.params.id]);
      res.json({ message: "Deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Receipt Sub Headlines Routes
  app.get("/api/receipt-sub-headlines", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM receipt_sub_headlines ORDER BY id ASC");
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/receipt-sub-headlines", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ message: "Text sub-headline tidak boleh kosong" });
      }
      const [result]: any = await pool.query("INSERT INTO receipt_sub_headlines (text) VALUES (?)", [text.trim()]);
      res.json({ id: result.insertId, text: text.trim() });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/receipt-sub-headlines/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM receipt_sub_headlines WHERE id = ?", [req.params.id]);
      res.json({ message: "Deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Receipt Settings Routes
  app.get("/api/receipt-settings", async (req, res) => {
    try {
      const [rows]: any = await pool.query("SELECT * FROM receipt_settings WHERE id = 1");
      res.json(rows[0] || {
        headline: '@HD fried chicken',
        address: 'Jl. Raya Utama No. 45',
        phone: '0812-3456-7890',
        footer_text: 'Terima Kasih atas Kunjungan Anda!'
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/receipt-settings", async (req, res) => {
    const { headline, address, phone, footer_text } = req.body;
    try {
      await pool.query(
        "UPDATE receipt_settings SET headline = ?, address = ?, phone = ?, footer_text = ? WHERE id = 1",
        [headline, address, phone, footer_text]
      );
      res.json({ message: "Settings updated" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Users CRUD Routes (Admin only)
  app.get("/api/users", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT id, username, email, role FROM users ORDER BY id DESC");
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/users", async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const [result]: any = await pool.query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        [username, email || null, hashedPassword, role || 'cashier']
      );
      res.json({ id: result.insertId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
      if (password && password.trim()) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        await pool.query(
          "UPDATE users SET username = ?, email = ?, password = ?, role = ? WHERE id = ?",
          [username, email || null, hashedPassword, role, req.params.id]
        );
      } else {
        await pool.query(
          "UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?",
          [username, email || null, role, req.params.id]
        );
      }
      res.json({ message: "Updated" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      // Prevent deleting the main admin user
      const [rows]: any = await pool.query("SELECT * FROM users WHERE id = ?", [req.params.id]);
      if (rows.length > 0 && rows[0].username === 'admin') {
        return res.status(400).json({ message: "Cannot delete default admin user" });
      }
      await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
      res.json({ message: "Deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Inventory Materials Routes
  app.get("/api/inventory-materials", async (req, res) => {
    const { user_id } = req.query;
    try {
      if (user_id) {
        const [materials] = await pool.query(`
          SELECT m.id, m.name, m.unit, m.price, m.category_id, c.name as category_name, COALESCE(c.enable_stok_awal, 1) as enable_stok_awal, COALESCE(ums.stock, 0) as stock 
          FROM inventory_materials m
          LEFT JOIN user_material_stocks ums ON m.id = ums.material_id AND ums.user_id = ?
          LEFT JOIN material_categories c ON m.category_id = c.id
          ORDER BY m.sort_order ASC, m.id DESC
        `, [user_id]);
        res.json(materials);
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const [materials] = await pool.query(`
          SELECT 
            m.id, m.name, m.unit, m.price, m.category_id, m.sort_order,
            c.name as category_name, COALESCE(c.enable_stok_awal, 1) as enable_stok_awal,
            COALESCE(ws.stock_awal, m.stock) as stock_awal,
            COALESCE(ws.terjual, 0) as terjual,
            COALESCE(ws.retur, 0) as retur,
            COALESCE(ws.sisa_stock, m.stock) as sisa_stock,
            m.stock as stock
          FROM inventory_materials m
          LEFT JOIN material_categories c ON m.category_id = c.id
          LEFT JOIN warehouse_stocks ws ON ws.id = (
            SELECT id FROM warehouse_stocks 
            WHERE material_id = m.id AND DATE(created_at) = ? 
            ORDER BY id DESC LIMIT 1
          )
          ORDER BY m.sort_order ASC, m.id DESC
        `, [today]);
        res.json(materials);
      }
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/inventory-materials/reorder", async (req, res) => {
    const { order } = req.body;
    try {
      if (!Array.isArray(order)) return res.status(400).json({ message: "Invalid order array" });
      const queries = order.map((id, index) => 
        pool.query("UPDATE inventory_materials SET sort_order = ? WHERE id = ?", [index, id])
      );
      await Promise.all(queries);
      res.json({ message: "Order updated" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/inventory-materials", async (req, res) => {
    const { name, stock, unit, price, category_id } = req.body;
    try {
      const catId = category_id === "" || category_id === null || category_id === undefined ? null : Number(category_id);
      const [result]: any = await pool.query("INSERT INTO inventory_materials (name, stock, unit, price, category_id) VALUES (?, ?, ?, ?, ?)", [
        name,
        stock === "" || stock === null ? 0 : stock,
        unit || 'pcs',
        price === "" || price === null ? 0 : price,
        catId
      ]);
      res.json({ id: result.insertId });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/inventory-materials/:id", async (req, res) => {
    const { name, stock, unit, price, category_id } = req.body;
    try {
      const catId = category_id === "" || category_id === null || category_id === undefined ? null : Number(category_id);
      await pool.query("UPDATE inventory_materials SET name = ?, stock = ?, unit = ?, price = ?, category_id = ? WHERE id = ?", [
        name,
        stock === "" || stock === null ? 0 : stock,
        unit || 'pcs',
        price === "" || price === null ? 0 : price,
        catId,
        req.params.id
      ]);
      res.json({ message: "Updated" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/inventory-materials/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM inventory_materials WHERE id = ?", [req.params.id]);
      res.json({ message: "Deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Stock Requests Routes
  app.get("/api/stock-requests", async (req, res) => {
    const { user_id, date, startDate, endDate } = req.query;
    try {
      let query = `
        SELECT sr.*, m.name as material_name, u.username as cashier_name 
        FROM stock_requests sr 
        JOIN inventory_materials m ON sr.material_id = m.id
        LEFT JOIN users u ON sr.user_id = u.id
      `;
      const conditions: string[] = [];
      const params: any[] = [];

      if (user_id) {
        conditions.push("sr.user_id = ?");
        params.push(user_id);
      }
      if (date) {
        conditions.push("DATE(sr.created_at) = ?");
        params.push(date);
      }
      if (startDate && endDate) {
        conditions.push("DATE(sr.created_at) BETWEEN ? AND ?");
        params.push(startDate, endDate);
      } else if (startDate) {
        conditions.push("DATE(sr.created_at) >= ?");
        params.push(startDate);
      } else if (endDate) {
        conditions.push("DATE(sr.created_at) <= ?");
        params.push(endDate);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
      query += " ORDER BY sr.created_at DESC";

      const [requests] = await pool.query(query, params);
      res.json(requests);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/stock-requests", async (req, res) => {
    try {
      const { items, material_id, quantity, user_id, price, total_price, payment_method } = req.body;
      if (items && Array.isArray(items)) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          for (const item of items) {
            await connection.query("INSERT INTO stock_requests (material_id, quantity, user_id, price, total_price, payment_method) VALUES (?, ?, ?, ?, ?, ?)", [
              item.material_id,
              item.quantity,
              user_id || null,
              item.price || 0,
              item.total_price || (item.quantity * (item.price || 0)),
              item.payment_method || 'cash'
            ]);
          }
          await connection.commit();
          res.json({ message: "Permintaan stok berhasil dikirim!" });
        } catch (e: any) {
          await connection.rollback();
          res.status(500).json({ message: e.message });
        } finally {
          connection.release();
        }
      } else {
        const [result]: any = await pool.query("INSERT INTO stock_requests (material_id, quantity, user_id, price, total_price, payment_method) VALUES (?, ?, ?, ?, ?, ?)", [
          material_id,
          quantity,
          user_id || null,
          price || 0,
          total_price || (quantity * (price || 0)),
          payment_method || 'cash'
        ]);
        res.json({ id: result.insertId });
      }
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/stock-requests/:id", async (req: any, res: any) => {
    const { status, approved_quantity } = req.body;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows]: any = await connection.query("SELECT * FROM stock_requests WHERE id = ?", [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Stock request not found" });
      }
      const request = rows[0];

      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Stock request is already processed" });
      }

      if (status === 'approved') {
        const finalQty = approved_quantity !== undefined && approved_quantity !== null ? Number(approved_quantity) : request.quantity;
        const finalTotal = finalQty * (request.price || 0);

        await connection.query(
          "UPDATE stock_requests SET status = ?, approved_quantity = ?, total_price = ? WHERE id = ?",
          [status, finalQty, finalTotal, req.params.id]
        );

        await connection.query(`
          INSERT INTO user_material_stocks (user_id, material_id, stock)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE stock = stock + ?
        `, [request.user_id, request.material_id, finalQty, finalQty]);

        // Update daily warehouse stocks
        const today = new Date().toISOString().slice(0, 10);
        const stockEntry = await ensureWarehouseStockForMaterial(connection, request.material_id, today);

        // Deduct stock from warehouse materials stock
        await connection.query(`
          UPDATE inventory_materials SET stock = stock - ? WHERE id = ?
        `, [finalQty, request.material_id]);

        await connection.query(`
          UPDATE warehouse_stocks
          SET terjual = terjual + ?, sisa_stock = sisa_stock - ?
          WHERE id = ?
        `, [finalQty, finalQty, stockEntry.id]);

        // Get details for warehouse cash flow description
        const [userRows]: any = await connection.query("SELECT username FROM users WHERE id = ?", [request.user_id]);
        const cashierName = userRows[0]?.username || "Kasir";
        const [materialRows]: any = await connection.query("SELECT name FROM inventory_materials WHERE id = ?", [request.material_id]);
        const materialName = materialRows[0]?.name || "Baku";

        // Log in warehouse cash flow (income)
        await connection.query(`
          INSERT INTO warehouse_cash_flow (type, amount, description, payment_method, ref_id)
          VALUES ('income', ?, ?, ?, ?)
        `, [
          finalTotal,
          `Permintaan Stok Disetujui: ${materialName} x${finalQty} (${cashierName})`,
          request.payment_method || 'cash',
          request.id
        ]);
      } else {
        await connection.query("UPDATE stock_requests SET status = ? WHERE id = ?", [status, req.params.id]);
      }

      await connection.commit();
      res.json({ message: `Stock request updated to ${status}` });
    } catch (e: any) {
      await connection.rollback();
      res.status(500).json({ message: e.message });
    } finally {
      connection.release();
    }
  });

  app.get("/api/cashier-running-stocks", async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT ums.*, u.username as cashier_name, m.name as material_name, m.unit 
        FROM user_material_stocks ums
        JOIN users u ON ums.user_id = u.id
        JOIN inventory_materials m ON ums.material_id = m.id
        ORDER BY u.username, m.name
      `);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Cashier Stocks Routes
  app.get("/api/cashier-stocks", async (req, res) => {
    const { cash_register_id, user_id, date, startDate, endDate } = req.query;
    try {
      let query = `
        SELECT cs.*, m.name as material_name, u.username as cashier_name 
        FROM cashier_stocks cs
        JOIN inventory_materials m ON cs.material_id = m.id
        LEFT JOIN users u ON cs.user_id = u.id
      `;
      const conditions: string[] = [];
      const params: any[] = [];

      if (cash_register_id) {
        conditions.push("cs.cash_register_id = ?");
        params.push(cash_register_id);
      }
      if (user_id) {
        conditions.push("cs.user_id = ?");
        params.push(user_id);
      }
      if (date) {
        conditions.push("DATE(cs.created_at) = ?");
        params.push(date);
      }
      if (startDate && endDate) {
        conditions.push("DATE(cs.created_at) BETWEEN ? AND ?");
        params.push(startDate, endDate);
      } else if (startDate) {
        conditions.push("DATE(cs.created_at) >= ?");
        params.push(startDate);
      } else if (endDate) {
        conditions.push("DATE(cs.created_at) <= ?");
        params.push(endDate);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
      query += " ORDER BY cs.created_at DESC";
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/cashier-stocks", async (req: any, res: any) => {
    const { cash_register_id, user_id, items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (cash_register_id) {
        await connection.query("DELETE FROM cashier_stocks WHERE cash_register_id = ?", [cash_register_id]);
      }

      for (const item of items) {
        const { material_id, stock_awal, masuk, tosser_in, tosser_out, terpakai, terbuang, sisa_stock } = item;
        await connection.query(`
          INSERT INTO cashier_stocks (user_id, cash_register_id, material_id, stock_awal, masuk, tosser_in, tosser_out, terpakai, terbuang, sisa_stock)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user_id,
          cash_register_id || null,
          material_id,
          stock_awal || 0,
          masuk || 0,
          tosser_in || 0,
          tosser_out || 0,
          terpakai || 0,
          terbuang || 0,
          sisa_stock || 0
        ]);

        await connection.query(`
          INSERT INTO user_material_stocks (user_id, material_id, stock)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE stock = ?
        `, [
          user_id,
          material_id,
          sisa_stock || 0,
          sisa_stock || 0
        ]);
      }

      await connection.commit();
      res.json({ message: "Stock cashier berhasil disimpan" });
    } catch (e: any) {
      await connection.rollback();
      res.status(500).json({ message: e.message });
    } finally {
      connection.release();
    }
  });

  // Open Bill Routes
  app.get("/api/open-bills", async (req, res) => {
    try {
      const [bills]: any = await pool.query("SELECT * FROM open_bills ORDER BY created_at DESC");
      res.json(bills.map((b: any) => ({ ...b, items: JSON.parse(b.items) })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/open-bills", async (req, res) => {
    const { table_name, customer_name, items } = req.body;
    try {
      const [result]: any = await pool.query("INSERT INTO open_bills (table_name, customer_name, items) VALUES (?, ?, ?)", [
        table_name || '', customer_name || '', JSON.stringify(items)
      ]);
      res.json({ id: result.insertId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/open-bills/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM open_bills WHERE id = ?", [req.params.id]);
      res.json({ message: "Bill deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Warehouse Stocks Routes
  app.get("/api/warehouse-stocks/latest", async (req, res) => {
    try {
      // Get the latest warehouse_stocks entry for each material
      const [rows]: any = await pool.query(`
        SELECT ws.*, m.name as material_name, m.unit 
        FROM warehouse_stocks ws
        JOIN inventory_materials m ON ws.material_id = m.id
        WHERE ws.id IN (
          SELECT MAX(id) FROM warehouse_stocks GROUP BY material_id
        )
      `);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/warehouse-stocks", async (req: any, res: any) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const today = new Date().toISOString().slice(0, 10);

      for (const item of items) {
        const { material_id, stock_awal, masuk, terpakai, terbuang, terjual, retur, sisa_stock } = item;
        
        const [existing]: any = await connection.query(
          "SELECT id FROM warehouse_stocks WHERE material_id = ? AND DATE(created_at) = ? LIMIT 1",
          [material_id, today]
        );

        if (existing.length > 0) {
          await connection.query(`
            UPDATE warehouse_stocks 
            SET stock_awal = ?, masuk = ?, terpakai = ?, terbuang = ?, terjual = ?, retur = ?, sisa_stock = ?
            WHERE id = ?
          `, [
            stock_awal || 0,
            masuk || 0,
            terpakai || 0,
            terbuang || 0,
            terjual || 0,
            retur || 0,
            sisa_stock || 0,
            existing[0].id
          ]);
        } else {
          await connection.query(`
            INSERT INTO warehouse_stocks (material_id, stock_awal, masuk, terpakai, terbuang, terjual, retur, sisa_stock)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            material_id,
            stock_awal || 0,
            masuk || 0,
            terpakai || 0,
            terbuang || 0,
            terjual || 0,
            retur || 0,
            sisa_stock || 0
          ]);
        }

        await connection.query(`
          UPDATE inventory_materials SET stock = ? WHERE id = ?
        `, [
          sisa_stock || 0,
          material_id
        ]);
      }

      await connection.commit();
      res.json({ message: "Stok gudang berhasil disimpan" });
    } catch (e: any) {
      await connection.rollback();
      res.status(500).json({ message: e.message });
    } finally {
      connection.release();
    }
  });

  const ensureWarehouseStockForMaterial = async (connection: any, materialId: number, targetDate?: string) => {
    const lookupDate = targetDate || new Date().toISOString().slice(0, 10);
    const [existingRows]: any = await connection.query(`
      SELECT id, stock_awal, masuk, terpakai, terbuang, terjual, retur, sisa_stock
      FROM warehouse_stocks
      WHERE material_id = ? AND DATE(created_at) = ?
      ORDER BY id DESC
      LIMIT 1
    `, [materialId, lookupDate]);

    if (existingRows.length > 0) {
      return existingRows[0];
    }

    const [matRows]: any = await connection.query("SELECT stock FROM inventory_materials WHERE id = ?", [materialId]);
    const currentStock = matRows[0]?.stock || 0;

    const [insertResult]: any = await connection.query(`
      INSERT INTO warehouse_stocks (material_id, stock_awal, masuk, terpakai, terbuang, terjual, retur, sisa_stock)
      VALUES (?, ?, 0, 0, 0, 0, 0, ?)
    `, [materialId, currentStock, currentStock]);

    return {
      id: insertResult.insertId,
      stock_awal: currentStock,
      masuk: 0,
      terpakai: 0,
      terbuang: 0,
      terjual: 0,
      retur: 0,
      sisa_stock: currentStock
    };
  };

  // Vendors Routes
  app.get("/api/vendors", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM vendors ORDER BY name ASC");
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/vendors", async (req: any, res: any) => {
    const { code, name } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: "Kode vendor dan Nama vendor harus diisi" });
    }
    try {
      await pool.query("INSERT INTO vendors (code, name) VALUES (?, ?)", [code.trim(), name.trim()]);
      res.json({ message: "Vendor berhasil ditambahkan" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/vendors/:id", async (req: any, res: any) => {
    const { code, name } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: "Kode vendor dan Nama vendor harus diisi" });
    }
    try {
      await pool.query("UPDATE vendors SET code = ?, name = ? WHERE id = ?", [code.trim(), name.trim(), req.params.id]);
      res.json({ message: "Vendor berhasil diubah" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/vendors/:id", async (req: any, res: any) => {
    try {
      await pool.query("DELETE FROM vendors WHERE id = ?", [req.params.id]);
      res.json({ message: "Vendor berhasil dihapus" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Vendor Items Routes
  app.get("/api/vendor-items", async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT vi.*, v.code as vendor_code, v.name as vendor_name, m.name as material_name, m.unit 
        FROM vendor_items vi
        LEFT JOIN vendors v ON vi.vendor_id = v.id
        LEFT JOIN inventory_materials m ON vi.material_id = m.id
        ORDER BY vi.name ASC
      `);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/vendor-items", async (req: any, res: any) => {
    const { name, vendor_id, material_id } = req.body;
    if (!name || !vendor_id || !material_id) {
      return res.status(400).json({ message: "Nama barang, Vendor, dan Bahan Baku harus diisi" });
    }
    try {
      await pool.query(`
        INSERT INTO vendor_items (name, vendor_id, material_id)
        VALUES (?, ?, ?)
      `, [name.trim(), vendor_id, material_id]);
      res.json({ message: "Barang vendor berhasil ditambahkan" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/vendor-items/:id", async (req: any, res: any) => {
    const { name, vendor_id, material_id } = req.body;
    if (!name || !vendor_id || !material_id) {
      return res.status(400).json({ message: "Nama barang, Vendor, dan Bahan Baku harus diisi" });
    }
    try {
      await pool.query(`
        UPDATE vendor_items SET name = ?, vendor_id = ?, material_id = ? WHERE id = ?
      `, [name.trim(), vendor_id, material_id, req.params.id]);
      res.json({ message: "Barang vendor berhasil diubah" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/vendor-items/:id", async (req: any, res: any) => {
    try {
      await pool.query("DELETE FROM vendor_items WHERE id = ?", [req.params.id]);
      res.json({ message: "Barang vendor berhasil dihapus" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Vendor Stock Requests (Purchases) Routes
  app.get("/api/vendor-stock-requests", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let query = `
        SELECT vs.*, vi.name as vendor_item_name, v.code as vendor_code, v.name as vendor_name, m.name as material_name, m.unit 
        FROM vendor_stock_requests vs
        LEFT JOIN vendor_items vi ON vs.vendor_item_id = vi.id
        LEFT JOIN vendors v ON vi.vendor_id = v.id
        LEFT JOIN inventory_materials m ON vs.material_id = m.id
      `;
      const params = [];
      if (startDate && endDate) {
        query += ` WHERE DATE(vs.created_at) BETWEEN ? AND ? `;
        params.push(startDate, endDate);
      }
      query += ` ORDER BY vs.created_at DESC `;
      
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/vendor-stock-requests", async (req: any, res: any) => {
    const { vendor_item_id, quantity, price, payment_method } = req.body;
    if (!vendor_item_id || !quantity || !price) {
      return res.status(400).json({ message: "Barang vendor, Qty, dan Harga harus diisi" });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get vendor item to find material_id and vendor info
      const [viRows]: any = await connection.query(`
        SELECT vi.id, vi.name, vi.material_id, v.code as vendor_code, v.name as vendor_name 
        FROM vendor_items vi 
        LEFT JOIN vendors v ON vi.vendor_id = v.id
        WHERE vi.id = ?
      `, [vendor_item_id]);

      if (viRows.length === 0) {
        throw new Error("Barang vendor tidak ditemukan");
      }

      const vendorItem = viRows[0];
      const material_id = vendorItem.material_id;

      if (!material_id) {
        throw new Error("Barang vendor ini tidak terhubung ke bahan baku gudang");
      }

      const total_price = quantity * price;

      const [result]: any = await connection.query(`
        INSERT INTO vendor_stock_requests (material_id, vendor_item_id, quantity, price, total_price, payment_method)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        material_id,
        vendor_item_id,
        quantity,
        price,
        total_price,
        payment_method || 'cash'
      ]);
      const reqId = result.insertId;

      // Restock warehouse material
      await connection.query(`
        UPDATE inventory_materials SET stock = stock + ? WHERE id = ?
      `, [quantity, material_id]);

      const today = new Date().toISOString().slice(0, 10);
      const stockEntry = await ensureWarehouseStockForMaterial(connection, material_id, today);
      await connection.query(`
        UPDATE warehouse_stocks
        SET stock_awal = stock_awal + ?, masuk = masuk + ?, sisa_stock = sisa_stock + ?
        WHERE id = ?
      `, [quantity, quantity, quantity, stockEntry.id]);

      const expenseDesc = `Pembelian Vendor: ${vendorItem.name} (${vendorItem.vendor_name || 'Vendor'}) x${quantity}`;

      // Log in warehouse cash flow
      await connection.query(`
        INSERT INTO warehouse_cash_flow (type, amount, description, payment_method, ref_id)
        VALUES ('expense', ?, ?, ?, ?)
      `, [
        total_price,
        expenseDesc,
        payment_method || 'cash',
        reqId
      ]);

      await connection.commit();
      res.json({ message: "Pembelian vendor berhasil dicatat!" });
    } catch (e: any) {
      await connection.rollback();
      res.status(500).json({ message: e.message });
    } finally {
      connection.release();
    }
  });

  app.delete("/api/vendor-stock-requests/:id", async (req: any, res: any) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Find request info
      const [reqRows]: any = await connection.query(`
        SELECT material_id, quantity, DATE(created_at) as req_date FROM vendor_stock_requests WHERE id = ?
      `, [req.params.id]);

      if (reqRows.length > 0) {
        const { material_id, quantity, req_date } = reqRows[0];
        // Subtract stock back
        await connection.query(`
          UPDATE inventory_materials SET stock = GREATEST(0, stock - ?) WHERE id = ?
        `, [quantity, material_id]);

        const stockEntry = await ensureWarehouseStockForMaterial(connection, material_id, req_date);
        await connection.query(`
          UPDATE warehouse_stocks
          SET stock_awal = GREATEST(0, stock_awal - ?), masuk = GREATEST(0, masuk - ?), sisa_stock = GREATEST(0, sisa_stock - ?)
          WHERE id = ?
        `, [quantity, quantity, quantity, stockEntry.id]);
      }

      // Delete request
      await connection.query("DELETE FROM vendor_stock_requests WHERE id = ?", [req.params.id]);

      // Delete expense in cash flow
      await connection.query("DELETE FROM warehouse_cash_flow WHERE ref_id = ? AND type = 'expense'", [req.params.id]);

      await connection.commit();
      res.json({ message: "Pembelian vendor berhasil dihapus/dibatalkan!" });
    } catch (e: any) {
      await connection.rollback();
      res.status(500).json({ message: e.message });
    } finally {
      connection.release();
    }
  });

  // Offline Returns Routes
  app.get("/api/offline-returns", async (req, res) => {
    try {
      const { startDate, endDate, user_id } = req.query;
      let query = `
        SELECT r.*, m.name as material_name, m.unit, m.price as material_price, u.username as cashier_name 
        FROM offline_returns r
        JOIN inventory_materials m ON r.material_id = m.id
        JOIN users u ON r.cashier_id = u.id
        WHERE 1=1
      `;
      const params = [];
      if (startDate && endDate) {
        query += ` AND DATE(r.created_at) BETWEEN ? AND ? `;
        params.push(startDate, endDate);
      }
      if (user_id) {
        query += ` AND r.cashier_id = ? `;
        params.push(user_id);
      }
      query += ` ORDER BY r.created_at DESC `;
      
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/offline-returns", async (req: any, res: any) => {
    const { material_id, cashier_id, quantity, condition_status, added_to_input } = req.body;
    if (!material_id || !cashier_id || !quantity || !condition_status) {
      return res.status(400).json({ message: "Semua field harus diisi" });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Log the offline return
      const [result]: any = await connection.query(`
        INSERT INTO offline_returns (material_id, cashier_id, quantity, condition_status, added_to_input)
        VALUES (?, ?, ?, ?, ?)
      `, [
        material_id,
        cashier_id,
        quantity,
        condition_status,
        added_to_input ? 1 : 0
      ]);
      const returnId = result.insertId;

      // 2. Reduce cashier's stock (user_material_stocks)
      await connection.query(`
        UPDATE user_material_stocks 
        SET stock = GREATEST(0, stock - ?) 
        WHERE user_id = ? AND material_id = ?
      `, [quantity, cashier_id, material_id]);

      // 3. If condition is tidak_layak (broken), record as expense (loss) in warehouse_cash_flow
      if (condition_status === 'tidak_layak') {
        // Get material info for price and name
        const [matRows]: any = await connection.query(`
          SELECT name, price FROM inventory_materials WHERE id = ?
        `, [material_id]);
        const matName = matRows[0]?.name || "Bahan Baku";
        const matPrice = matRows[0]?.price || 0;
        const lossAmount = quantity * matPrice;

        // Log loss in warehouse cash flow
        await connection.query(`
          INSERT INTO warehouse_cash_flow (type, amount, description, payment_method, ref_id)
          VALUES ('loss', ?, ?, 'cash', ?)
        `, [
          lossAmount,
          `Kerugian Barang Rusak (Offline Return): ${matName} x${quantity}`,
          returnId
        ]);
      }

      await connection.commit();
      res.json({ message: "Retur offline berhasil diproses!" });
    } catch (e: any) {
      await connection.rollback();
      res.status(500).json({ message: e.message });
    } finally {
      connection.release();
    }
  });

  // Warehouse Cash Flow Route
  app.get("/api/reports/warehouse-cash-flow", async (req, res) => {
    try {
      const { date, month, year, startDate, endDate } = req.query;
      let params: any[] = [];
      let conditions: string[] = ["1=1"];

      if (date) {
        conditions.push("DATE(date) = ?");
        params.push(date);
      } else {
        if (month) {
          conditions.push("MONTH(date) = ?");
          params.push(month);
        }
        if (year) {
          conditions.push("YEAR(date) = ?");
          params.push(year);
        }
      }
      if (startDate && endDate) {
        conditions.push("DATE(date) BETWEEN ? AND ?");
        params.push(startDate, endDate);
      }

      const query = `
        SELECT id, type, amount, date, description, payment_method 
        FROM warehouse_cash_flow 
        WHERE ${conditions.join(" AND ")}
        ORDER BY date DESC
      `;
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Stock Transfer Routes
  app.post("/api/stock-transfers", async (req, res) => {
    const { sender_id, receiver_id, material_id, quantity } = req.body;
    if (!sender_id || !receiver_id || !material_id || !quantity || quantity <= 0) {
      return res.status(400).json({ message: "Data transfer tidak valid." });
    }
    if (Number(sender_id) === Number(receiver_id)) {
      return res.status(400).json({ message: "Tidak dapat mentransfer ke outlet sendiri." });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Check sender's stock
      const [senderStockRows]: any = await connection.query(
        "SELECT stock FROM user_material_stocks WHERE user_id = ? AND material_id = ?",
        [sender_id, material_id]
      );
      const senderStock = senderStockRows[0]?.stock || 0;
      if (senderStock < quantity) {
        return res.status(400).json({ message: "Stok tidak mencukupi untuk transfer." });
      }

      // 2. Reduce sender's stock
      await connection.query(
        "UPDATE user_material_stocks SET stock = stock - ? WHERE user_id = ? AND material_id = ?",
        [quantity, sender_id, material_id]
      );

      // 3. Update cashier_stocks for sender (if active register exists)
      const [senderRegRows]: any = await connection.query(
        "SELECT id FROM cash_registers WHERE cashier_id = ? AND status = 'open' LIMIT 1",
        [sender_id]
      );
      if (senderRegRows.length > 0) {
        const senderRegId = senderRegRows[0].id;
        const [senderStockRows]: any = await connection.query(
          "SELECT id FROM cashier_stocks WHERE user_id = ? AND cash_register_id = ? AND material_id = ?",
          [sender_id, senderRegId, material_id]
        );
        if (senderStockRows.length > 0) {
          await connection.query(`
            UPDATE cashier_stocks 
            SET tosser_out = tosser_out + ?,
                sisa_stock = GREATEST(0, sisa_stock - ?)
            WHERE user_id = ? AND cash_register_id = ? AND material_id = ?
          `, [quantity, quantity, sender_id, senderRegId, material_id]);
        } else {
          // Initialize with current senderStock (which was before the transfer was completed)
          await connection.query(`
            INSERT INTO cashier_stocks (user_id, cash_register_id, material_id, stock_awal, masuk, tosser_in, tosser_out, terpakai, terbuang, sisa_stock)
            VALUES (?, ?, ?, ?, 0, 0, ?, 0, 0, ?)
          `, [sender_id, senderRegId, material_id, senderStock, quantity, senderStock - quantity]);
        }
      }

      // 4. Record transfer log with status = 'pending'
      await connection.query(
        "INSERT INTO stock_transfers (sender_id, receiver_id, material_id, quantity, status) VALUES (?, ?, ?, ?, 'pending')",
        [sender_id, receiver_id, material_id, quantity]
      );

      await connection.commit();
      res.json({ message: "Transfer stok berhasil dikirim, menunggu approval outlet tujuan!" });
    } catch (e: any) {
      await connection.rollback();
      res.status(500).json({ message: e.message });
    } finally {
      connection.release();
    }
  });

  app.get("/api/stock-transfers", async (req, res) => {
    const { sender_id, receiver_id, startDate, endDate } = req.query;
    try {
      let query = '';
      const params = [];
      if (sender_id) {
        query = `
          SELECT t.id, t.created_at, t.quantity, t.status, m.name as material_name, m.unit as material_unit, u.username as receiver_name
          FROM stock_transfers t
          JOIN inventory_materials m ON t.material_id = m.id
          JOIN users u ON t.receiver_id = u.id
          WHERE t.sender_id = ?
        `;
        params.push(sender_id);
      } else if (receiver_id) {
        query = `
          SELECT t.id, t.created_at, t.quantity, t.status, m.name as material_name, m.unit as material_unit, u.username as sender_name
          FROM stock_transfers t
          JOIN inventory_materials m ON t.material_id = m.id
          JOIN users u ON t.sender_id = u.id
          WHERE t.receiver_id = ?
        `;
        params.push(receiver_id);
      } else {
        return res.status(400).json({ message: "sender_id atau receiver_id wajib diisi." });
      }

      if (startDate && endDate) {
        query += ` AND DATE(t.created_at) BETWEEN ? AND ? `;
        params.push(startDate, endDate);
      }

      query += ` ORDER BY t.created_at DESC `;

      const [rows] = await pool.query(query, params);
      return res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/stock-transfers/:id/status", async (req, res) => {
    const { status } = req.body;
    const transferId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Status tidak valid." });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Fetch transfer details and check status
      const [transferRows]: any = await connection.query(
        "SELECT * FROM stock_transfers WHERE id = ?",
        [transferId]
      );
      if (transferRows.length === 0) {
        return res.status(404).json({ message: "Transfer tidak ditemukan." });
      }
      const transfer = transferRows[0];
      if (transfer.status !== 'pending') {
        return res.status(400).json({ message: "Transfer ini sudah diproses." });
      }

      // 2. Update status of the transfer
      await connection.query(
        "UPDATE stock_transfers SET status = ? WHERE id = ?",
        [status, transferId]
      );

      if (status === 'approved') {
        // Increment receiver's stock
        await connection.query(`
          INSERT INTO user_material_stocks (user_id, material_id, stock)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE stock = stock + ?
        `, [transfer.receiver_id, transfer.material_id, transfer.quantity, transfer.quantity]);

        // Update receiver's cashier_stocks (if active register exists)
        const [receiverRegRows]: any = await connection.query(
          "SELECT id FROM cash_registers WHERE cashier_id = ? AND status = 'open' LIMIT 1",
          [transfer.receiver_id]
        );
        if (receiverRegRows.length > 0) {
          const receiverRegId = receiverRegRows[0].id;
          // Check if a cashier_stocks row exists for receiver
          const [receiverStockRows]: any = await connection.query(
            "SELECT id FROM cashier_stocks WHERE user_id = ? AND cash_register_id = ? AND material_id = ?",
            [transfer.receiver_id, receiverRegId, transfer.material_id]
          );
          if (receiverStockRows.length > 0) {
            await connection.query(`
              UPDATE cashier_stocks 
              SET tosser_in = tosser_in + ?,
                  sisa_stock = sisa_stock + ?
              WHERE user_id = ? AND cash_register_id = ? AND material_id = ?
            `, [transfer.quantity, transfer.quantity, transfer.receiver_id, receiverRegId, transfer.material_id]);
          } else {
            // Get current user stock
            const [uStockRows]: any = await connection.query(
              "SELECT stock FROM user_material_stocks WHERE user_id = ? AND material_id = ?",
              [transfer.receiver_id, transfer.material_id]
            );
            const currentStock = uStockRows[0]?.stock || 0;
            // Before adding this transfer, the receiver's stock was (currentStock - transfer.quantity)
            const stockAwal = Math.max(0, currentStock - transfer.quantity);
            await connection.query(`
              INSERT INTO cashier_stocks (user_id, cash_register_id, material_id, stock_awal, masuk, tosser_in, tosser_out, terpakai, terbuang, sisa_stock)
              VALUES (?, ?, ?, ?, 0, ?, 0, 0, 0, ?)
            `, [transfer.receiver_id, receiverRegId, transfer.material_id, stockAwal, transfer.quantity, currentStock]);
          }
        }
      } else if (status === 'rejected') {
        // Return/refund stock to the sender
        await connection.query(`
          INSERT INTO user_material_stocks (user_id, material_id, stock)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE stock = stock + ?
        `, [transfer.sender_id, transfer.material_id, transfer.quantity, transfer.quantity]);

        // Update sender's cashier_stocks (if active register exists)
        const [senderRegRows]: any = await connection.query(
          "SELECT id FROM cash_registers WHERE cashier_id = ? AND status = 'open' LIMIT 1",
          [transfer.sender_id]
        );
        if (senderRegRows.length > 0) {
          const senderRegId = senderRegRows[0].id;
          // Check if a cashier_stocks row exists for sender
          const [senderStockRows]: any = await connection.query(
            "SELECT id FROM cashier_stocks WHERE user_id = ? AND cash_register_id = ? AND material_id = ?",
            [transfer.sender_id, senderRegId, transfer.material_id]
          );
          if (senderStockRows.length > 0) {
            await connection.query(`
              UPDATE cashier_stocks 
              SET tosser_out = GREATEST(0, tosser_out - ?),
                  sisa_stock = sisa_stock + ?
              WHERE user_id = ? AND cash_register_id = ? AND material_id = ?
            `, [transfer.quantity, transfer.quantity, transfer.sender_id, senderRegId, transfer.material_id]);
          }
        }
      }

      await connection.commit();
      res.json({ message: `Transfer berhasil ${status === 'approved' ? 'diterima' : 'ditolak'}!` });
    } catch (e: any) {
      await connection.rollback();
      res.status(500).json({ message: e.message });
    } finally {
      connection.release();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

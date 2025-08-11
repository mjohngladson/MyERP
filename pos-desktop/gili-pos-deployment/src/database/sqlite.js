const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

let db;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'gili-pos.db');
}

async function initDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = getDbPath();
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
      } else {
        console.log('Connected to SQLite database at:', dbPath);
        createTables().then(resolve).catch(reject);
      }
    });
  });
}

async function createTables() {
  const tables = [
    // Products table
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      barcode TEXT,
      price REAL NOT NULL,
      category TEXT,
      stock_quantity INTEGER DEFAULT 0,
      description TEXT,
      image_url TEXT,
      active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0,
      server_id TEXT
    )`,
    
    // Customers table
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0,
      server_id TEXT
    )`,
    
    // Transactions table
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_details TEXT,
      status TEXT DEFAULT 'completed',
      receipt_number TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0,
      server_id TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )`,
    
    // Transaction items table (detailed line items)
    `CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount_percent REAL DEFAULT 0,
      line_total REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(transaction_id) REFERENCES transactions(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`,
    
    // Sync log table
    `CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      record_id TEXT NOT NULL,
      sync_status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT
    )`,
    
    // Settings table
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const tableSQL of tables) {
    await new Promise((resolve, reject) => {
      db.run(tableSQL, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Create indexes for better performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
    'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(sync_status)'
  ];

  for (const indexSQL of indexes) {
    await new Promise((resolve, reject) => {
      db.run(indexSQL, (err) => {
        if (err) {
          console.error('Error creating index:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Insert default settings
  await insertDefaultSettings();
  
  console.log('✅ Database tables created successfully');
}

async function insertDefaultSettings() {
  const defaultSettings = [
    ['server_url', 'https://api-production-8536.up.railway.app'],
    ['store_name', 'GiLi Store'],
    ['store_address', ''],
    ['receipt_footer', 'Thank you for your business!'],
    ['tax_rate', '0.10'],
    ['currency', 'USD'],
    ['auto_sync', 'true'],
    ['printer_name', ''],
    ['cash_drawer_port', '']
  ];

  for (const [key, value] of defaultSettings) {
    await new Promise((resolve) => {
      db.run(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        [key, value],
        () => resolve()
      );
    });
  }
}

function getDatabase() {
  return db;
}

function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
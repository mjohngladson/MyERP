const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { initDatabase } = require('./src/database/sqlite');
const { SyncManager } = require('./src/sync/syncManager');
const { HardwareManager } = require('./src/hardware/hardwareManager');

let mainWindow;
let syncManager;
let hardwareManager;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'GiLi Point of Sale',
    show: false
  });

  // Load the app
  mainWindow.loadFile('src/renderer/index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeApp() {
  try {
    // Initialize SQLite database
    await initDatabase();
    console.log('✅ Database initialized');

    // Initialize sample data
    const { initializeSampleData } = require('./src/data/sampleData');
    const { getDatabase } = require('./src/database/sqlite');
    await initializeSampleData(getDatabase());

    // Initialize sync manager
    syncManager = new SyncManager();
    await syncManager.initialize();
    console.log('✅ Sync manager initialized');

    // Initialize hardware manager
    hardwareManager = new HardwareManager();
    await hardwareManager.initialize();
    console.log('✅ Hardware manager initialized');

    createWindow();
  } catch (error) {
    console.error('❌ Error initializing app:', error);
  }
}

// App event handlers
app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for PoS operations
ipcMain.handle('pos:get-products', async () => {
  const db = require('./src/database/sqlite').getDatabase();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products WHERE active = 1', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('pos:create-transaction', async (event, transactionData) => {
  const db = require('./src/database/sqlite').getDatabase();
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO transactions (id, items, total, payment_method, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      transactionData.id,
      JSON.stringify(transactionData.items),
      transactionData.total,
      transactionData.payment_method,
      'completed',
      new Date().toISOString()
    ], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, transaction_id: transactionData.id });
    });
  });
});

ipcMain.handle('pos:print-receipt', async (event, receiptData) => {
  if (hardwareManager) {
    return await hardwareManager.printReceipt(receiptData);
  }
  throw new Error('Hardware manager not initialized');
});

// Updated and enhanced sync handlers for full GiLi integration
ipcMain.handle('pos:get-device-id', async () => {
  if (syncManager) {
    return syncManager.deviceId;
  }
  return 'unknown-device';
});

ipcMain.handle('pos:check-connection', async () => {
  if (syncManager) {
    const isOnline = await syncManager.checkConnection();
    return { 
      online: isOnline,
      serverUrl: syncManager.serverUrl,
      deviceId: syncManager.deviceId 
    };
  }
  return { online: false, error: 'Sync manager not initialized' };
});

ipcMain.handle('pos:sync-all', async () => {
  if (syncManager) {
    try {
      const result = await syncManager.syncAll();
      return result;
    } catch (error) {
      console.error('❌ IPC sync-all failed:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Sync manager not initialized' };
});

ipcMain.handle('pos:sync-data', async () => {
  // Legacy handler for backward compatibility
  return ipcMain.handle('pos:sync-all');
});

ipcMain.handle('pos:get-sync-status', async () => {
  if (syncManager) {
    return await syncManager.getSyncStatus();
  }
  return { online: false, lastSync: null };
});

ipcMain.handle('pos:get-sync-stats', async () => {
  if (syncManager) {
    const db = require('./src/database/sqlite').getDatabase();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM transactions WHERE synced = 0',
        (err, row) => {
          if (err) {
            resolve({ pendingTransactions: 0, error: err.message });
          } else {
            resolve({ 
              pendingTransactions: row?.count || 0,
              deviceId: syncManager.deviceId,
              lastSync: syncManager.lastSyncTime,
              isOnline: syncManager.isOnline
            });
          }
        }
      );
    });
  }
  return { pendingTransactions: 0, error: 'Sync manager not available' };
});

ipcMain.handle('pos:search-products', async (event, query) => {
  if (syncManager) {
    return await syncManager.searchProducts(query);
  }
  
  // Fallback to local database search
  const db = require('./src/database/sqlite').getDatabase();
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT * FROM products 
      WHERE active = 1 AND (
        name LIKE ? OR 
        sku LIKE ? OR 
        barcode LIKE ?
      )
      LIMIT 20
    `, [`%${query}%`, `%${query}%`, `%${query}%`], (err, rows) => {
      if (err) resolve([]);
      else resolve(rows);
    });
  });
});

ipcMain.handle('pos:search-customers', async (event, query) => {
  if (syncManager) {
    // Try to search via sync manager (online)
    try {
      const response = await require('axios').get(
        `${syncManager.serverUrl}/api/pos/customers`,
        {
          params: { search: query, limit: 20 },
          timeout: 5000
        }
      );
      return response.data;
    } catch (error) {
      console.warn('Online customer search failed, using local fallback');
    }
  }
  
  // Fallback to local database search
  const db = require('./src/database/sqlite').getDatabase();
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT * FROM customers 
      WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
      LIMIT 20
    `, [`%${query}%`, `%${query}%`, `%${query}%`], (err, rows) => {
      if (err) resolve([]);
      else resolve(rows);
    });
  });
});

ipcMain.handle('pos:check-inventory', async (event, productId, quantity) => {
  const db = require('./src/database/sqlite').getDatabase();
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT stock_quantity FROM products WHERE id = ? AND active = 1',
      [productId],
      (err, row) => {
        if (err) {
          console.warn('Inventory check failed:', err);
          resolve(true); // Assume available on error
        } else if (!row) {
          resolve(false); // Product not found
        } else {
          resolve((row.stock_quantity || 0) >= quantity);
        }
      }
    );
  });
});

ipcMain.handle('pos:create-customer', async (event, customerData) => {
  if (syncManager && syncManager.isOnline) {
    try {
      // Create customer via GiLi backend
      const response = await require('axios').post(
        `${syncManager.serverUrl}/api/pos/customers`,
        {
          pos_customer_id: customerData.id || require('crypto').randomUUID(),
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          loyalty_points: customerData.loyalty_points || 0,
          last_updated: new Date()
        },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (response.data.success) {
        // Also store locally
        const db = require('./src/database/sqlite').getDatabase();
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT OR REPLACE INTO customers (
              id, name, email, phone, address, loyalty_points, synced, server_id, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            response.data.customer_id,
            customerData.name,
            customerData.email,
            customerData.phone,
            customerData.address,
            customerData.loyalty_points || 0,
            1, // synced
            response.data.customer_id,
            new Date().toISOString()
          ], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        return response.data;
      }
    } catch (error) {
      console.error('Remote customer creation failed:', error.message);
    }
  }
  
  // Fallback: create locally and mark for sync
  const db = require('./src/database/sqlite').getDatabase();
  const customerId = customerData.id || require('crypto').randomUUID();
  
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT OR REPLACE INTO customers (
        id, name, email, phone, address, loyalty_points, synced, server_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customerId,
      customerData.name,
      customerData.email,
      customerData.phone,
      customerData.address,
      customerData.loyalty_points || 0,
      0, // not synced
      null,
      new Date().toISOString()
    ], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ 
          success: true, 
          customer_id: customerId, 
          message: 'Customer created locally, will sync when online' 
        });
      }
    });
  });
});

ipcMain.handle('pos:get-detailed-sync-status', async () => {
  if (syncManager) {
    return await syncManager.getSyncStatus();
  }
  
  return {
    online: false,
    lastSync: null,
    serverUrl: 'Unknown',
    deviceId: 'Unknown',
    error: 'Sync manager not available'
  };
});

// Menu setup
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Sync Data',
        accelerator: 'CmdOrCtrl+S',
        click: async () => {
          if (syncManager) {
            await syncManager.syncAll();
          }
        }
      },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About GiLi PoS',
        click: () => {
          require('electron').dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About GiLi PoS',
            message: 'GiLi Point of Sale System',
            detail: 'Version 1.0.0\nOffline-capable PoS for GiLi Business Management System'
          });
        }
      }
    ]
  }
];

Menu.setApplicationMenu(Menu.buildFromTemplate(template));
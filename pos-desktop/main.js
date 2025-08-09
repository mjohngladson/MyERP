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

ipcMain.handle('pos:sync-data', async () => {
  if (syncManager) {
    return await syncManager.syncAll();
  }
  throw new Error('Sync manager not initialized');
});

ipcMain.handle('pos:get-sync-status', async () => {
  if (syncManager) {
    return syncManager.getSyncStatus();
  }
  return { online: false, lastSync: null };
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
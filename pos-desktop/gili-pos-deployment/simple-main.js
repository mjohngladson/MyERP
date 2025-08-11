// Simplified Production Main - Based on working debug version
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

// Minimal required modules
const { initDatabase } = require('./src/database/sqlite');
const { SyncManager } = require('./src/sync/syncManager');

let mainWindow;
let syncManager;

// IPC Handlers for renderer communication
function setupIpcHandlers() {
    // Get device ID
    ipcMain.handle('pos:get-device-id', () => {
        return syncManager ? syncManager.deviceId : 'local-device-' + Date.now();
    });
    
    // Check connection status
    ipcMain.handle('pos:check-connection', async () => {
        if (!syncManager) {
            return { online: false, message: 'Sync manager not initialized' };
        }
        
        try {
            await syncManager.checkConnection();
            return { 
                online: syncManager.isOnline, 
                message: syncManager.isOnline ? 'Connected to GiLi backend' : 'Backend not reachable'
            };
        } catch (error) {
            return { online: false, message: error.message };
        }
    });
    
    // Load products
    ipcMain.handle('pos:load-products', async () => {
        if (!syncManager) {
            return { success: false, products: [], error: 'Sync manager not available' };
        }
        
        try {
            const products = await syncManager.getProducts();
            return { success: true, products: products || [] };
        } catch (error) {
            console.error('Failed to load products:', error);
            return { success: false, products: [], error: error.message };
        }
    });
    
    // Load customers
    ipcMain.handle('pos:load-customers', async () => {
        if (!syncManager) {
            return { success: false, customers: [], error: 'Sync manager not available' };
        }
        
        try {
            const customers = await syncManager.getCustomers();
            return { success: true, customers: customers || [] };
        } catch (error) {
            console.error('Failed to load customers:', error);
            return { success: false, customers: [], error: error.message };
        }
    });
    
    // Process transaction
    ipcMain.handle('pos:process-transaction', async (event, transactionData) => {
        if (!syncManager) {
            return { success: false, error: 'Sync manager not available' };
        }
        
        try {
            const result = await syncManager.processTransaction(transactionData);
            return { success: true, result };
        } catch (error) {
            console.error('Failed to process transaction:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Sync data
    ipcMain.handle('pos:sync-data', async () => {
        if (!syncManager) {
            return { success: false, error: 'Sync manager not available' };
        }
        
        try {
            await syncManager.syncData();
            return { success: true, message: 'Data synced successfully' };
        } catch (error) {
            console.error('Failed to sync data:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('✅ IPC handlers registered');
}

async function createWindow() {
    console.log('🚀 Starting GiLi PoS...');
    
    // Create window (similar to working debug version)
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        show: true,  // Show immediately like debug version
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'GiLi Point of Sale',
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    // Initialize database
    try {
        await initDatabase();
        console.log('✅ Database initialized');
    } catch (error) {
        console.warn('⚠️ Database initialization failed:', error.message);
    }

    // Initialize sync manager
    try {
        syncManager = new SyncManager();
        await syncManager.initialize();
        console.log('✅ Sync manager initialized');
    } catch (error) {
        console.warn('⚠️ Sync manager failed:', error.message);
    }

    // Setup IPC handlers after sync manager is ready
    setupIpcHandlers();

    // Load the app
    const indexPath = path.join(__dirname, 'src/renderer/index.html');
    console.log('📄 Loading UI from:', indexPath);
    
    try {
        await mainWindow.loadFile(indexPath);
        console.log('✅ UI loaded successfully!');
        
        // Set up basic menu
        const menu = Menu.buildFromTemplate([
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Exit',
                        accelerator: 'CmdOrCtrl+Q',
                        click: () => app.quit()
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Reload',
                        accelerator: 'CmdOrCtrl+R',
                        click: () => mainWindow.reload()
                    },
                    {
                        label: 'Developer Tools',
                        accelerator: 'F12',
                        click: () => mainWindow.webContents.toggleDevTools()
                    }
                ]
            }
        ]);
        Menu.setApplicationMenu(menu);
        
    } catch (error) {
        console.error('❌ Failed to load UI:', error);
        mainWindow.loadURL('data:text/html,<h1>GiLi PoS - Loading Error</h1><p>' + error.message + '</p>');
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    console.log('✅ GiLi PoS started successfully!');
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// Export for IPC handlers
module.exports = {
    getMainWindow: () => mainWindow,
    getSyncManager: () => syncManager
};
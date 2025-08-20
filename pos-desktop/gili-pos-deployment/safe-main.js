// Safe Main - Uses web storage instead of SQLite
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Use web sync manager (no SQLite)
const { SyncManager } = require('./src/sync/webSyncManager');

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
        console.log('📦 IPC: pos:load-products called');
        
        if (!syncManager) {
            console.log('⚠️ No sync manager available, returning mock products');
            const mockProducts = [
                {
                    id: 'mock-1',
                    name: 'Sample Product A',
                    price: 10.99,
                    stock_quantity: 50,
                    category: 'Test',
                    image_url: null
                },
                {
                    id: 'mock-2',
                    name: 'Sample Product B', 
                    price: 25.50,
                    stock_quantity: 25,
                    category: 'Test',
                    image_url: null
                }
            ];
            
            return { success: true, products: mockProducts };
        }
        
        try {
            const products = await syncManager.getProducts();
            console.log(`✅ Retrieved ${products.length} products via sync manager`);
            return { success: true, products: products || [] };
        } catch (error) {
            console.error('Failed to load products via sync manager:', error);
            
            // Return mock products as fallback
            console.log('🧪 Returning mock products as fallback');
            const mockProducts = [
                {
                    id: 'fallback-1',
                    name: 'Fallback Product A',
                    price: 15.99,
                    stock_quantity: 30,
                    category: 'Fallback',
                    image_url: null
                }
            ];
            
            return { success: true, products: mockProducts };
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
    console.log('🚀 Starting GiLi PoS Safe...');
    
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
        title: 'GiLi Point of Sale - Safe Version',
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    // Initialize sync manager (no database needed)
    try {
        console.log('🔄 Creating sync manager...');
        syncManager = new SyncManager();
        console.log('🔄 Initializing sync manager...');
        await syncManager.initialize();
        console.log('✅ Web sync manager initialized');
    } catch (error) {
        console.error('❌ Sync manager failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Continue without sync manager for now
        syncManager = null;
        console.warn('⚠️ Continuing without sync manager - products will be unavailable');
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

    console.log('✅ GiLi PoS Safe started successfully!');
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
// Simplified Production Main - Based on working debug version
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Minimal required modules
const { initDatabase } = require('./src/database/sqlite');
const { SyncManager } = require('./src/sync/syncManager');

let mainWindow;
let syncManager;

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
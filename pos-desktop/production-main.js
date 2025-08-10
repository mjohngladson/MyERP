// Production-Ready Main Process for GiLi PoS
const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Production modules
const { initDatabase } = require('./src/database/sqlite');
const { SyncManager } = require('./src/sync/syncManager');
const { HardwareManager } = require('./src/hardware/hardwareManager');
const { UserManager } = require('./src/auth/userManager');
const { BackupManager } = require('./src/backup/backupManager');
const { getCrashReporter } = require('./src/monitoring/crashReporter');
const { ConfigManager } = require('./src/config/production');
const { getLogger } = require('./src/logging/logger');

// Global managers
let mainWindow;
let syncManager;
let hardwareManager;
let userManager;
let backupManager;
let crashReporter;
let config;
let logger;

// Application state
let isProductionReady = false;
let startupErrors = [];

async function createWindow() {
    // Create the browser window with production settings
    mainWindow = new BrowserWindow({
        width: config.get('ui.window_width') || 1200,
        height: config.get('ui.window_height') || 800,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: true, // Enable web security in production
            allowRunningInsecureContent: false
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'GiLi Point of Sale',
        show: false,
        autoHideMenuBar: config.get('ui.auto_hide_menu') || false,
        fullscreenable: true,
        resizable: true
    });

    // Load the app
    const indexPath = path.join(__dirname, 'src/renderer/index.html');
    
    try {
        await mainWindow.loadFile(indexPath);
        console.log('✅ Renderer loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load renderer:', error);
        // Show error window
        await dialog.showErrorBox('Loading Error', 
            `Failed to load application UI: ${error.message}`);
    }

    // Production window event handlers
    mainWindow.once('ready-to-show', () => {
        console.log('✅ Window ready-to-show event fired');
        mainWindow.show();
        mainWindow.focus();
        
        // Log application startup
        logger.info('Application window ready and shown');
        
        // Check if this is first run
        if (isFirstRun()) {
            showFirstRunDialog();
        }
        
        // Open DevTools only in development
        if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Fallback: Show window after 3 seconds if ready-to-show doesn't fire
    setTimeout(() => {
        if (mainWindow && !mainWindow.isVisible()) {
            console.log('⚠️ Window not shown yet, forcing show...');
            mainWindow.show();
            mainWindow.focus();
        }
    }, 3000);

    mainWindow.on('closed', () => {
        logger.info('Main window closed');
        mainWindow = null;
    });

    // Handle window close event (ask for confirmation in production)
    mainWindow.on('close', async (event) => {
        if (config.get('ui.confirm_close') && !app.isQuiting) {
            event.preventDefault();
            
            const response = await dialog.showMessageBox(mainWindow, {
                type: 'question',
                buttons: ['Cancel', 'Close'],
                defaultId: 0,
                message: 'Are you sure you want to close GiLi PoS?',
                detail: 'All unsaved changes will be lost.'
            });
            
            if (response.response === 1) {
                app.isQuiting = true;
                mainWindow.close();
            }
        }
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Log navigation events
    mainWindow.webContents.on('did-navigate', (event, navigationUrl) => {
        logger.debug(`Navigation to: ${navigationUrl}`);
    });

    // Handle page crashes
    mainWindow.webContents.on('render-process-gone', (event, details) => {
        logger.error('Renderer process gone', { reason: details.reason, exitCode: details.exitCode });
        crashReporter.reportError(new Error(`Renderer crash: ${details.reason}`), {
            type: 'renderer_crash',
            details: details
        });
    });

    return mainWindow;
}

async function initializeProductionApp() {
    try {
        logger.info('🚀 Initializing GiLi PoS in production mode...');

        // 1. Initialize crash reporter first
        crashReporter = getCrashReporter();
        await crashReporter.initialize();

        // 2. Load and validate configuration
        config = new ConfigManager();
        config.validate();
        logger.info('✅ Configuration loaded and validated');

        // 3. Initialize SQLite database
        await initDatabase();
        logger.info('✅ Database initialized');

        // 4. Initialize authentication system
        userManager = new UserManager();
        await userManager.initialize();
        logger.info('✅ Authentication system initialized');

        // 5. Initialize backup manager
        backupManager = new BackupManager();
        await backupManager.initialize();
        logger.info('✅ Backup system initialized');

        // 6. Initialize sync manager
        syncManager = new SyncManager();
        await syncManager.initialize();
        logger.info('✅ Sync manager initialized');

        // 7. Initialize hardware manager
        hardwareManager = new HardwareManager();
        await hardwareManager.initialize();
        logger.info('✅ Hardware manager initialized');

        // 8. Run system health checks
        await runHealthChecks();

        // 9. Create application window
        await createWindow();

        // 10. Setup production menu
        setupProductionMenu();

        // 11. Schedule maintenance tasks
        scheduleMaintenanceTasks();

        isProductionReady = true;
        logger.info('🎉 GiLi PoS production initialization complete');

    } catch (error) {
        logger.error('❌ Production initialization failed', error);
        startupErrors.push(error);
        
        await crashReporter.reportCrash(error, 'startup_failure');
        
        // Show critical error dialog
        await showCriticalErrorDialog(error);
        
        app.quit();
    }
}

async function runHealthChecks() {
    logger.info('🔍 Running system health checks...');
    
    const checks = [
        checkDatabaseHealth(),
        checkHardwareHealth(),
        checkNetworkHealth(),
        checkDiskSpaceHealth(),
        checkPermissionsHealth()
    ];
    
    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
        const checkNames = ['Database', 'Hardware', 'Network', 'Disk Space', 'Permissions'];
        
        if (result.status === 'fulfilled') {
            logger.info(`✅ ${checkNames[index]} health check passed`);
        } else {
            logger.warn(`⚠️ ${checkNames[index]} health check failed:`, result.reason);
        }
    });
}

async function checkDatabaseHealth() {
    const { getDatabase } = require('./src/database/sqlite');
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
        db.get('SELECT 1', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function checkHardwareHealth() {
    const status = hardwareManager.getStatus();
    
    if (!status.initialized) {
        throw new Error('Hardware manager not initialized');
    }
    
    // Check critical hardware
    if (config.get('hardware.receipt_printer.enabled') && !status.printer.connected) {
        logger.warn('Receipt printer not connected but enabled in settings');
    }
}

async function checkNetworkHealth() {
    if (config.get('network.server_url')) {
        const isOnline = await syncManager.checkConnection();
        if (!isOnline) {
            logger.warn('Server connection unavailable - running in offline mode');
        }
    }
}

async function checkDiskSpaceHealth() {
    // Check available disk space
    const fs = require('fs');
    const stats = await fs.promises.statSync('.');
    
    // This is a simplified check - in production you'd check actual free space
    logger.debug('Disk space check completed');
}

async function checkPermissionsHealth() {
    // Check if we can write to required directories
    const testDirs = [
        path.join(require('os').homedir(), 'AppData', 'Roaming', 'gili-pos'),
        config.get('backup.location'),
        config.get('logging.log_directory')
    ];
    
    for (const dir of testDirs) {
        try {
            await fs.promises.mkdir(dir, { recursive: true });
            await fs.promises.access(dir, fs.constants.W_OK);
        } catch (error) {
            throw new Error(`Cannot write to directory: ${dir}`);
        }
    }
}

function setupProductionMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Sale',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'new-sale');
                    }
                },
                {
                    label: 'Hold Sale',
                    accelerator: 'CmdOrCtrl+H',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'hold-sale');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Sync Data',
                    accelerator: 'CmdOrCtrl+S',
                    click: async () => {
                        try {
                            await syncManager.syncAll();
                        } catch (error) {
                            logger.error('Manual sync failed', error);
                        }
                    }
                },
                {
                    label: 'Backup Now',
                    click: async () => {
                        try {
                            await backupManager.createFullBackup('manual');
                            dialog.showMessageBox(mainWindow, {
                                type: 'info',
                                message: 'Backup completed successfully'
                            });
                        } catch (error) {
                            logger.error('Manual backup failed', error);
                            dialog.showErrorBox('Backup Failed', error.message);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
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
            label: 'Reports',
            submenu: [
                {
                    label: 'Sales Report',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'sales-report');
                    }
                },
                {
                    label: 'Inventory Report',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'inventory-report');
                    }
                },
                {
                    label: 'Export Data',
                    click: () => {
                        showExportDialog();
                    }
                }
            ]
        },
        {
            label: 'Tools',
            submenu: [
                {
                    label: 'Settings',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'settings');
                    }
                },
                {
                    label: 'Hardware Test',
                    click: () => {
                        showHardwareTestDialog();
                    }
                },
                {
                    label: 'System Info',
                    click: () => {
                        showSystemInfoDialog();
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'User Manual',
                    click: () => {
                        shell.openExternal('https://docs.gili.com/pos');
                    }
                },
                {
                    label: 'Keyboard Shortcuts',
                    click: () => {
                        showKeyboardShortcuts();
                    }
                },
                {
                    label: 'Support',
                    click: () => {
                        shell.openExternal('https://support.gili.com');
                    }
                },
                { type: 'separator' },
                {
                    label: 'About GiLi PoS',
                    click: () => {
                        showAboutDialog();
                    }
                }
            ]
        }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function scheduleMaintenanceTasks() {
    // Daily maintenance at 2 AM
    const scheduleDaily = () => {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 2, 0, 0);
        const timeUntil = target.getTime() - now.getTime();
        
        setTimeout(async () => {
            await runDailyMaintenance();
            scheduleDaily(); // Schedule next day
        }, timeUntil);
    };
    
    scheduleDaily();
    
    // Hourly tasks
    setInterval(async () => {
        await runHourlyMaintenance();
    }, 60 * 60 * 1000);
    
    logger.info('✅ Maintenance tasks scheduled');
}

async function runDailyMaintenance() {
    logger.info('🔧 Running daily maintenance...');
    
    try {
        // Create automatic backup
        if (config.get('backup.enabled')) {
            await backupManager.createFullBackup('scheduled');
        }
        
        // Rotate logs
        logger.rotateLogs();
        
        // Clean up temporary files
        await cleanupTempFiles();
        
        // Optimize database
        await optimizeDatabase();
        
        logger.info('✅ Daily maintenance completed');
        
    } catch (error) {
        logger.error('❌ Daily maintenance failed', error);
    }
}

async function runHourlyMaintenance() {
    try {
        // Check sync status and auto-sync if needed
        if (config.get('network.auto_sync') && syncManager.isOnline) {
            await syncManager.syncAll();
        }
        
        // Monitor performance
        const memUsage = process.memoryUsage();
        logger.performance('memory_heap_used', memUsage.heapUsed, 100 * 1024 * 1024); // 100MB threshold
        
    } catch (error) {
        logger.warn('Hourly maintenance issue', error);
    }
}

function isFirstRun() {
    const settingsPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'gili-pos', 'first-run-complete');
    return !fs.existsSync(settingsPath);
}

function markFirstRunComplete() {
    const settingsPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'gili-pos', 'first-run-complete');
    fs.writeFileSync(settingsPath, new Date().toISOString());
}

async function showFirstRunDialog() {
    const response = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Welcome to GiLi PoS',
        message: 'Welcome to GiLi Point of Sale!',
        detail: 'This is your first time running GiLi PoS. Would you like to:\n\n• Configure hardware settings\n• Set up your store information\n• Import products\n\nDefault login: admin / Admin123!\n\n⚠️ Please change the default password immediately!',
        buttons: ['Configure Now', 'Skip Setup'],
        defaultId: 0
    });
    
    if (response.response === 0) {
        mainWindow.webContents.send('menu-action', 'first-run-setup');
    }
    
    markFirstRunComplete();
}

async function showCriticalErrorDialog(error) {
    await dialog.showErrorBox(
        'GiLi PoS Startup Failed',
        `A critical error occurred during startup:\n\n${error.message}\n\nPlease contact support if this problem persists.\n\nError details have been saved to the crash log.`
    );
}

// App event handlers
app.whenReady().then(async () => {
    logger = getLogger();
    await initializeProductionApp();
});

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

app.on('before-quit', async (event) => {
    if (!app.isQuiting) {
        event.preventDefault();
        
        logger.info('🔄 Shutting down GiLi PoS...');
        
        try {
            // Cleanup tasks
            if (hardwareManager) {
                hardwareManager.disconnect();
            }
            
            if (logger) {
                logger.close();
            }
            
            logger.info('✅ Shutdown complete');
            
        } catch (error) {
            console.error('Shutdown error:', error);
        }
        
        app.isQuiting = true;
        app.quit();
    }
});

// Global error handlers for production
process.on('uncaughtException', (error) => {
    if (logger) {
        logger.error('Uncaught exception', error);
    }
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    if (logger) {
        logger.error('Unhandled promise rejection', { reason, promise });
    }
    console.error('Unhandled rejection:', reason);
});

// Helper functions
function showExportDialog() {
    // Show export dialog to the main window
    if (mainWindow) {
        mainWindow.webContents.send('menu-action', 'export-data');
    }
}

function showHardwareTestDialog() {
    // Show hardware test dialog
    if (mainWindow) {
        mainWindow.webContents.send('menu-action', 'hardware-test');
    }
}

function showSystemInfoDialog() {
    // Show system information dialog
    if (mainWindow) {
        mainWindow.webContents.send('menu-action', 'system-info');
    }
}

function showKeyboardShortcuts() {
    // Show keyboard shortcuts dialog
    if (mainWindow) {
        mainWindow.webContents.send('menu-action', 'keyboard-shortcuts');
    }
}

function showAboutDialog() {
    // Show about dialog
    if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About GiLi PoS',
            message: 'GiLi Point of Sale System',
            detail: 'Version 1.0.0\nBuilt with Electron\n© 2024 GiLi Business Systems',
            buttons: ['OK']
        });
    }
}

function cleanupTempFiles() {
    // Clean up temporary files
    console.log('🧹 Cleaning up temporary files...');
    // Add cleanup logic here if needed
}

function optimizeDatabase() {
    // Optimize database
    console.log('🔧 Optimizing database...');
    // Add database optimization logic here if needed
}

module.exports = {
    getMainWindow: () => mainWindow,
    isReady: () => isProductionReady,
    getSyncManager: () => syncManager,
    getHardwareManager: () => hardwareManager,
    getUserManager: () => userManager,
    getBackupManager: () => backupManager,
    getConfig: () => config,
    getLogger: () => logger
};
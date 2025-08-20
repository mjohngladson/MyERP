// Simple Electron main - loads standalone PoS
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    console.log('🚀 Starting GiLi PoS Standalone...');
    
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        show: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        title: 'GiLi Point of Sale - Standalone',
        frame: true,
        resizable: true
    });

    const htmlPath = path.join(__dirname, 'standalone-pos.html');
    console.log('📄 Loading standalone PoS:', htmlPath);
    
    mainWindow.loadFile(htmlPath)
        .then(() => {
            console.log('✅ Standalone PoS loaded successfully!');
        })
        .catch((error) => {
            console.error('❌ Failed to load PoS:', error);
        });

    // Open DevTools for debugging
    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    console.log('✅ GiLi PoS Standalone started!');
}

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

console.log('🚀 Standalone main.js loaded');
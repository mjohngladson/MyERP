// Debug version - Simple main.js that will definitely show a window
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    console.log('🔧 Creating debug window...');
    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: true,  // Show immediately
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'GiLi PoS - Debug Mode'
    });

    const indexPath = path.join(__dirname, 'src/renderer/index.html');
    console.log('📄 Loading HTML from:', indexPath);
    
    mainWindow.loadFile(indexPath)
        .then(() => {
            console.log('✅ HTML loaded successfully!');
            mainWindow.webContents.openDevTools(); // Open dev tools for debugging
        })
        .catch((error) => {
            console.error('❌ Failed to load HTML:', error);
            // Show a simple error page
            mainWindow.loadURL('data:text/html,<h1>GiLi PoS - Loading Error</h1><p>' + error.message + '</p>');
        });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
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

console.log('🚀 Debug main.js started');
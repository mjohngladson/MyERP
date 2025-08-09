#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Creating GiLi PoS Deployment Package...');

// Create deployment directory
const deployDir = path.join(__dirname, 'gili-pos-deployment');
const version = require('./package.json').version;

// Clean previous deployment
if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true, force: true });
}

fs.mkdirSync(deployDir, { recursive: true });

console.log('✅ Created deployment directory');

// Copy application files
const filesToCopy = [
    'production-main.js',
    'main.js',
    'package.json',
    'src/',
    'assets/',
    'build-info.json',
    'DEPLOYMENT.md'
];

for (const file of filesToCopy) {
    const sourcePath = path.join(__dirname, file);
    const targetPath = path.join(deployDir, file);
    
    if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
            fs.cpSync(sourcePath, targetPath, { recursive: true });
            console.log(`✅ Copied directory: ${file}`);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`✅ Copied file: ${file}`);
        }
    }
}

// Create a startup script
const startupScript = `@echo off
title GiLi Point of Sale
echo Starting GiLi Point of Sale...
echo.
echo Make sure Node.js and npm are installed on this system.
echo.
pause

echo Installing dependencies...
npm install

echo.
echo Starting GiLi PoS...
npm start

pause
`;

fs.writeFileSync(path.join(deployDir, 'start-gili-pos.bat'), startupScript);
console.log('✅ Created startup script');

// Create installation instructions
const instructions = `# GiLi Point of Sale - Deployment Instructions

## Version: ${version}
## Build Date: ${new Date().toISOString()}

### System Requirements
- Windows 10 or later
- Node.js 18+ installed
- Internet connection (for initial setup and synchronization)

### Installation Steps

1. **Install Node.js**: Download and install Node.js from https://nodejs.org
2. **Extract Files**: Extract this package to a folder (e.g., C:\\GiLi-PoS\\)
3. **Install Dependencies**: Double-click \`start-gili-pos.bat\` or run:
   \`\`\`
   npm install
   \`\`\`
4. **Start Application**: Run:
   \`\`\`
   npm start
   \`\`\`

### Manual Installation
If the automatic script doesn't work:

1. Open Command Prompt in this folder
2. Run: \`npm install\`
3. Run: \`npm start\`

### Configuration
- The PoS will connect to your GiLi backend at: \`http://localhost:8001\`
- Edit \`src/sync/syncManager.js\` to change the server URL if needed
- Database files will be created in the application directory

### Features
- ✅ Offline Point of Sale operations
- ✅ Product management and barcode scanning
- ✅ Customer management with loyalty points
- ✅ Transaction processing and receipt printing
- ✅ Automatic sync with GiLi backend system
- ✅ Real-time inventory updates
- ✅ Hardware integration (printers, scanners)

### Support
For technical support, contact the GiLi development team.

### Troubleshooting
1. **Node.js not found**: Install Node.js from nodejs.org
2. **SQLite errors**: Make sure you have build tools installed
3. **Connection issues**: Check your GiLi backend server is running
4. **Hardware issues**: Ensure printer drivers are installed

---
Generated: ${new Date().toLocaleDateString()}
`;

fs.writeFileSync(path.join(deployDir, 'INSTALLATION.md'), instructions);
console.log('✅ Created installation instructions');

// Create simplified package.json for deployment
const deployPackageJson = {
    name: "gili-pos-deployment",
    version: version,
    description: "GiLi Point of Sale Desktop Application - Deployment Package",
    main: "production-main.js",
    scripts: {
        start: "electron production-main.js --no-sandbox --disable-dev-shm-usage",
        dev: "electron main.js --dev --no-sandbox --disable-dev-shm-usage"
    },
    keywords: ["pos", "point-of-sale", "gili", "electron", "offline"],
    author: "GiLi Team",
    license: "MIT",
    dependencies: {
        "electron": "^28.1.0",
        "sqlite3": "^5.1.6",
        "axios": "^1.6.2",
        "electron-store": "^8.1.0",
        "node-thermal-printer": "^4.4.4",
        "serialport": "^12.0.0",
        "express": "^4.18.2",
        "cors": "^2.8.5"
    }
};

fs.writeFileSync(
    path.join(deployDir, 'package.json'), 
    JSON.stringify(deployPackageJson, null, 2)
);

console.log('✅ Created deployment package.json');

// Create a ZIP archive
try {
    const archiveName = `GiLi-PoS-v${version}-Deployment.zip`;
    execSync(`cd "${path.dirname(deployDir)}" && zip -r "${archiveName}" "${path.basename(deployDir)}"`, { stdio: 'inherit' });
    console.log(`📦 Created deployment archive: ${archiveName}`);
} catch (error) {
    console.log('⚠️ ZIP creation failed, manual archive needed');
    console.log('   Create a ZIP file of the gili-pos-deployment folder manually');
}

console.log('');
console.log('🎉 GiLi PoS Deployment Package Created Successfully!');
console.log('');
console.log('📂 Location:', deployDir);
console.log('📋 Next steps:');
console.log('   1. Share the deployment folder or ZIP file');
console.log('   2. Recipients should follow INSTALLATION.md instructions');
console.log('   3. Make sure your GiLi backend server is accessible');
console.log('');
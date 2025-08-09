// Production Build Configuration for Windows Installer
const path = require('path');
const { version } = require('./package.json');

const buildConfig = {
    // Application metadata
    productName: "GiLi Point of Sale",
    appId: "com.gili.pos",
    version: version,
    copyright: "Copyright © 2025 GiLi Team",
    
    // Build directories
    directories: {
        output: "dist",
        buildResources: "build-resources"
    },
    
    // Files to include/exclude
    files: [
        "**/*",
        "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
        "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
        "!**/node_modules/*.d.ts",
        "!**/node_modules/.bin",
        "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
        "!.editorconfig",
        "!**/._*",
        "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
        "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
        "!**/{appveyor.yml,.travis.yml,circle.yml}",
        "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}",
        "!pos-startup.log",
        "!README.md"
    ],
    
    // Windows-specific configuration
    win: {
        target: [
            {
                target: "nsis",
                arch: ["x64", "ia32"]
            },
            {
                target: "portable",
                arch: ["x64"]
            }
        ],
        icon: "build-resources/icon.ico",
        publisherName: "GiLi Team",
        verifyUpdateCodeSignature: false,
        artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
        
        // Windows file properties
        fileAssociation: {
            ext: "gilipos",
            name: "GiLi PoS Data File",
            description: "GiLi Point of Sale data file",
            icon: "build-resources/file-icon.ico"
        }
    },
    
    // NSIS installer configuration
    nsis: {
        oneClick: false,
        allowElevation: true,
        allowToChangeInstallationDirectory: true,
        installerIcon: "build-resources/installer-icon.ico",
        uninstallerIcon: "build-resources/uninstaller-icon.ico",
        installerHeaderIcon: "build-resources/header-icon.ico",
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: "GiLi PoS",
        
        // Custom installer script
        include: "build-resources/installer.nsh",
        
        // License agreement
        license: "build-resources/LICENSE.txt",
        
        // Installer language
        language: "1033", // English
        
        // Custom install directory
        artifactName: "GiLi-PoS-Setup-${version}.${ext}",
        
        // Registry entries for Windows
        deleteAppDataOnUninstall: false, // Keep user data
        
        // Uninstall display info
        displayLanguageSelector: true
    },
    
    // Portable app configuration
    portable: {
        artifactName: "GiLi-PoS-Portable-${version}.${ext}"
    },
    
    // Auto-updater configuration
    publish: {
        provider: "generic",
        url: "https://releases.gili.com/pos/",
        channel: "stable"
    },
    
    // Compression settings
    compression: "maximum",
    
    // Build hooks
    beforeBuild: async (context) => {
        console.log('🔨 Preparing production build...');
        
        // Create build resources directory
        const buildResourcesPath = path.join(__dirname, 'build-resources');
        const fs = require('fs');
        
        if (!fs.existsSync(buildResourcesPath)) {
            fs.mkdirSync(buildResourcesPath, { recursive: true });
        }
        
        // Generate build info
        const buildInfo = {
            version: version,
            buildTime: new Date().toISOString(),
            platform: context.platform.name,
            arch: context.arch,
            nodeVersion: process.version,
            electronVersion: context.electronVersion
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'build-info.json'),
            JSON.stringify(buildInfo, null, 2)
        );
        
        console.log('✅ Build preparation completed');
    },
    
    afterBuild: async (context) => {
        console.log('🎉 Build completed successfully!');
        
        // Generate checksums
        const crypto = require('crypto');
        const fs = require('fs');
        
        const outputPath = context.outDir;
        const files = fs.readdirSync(outputPath).filter(f => f.endsWith('.exe'));
        
        const checksums = {};
        
        for (const file of files) {
            const filePath = path.join(outputPath, file);
            const content = fs.readFileSync(filePath);
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            checksums[file] = hash;
        }
        
        fs.writeFileSync(
            path.join(outputPath, 'checksums.json'),
            JSON.stringify(checksums, null, 2)
        );
        
        console.log('✅ Checksums generated');
    }
};

module.exports = buildConfig;
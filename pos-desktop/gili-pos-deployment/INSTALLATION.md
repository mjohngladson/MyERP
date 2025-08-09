# GiLi Point of Sale - Deployment Instructions

## Version: 1.0.0
## Build Date: 2025-08-09T20:12:04.408Z

### System Requirements
- Windows 10 or later
- Node.js 18+ installed
- Internet connection (for initial setup and synchronization)

### Installation Steps

1. **Install Node.js**: Download and install Node.js from https://nodejs.org
2. **Extract Files**: Extract this package to a folder (e.g., C:\GiLi-PoS\)
3. **Install Dependencies**: Double-click `start-gili-pos.bat` or run:
   ```
   npm install
   ```
4. **Start Application**: Run:
   ```
   npm start
   ```

### Manual Installation
If the automatic script doesn't work:

1. Open Command Prompt in this folder
2. Run: `npm install`
3. Run: `npm start`

### Configuration
- The PoS will connect to your GiLi backend at: `http://localhost:8001`
- Edit `src/sync/syncManager.js` to change the server URL if needed
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
Generated: 8/9/2025

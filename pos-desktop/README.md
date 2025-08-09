# GiLi Point of Sale Desktop Application

A comprehensive offline-capable Point of Sale system built with Electron for the GiLi Business Management System.

## Features

### 🛒 Core PoS Functionality
- **Product Management**: Browse products by category, search, and barcode scanning
- **Shopping Cart**: Add/remove items, quantity adjustment, line-item discounts
- **Multiple Payment Methods**: Cash, credit/debit cards, digital wallets, checks
- **Transaction Processing**: Complete sales with receipt printing

### 💾 Offline Capabilities
- **Local SQLite Database**: All data stored locally for offline operation
- **Transaction Queue**: Process sales even without internet connection
- **Automatic Sync**: Sync with GiLi backend when connection is available
- **Conflict Resolution**: Handle data conflicts between local and server

### 🖥️ Desktop Features
- **Native Windows App**: Built with Electron for Windows desktop
- **Hardware Integration**: Support for receipt printers, cash drawers, barcode scanners
- **Keyboard Shortcuts**: Quick access to common functions
- **Multi-window Support**: Run multiple PoS terminals

### 🔧 Hardware Integration
- **Receipt Printers**: Thermal printer support (ESC/POS compatible)
- **Cash Drawers**: Automatic drawer opening on cash payments
- **Barcode Scanners**: USB and serial barcode scanner support
- **Multiple Interfaces**: TCP, USB, Serial port connectivity

### 📊 Business Features
- **Customer Management**: Track customer information and purchase history
- **Inventory Tracking**: Real-time stock level updates
- **Sales Reporting**: Transaction history and sales analytics
- **Tax Calculation**: Configurable tax rates and exemptions
- **Discount System**: Percentage and fixed-amount discounts

## Installation

### Prerequisites
- Windows 10 or later
- Node.js 18+ (for development)
- Receipt printer (optional)
- Barcode scanner (optional)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd pos-desktop
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start in development mode:**
   ```bash
   npm run dev
   ```

### Building for Production

```bash
# Build Windows installer
npm run build-win

# The installer will be created in the dist/ folder
```

## Configuration

### Hardware Setup

1. **Receipt Printer Configuration:**
   - Connect thermal printer via USB or network
   - Update printer settings in PoS Settings
   - Test printer connection

2. **Cash Drawer Setup:**
   - Connect cash drawer to printer or computer
   - Configure COM port in settings
   - Test drawer operation

3. **Barcode Scanner:**
   - Connect USB or serial barcode scanner
   - Configure input mode (keyboard emulation or serial)
   - Test scanning functionality

### Network Configuration

1. **GiLi Backend Connection:**
   - Set server URL in settings (default: http://localhost:8001)
   - Ensure network connectivity
   - Test synchronization

## Usage

### Starting a Sale

1. **Add Products:**
   - Search or browse products
   - Scan barcodes
   - Click products to add to cart

2. **Process Payment:**
   - Click "Checkout" button
   - Select payment method
   - Enter payment details
   - Complete transaction

3. **Print Receipt:**
   - Receipt prints automatically
   - Cash drawer opens for cash payments

### Managing Products

1. **Product Search:**
   - Use search bar for quick product lookup
   - Filter by category
   - Scan barcode for instant selection

2. **Inventory Updates:**
   - Stock levels update automatically
   - Low stock warnings
   - Sync with main GiLi system

### Offline Operation

1. **Local Storage:**
   - All transactions saved locally
   - Product catalog cached for offline use
   - Customer information available offline

2. **Sync Process:**
   - Automatic sync when online
   - Manual sync available
   - Conflict resolution for data changes

## Keyboard Shortcuts

- **Ctrl+S**: Sync data
- **Ctrl+F**: Focus search
- **Ctrl+B**: Focus barcode input
- **F1**: Start checkout
- **Esc**: Cancel current operation

## Troubleshooting

### Common Issues

1. **Printer Not Working:**
   - Check USB/network connection
   - Verify printer settings
   - Test print function

2. **Database Errors:**
   - Restart application
   - Check disk space
   - Restore from backup

3. **Sync Problems:**
   - Verify internet connection
   - Check server URL
   - Review sync logs

### Log Files

Application logs are stored in:
```
Windows: %APPDATA%/gili-pos/logs/
```

### Database Location

SQLite database is stored at:
```
Windows: %APPDATA%/gili-pos/gili-pos.db
```

## Support

For technical support and feature requests:
- Email: support@gili.com
- Documentation: [docs.gili.com/pos](https://docs.gili.com/pos)
- Community: [community.gili.com](https://community.gili.com)

## Version History

- **v1.0.0**: Initial release with core PoS functionality
- Offline operation support
- Hardware integration
- GiLi backend synchronization

## License

Copyright © 2025 GiLi Team. All rights reserved.
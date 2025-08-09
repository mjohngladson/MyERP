# GiLi PoS Production Deployment Guide

## 🚀 Building for Production

### Prerequisites
- Windows 10/11 development machine
- Node.js 18+ installed
- Git repository with all changes committed

### Build Commands

**1. Clean Build Environment:**
```bash
npm run clean
npm install --production
```

**2. Build Windows Installer:**
```bash
npm run build-win
```

**3. Build Portable Version:**
```bash
npm run build-portable
```

**4. Build All Platforms:**
```bash
npm run build-all
```

### Output Files

After successful build, you'll find in `dist/` folder:
- `GiLi-PoS-Setup-1.0.0.exe` - Full installer
- `GiLi-PoS-Portable-1.0.0.exe` - Portable version
- `checksums.json` - File verification checksums

## 🏪 Retail Deployment Checklist

### Pre-Installation
- [ ] Test installer on clean Windows machine
- [ ] Verify hardware compatibility
- [ ] Prepare network configuration
- [ ] Create backup of existing data (if upgrading)

### Installation Steps
1. **Run installer as Administrator**
2. **Select installation directory** (default: C:\Program Files\GiLi PoS)
3. **Choose components:**
   - ✅ Core Application (required)
   - ✅ Hardware Configuration Templates
   - ✅ Desktop & Start Menu Shortcuts
   - ✅ File Associations
   - ✅ Windows Firewall Configuration
   - ⚠️ Sample Data (optional - for testing)
   - ⚠️ Auto-start with Windows (optional)

### Post-Installation Configuration

#### 1. First Launch Setup
- Launch GiLi PoS from Desktop or Start Menu
- **CRITICAL:** Change default admin password immediately
  - Default: `admin` / `Admin123!`
  - New password must meet security requirements

#### 2. Store Information
```
Settings > Store Information
- Store Name: [Your Store Name]
- Address: [Full Address]
- Phone: [Contact Number]
- Email: [Contact Email]
- Tax ID: [Business Tax ID]
- Currency: [USD/EUR/etc]
- Tax Rate: [Local tax percentage]
```

#### 3. Hardware Configuration
```
Settings > Hardware
Receipt Printer:
- Type: Thermal/Impact
- Connection: USB/Network/Serial
- Test print to verify

Cash Drawer:
- Connection: Printer/Serial
- Test open/close

Barcode Scanner:
- Type: USB HID/Serial
- Test scanning
```

#### 4. Network & Sync Setup
```
Settings > Network
- Server URL: https://your-gili-server.com
- API Key: [Your API key]
- Sync Interval: 10 minutes (recommended)
- Test connection
```

#### 5. Product Import
- Import existing product catalog
- Set up categories and pricing
- Configure stock levels
- Test barcode scanning

## 🔐 Security Configuration

### User Accounts
1. **Create cashier accounts:**
   - Username: unique identifier
   - Strong passwords required
   - Role: cashier (limited permissions)

2. **Manager account:**
   - Role: manager (reports & refunds)
   - Access to sensitive functions

3. **Admin account:**
   - Change default password immediately
   - Enable two-factor authentication (if available)
   - Limit admin access to trusted personnel

### Data Protection
- Enable automatic backups (daily recommended)
- Set backup location to secure drive/cloud
- Test restore procedure
- Configure audit logging

## 🔧 Performance Optimization

### System Requirements
**Minimum:**
- Windows 10 64-bit
- 4GB RAM
- 1GB disk space
- 1 GHz processor

**Recommended:**
- Windows 11 64-bit
- 8GB RAM
- 2GB disk space (for logs/backups)
- 2+ GHz processor
- SSD storage

### Performance Settings
```
Settings > Performance
- Cache Size: 100 products (default)
- Sync Batch Size: 50 records
- Log Level: info (error for production)
- Memory Limit: 512MB
```

## 🛠️ Hardware Setup Guide

### Receipt Printer Setup
**Thermal Printer (Recommended):**
1. Connect via USB or network
2. Install manufacturer drivers if required
3. Set as default printer (optional)
4. Configure paper size (80mm typical)
5. Test print from GiLi PoS

**Driver Sources:**
- Epson: TM-T20/T82 series
- Star: TSP series
- Bixolon: SRP series

### Cash Drawer Integration
1. **Printer-driven drawer:**
   - Connect drawer to printer
   - No additional setup required

2. **Serial drawer:**
   - Connect to COM port
   - Configure port settings
   - Test open command

### Barcode Scanner Configuration
1. **USB HID Scanner (Easiest):**
   - Plug and play
   - Acts like keyboard input
   - No configuration required

2. **Serial Scanner:**
   - Connect to COM port
   - Configure baud rate
   - Set up data format

## 📊 Backup & Recovery

### Automatic Backup Setup
```
Settings > Backup
- Enable: Yes
- Location: D:\GiLi Backups (separate drive)
- Schedule: Daily at 2:00 AM
- Retention: 30 days
- Encryption: Enabled
```

### Manual Backup
- Menu > File > Backup Now
- Export to external drive monthly
- Store off-site copy quarterly

### Recovery Testing
- Test restore procedure monthly
- Document recovery steps
- Train staff on emergency procedures

## 🎯 Go-Live Checklist

### Week Before Launch
- [ ] Complete system testing with real products
- [ ] Train all cashiers on basic operations
- [ ] Train managers on reports and refunds
- [ ] Set up customer accounts (if used)
- [ ] Configure payment methods
- [ ] Test end-to-end transactions
- [ ] Prepare contingency procedures

### Day of Launch
- [ ] Verify all hardware connections
- [ ] Confirm network connectivity
- [ ] Test backup system
- [ ] Ensure all users can log in
- [ ] Have technical support contact ready
- [ ] Keep old system running as backup (if applicable)

### First Week Monitoring
- [ ] Monitor transaction processing
- [ ] Check sync operations
- [ ] Verify report accuracy
- [ ] Address user feedback
- [ ] Monitor performance metrics

## 📞 Support Information

### Self-Service Resources
- User Manual: Available in Help menu
- Video Tutorials: https://training.gili.com
- FAQ: https://support.gili.com/faq

### Technical Support
- Email: support@gili.com
- Priority Support: Available for retail customers
- Remote Assistance: Available with prior approval

### Emergency Contacts
- Critical Issues: support@gili.com (mark as URGENT)
- Hardware Failures: Check warranty information
- Data Recovery: Professional services available

## 🔄 Maintenance Schedule

### Daily
- Verify automatic backup completion
- Check hardware status lights
- Monitor transaction processing

### Weekly  
- Review error logs
- Check sync status
- Test hardware functions

### Monthly
- Review performance reports
- Update software (if available)
- Clean hardware (printer, scanner)
- Test backup restore

### Quarterly
- Full system backup to external media
- Security audit (passwords, permissions)
- Hardware maintenance check
- Staff retraining if needed

---

## ⚠️ Critical Success Factors

1. **Change default passwords immediately**
2. **Test all hardware before going live**
3. **Set up reliable backups from day one**
4. **Train staff thoroughly**
5. **Have contingency plans ready**
6. **Monitor system health actively**

---

*GiLi PoS Production Deployment Guide v1.0*  
*© 2025 GiLi Team - For Internal Use*
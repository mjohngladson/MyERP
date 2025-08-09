// Hardware Integration Manager
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const { SerialPort } = require('serialport');

class HardwareManager {
    constructor() {
        this.printer = null;
        this.cashDrawer = null;
        this.barcodeScanner = null;
        this.settings = {
            printer: {
                type: PrinterTypes.EPSON,
                interface: 'tcp://192.168.1.100',
                characterSet: CharacterSet.PC852_LATIN2,
                removeSpecialCharacters: false,
                lineCharacter: "=",
                breakLine: BreakLine.WORD,
                options: {
                    timeout: 5000
                }
            },
            cashDrawer: {
                port: 'COM3',
                baudRate: 9600
            },
            scanner: {
                port: 'COM4',
                baudRate: 9600
            }
        };
        this.initialized = false;
    }
    
    async initialize() {
        try {
            await this.loadSettings();
            await this.initializePrinter();
            await this.initializeCashDrawer();
            await this.initializeBarcodeScanner();
            
            this.initialized = true;
            console.log('✅ Hardware manager initialized');
        } catch (error) {
            console.warn('⚠️ Hardware initialization failed:', error.message);
            // Don't fail the entire app if hardware isn't available
        }
    }
    
    async loadSettings() {
        // In a real app, load from database
        // For now, use defaults
        try {
            const Store = require('electron-store');
            const store = new Store();
            const savedSettings = store.get('hardware', {});
            
            this.settings = { ...this.settings, ...savedSettings };
        } catch (error) {
            console.warn('Could not load hardware settings:', error);
        }
    }
    
    async initializePrinter() {
        try {
            this.printer = new ThermalPrinter({
                type: this.settings.printer.type,
                interface: this.settings.printer.interface,
                characterSet: this.settings.printer.characterSet,
                removeSpecialCharacters: this.settings.printer.removeSpecialCharacters,
                lineCharacter: this.settings.printer.lineCharacter,
                breakLine: this.settings.printer.breakLine,
                options: this.settings.printer.options
            });
            
            const isConnected = await this.printer.isPrinterConnected();
            
            if (isConnected) {
                console.log('✅ Thermal printer connected');
            } else {
                console.warn('⚠️ Thermal printer not connected');
                this.printer = null;
            }
        } catch (error) {
            console.warn('⚠️ Printer initialization failed:', error.message);
            this.printer = null;
        }
    }
    
    async initializeCashDrawer() {
        try {
            if (this.settings.cashDrawer.port) {
                this.cashDrawer = new SerialPort({
                    path: this.settings.cashDrawer.port,
                    baudRate: this.settings.cashDrawer.baudRate
                });
                
                this.cashDrawer.on('open', () => {
                    console.log('✅ Cash drawer connected');
                });
                
                this.cashDrawer.on('error', (error) => {
                    console.warn('⚠️ Cash drawer error:', error.message);
                    this.cashDrawer = null;
                });
            }
        } catch (error) {
            console.warn('⚠️ Cash drawer initialization failed:', error.message);
            this.cashDrawer = null;
        }
    }
    
    async initializeBarcodeScanner() {
        try {
            if (this.settings.scanner.port) {
                this.barcodeScanner = new SerialPort({
                    path: this.settings.scanner.port,
                    baudRate: this.settings.scanner.baudRate
                });
                
                this.barcodeScanner.on('data', (data) => {
                    const barcode = data.toString().trim();
                    this.handleBarcodeScanned(barcode);
                });
                
                this.barcodeScanner.on('open', () => {
                    console.log('✅ Barcode scanner connected');
                });
                
                this.barcodeScanner.on('error', (error) => {
                    console.warn('⚠️ Barcode scanner error:', error.message);
                    this.barcodeScanner = null;
                });
            }
        } catch (error) {
            console.warn('⚠️ Barcode scanner initialization failed:', error.message);
            this.barcodeScanner = null;
        }
    }
    
    handleBarcodeScanned(barcode) {
        // Send barcode to the renderer process
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getFocusedWindow();
        
        if (mainWindow) {
            mainWindow.webContents.send('barcode-scanned', barcode);
        }
    }
    
    async printReceipt(receiptData) {
        if (!this.printer) {
            throw new Error('Printer not available');
        }
        
        try {
            this.printer.clear();
            
            // Store header
            if (receiptData.store) {
                this.printer.alignCenter();
                this.printer.setTypeFontB();
                this.printer.bold(true);
                this.printer.println(receiptData.store.name || 'GiLi Store');
                this.printer.bold(false);
                
                if (receiptData.store.address) {
                    this.printer.println(receiptData.store.address);
                }
                if (receiptData.store.phone) {
                    this.printer.println(`Phone: ${receiptData.store.phone}`);
                }
                if (receiptData.store.email) {
                    this.printer.println(`Email: ${receiptData.store.email}`);
                }
                
                this.printer.newLine();
                this.printer.drawLine();
            }
            
            // Transaction header
            this.printer.alignLeft();
            this.printer.setTypeFontA();
            
            if (receiptData.type === 'refund') {
                this.printer.bold(true);
                this.printer.println('*** REFUND ***');
                this.printer.bold(false);
                this.printer.println(`Refund ID: ${receiptData.refund.id}`);
                this.printer.println(`Original: ${receiptData.refund.original_transaction_id}`);
                this.printer.println(`Amount: $${receiptData.refund.amount.toFixed(2)}`);
                this.printer.println(`Reason: ${receiptData.refund.reason || 'N/A'}`);
            } else {
                this.printer.println(`Transaction: ${receiptData.transaction.id}`);
                this.printer.println(`Date: ${receiptData.timestamp}`);
                
                if (receiptData.transaction.customer_id) {
                    this.printer.println(`Customer: ${receiptData.transaction.customer_id}`);
                }
                
                this.printer.newLine();
                this.printer.drawLine();
                
                // Items
                this.printer.tableCustom([
                    { text: 'Item', align: 'LEFT', width: 0.5 },
                    { text: 'Qty', align: 'CENTER', width: 0.15 },
                    { text: 'Price', align: 'RIGHT', width: 0.15 },
                    { text: 'Total', align: 'RIGHT', width: 0.2 }
                ]);
                
                receiptData.transaction.items.forEach(item => {
                    this.printer.tableCustom([
                        { text: item.product_name, align: 'LEFT', width: 0.5 },
                        { text: item.quantity.toString(), align: 'CENTER', width: 0.15 },
                        { text: `$${item.unit_price.toFixed(2)}`, align: 'RIGHT', width: 0.15 },
                        { text: `$${item.line_total.toFixed(2)}`, align: 'RIGHT', width: 0.2 }
                    ]);
                });
                
                this.printer.drawLine();
                
                // Totals
                this.printer.tableCustom([
                    { text: 'Subtotal:', align: 'LEFT', width: 0.7 },
                    { text: `$${receiptData.transaction.subtotal.toFixed(2)}`, align: 'RIGHT', width: 0.3 }
                ]);
                
                if (receiptData.transaction.discount_amount > 0) {
                    this.printer.tableCustom([
                        { text: 'Discount:', align: 'LEFT', width: 0.7 },
                        { text: `-$${receiptData.transaction.discount_amount.toFixed(2)}`, align: 'RIGHT', width: 0.3 }
                    ]);
                }
                
                this.printer.tableCustom([
                    { text: 'Tax:', align: 'LEFT', width: 0.7 },
                    { text: `$${receiptData.transaction.tax_amount.toFixed(2)}`, align: 'RIGHT', width: 0.3 }
                ]);
                
                this.printer.bold(true);
                this.printer.tableCustom([
                    { text: 'TOTAL:', align: 'LEFT', width: 0.7 },
                    { text: `$${receiptData.transaction.total.toFixed(2)}`, align: 'RIGHT', width: 0.3 }
                ]);
                this.printer.bold(false);
                
                this.printer.drawLine();
                
                // Payment info
                this.printer.println(`Payment: ${receiptData.transaction.payment_method.toUpperCase()}`);
                
                if (receiptData.payment && receiptData.payment.change > 0) {
                    this.printer.println(`Paid: $${receiptData.payment.amount_received.toFixed(2)}`);
                    this.printer.println(`Change: $${receiptData.payment.change.toFixed(2)}`);
                }
            }
            
            this.printer.newLine();
            this.printer.drawLine();
            
            // Footer
            this.printer.alignCenter();
            this.printer.println('Thank you for your business!');
            this.printer.println('Please come again');
            
            if (receiptData.store && receiptData.store.receipt_footer) {
                this.printer.newLine();
                this.printer.println(receiptData.store.receipt_footer);
            }
            
            this.printer.newLine();
            this.printer.newLine();
            this.printer.newLine();
            
            // Cut paper
            this.printer.cut();
            
            // Send to printer
            await this.printer.execute();
            
            console.log('✅ Receipt printed successfully');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Receipt printing failed:', error);
            throw new Error(`Receipt printing failed: ${error.message}`);
        }
    }
    
    async openCashDrawer() {
        if (!this.cashDrawer) {
            console.warn('Cash drawer not available');
            return { success: false, error: 'Cash drawer not connected' };
        }
        
        try {
            // ESC/POS command to open cash drawer
            const openCommand = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
            
            return new Promise((resolve, reject) => {
                this.cashDrawer.write(openCommand, (error) => {
                    if (error) {
                        console.error('Cash drawer open failed:', error);
                        reject(new Error(`Cash drawer error: ${error.message}`));
                    } else {
                        console.log('✅ Cash drawer opened');
                        resolve({ success: true });
                    }
                });
            });
        } catch (error) {
            console.error('Cash drawer error:', error);
            throw new Error(`Cash drawer error: ${error.message}`);
        }
    }
    
    async testPrinter() {
        if (!this.printer) {
            throw new Error('Printer not available');
        }
        
        try {
            this.printer.clear();
            this.printer.alignCenter();
            this.printer.setTypeFontB();
            this.printer.bold(true);
            this.printer.println('GiLi PoS');
            this.printer.bold(false);
            this.printer.newLine();
            this.printer.println('Printer Test');
            this.printer.println(new Date().toLocaleString());
            this.printer.newLine();
            this.printer.println('If you can read this,');
            this.printer.println('your printer is working!');
            this.printer.newLine();
            this.printer.newLine();
            this.printer.cut();
            
            await this.printer.execute();
            
            return { success: true };
        } catch (error) {
            throw new Error(`Printer test failed: ${error.message}`);
        }
    }
    
    getStatus() {
        return {
            initialized: this.initialized,
            printer: {
                connected: !!this.printer,
                type: this.settings.printer.type,
                interface: this.settings.printer.interface
            },
            cashDrawer: {
                connected: !!this.cashDrawer,
                port: this.settings.cashDrawer.port
            },
            barcodeScanner: {
                connected: !!this.barcodeScanner,
                port: this.settings.scanner.port
            }
        };
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Save settings
        try {
            const Store = require('electron-store');
            const store = new Store();
            store.set('hardware', this.settings);
        } catch (error) {
            console.warn('Could not save hardware settings:', error);
        }
        
        // Re-initialize with new settings
        this.initialize();
    }
    
    disconnect() {
        if (this.cashDrawer && this.cashDrawer.isOpen) {
            this.cashDrawer.close();
        }
        
        if (this.barcodeScanner && this.barcodeScanner.isOpen) {
            this.barcodeScanner.close();
        }
        
        this.initialized = false;
        console.log('Hardware manager disconnected');
    }
}

module.exports = { HardwareManager };
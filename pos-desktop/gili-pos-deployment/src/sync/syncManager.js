// Data Synchronization Manager (Backend) - Integrated with GiLi System
const axios = require('axios');
const { getDatabase } = require('../database/sqlite');

class SyncManager {
    constructor() {
        this.serverUrl = process.env.GILI_SERVER_URL || 'https://api-production-8536.up.railway.app';
        this.deviceId = this.generateDeviceId();
        this.deviceName = require('os').hostname() || 'GiLi-PoS-Device';
        this.isOnline = false;
        this.lastSyncTime = null;
        this.db = null;
    }
    
    async initialize() {
        this.db = getDatabase();
        await this.checkConnection();
        this.loadLastSyncTime();
        this.registerDevice();
    }
    
    generateDeviceId() {
        const crypto = require('crypto');
        const { machineId } = require('os');
        
        try {
            // Use machine ID if available, otherwise generate one
            return crypto.createHash('sha256').update(machineId || require('os').hostname()).digest('hex').substring(0, 16);
        } catch {
            return crypto.randomBytes(8).toString('hex');
        }
    }
    
    async registerDevice() {
        try {
            await axios.post(`${this.serverUrl}/api/pos/device-register`, {
                device_id: this.deviceId,
                device_name: this.deviceName,
                device_type: 'pos_terminal',
                os_platform: require('os').platform(),
                app_version: '1.0.0'
            });
            console.log(`✅ PoS device registered: ${this.deviceId}`);
        } catch (error) {
            console.warn('⚠️ Device registration failed:', error.message);
        }
    }
    
    async checkConnection() {
        try {
            const response = await axios.get(`${this.serverUrl}/api/pos/health`, { timeout: 5000 });
            this.isOnline = response.status === 200;
            
            if (this.isOnline) {
                console.log('✅ GiLi backend connection established');
                console.log(`📊 Products available: ${response.data.products_available}`);
                console.log(`👥 Customers available: ${response.data.customers_available}`);
            }
        } catch (error) {
            this.isOnline = false;
            console.warn('⚠️ GiLi backend connection failed:', error.message);
        }
        return this.isOnline;
    }
    
    loadLastSyncTime() {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT value FROM settings WHERE key = ?',
                ['last_sync_time'],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.lastSyncTime = row ? row.value : null;
                        resolve(this.lastSyncTime);
                    }
                }
            );
        });
    }
    
    async saveLastSyncTime(timestamp) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                ['last_sync_time', timestamp],
                (err) => {
                    if (err) reject(err);
                    else {
                        this.lastSyncTime = timestamp;
                        resolve();
                    }
                }
            );
        });
    }
    
    async syncAll() {
        if (!this.isOnline) {
            await this.checkConnection();
            if (!this.isOnline) {
                throw new Error('Cannot sync: GiLi backend not available');
            }
        }
        
        try {
            console.log('🔄 Starting GiLi PoS synchronization...');
            
            // 1. Upload pending transactions first
            await this.uploadPendingTransactions();
            
            // 2. Request complete sync from GiLi backend
            const syncResult = await this.requestFullSync();
            
            // 3. Process sync response
            await this.processSyncResponse(syncResult);
            
            // 4. Update sync time
            const syncTime = new Date().toISOString();
            await this.saveLastSyncTime(syncTime);
            
            console.log('✅ GiLi PoS synchronization completed');
            console.log(`📦 Products updated: ${syncResult.products_updated}`);
            console.log(`👥 Customers updated: ${syncResult.customers_updated}`);
            console.log(`💰 Transactions processed: ${syncResult.transactions_processed}`);
            
            return { 
                success: true, 
                timestamp: syncTime,
                ...syncResult
            };
            
        } catch (error) {
            console.error('❌ GiLi PoS synchronization failed:', error);
            throw error;
        }
    }
    
    async requestFullSync() {
        const syncRequest = {
            device_id: this.deviceId,
            device_name: this.deviceName,
            last_sync: this.lastSyncTime,
            sync_types: ['products', 'customers']
        };
        
        const response = await axios.post(
            `${this.serverUrl}/api/pos/sync`,
            syncRequest,
            { 
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': `GiLi-PoS/${this.deviceId}`
                }
            }
        );
        
        if (!response.data.success && response.data.errors.length > 0) {
            console.warn('⚠️ Sync completed with errors:', response.data.errors);
        }
        
        return response.data;
    }
    
    async processSyncResponse(syncResult) {
        // Process new products from GiLi backend
        if (syncResult.products_updated > 0) {
            await this.downloadProducts();
        }
        
        // Process new customers from GiLi backend
        if (syncResult.customers_updated > 0) {
            await this.downloadCustomers();
        }
    }
    
    async downloadProducts() {
        try {
            const response = await axios.get(
                `${this.serverUrl}/api/pos/products`,
                { 
                    params: { limit: 1000, active_only: true },
                    timeout: 15000 
                }
            );
            
            const products = response.data;
            let updateCount = 0;
            
            for (const product of products) {
                await this.upsertProduct({
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    barcode: product.barcode,
                    price: product.price,
                    category: product.category,
                    description: product.description,
                    stock_quantity: product.stock_quantity,
                    image_url: product.image_url,
                    active: product.active,
                    synced: true,
                    server_id: product.id,
                    updated_at: new Date().toISOString()
                });
                updateCount++;
            }
            
            console.log(`✅ Downloaded ${updateCount} products from GiLi backend`);
            
        } catch (error) {
            console.error('❌ Failed to download products:', error.message);
            throw error;
        }
    }
    
    async downloadCustomers() {
        try {
            const response = await axios.get(
                `${this.serverUrl}/api/pos/customers`,
                { 
                    params: { limit: 500 },
                    timeout: 15000 
                }
            );
            
            const customers = response.data;
            let updateCount = 0;
            
            for (const customer of customers) {
                await this.upsertCustomer({
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    loyalty_points: customer.loyalty_points || 0,
                    synced: true,
                    server_id: customer.id,
                    updated_at: new Date().toISOString()
                });
                updateCount++;
            }
            
            console.log(`✅ Downloaded ${updateCount} customers from GiLi backend`);
            
        } catch (error) {
            console.error('❌ Failed to download customers:', error.message);
            throw error;
        }
    }
    
    async uploadPendingTransactions() {
        const unsyncedTransactions = await this.getUnsyncedTransactions();
        
        if (unsyncedTransactions.length === 0) {
            console.log('📝 No pending transactions to upload');
            return;
        }
        
        console.log(`📤 Uploading ${unsyncedTransactions.length} transactions to GiLi backend...`);
        
        // Process in batches to avoid overwhelming the server
        const batchSize = 10;
        let processedCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < unsyncedTransactions.length; i += batchSize) {
            const batch = unsyncedTransactions.slice(i, i + batchSize);
            
            try {
                const giliTransactions = batch.map(transaction => this.convertToGiLiFormat(transaction));
                
                const response = await axios.post(
                    `${this.serverUrl}/api/pos/transactions/batch`,
                    giliTransactions,
                    {
                        timeout: 30000,
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': `GiLi-PoS/${this.deviceId}`
                        }
                    }
                );
                
                // Mark successful transactions as synced
                for (const result of response.data.results) {
                    if (result.success) {
                        await this.markTransactionSynced(result.pos_transaction_id, result.sales_order_id);
                        processedCount++;
                    }
                }
                
                // Log errors
                for (const error of response.data.error_details) {
                    console.error(`❌ Transaction ${error.pos_transaction_id} failed:`, error.error);
                    await this.logSyncError('transactions', error.pos_transaction_id, error.error);
                    errorCount++;
                }
                
            } catch (error) {
                console.error('❌ Batch upload failed:', error.message);
                errorCount += batch.length;
                
                // Log all transactions in this batch as failed
                for (const transaction of batch) {
                    await this.logSyncError('transactions', transaction.id, error.message);
                }
            }
        }
        
        console.log(`✅ Transactions processed: ${processedCount} success, ${errorCount} failed`);
    }
    
    convertToGiLiFormat(posTransaction) {
        return {
            pos_transaction_id: posTransaction.id,
            store_location: 'Main Store',
            cashier_id: posTransaction.cashier_id || 'pos_user',
            customer_id: posTransaction.customer_id,
            items: JSON.parse(posTransaction.items).map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percent: item.discount_percent || 0,
                line_total: item.line_total
            })),
            subtotal: posTransaction.subtotal,
            tax_amount: posTransaction.tax_amount,
            discount_amount: posTransaction.discount_amount,
            total_amount: posTransaction.total,
            payment_method: posTransaction.payment_method,
            payment_details: JSON.parse(posTransaction.payment_details || '{}'),
            status: posTransaction.status,
            transaction_timestamp: new Date(posTransaction.created_at),
            pos_device_id: this.deviceId,
            receipt_number: posTransaction.receipt_number
        };
    }
    
    // Database helper methods remain the same as before...
    getUnsyncedTransactions() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM transactions WHERE synced = 0 ORDER BY created_at',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
    
    markTransactionSynced(localId, serverId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE transactions SET synced = 1, server_id = ? WHERE id = ?',
                [serverId, localId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
    
    upsertProduct(product) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT OR REPLACE INTO products (
                    id, name, sku, barcode, price, category, description,
                    stock_quantity, image_url, active, synced, server_id, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                product.id, product.name, product.sku, product.barcode,
                product.price, product.category, product.description,
                product.stock_quantity, product.image_url, product.active,
                product.synced, product.server_id, product.updated_at
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
    
    upsertCustomer(customer) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT OR REPLACE INTO customers (
                    id, name, email, phone, address, loyalty_points, synced, server_id, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                customer.id, customer.name, customer.email, customer.phone,
                customer.address, customer.loyalty_points || 0, customer.synced, 
                customer.server_id, customer.updated_at
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
    
    logSyncError(tableName, recordId, errorMessage) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO sync_log (table_name, operation, record_id, sync_status, error_message)
                VALUES (?, ?, ?, ?, ?)
            `, [tableName, 'sync', recordId, 'failed', errorMessage], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
    
    async getSyncStatus() {
        try {
            const response = await axios.get(
                `${this.serverUrl}/api/pos/sync-status/${this.deviceId}`,
                { timeout: 5000 }
            );
            
            return {
                online: this.isOnline,
                lastSync: this.lastSyncTime,
                serverUrl: this.serverUrl,
                deviceId: this.deviceId,
                serverStatus: response.data
            };
        } catch (error) {
            return {
                online: false,
                lastSync: this.lastSyncTime,
                serverUrl: this.serverUrl,
                deviceId: this.deviceId,
                error: error.message
            };
        }
    }
    
    // Search integration with GiLi backend
    async searchProducts(query) {
        if (!this.isOnline) {
            // Fallback to local search
            return this.searchProductsLocal(query);
        }
        
        try {
            const response = await axios.get(
                `${this.serverUrl}/api/pos/products`,
                {
                    params: { search: query, limit: 20 },
                    timeout: 5000
                }
            );
            
            return response.data;
        } catch (error) {
            console.warn('Online search failed, using local fallback');
            return this.searchProductsLocal(query);
        }
    }
    
    async searchProductsLocal(query) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM products 
                WHERE active = 1 AND (
                    name LIKE ? OR 
                    sku LIKE ? OR 
                    barcode LIKE ?
                )
                LIMIT 20
            `, [`%${query}%`, `%${query}%`, `%${query}%`], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
    
    // Real-time status monitoring
    startHeartbeat() {
        setInterval(async () => {
            await this.checkConnection();
        }, 60000); // Check every minute
    }
    
    // Emergency offline mode
    async enterOfflineMode() {
        this.isOnline = false;
        console.log('⚠️ Entered offline mode - transactions will be queued for sync');
        
        // Notify the renderer process
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getFocusedWindow();
        if (mainWindow) {
            mainWindow.webContents.send('sync-status-changed', {
                online: false,
                message: 'Operating in offline mode. Transactions will be synced when connection is restored.'
            });
        }
    }
}

module.exports = { SyncManager };
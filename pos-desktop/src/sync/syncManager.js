// Data Synchronization Manager (Backend)
const axios = require('axios');
const { getDatabase } = require('../database/sqlite');

class SyncManager {
    constructor() {
        this.serverUrl = process.env.GILI_SERVER_URL || 'http://localhost:8001';
        this.isOnline = false;
        this.lastSyncTime = null;
        this.db = null;
    }
    
    async initialize() {
        this.db = getDatabase();
        await this.checkConnection();
        this.loadLastSyncTime();
    }
    
    async checkConnection() {
        try {
            const response = await axios.get(`${this.serverUrl}/api/`, { timeout: 5000 });
            this.isOnline = response.status === 200;
        } catch (error) {
            this.isOnline = false;
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
                throw new Error('No internet connection');
            }
        }
        
        try {
            console.log('🔄 Starting full synchronization...');
            
            // Upload local changes first
            await this.uploadTransactions();
            await this.uploadCustomers();
            
            // Download server data
            await this.downloadProducts();
            await this.downloadCustomers();
            
            // Update sync time
            const syncTime = new Date().toISOString();
            await this.saveLastSyncTime(syncTime);
            
            console.log('✅ Synchronization completed');
            return { success: true, timestamp: syncTime };
            
        } catch (error) {
            console.error('❌ Synchronization failed:', error);
            throw error;
        }
    }
    
    async uploadTransactions() {
        const transactions = await this.getUnsyncedTransactions();
        
        for (const transaction of transactions) {
            try {
                const salesOrder = this.convertToSalesOrder(transaction);
                
                const response = await axios.post(
                    `${this.serverUrl}/api/sales-orders`,
                    salesOrder,
                    { timeout: 10000 }
                );
                
                if (response.status === 201) {
                    await this.markTransactionSynced(transaction.id, response.data.id);
                    console.log(`✅ Transaction ${transaction.id} synced`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to sync transaction ${transaction.id}:`, error.message);
                await this.logSyncError('transactions', transaction.id, error.message);
            }
        }
    }
    
    async uploadCustomers() {
        const customers = await this.getUnsyncedCustomers();
        
        for (const customer of customers) {
            try {
                const customerData = {
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address
                };
                
                const response = await axios.post(
                    `${this.serverUrl}/api/customers`,
                    customerData,
                    { timeout: 10000 }
                );
                
                if (response.status === 201) {
                    await this.markCustomerSynced(customer.id, response.data.id);
                    console.log(`✅ Customer ${customer.id} synced`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to sync customer ${customer.id}:`, error.message);
                await this.logSyncError('customers', customer.id, error.message);
            }
        }
    }
    
    async downloadProducts() {
        try {
            const response = await axios.get(
                `${this.serverUrl}/api/items`,
                { timeout: 15000 }
            );
            
            if (response.status === 200 && response.data) {
                const products = Array.isArray(response.data) ? response.data : [response.data];
                
                for (const product of products) {
                    await this.upsertProduct({
                        id: product.id,
                        name: product.name,
                        sku: product.item_code,
                        barcode: product.barcode,
                        price: product.price || 0,
                        category: product.category,
                        description: product.description,
                        stock_quantity: product.stock_quantity || 0,
                        image_url: product.image,
                        active: true,
                        synced: true,
                        server_id: product.id,
                        updated_at: new Date().toISOString()
                    });
                }
                
                console.log(`✅ Downloaded ${products.length} products`);
            }
            
        } catch (error) {
            console.error('❌ Failed to download products:', error.message);
            throw error;
        }
    }
    
    async downloadCustomers() {
        try {
            const response = await axios.get(
                `${this.serverUrl}/api/customers`,
                { timeout: 15000 }
            );
            
            if (response.status === 200 && response.data) {
                const customers = Array.isArray(response.data) ? response.data : [response.data];
                
                for (const customer of customers) {
                    await this.upsertCustomer({
                        id: customer.id,
                        name: customer.name,
                        email: customer.email,
                        phone: customer.phone,
                        address: customer.address,
                        synced: true,
                        server_id: customer.id,
                        updated_at: new Date().toISOString()
                    });
                }
                
                console.log(`✅ Downloaded ${customers.length} customers`);
            }
            
        } catch (error) {
            console.error('❌ Failed to download customers:', error.message);
            throw error;
        }
    }
    
    convertToSalesOrder(transaction) {
        return {
            customer: transaction.customer_id || 'Guest Customer',
            items: transaction.items.map(item => ({
                item: item.product_id,
                quantity: item.quantity,
                rate: item.unit_price,
                amount: item.line_total
            })),
            total: transaction.total,
            payment_method: transaction.payment_method,
            pos_transaction_id: transaction.id,
            transaction_date: transaction.created_at
        };
    }
    
    // Database helper methods
    getUnsyncedTransactions() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM transactions WHERE synced = 0 ORDER BY created_at',
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        // Parse items JSON
                        const transactions = rows.map(row => ({
                            ...row,
                            items: JSON.parse(row.items)
                        }));
                        resolve(transactions);
                    }
                }
            );
        });
    }
    
    getUnsyncedCustomers() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM customers WHERE synced = 0 ORDER BY created_at',
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
    
    markCustomerSynced(localId, serverId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE customers SET synced = 1, server_id = ? WHERE id = ?',
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
                    id, name, email, phone, address, synced, server_id, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                customer.id, customer.name, customer.email, customer.phone,
                customer.address, customer.synced, customer.server_id, customer.updated_at
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
    
    getSyncStatus() {
        return {
            online: this.isOnline,
            lastSync: this.lastSyncTime,
            serverUrl: this.serverUrl
        };
    }
}

module.exports = { SyncManager };
// Data Synchronization Manager
const { ipcRenderer } = require('electron');

class SyncManager {
    constructor() {
        this.isOnline = false;
        this.lastSyncTime = null;
        this.syncInProgress = false;
        this.serverUrl = 'http://localhost:8001';
        this.syncInterval = 5 * 60 * 1000; // 5 minutes
        this.autoSyncTimer = null;
    }
    
    async init() {
        // Check initial connection status
        await this.checkConnection();
        
        // Start auto-sync if enabled
        this.startAutoSync();
        
        // Listen for connection changes
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.checkConnection();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.stopAutoSync();
        });
    }
    
    async checkConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/api/`, {
                method: 'GET',
                timeout: 5000
            });
            
            this.isOnline = response.ok;
            
            if (this.isOnline) {
                this.startAutoSync();
            }
        } catch (error) {
            this.isOnline = false;
            this.stopAutoSync();
        }
        
        return this.isOnline;
    }
    
    startAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
        }
        
        this.autoSyncTimer = setInterval(async () => {
            if (this.isOnline && !this.syncInProgress) {
                await this.syncAll();
            }
        }, this.syncInterval);
    }
    
    stopAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }
    }
    
    async syncAll() {
        if (this.syncInProgress) {
            console.warn('Sync already in progress');
            return { success: false, error: 'Sync in progress' };
        }
        
        this.syncInProgress = true;
        
        try {
            console.log('🔄 Starting data synchronization...');
            
            const results = {
                products: await this.syncProducts(),
                customers: await this.syncCustomers(),
                transactions: await this.syncTransactions(),
                timestamp: new Date().toISOString()
            };
            
            // Check if all syncs were successful
            const success = Object.values(results).every(result => 
                result && result.success !== false
            );
            
            if (success) {
                this.lastSyncTime = results.timestamp;
                console.log('✅ Synchronization completed successfully');
                return { success: true, results: results };
            } else {
                console.error('❌ Some synchronization operations failed');
                return { success: false, results: results };
            }
            
        } catch (error) {
            console.error('❌ Synchronization failed:', error);
            return { success: false, error: error.message };
        } finally {
            this.syncInProgress = false;
        }
    }
    
    async syncProducts() {
        try {
            console.log('🔄 Syncing products...');
            
            // Get local products that need syncing
            const localProducts = await this.getUnsyncedLocalData('products');
            
            // Upload new/modified local products
            for (const product of localProducts) {
                if (!product.synced) {
                    await this.uploadProduct(product);
                }
            }
            
            // Download products from server
            const serverProducts = await this.downloadProducts();
            
            // Update local database
            await this.updateLocalProducts(serverProducts);
            
            console.log('✅ Products synced successfully');
            return { success: true, count: serverProducts.length };
            
        } catch (error) {
            console.error('❌ Product sync failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async syncCustomers() {
        try {
            console.log('🔄 Syncing customers...');
            
            // Similar process for customers
            const localCustomers = await this.getUnsyncedLocalData('customers');
            
            for (const customer of localCustomers) {
                if (!customer.synced) {
                    await this.uploadCustomer(customer);
                }
            }
            
            const serverCustomers = await this.downloadCustomers();
            await this.updateLocalCustomers(serverCustomers);
            
            console.log('✅ Customers synced successfully');
            return { success: true, count: serverCustomers.length };
            
        } catch (error) {
            console.error('❌ Customer sync failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async syncTransactions() {
        try {
            console.log('🔄 Syncing transactions...');
            
            // Upload unsynced transactions
            const localTransactions = await this.getUnsyncedLocalData('transactions');
            
            for (const transaction of localTransactions) {
                if (!transaction.synced) {
                    await this.uploadTransaction(transaction);
                }
            }
            
            console.log('✅ Transactions synced successfully');
            return { success: true, count: localTransactions.length };
            
        } catch (error) {
            console.error('❌ Transaction sync failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getUnsyncedLocalData(tableName) {
        return await ipcRenderer.invoke('pos:get-unsynced-data', tableName);
    }
    
    async uploadProduct(product) {
        try {
            const response = await fetch(`${this.serverUrl}/api/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: product.name,
                    item_code: product.sku,
                    barcode: product.barcode,
                    standard_rate: product.price,
                    item_group: product.category,
                    description: product.description,
                    stock_uom: 'Nos',
                    is_stock_item: 1,
                    include_item_in_manufacturing: 0
                })
            });
            
            if (response.ok) {
                const serverProduct = await response.json();
                // Mark as synced locally
                await ipcRenderer.invoke('pos:mark-synced', 'products', product.id, serverProduct.name);
                return serverProduct;
            }
        } catch (error) {
            console.error('Error uploading product:', error);
            throw error;
        }
    }
    
    async downloadProducts() {
        try {
            const response = await fetch(`${this.serverUrl}/api/items?fields=["name","item_code","barcode","standard_rate","item_group","description","stock_uom"]&limit_page_length=1000`);
            
            if (response.ok) {
                const data = await response.json();
                return data.data || [];
            }
            
            throw new Error('Failed to download products');
        } catch (error) {
            console.error('Error downloading products:', error);
            throw error;
        }
    }
    
    async updateLocalProducts(serverProducts) {
        for (const serverProduct of serverProducts) {
            const localProduct = {
                id: serverProduct.name,
                name: serverProduct.name,
                sku: serverProduct.item_code,
                barcode: serverProduct.barcode,
                price: serverProduct.standard_rate || 0,
                category: serverProduct.item_group,
                description: serverProduct.description,
                stock_quantity: 0, // Will be updated separately
                synced: true,
                server_id: serverProduct.name,
                updated_at: new Date().toISOString()
            };
            
            await ipcRenderer.invoke('pos:upsert-product', localProduct);
        }
    }
    
    async uploadCustomer(customer) {
        try {
            const response = await fetch(`${this.serverUrl}/api/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer_name: customer.name,
                    customer_type: 'Individual',
                    territory: 'All Territories',
                    customer_group: 'All Customer Groups'
                })
            });
            
            if (response.ok) {
                const serverCustomer = await response.json();
                await ipcRenderer.invoke('pos:mark-synced', 'customers', customer.id, serverCustomer.name);
                return serverCustomer;
            }
        } catch (error) {
            console.error('Error uploading customer:', error);
            throw error;
        }
    }
    
    async downloadCustomers() {
        try {
            const response = await fetch(`${this.serverUrl}/api/customers?fields=["name","customer_name","customer_type","territory"]&limit_page_length=1000`);
            
            if (response.ok) {
                const data = await response.json();
                return data.data || [];
            }
            
            throw new Error('Failed to download customers');
        } catch (error) {
            console.error('Error downloading customers:', error);
            throw error;
        }
    }
    
    async updateLocalCustomers(serverCustomers) {
        for (const serverCustomer of serverCustomers) {
            const localCustomer = {
                id: serverCustomer.name,
                name: serverCustomer.customer_name,
                customer_type: serverCustomer.customer_type,
                synced: true,
                server_id: serverCustomer.name,
                updated_at: new Date().toISOString()
            };
            
            await ipcRenderer.invoke('pos:upsert-customer', localCustomer);
        }
    }
    
    async uploadTransaction(transaction) {
        try {
            // Convert PoS transaction to Sales Invoice format
            const salesInvoice = {
                customer: transaction.customer_id || 'Walk-In Customer',
                posting_date: new Date(transaction.created_at).toISOString().split('T')[0],
                posting_time: new Date(transaction.created_at).toTimeString().split(' ')[0],
                items: transaction.items.map(item => ({
                    item_code: item.product_id,
                    item_name: item.product_name,
                    qty: item.quantity,
                    rate: item.unit_price,
                    amount: item.line_total
                })),
                total_qty: transaction.items.reduce((sum, item) => sum + item.quantity, 0),
                net_total: transaction.subtotal,
                grand_total: transaction.total,
                mode_of_payment: transaction.payment_method,
                is_pos: 1,
                pos_profile: 'Main'
            };
            
            const response = await fetch(`${this.serverUrl}/api/sales-invoices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(salesInvoice)
            });
            
            if (response.ok) {
                const serverTransaction = await response.json();
                await ipcRenderer.invoke('pos:mark-synced', 'transactions', transaction.id, serverTransaction.name);
                return serverTransaction;
            }
        } catch (error) {
            console.error('Error uploading transaction:', error);
            throw error;
        }
    }
    
    getSyncStatus() {
        return {
            online: this.isOnline,
            lastSync: this.lastSyncTime,
            syncInProgress: this.syncInProgress,
            autoSyncEnabled: !!this.autoSyncTimer
        };
    }
    
    // Force sync of specific data type
    async forceSyncProducts() {
        return await this.syncProducts();
    }
    
    async forceSyncCustomers() {
        return await this.syncCustomers();
    }
    
    async forceSyncTransactions() {
        return await this.syncTransactions();
    }
    
    // Conflict resolution
    async resolveConflicts(conflictType, localData, serverData, resolution = 'server') {
        try {
            switch (resolution) {
                case 'server':
                    // Use server data
                    await this.updateLocalData(conflictType, serverData);
                    break;
                case 'local':
                    // Use local data
                    await this.uploadLocalData(conflictType, localData);
                    break;
                case 'merge':
                    // Merge data (custom logic based on data type)
                    const merged = this.mergeData(localData, serverData);
                    await this.updateBothSides(conflictType, merged);
                    break;
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncManager;
}
// Frontend Data Synchronization - Integrated with GiLi Backend
const { ipcRenderer } = require('electron');

class SyncManager {
    constructor() {
        this.isOnline = false;
        this.lastSyncTime = null;
        this.syncInProgress = false;
        this.serverUrl = 'http://localhost:8001'; // Will be loaded from config
        this.syncInterval = 5 * 60 * 1000; // 5 minutes
        this.autoSyncTimer = null;
        this.deviceId = null;
    }
    
    async init() {
        // Get device ID from main process
        this.deviceId = await ipcRenderer.invoke('pos:get-device-id');
        
        // Check initial connection status
        await this.checkConnection();
        
        // Start auto-sync if enabled
        this.startAutoSync();
        
        // Listen for connection changes
        window.addEventListener('online', () => {
            console.log('🌐 Network connection restored');
            this.handleConnectionRestore();
        });
        
        window.addEventListener('offline', () => {
            console.log('📡 Network connection lost - entering offline mode');
            this.handleConnectionLoss();
        });
        
        // Listen for sync status updates from main process
        ipcRenderer.on('sync-status-changed', (event, status) => {
            this.updateSyncStatus(status);
        });
    }
    
    async checkConnection() {
        try {
            const status = await ipcRenderer.invoke('pos:check-connection');
            this.isOnline = status.online;
            
            if (this.isOnline) {
                console.log('✅ GiLi backend connection active');
                this.showSyncStatus('Online', 'success');
                this.startAutoSync();
            } else {
                console.log('⚠️ GiLi backend not available - offline mode');
                this.showSyncStatus('Offline', 'warning');
                this.stopAutoSync();
            }
            
            return this.isOnline;
        } catch (error) {
            this.isOnline = false;
            this.showSyncStatus('Connection Error', 'error');
            return false;
        }
    }
    
    async handleConnectionRestore() {
        this.isOnline = true;
        this.showSyncStatus('Online', 'success');
        this.startAutoSync();
        
        // Automatically sync pending data
        setTimeout(async () => {
            if (!this.syncInProgress) {
                await this.syncAll();
            }
        }, 2000);
        
        // Notify user
        if (typeof app !== 'undefined' && app.showNotification) {
            app.showNotification('Connection restored - syncing data', 'info');
        }
    }
    
    async handleConnectionLoss() {
        this.isOnline = false;
        this.showSyncStatus('Offline', 'warning');
        this.stopAutoSync();
        
        // Notify user
        if (typeof app !== 'undefined' && app.showNotification) {
            app.showNotification('Working offline - transactions will be synced when connection is restored', 'warning');
        }
    }
    
    startAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
        }
        
        this.autoSyncTimer = setInterval(async () => {
            if (this.isOnline && !this.syncInProgress) {
                try {
                    await this.syncAll();
                } catch (error) {
                    console.warn('Auto-sync failed:', error);
                }
            }
        }, this.syncInterval);
        
        console.log(`🔄 Auto-sync enabled (every ${this.syncInterval / 60000} minutes)`);
    }
    
    stopAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }
        console.log('⏹️ Auto-sync disabled');
    }
    
    async syncAll() {
        if (this.syncInProgress) {
            console.warn('Sync already in progress');
            return { success: false, error: 'Sync in progress' };
        }
        
        this.syncInProgress = true;
        this.showSyncStatus('Syncing...', 'info');
        
        try {
            console.log('🔄 Starting GiLi PoS synchronization...');
            
            const result = await ipcRenderer.invoke('pos:sync-all');
            
            if (result.success) {
                this.lastSyncTime = result.timestamp;
                this.showSyncStatus('Online', 'success');
                
                // Show success notification
                if (typeof app !== 'undefined' && app.showNotification) {
                    const message = `Sync completed successfully
📦 Products: ${result.products_updated || 0}
👥 Customers: ${result.customers_updated || 0}
💰 Transactions: ${result.transactions_processed || 0}`;
                    app.showNotification(message, 'success');
                }
                
                // Refresh product display if needed
                if (result.products_updated > 0 && typeof app !== 'undefined' && app.loadProducts) {
                    await app.loadProducts();
                }
                
                // Refresh customer list if needed
                if (result.customers_updated > 0 && typeof app !== 'undefined' && app.loadCustomers) {
                    await app.loadCustomers();
                }
                
                console.log('✅ GiLi PoS synchronization completed');
                return result;
                
            } else {
                this.showSyncStatus('Sync Error', 'error');
                
                if (typeof app !== 'undefined' && app.showNotification) {
                    app.showNotification('Sync failed: ' + (result.error || 'Unknown error'), 'error');
                }
                
                return result;
            }
            
        } catch (error) {
            console.error('❌ Synchronization failed:', error);
            this.showSyncStatus('Sync Error', 'error');
            
            if (typeof app !== 'undefined' && app.showNotification) {
                app.showNotification('Sync failed: ' + error.message, 'error');
            }
            
            return { success: false, error: error.message };
            
        } finally {
            this.syncInProgress = false;
        }
    }
    
    showSyncStatus(text, type) {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (statusIndicator && statusText) {
            // Update indicator color
            statusIndicator.className = 'w-3 h-3 rounded-full';
            switch (type) {
                case 'success':
                    statusIndicator.classList.add('bg-green-500');
                    break;
                case 'warning':
                    statusIndicator.classList.add('bg-yellow-500');
                    break;
                case 'error':
                    statusIndicator.classList.add('bg-red-500');
                    break;
                case 'info':
                    statusIndicator.classList.add('bg-blue-500');
                    break;
                default:
                    statusIndicator.classList.add('bg-gray-500');
            }
            
            // Update status text
            statusText.textContent = text;
            
            // Add last sync time if available
            if (this.lastSyncTime && type === 'success') {
                const syncTime = new Date(this.lastSyncTime);
                statusText.textContent += ` (${syncTime.toLocaleTimeString()})`;
            }
        }
    }
    
    updateSyncStatus(status) {
        this.isOnline = status.online;
        
        if (status.online) {
            this.showSyncStatus('Online', 'success');
        } else {
            this.showSyncStatus(status.message || 'Offline', 'warning');
        }
    }
    
    // Manual sync trigger
    async manualSync() {
        const syncBtn = document.getElementById('sync-btn');
        
        if (syncBtn) {
            syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
            syncBtn.disabled = true;
        }
        
        try {
            const result = await this.syncAll();
            return result;
        } finally {
            if (syncBtn) {
                syncBtn.innerHTML = '<i class="fas fa-sync"></i> Sync';
                syncBtn.disabled = false;
            }
        }
    }
    
    // Get sync statistics for display
    async getSyncStats() {
        try {
            const stats = await ipcRenderer.invoke('pos:get-sync-stats');
            return {
                deviceId: this.deviceId,
                lastSync: this.lastSyncTime,
                isOnline: this.isOnline,
                pendingTransactions: stats.pendingTransactions || 0,
                syncInProgress: this.syncInProgress,
                autoSyncEnabled: !!this.autoSyncTimer,
                serverUrl: this.serverUrl
            };
        } catch (error) {
            return {
                deviceId: this.deviceId,
                lastSync: this.lastSyncTime,
                isOnline: false,
                error: error.message
            };
        }
    }
    
    // Product search with GiLi backend
    async searchProducts(query) {
        try {
            const products = await ipcRenderer.invoke('pos:search-products', query);
            return products;
        } catch (error) {
            console.error('Product search failed:', error);
            return [];
        }
    }
    
    // Customer search with GiLi backend
    async searchCustomers(query) {
        try {
            const customers = await ipcRenderer.invoke('pos:search-customers', query);
            return customers;
        } catch (error) {
            console.error('Customer search failed:', error);
            return [];
        }
    }
    
    // Real-time inventory check
    async checkInventory(productId, quantity) {
        try {
            const available = await ipcRenderer.invoke('pos:check-inventory', productId, quantity);
            return available;
        } catch (error) {
            console.warn('Inventory check failed, assuming available:', error);
            return true;
        }
    }
    
    // Create customer in GiLi system
    async createCustomer(customerData) {
        try {
            const result = await ipcRenderer.invoke('pos:create-customer', customerData);
            
            if (result.success) {
                if (typeof app !== 'undefined' && app.showNotification) {
                    app.showNotification('Customer created successfully', 'success');
                }
                
                // Refresh customer list
                if (typeof app !== 'undefined' && app.loadCustomers) {
                    await app.loadCustomers();
                }
            }
            
            return result;
        } catch (error) {
            console.error('Customer creation failed:', error);
            throw error;
        }
    }
    
    // Get detailed sync status
    async getDetailedStatus() {
        try {
            const status = await ipcRenderer.invoke('pos:get-detailed-sync-status');
            return {
                ...status,
                frontend: {
                    isOnline: this.isOnline,
                    lastSyncTime: this.lastSyncTime,
                    syncInProgress: this.syncInProgress,
                    autoSyncEnabled: !!this.autoSyncTimer,
                    syncInterval: this.syncInterval
                }
            };
        } catch (error) {
            return {
                error: error.message,
                frontend: {
                    isOnline: this.isOnline,
                    lastSyncTime: this.lastSyncTime,
                    syncInProgress: this.syncInProgress
                }
            };
        }
    }
    
    // Force reconnection
    async forceReconnect() {
        console.log('🔄 Forcing reconnection to GiLi backend...');
        
        this.stopAutoSync();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const connected = await this.checkConnection();
        
        if (connected) {
            this.startAutoSync();
            console.log('✅ Reconnection successful');
        } else {
            console.log('❌ Reconnection failed');
        }
        
        return connected;
    }
    
    // Emergency offline mode toggle
    toggleOfflineMode() {
        if (this.isOnline) {
            this.handleConnectionLoss();
            console.log('📡 Manually switched to offline mode');
        } else {
            this.handleConnectionRestore();
            console.log('🌐 Manually switched to online mode');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncManager;
}
// Web Storage Sync Manager - No SQLite dependencies
const axios = require('axios');
const Store = require('electron-store');

class WebSyncManager {
    constructor() {
        this.serverUrl = process.env.GILI_SERVER_URL || 'https://api-production-8536.up.railway.app';
        this.deviceId = this.generateDeviceId();
        this.deviceName = require('os').hostname() || 'GiLi-PoS-Desktop';
        this.isOnline = false;
        this.store = new Store(); // Use electron-store for persistence
    }

    generateDeviceId() {
        let deviceId = this.store.get('deviceId');
        if (!deviceId) {
            deviceId = 'gili-' + Math.random().toString(36).substr(2, 10);
            this.store.set('deviceId', deviceId);
        }
        return deviceId;
    }

    async initialize() {
        console.log('🚀 Initializing Web Sync Manager...');
        try {
            await this.checkConnection();
            await this.registerDevice();
            console.log('✅ Web Sync Manager initialized');
        } catch (error) {
            console.warn('⚠️ Sync manager initialization failed:', error.message);
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
            console.warn('❌ Backend connection failed:', error.message);
        }
    }

    async getProducts() {
        console.log('🛍️ WebSyncManager: Fetching products from server...');
        try {
            const response = await axios.get(`${this.serverUrl}/api/pos/products`, { timeout: 10000 });
            console.log('📦 Server response for products:', response.status, response.data);
            
            const products = response.data || [];
            
            // Store in local storage
            this.store.set('products', products);
            console.log(`✅ Stored ${products.length} products locally`);
            
            return products;
        } catch (error) {
            console.error('❌ Failed to fetch products from server:', error.message);
            console.log('📱 Trying cached products...');
            
            // Return cached products
            const cachedProducts = this.store.get('products', []);
            console.log(`📱 Found ${cachedProducts.length} cached products`);
            return cachedProducts;
        }
    }

    async getCustomers() {
        try {
            const response = await axios.get(`${this.serverUrl}/api/pos/customers`, { timeout: 10000 });
            const customers = response.data || [];
            
            // Store in local storage
            this.store.set('customers', customers);
            
            return customers;
        } catch (error) {
            console.error('Failed to fetch customers from server:', error.message);
            // Return cached customers
            return this.store.get('customers', []);
        }
    }

    async processTransaction(transactionData) {
        try {
            const response = await axios.post(`${this.serverUrl}/api/pos/transactions`, transactionData);
            
            // Store transaction locally as backup
            const transactions = this.store.get('transactions', []);
            transactions.push({
                ...transactionData,
                processed_at: new Date().toISOString(),
                server_response: response.data
            });
            this.store.set('transactions', transactions);
            
            return response.data;
        } catch (error) {
            console.error('Failed to process transaction:', error);
            
            // Store for later sync
            const pendingTransactions = this.store.get('pendingTransactions', []);
            pendingTransactions.push({
                ...transactionData,
                created_at: new Date().toISOString(),
                status: 'pending'
            });
            this.store.set('pendingTransactions', pendingTransactions);
            
            throw error;
        }
    }

    async syncData() {
        console.log('🔄 Syncing data...');
        
        try {
            await this.checkConnection();
            
            if (!this.isOnline) {
                console.warn('⚠️ Cannot sync - offline');
                return;
            }

            // Sync pending transactions
            const pendingTransactions = this.store.get('pendingTransactions', []);
            
            for (const transaction of pendingTransactions) {
                try {
                    await this.processTransaction(transaction);
                    // Remove from pending if successful
                    const remaining = pendingTransactions.filter(t => t !== transaction);
                    this.store.set('pendingTransactions', remaining);
                } catch (error) {
                    console.warn('Failed to sync transaction:', error.message);
                }
            }

            // Refresh products and customers
            await this.getProducts();
            await this.getCustomers();
            
            console.log('✅ Data sync completed');
        } catch (error) {
            console.error('❌ Sync failed:', error.message);
        }
    }

    getPendingTransactionsCount() {
        return this.store.get('pendingTransactions', []).length;
    }

    getStoredData() {
        return {
            products: this.store.get('products', []),
            customers: this.store.get('customers', []),
            transactions: this.store.get('transactions', []),
            pendingTransactions: this.store.get('pendingTransactions', [])
        };
    }
}

module.exports = { SyncManager: WebSyncManager };
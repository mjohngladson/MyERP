// Main PoS Application Controller
const { ipcRenderer } = require('electron');

class PoSApp {
    constructor() {
        this.cart = new Cart();
        this.products = new ProductManager();
        this.payments = new PaymentManager();
        this.sync = new SyncManager();
        
        this.currentTransaction = {
            id: this.generateTransactionId(),
            items: [],
            customer: null,
            subtotal: 0,
            tax: 0,
            discount: 0,
            total: 0
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize modules
            await this.products.init();
            await this.cart.init();
            await this.payments.init();
            await this.sync.init();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadProducts();
            await this.loadCustomers();
            
            // Update sync status
            this.updateSyncStatus();
            
            console.log('✅ GiLi PoS initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing PoS:', error);
            this.showError('Failed to initialize PoS system');
        }
    }
    
    setupEventListeners() {
        // Barcode input
        document.getElementById('barcode-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleBarcodeInput(e.target.value);
                e.target.value = '';
            }
        });
        
        // Product search
        document.getElementById('product-search').addEventListener('input', (e) => {
            this.searchProducts(e.target.value);
        });
        
        // Category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterProductsByCategory(e.target.dataset.category);
                this.updateCategoryButtons(e.target);
            });
        });
        
        // Cart actions
        document.getElementById('discount-btn').addEventListener('click', () => {
            this.showDiscountModal();
        });
        
        document.getElementById('void-btn').addEventListener('click', () => {
            this.voidTransaction();
        });
        
        document.getElementById('hold-btn').addEventListener('click', () => {
            this.holdTransaction();
        });
        
        document.getElementById('checkout-btn').addEventListener('click', () => {
            this.startCheckout();
        });
        
        // Sync button
        document.getElementById('sync-btn').addEventListener('click', () => {
            this.syncData();
        });
        
        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettings();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.syncData();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('product-search').focus();
                        break;
                    case 'b':
                        e.preventDefault();
                        document.getElementById('barcode-input').focus();
                        break;
                }
            }
            
            if (e.key === 'F1') {
                e.preventDefault();
                this.startCheckout();
            }
        });
    }
    
    generateTransactionId() {
        const now = new Date();
        const timestamp = now.getTime().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `TXN${timestamp}${random}`;
    }
    
    async handleBarcodeInput(barcode) {
        if (!barcode) return;
        
        try {
            const product = await this.products.findByBarcode(barcode);
            
            if (product) {
                this.addProductToCart(product);
                this.showNotification('Product added to cart', 'success');
            } else {
                this.showNotification('Product not found', 'warning');
            }
        } catch (error) {
            console.error('Error handling barcode:', error);
            this.showNotification('Error processing barcode', 'error');
        }
    }
    
    addProductToCart(product, quantity = 1) {
        const cartItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            total: product.price * quantity
        };
        
        this.cart.addItem(cartItem);
        this.updateCartDisplay();
        this.enableCheckoutButton();
    }
    
    updateCartDisplay() {
        const cartContainer = document.getElementById('cart-items');
        const emptyCart = document.getElementById('empty-cart');
        
        if (this.cart.items.length === 0) {
            cartContainer.style.display = 'none';
            emptyCart.style.display = 'block';
            this.disableCheckoutButton();
            return;
        }
        
        cartContainer.style.display = 'block';
        emptyCart.style.display = 'none';
        
        cartContainer.innerHTML = this.cart.items.map(item => `
            <div class="cart-item p-4 flex justify-between items-center">
                <div class="flex-1">
                    <div class="font-medium">${item.name}</div>
                    <div class="text-sm text-gray-600">$${item.price.toFixed(2)} each</div>
                </div>
                <div class="flex items-center space-x-3">
                    <button onclick="app.cart.updateQuantity('${item.id}', ${item.quantity - 1})" 
                            class="bg-gray-200 hover:bg-gray-300 w-8 h-8 rounded flex items-center justify-center">
                        <i class="fas fa-minus text-sm"></i>
                    </button>
                    <span class="w-8 text-center">${item.quantity}</span>
                    <button onclick="app.cart.updateQuantity('${item.id}', ${item.quantity + 1})" 
                            class="bg-gray-200 hover:bg-gray-300 w-8 h-8 rounded flex items-center justify-center">
                        <i class="fas fa-plus text-sm"></i>
                    </button>
                    <div class="w-20 text-right font-medium">$${item.total.toFixed(2)}</div>
                    <button onclick="app.cart.removeItem('${item.id}')" 
                            class="text-red-600 hover:text-red-800 ml-2">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        this.updateCartSummary();
    }
    
    updateCartSummary() {
        const summary = this.cart.getSummary();
        
        document.getElementById('subtotal').textContent = `$${summary.subtotal.toFixed(2)}`;
        document.getElementById('tax-amount').textContent = `$${summary.tax.toFixed(2)}`;
        document.getElementById('discount-amount').textContent = `$${summary.discount.toFixed(2)}`;
        document.getElementById('total-amount').textContent = `$${summary.total.toFixed(2)}`;
    }
    
    enableCheckoutButton() {
        const checkoutBtn = document.getElementById('checkout-btn');
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('bg-gray-400');
        checkoutBtn.classList.add('bg-green-500', 'hover:bg-green-600');
    }
    
    disableCheckoutButton() {
        const checkoutBtn = document.getElementById('checkout-btn');
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('bg-gray-400');
        checkoutBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
    }
    
    async loadProducts() {
        try {
            const products = await ipcRenderer.invoke('pos:get-products');
            this.products.setProducts(products);
            this.displayProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Failed to load products');
        }
    }
    
    displayProducts(products) {
        const grid = document.getElementById('products-grid');
        grid.innerHTML = products.map(product => `
            <div class="product-card bg-white border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                 onclick="app.addProductToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                <div class="aspect-w-1 aspect-h-1 mb-2">
                    <img src="${product.image_url || 'assets/placeholder-product.png'}" 
                         alt="${product.name}" class="w-full h-20 object-cover rounded">
                </div>
                <div class="text-sm font-medium truncate">${product.name}</div>
                <div class="text-lg font-bold text-blue-600">$${product.price.toFixed(2)}</div>
                <div class="text-xs text-gray-500">Stock: ${product.stock_quantity || 0}</div>
            </div>
        `).join('');
    }
    
    async syncData() {
        try {
            document.getElementById('sync-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
            
            const result = await ipcRenderer.invoke('pos:sync-data');
            
            if (result.success) {
                this.showNotification('Data synced successfully', 'success');
                await this.loadProducts();
                await this.loadCustomers();
            } else {
                this.showNotification('Sync failed: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.showNotification('Sync failed', 'error');
        } finally {
            document.getElementById('sync-btn').innerHTML = '<i class="fas fa-sync"></i> Sync';
            this.updateSyncStatus();
        }
    }
    
    async updateSyncStatus() {
        try {
            const status = await ipcRenderer.invoke('pos:get-sync-status');
            const indicator = document.getElementById('status-indicator');
            const text = document.getElementById('status-text');
            
            if (status.online) {
                indicator.className = 'w-3 h-3 rounded-full bg-green-500';
                text.textContent = 'Online';
            } else {
                indicator.className = 'w-3 h-3 rounded-full bg-red-500';
                text.textContent = 'Offline';
            }
            
            if (status.lastSync) {
                text.textContent += ` (${new Date(status.lastSync).toLocaleTimeString()})`;
            }
        } catch (error) {
            console.error('Error updating sync status:', error);
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white slide-in`;
        
        switch (type) {
            case 'success':
                notification.classList.add('bg-green-500');
                break;
            case 'error':
                notification.classList.add('bg-red-500');
                break;
            case 'warning':
                notification.classList.add('bg-yellow-500');
                break;
            default:
                notification.classList.add('bg-blue-500');
        }
        
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    voidTransaction() {
        if (confirm('Are you sure you want to void this transaction?')) {
            this.cart.clear();
            this.updateCartDisplay();
            this.currentTransaction.id = this.generateTransactionId();
            document.getElementById('transaction-id').textContent = this.currentTransaction.id.slice(-3);
            this.showNotification('Transaction voided', 'warning');
        }
    }
    
    startCheckout() {
        if (this.cart.items.length === 0) {
            this.showNotification('Cart is empty', 'warning');
            return;
        }
        
        this.payments.showPaymentModal(this.cart.getSummary().total);
    }
}

// Initialize the PoS application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PoSApp();
});

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoSApp;
}
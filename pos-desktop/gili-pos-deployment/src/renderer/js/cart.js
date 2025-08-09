// Cart Management System
class Cart {
    constructor() {
        this.items = [];
        this.taxRate = 0.10; // 10% tax
        this.discountPercent = 0;
        this.discountAmount = 0;
    }
    
    async init() {
        // Load tax rate and other settings
        try {
            const settings = await this.loadSettings();
            this.taxRate = parseFloat(settings.tax_rate || 0.10);
        } catch (error) {
            console.warn('Could not load cart settings, using defaults');
        }
    }
    
    addItem(product, quantity = 1) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.total = existingItem.price * existingItem.quantity;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                quantity: quantity,
                total: product.price * quantity,
                discount: 0
            });
        }
        
        this.updateDisplay();
    }
    
    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.updateDisplay();
    }
    
    updateQuantity(productId, newQuantity) {
        const item = this.items.find(item => item.id === productId);
        
        if (item) {
            if (newQuantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = newQuantity;
                item.total = item.price * newQuantity;
                this.updateDisplay();
            }
        }
    }
    
    applyItemDiscount(productId, discountPercent) {
        const item = this.items.find(item => item.id === productId);
        
        if (item) {
            item.discount = discountPercent;
            const discountAmount = (item.price * item.quantity) * (discountPercent / 100);
            item.total = (item.price * item.quantity) - discountAmount;
            this.updateDisplay();
        }
    }
    
    applyTransactionDiscount(discountPercent = 0, discountAmount = 0) {
        this.discountPercent = discountPercent;
        this.discountAmount = discountAmount;
        this.updateDisplay();
    }
    
    getSummary() {
        const subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
        
        let totalDiscount = this.discountAmount;
        if (this.discountPercent > 0) {
            totalDiscount += (subtotal * this.discountPercent / 100);
        }
        
        const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
        const tax = discountedSubtotal * this.taxRate;
        const total = discountedSubtotal + tax;
        
        return {
            itemCount: this.items.length,
            totalQuantity: this.items.reduce((sum, item) => sum + item.quantity, 0),
            subtotal: subtotal,
            discount: totalDiscount,
            tax: tax,
            total: total
        };
    }
    
    getItems() {
        return [...this.items];
    }
    
    clear() {
        this.items = [];
        this.discountPercent = 0;
        this.discountAmount = 0;
        this.updateDisplay();
    }
    
    updateDisplay() {
        // Trigger display update in main app
        if (typeof app !== 'undefined' && app.updateCartDisplay) {
            app.updateCartDisplay();
        }
    }
    
    // Hold/Save cart for later
    hold(name = null) {
        const heldCart = {
            id: Date.now().toString(),
            name: name || `Held Sale ${new Date().toLocaleTimeString()}`,
            items: [...this.items],
            discountPercent: this.discountPercent,
            discountAmount: this.discountAmount,
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage for now (could be database later)
        const heldCarts = JSON.parse(localStorage.getItem('heldCarts') || '[]');
        heldCarts.push(heldCart);
        localStorage.setItem('heldCarts', JSON.stringify(heldCarts));
        
        this.clear();
        return heldCart.id;
    }
    
    // Recall held cart
    recall(cartId) {
        const heldCarts = JSON.parse(localStorage.getItem('heldCarts') || '[]');
        const heldCart = heldCarts.find(cart => cart.id === cartId);
        
        if (heldCart) {
            this.items = [...heldCart.items];
            this.discountPercent = heldCart.discountPercent || 0;
            this.discountAmount = heldCart.discountAmount || 0;
            
            // Remove from held carts
            const updatedHeldCarts = heldCarts.filter(cart => cart.id !== cartId);
            localStorage.setItem('heldCarts', JSON.stringify(updatedHeldCarts));
            
            this.updateDisplay();
            return true;
        }
        
        return false;
    }
    
    // Get all held carts
    getHeldCarts() {
        return JSON.parse(localStorage.getItem('heldCarts') || '[]');
    }
    
    // Validate cart before checkout
    validate() {
        const issues = [];
        
        if (this.items.length === 0) {
            issues.push('Cart is empty');
        }
        
        // Check for items with zero or negative quantities
        const invalidItems = this.items.filter(item => item.quantity <= 0);
        if (invalidItems.length > 0) {
            issues.push('Some items have invalid quantities');
        }
        
        // Check for items with zero or negative prices
        const invalidPrices = this.items.filter(item => item.price <= 0);
        if (invalidPrices.length > 0) {
            issues.push('Some items have invalid prices');
        }
        
        const summary = this.getSummary();
        if (summary.total < 0) {
            issues.push('Total amount cannot be negative');
        }
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }
    
    // Convert cart to transaction format
    toTransaction(customerId = null, paymentMethod = 'cash', paymentDetails = {}) {
        const summary = this.getSummary();
        
        return {
            id: this.generateTransactionId(),
            customer_id: customerId,
            items: this.items.map(item => ({
                product_id: item.id,
                product_name: item.name,
                sku: item.sku,
                quantity: item.quantity,
                unit_price: item.price,
                discount_percent: item.discount || 0,
                line_total: item.total
            })),
            subtotal: summary.subtotal,
            tax_amount: summary.tax,
            discount_amount: summary.discount,
            total: summary.total,
            payment_method: paymentMethod,
            payment_details: JSON.stringify(paymentDetails),
            status: 'completed',
            created_at: new Date().toISOString()
        };
    }
    
    generateTransactionId() {
        const now = new Date();
        const timestamp = now.getTime().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `TXN${timestamp}${random}`;
    }
    
    async loadSettings() {
        // In a real app, this would load from the database
        // For now, return defaults
        return {
            tax_rate: '0.10',
            currency: 'USD'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Cart;
}
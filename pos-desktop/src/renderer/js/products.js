// Product Management System
class ProductManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.categories = ['all'];
        this.currentCategory = 'all';
        this.searchTerm = '';
    }
    
    async init() {
        // Products will be loaded from main app
    }
    
    setProducts(products) {
        this.products = products;
        this.filteredProducts = [...products];
        this.updateCategories();
        this.filterProducts();
    }
    
    updateCategories() {
        const categorySet = new Set(['all']);
        this.products.forEach(product => {
            if (product.category) {
                categorySet.add(product.category);
            }
        });
        this.categories = Array.from(categorySet);
    }
    
    findByBarcode(barcode) {
        return this.products.find(product => 
            product.barcode === barcode || product.sku === barcode
        );
    }
    
    findById(productId) {
        return this.products.find(product => product.id === productId);
    }
    
    search(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.filterProducts();
    }
    
    filterByCategory(category) {
        this.currentCategory = category;
        this.filterProducts();
    }
    
    filterProducts() {
        let filtered = [...this.products];
        
        // Apply category filter
        if (this.currentCategory && this.currentCategory !== 'all') {
            filtered = filtered.filter(product => 
                product.category === this.currentCategory
            );
        }
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(this.searchTerm) ||
                product.sku?.toLowerCase().includes(this.searchTerm) ||
                product.barcode?.toLowerCase().includes(this.searchTerm)
            );
        }
        
        this.filteredProducts = filtered;
        
        // Update display if app is available
        if (typeof app !== 'undefined' && app.displayProducts) {
            app.displayProducts(this.filteredProducts);
        }
    }
    
    getFilteredProducts() {
        return this.filteredProducts;
    }
    
    getCategories() {
        return this.categories;
    }
    
    // Stock management
    updateStock(productId, quantity) {
        const product = this.findById(productId);
        if (product) {
            product.stock_quantity = Math.max(0, product.stock_quantity + quantity);
        }
    }
    
    checkStock(productId, requestedQuantity = 1) {
        const product = this.findById(productId);
        if (!product) return false;
        
        return product.stock_quantity >= requestedQuantity;
    }
    
    getLowStockProducts(threshold = 5) {
        return this.products.filter(product => 
            product.stock_quantity <= threshold && product.stock_quantity > 0
        );
    }
    
    getOutOfStockProducts() {
        return this.products.filter(product => product.stock_quantity <= 0);
    }
    
    // Price management
    updatePrice(productId, newPrice) {
        const product = this.findById(productId);
        if (product && newPrice > 0) {
            product.price = newPrice;
        }
    }
    
    applyBulkDiscount(categoryOrProductIds, discountPercent) {
        let productsToUpdate = [];
        
        if (Array.isArray(categoryOrProductIds)) {
            // Product IDs provided
            productsToUpdate = this.products.filter(product => 
                categoryOrProductIds.includes(product.id)
            );
        } else {
            // Category provided
            productsToUpdate = this.products.filter(product => 
                product.category === categoryOrProductIds
            );
        }
        
        productsToUpdate.forEach(product => {
            product.sale_price = product.price * (1 - discountPercent / 100);
        });
        
        return productsToUpdate.length;
    }
    
    // Product creation/editing (for admin functions)
    createProduct(productData) {
        const newProduct = {
            id: this.generateProductId(),
            name: productData.name,
            sku: productData.sku || this.generateSKU(),
            barcode: productData.barcode,
            price: productData.price,
            category: productData.category,
            description: productData.description,
            stock_quantity: productData.stock_quantity || 0,
            image_url: productData.image_url,
            active: true,
            created_at: new Date().toISOString()
        };
        
        this.products.push(newProduct);
        this.filterProducts();
        
        return newProduct;
    }
    
    updateProduct(productId, updates) {
        const productIndex = this.products.findIndex(product => product.id === productId);
        if (productIndex !== -1) {
            this.products[productIndex] = {
                ...this.products[productIndex],
                ...updates,
                updated_at: new Date().toISOString()
            };
            this.filterProducts();
            return this.products[productIndex];
        }
        return null;
    }
    
    deleteProduct(productId) {
        const productIndex = this.products.findIndex(product => product.id === productId);
        if (productIndex !== -1) {
            this.products[productIndex].active = false;
            this.filterProducts();
            return true;
        }
        return false;
    }
    
    generateProductId() {
        return 'PRD' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
    }
    
    generateSKU() {
        return 'SKU' + Date.now().toString().slice(-8);
    }
    
    // Inventory reports
    getInventoryReport() {
        const totalProducts = this.products.filter(p => p.active).length;
        const totalValue = this.products.reduce((sum, product) => 
            sum + (product.price * product.stock_quantity), 0
        );
        const lowStock = this.getLowStockProducts();
        const outOfStock = this.getOutOfStockProducts();
        
        return {
            total_products: totalProducts,
            total_inventory_value: totalValue,
            low_stock_count: lowStock.length,
            out_of_stock_count: outOfStock.length,
            low_stock_products: lowStock,
            out_of_stock_products: outOfStock,
            categories: this.categories.filter(cat => cat !== 'all'),
            generated_at: new Date().toISOString()
        };
    }
    
    // Export/Import functions
    exportProducts() {
        return JSON.stringify(this.products, null, 2);
    }
    
    importProducts(jsonData) {
        try {
            const importedProducts = JSON.parse(jsonData);
            
            if (Array.isArray(importedProducts)) {
                importedProducts.forEach(product => {
                    // Validate required fields
                    if (product.name && product.price) {
                        this.createProduct(product);
                    }
                });
                return true;
            }
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
        return false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductManager;
}
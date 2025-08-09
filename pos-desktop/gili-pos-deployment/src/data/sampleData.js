// Sample data for PoS initialization
const sampleProducts = [
    {
        id: 'prod_001',
        name: 'Laptop Computer',
        sku: 'LAPTOP-001',
        barcode: '1234567890123',
        price: 999.99,
        category: 'electronics',
        description: 'High-performance laptop computer',
        stock_quantity: 15,
        image_url: 'assets/products/laptop.jpg',
        active: true
    },
    {
        id: 'prod_002', 
        name: 'Wireless Mouse',
        sku: 'MOUSE-001',
        barcode: '1234567890124',
        price: 29.99,
        category: 'electronics',
        description: 'Ergonomic wireless mouse',
        stock_quantity: 50,
        image_url: 'assets/products/mouse.jpg',
        active: true
    },
    {
        id: 'prod_003',
        name: 'Coffee Mug',
        sku: 'MUG-001', 
        barcode: '1234567890125',
        price: 12.99,
        category: 'home',
        description: 'Ceramic coffee mug',
        stock_quantity: 100,
        image_url: 'assets/products/mug.jpg',
        active: true
    },
    {
        id: 'prod_004',
        name: 'T-Shirt',
        sku: 'SHIRT-001',
        barcode: '1234567890126', 
        price: 19.99,
        category: 'clothing',
        description: 'Cotton t-shirt',
        stock_quantity: 75,
        image_url: 'assets/products/tshirt.jpg',
        active: true
    },
    {
        id: 'prod_005',
        name: 'Notebook',
        sku: 'NOTE-001',
        barcode: '1234567890127',
        price: 8.99,
        category: 'books',
        description: 'Spiral notebook',
        stock_quantity: 200,
        image_url: 'assets/products/notebook.jpg',
        active: true
    },
    {
        id: 'prod_006',
        name: 'Energy Drink',
        sku: 'DRINK-001',
        barcode: '1234567890128',
        price: 2.99,
        category: 'food',
        description: 'Energy drink 500ml',
        stock_quantity: 300,
        image_url: 'assets/products/drink.jpg',
        active: true
    }
];

const sampleCustomers = [
    {
        id: 'cust_001',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0123',
        address: '123 Main St, City, State 12345'
    },
    {
        id: 'cust_002',
        name: 'Jane Smith', 
        email: 'jane@example.com',
        phone: '555-0124',
        address: '456 Oak Ave, City, State 12345'
    },
    {
        id: 'cust_003',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '555-0125',
        address: '789 Pine St, City, State 12345'
    }
];

async function initializeSampleData(db) {
    console.log('🔄 Initializing sample data...');
    
    try {
        // Insert sample products
        for (const product of sampleProducts) {
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT OR IGNORE INTO products (
                        id, name, sku, barcode, price, category, description,
                        stock_quantity, image_url, active, synced, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    product.id, product.name, product.sku, product.barcode,
                    product.price, product.category, product.description,
                    product.stock_quantity, product.image_url, product.active,
                    0, new Date().toISOString()
                ], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        
        // Insert sample customers
        for (const customer of sampleCustomers) {
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT OR IGNORE INTO customers (
                        id, name, email, phone, address, synced, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    customer.id, customer.name, customer.email,
                    customer.phone, customer.address, 0, new Date().toISOString()
                ], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        
        console.log('✅ Sample data initialized successfully');
        console.log(`   - ${sampleProducts.length} products`);
        console.log(`   - ${sampleCustomers.length} customers`);
        
    } catch (error) {
        console.error('❌ Failed to initialize sample data:', error);
        throw error;
    }
}

module.exports = {
    sampleProducts,
    sampleCustomers,
    initializeSampleData
};
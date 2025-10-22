#!/bin/bash
# Quick Database Cleanup Script
# Removes all transactional data from gili_production database

echo "🧹 Cleaning gili_production database..."
echo ""

mongosh gili_production --quiet --eval "
var results = {
  'sales_quotations': db.sales_quotations.deleteMany({}).deletedCount,
  'sales_orders': db.sales_orders.deleteMany({}).deletedCount,
  'sales_invoices': db.sales_invoices.deleteMany({}).deletedCount,
  'purchase_orders': db.purchase_orders.deleteMany({}).deletedCount,
  'purchase_invoices': db.purchase_invoices.deleteMany({}).deletedCount,
  'credit_notes': db.credit_notes.deleteMany({}).deletedCount,
  'debit_notes': db.debit_notes.deleteMany({}).deletedCount,
  'payments': db.payments.deleteMany({}).deletedCount,
  'payment_allocations': db.payment_allocations.deleteMany({}).deletedCount,
  'journal_entries': db.journal_entries.deleteMany({}).deletedCount,
  'bank_transactions': db.bank_transactions.deleteMany({}).deletedCount,
  'bank_statements': db.bank_statements.deleteMany({}).deletedCount,
  'stock_entries': db.stock_entries.deleteMany({}).deletedCount,
  'customers': db.customers.deleteMany({}).deletedCount,
  'suppliers': db.suppliers.deleteMany({}).deletedCount,
  'items': db.items.deleteMany({}).deletedCount,
  'products': db.products.deleteMany({}).deletedCount
};

var total = Object.values(results).reduce((a, b) => a + b, 0);

print('Deleted ' + total + ' records:');
Object.keys(results).forEach(key => {
  if (results[key] > 0) {
    print('  ✅ ' + key + ': ' + results[key]);
  }
});

print('');
print('✅ Database cleaned successfully!');
" 2>/dev/null

echo ""
echo "📋 Reinitializing with fresh test data..."
cd /app/backend && DB_NAME=gili_production python init_database.py 2>&1 | tail -15

echo ""
echo "✅ Cleanup and reinitialization complete!"
echo "🔐 Login: admin@gili.com / admin123"

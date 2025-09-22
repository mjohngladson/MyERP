import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  Calculator,
  User,
  Package,
  Search
} from 'lucide-react';
import { api } from '../services/api';

const SalesInvoiceForm = ({ invoiceId, onBack, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [searchCustomers, setSearchCustomers] = useState('');
  const [searchItems, setSearchItems] = useState('');
  
  const [invoice, setInvoice] = useState({
    invoice_number: '',
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    terms: 'Net 30',
    status: 'draft',
    items: [],
    subtotal: 0,
    discount_amount: 0,
    discount_type: 'amount', // amount or percentage
    tax_rate: 18,
    tax_amount: 0,
    total_amount: 0,
    notes: '',
    payment_terms: 'Net 30 days'
  });

  // Load customers and items on component mount
  useEffect(() => {
    loadCustomers();
    loadItems();
    if (invoiceId) {
      loadInvoice();
    } else {
      generateInvoiceNumber();
    }
  }, [invoiceId]);

  const loadCustomers = async () => {
    try {
      const response = await fetch(`${api.getBaseUrl()}/api/sales/customers`);
      const data = await response.json();
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadItems = async () => {
    try {
      const response = await fetch(`${api.getBaseUrl()}/api/stock/items`);
      const data = await response.json();
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    setInvoice(prev => ({
      ...prev,
      invoice_number: `INV-${year}${month}${day}-${random}`
    }));
  };

  const loadInvoice = async () => {
    if (!invoiceId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${api.getBaseUrl()}/api/invoices/${invoiceId}`);
      const data = await response.json();
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (updatedItems, discountAmount = invoice.discount_amount, discountType = invoice.discount_type) => {
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    
    let discount = 0;
    if (discountType === 'percentage') {
      discount = (subtotal * discountAmount) / 100;
    } else {
      discount = discountAmount;
    }
    
    const discountedSubtotal = subtotal - discount;
    const taxAmount = (discountedSubtotal * invoice.tax_rate) / 100;
    const totalAmount = discountedSubtotal + taxAmount;

    return {
      subtotal: subtotal,
      discount_amount: discount,
      tax_amount: taxAmount,
      total_amount: totalAmount
    };
  };

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      item_id: '',
      item_name: '',
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    
    const updatedItems = [...invoice.items, newItem];
    const totals = calculateTotals(updatedItems);
    
    setInvoice(prev => ({
      ...prev,
      items: updatedItems,
      ...totals
    }));
  };

  const updateItem = (itemId, field, value) => {
    const updatedItems = invoice.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // If item selected from dropdown, populate details
        if (field === 'item_id') {
          const selectedItem = items.find(i => i.id === value);
          if (selectedItem) {
            updatedItem.item_name = selectedItem.name;
            updatedItem.description = selectedItem.description || '';
            updatedItem.rate = selectedItem.price || 0;
          }
        }
        
        // Calculate amount
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = updatedItem.quantity * updatedItem.rate;
        }
        
        return updatedItem;
      }
      return item;
    });
    
    const totals = calculateTotals(updatedItems);
    
    setInvoice(prev => ({
      ...prev,
      items: updatedItems,
      ...totals
    }));
  };

  const removeItem = (itemId) => {
    const updatedItems = invoice.items.filter(item => item.id !== itemId);
    const totals = calculateTotals(updatedItems);
    
    setInvoice(prev => ({
      ...prev,
      items: updatedItems,
      ...totals
    }));
  };

  const selectCustomer = (customer) => {
    setInvoice(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_email: customer.email || '',
      customer_phone: customer.phone || '',
      customer_address: customer.address || ''
    }));
  };

  const updateDiscount = (amount, type) => {
    const totals = calculateTotals(invoice.items, amount, type);
    
    setInvoice(prev => ({
      ...prev,
      discount_amount: amount,
      discount_type: type,
      ...totals
    }));
  };

  const saveInvoice = async (status = 'draft') => {
    setSaving(true);
    try {
      const invoiceData = {
        ...invoice,
        status,
        company_id: 'default_company'
      };

      let response;
      if (invoiceId) {
        response = await fetch(`${api.getBaseUrl()}/invoices/${invoiceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceData)
        });
      } else {
        response = await fetch(`${api.getBaseUrl()}/invoices/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceData)
        });
      }

      if (response.ok) {
        const savedInvoice = await response.json();
        onSave && onSave(savedInvoice);
        onBack();
      } else {
        console.error('Failed to save invoice');
        alert('Failed to save invoice. Please try again.');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Error saving invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchCustomers.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchCustomers.toLowerCase()) ||
    customer.phone?.includes(searchCustomers)
  );

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchItems.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchItems.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {invoiceId ? 'Edit Invoice' : 'Create New Invoice'}
          </h1>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => saveInvoice('draft')}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>
          
          <button
            onClick={() => saveInvoice('submitted')}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>Submit Invoice</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Invoice Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoice.invoice_number}
                    onChange={(e) => setInvoice(prev => ({ ...prev, invoice_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={invoice.invoice_date}
                      onChange={(e) => setInvoice(prev => ({ ...prev, invoice_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={invoice.due_date}
                      onChange={(e) => setInvoice(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              
              {/* Customer Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Customer</label>
                <div className="relative">
                  <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchCustomers}
                    onChange={(e) => setSearchCustomers(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Customer Dropdown */}
                {searchCustomers && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          selectCustomer(customer);
                          setSearchCustomers('');
                        }}
                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-600 hover:text-white"
                      >
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          <span className="font-normal truncate">{customer.name}</span>
                        </div>
                        {customer.email && (
                          <span className="text-sm text-gray-500">{customer.email}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Customer Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={invoice.customer_name}
                    onChange={(e) => setInvoice(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter customer name"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={invoice.customer_email}
                      onChange={(e) => setInvoice(prev => ({ ...prev, customer_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="customer@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={invoice.customer_phone}
                      onChange={(e) => setInvoice(prev => ({ ...prev, customer_phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
              <button
                onClick={addItem}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <select
                          value={item.item_id}
                          onChange={(e) => updateItem(item.id, 'item_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="">Select Item</option>
                          {items.map((availableItem) => (
                            <option key={availableItem.id} value={availableItem.id}>
                              {availableItem.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Description"
                        />
                      </td>
                      
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </td>
                      
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.amount)}
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invoice.items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No items added yet. Click "Add Item" to get started.</p>
              </div>
            )}
          </div>

          {/* Totals Section */}
          <div className="border-t pt-6">
            <div className="flex justify-end">
              <div className="w-80">
                <div className="space-y-3">
                  {/* Subtotal */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  
                  {/* Discount */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Discount:</span>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={invoice.discount_amount}
                        onChange={(e) => updateDiscount(parseFloat(e.target.value) || 0, invoice.discount_type)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <select
                        value={invoice.discount_type}
                        onChange={(e) => updateDiscount(invoice.discount_amount, e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="amount">₹</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Tax */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                    <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                  
                  {/* Total */}
                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={invoice.notes}
              onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes or terms..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoiceForm;
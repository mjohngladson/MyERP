import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Plus, Trash2, Save, Send, Calculator, 
  User, Package, Calendar, FileText, AlertCircle
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const CreateSalesOrder = ({ onBack, onSave }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    reference: '',
    terms: '',
    notes: '',
    items: [
      { id: 1, item_id: '', item_name: '', description: '', quantity: 1, rate: 0, amount: 0 }
    ]
  });

  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load customers and items
  useEffect(() => {
    loadCustomers();
    loadItems();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.sales.getCustomers();
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadItems = async () => {
    // Mock items for now
    setItems([
      { id: '1', item_code: 'PROD-A-001', item_name: 'Product A', unit_price: 100 },
      { id: '2', item_code: 'PROD-B-001', item_name: 'Product B', unit_price: 200 },
      { id: '3', item_code: 'SRV-001', item_name: 'Consulting Service', unit_price: 1500 }
    ]);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    
    // Auto-calculate amount when quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate;
    }
    
    // Auto-fill item details when item is selected
    if (field === 'item_id') {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        updatedItems[index].item_name = selectedItem.item_name;
        updatedItems[index].rate = selectedItem.unit_price;
        updatedItems[index].amount = updatedItems[index].quantity * selectedItem.unit_price;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
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
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.customer_id) {
      newErrors.customer_id = 'Please select a customer';
    }
    
    if (!formData.delivery_date) {
      newErrors.delivery_date = 'Please set delivery date';
    }
    
    if (formData.items.some(item => !item.item_id)) {
      newErrors.items = 'Please select items for all rows';
    }
    
    if (formData.items.some(item => item.quantity <= 0)) {
      newErrors.items = 'Quantity must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (isDraft = true) => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const { total } = calculateTotals();
      const orderData = {
        ...formData,
        total_amount: total,
        status: isDraft ? 'draft' : 'submitted',
        company_id: 'default_company'
      };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Sales Order Created:', orderData);
      
      if (onSave) {
        onSave(orderData);
      } else {
        onBack();
      }
    } catch (error) {
      console.error('Failed to create sales order:', error);
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">New Sales Order</h1>
              <p className="text-gray-600">Create a new sales order for your customer</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Save size={16} />
              <span>Save Draft</span>
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send size={16} />
              <span>{loading ? 'Creating...' : 'Submit Order'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <User className="mr-2" size={20} />
              Customer Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => handleInputChange('customer_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.customer_id ? 'border-red-500' : 'border-gray-200'
                  }`}
                >
                  <option value="">Select a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {errors.customer_id && (
                  <p className="text-red-600 text-sm mt-1 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.customer_id}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  placeholder="Customer reference"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="mr-2" size={20} />
              Order Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Date
                </label>
                <input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => handleInputChange('order_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date *
                </label>
                <input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => handleInputChange('delivery_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.delivery_date ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.delivery_date && (
                  <p className="text-red-600 text-sm mt-1 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.delivery_date}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Package className="mr-2" size={20} />
                Items
              </h3>
              <button
                onClick={addItem}
                className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                <span>Add Item</span>
              </button>
            </div>
            
            {errors.items && (
              <p className="text-red-600 text-sm mb-4 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {errors.items}
              </p>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Item</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Description</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Qty</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Rate</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Amount</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2 px-2">
                        <select
                          value={item.item_id}
                          onChange={(e) => handleItemChange(index, 'item_id', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select item</option>
                          {items.map(availableItem => (
                            <option key={availableItem.id} value={availableItem.id}>
                              {availableItem.item_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <span className="font-medium">₹{item.amount.toLocaleString()}</span>
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => removeItem(index)}
                          disabled={formData.items.length === 1}
                          className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary & Notes */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calculator className="mr-2" size={20} />
              Order Summary
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (18% GST):</span>
                <span className="font-medium">₹{tax.toLocaleString()}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg">
                <span className="font-semibold text-gray-800">Total:</span>
                <span className="font-bold text-gray-800">₹{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="mr-2" size={20} />
              Additional Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => handleInputChange('terms', e.target.value)}
                  rows={3}
                  placeholder="Enter terms and conditions"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Internal notes"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSalesOrder;
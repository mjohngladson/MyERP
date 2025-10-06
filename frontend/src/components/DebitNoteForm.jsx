import React from 'react';
import { ChevronLeft, Save, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import AutocompleteSearch from './ui/AutocompleteSearch';

const DebitNoteForm = ({ debitNoteId, onBack, onSave }) => {
  const [loading, setLoading] = React.useState(!!debitNoteId);
  const [saving, setSaving] = React.useState(false);
  const [masterItems, setMasterItems] = React.useState([]);
  const [suppliers, setSuppliers] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [form, setForm] = React.useState({
    supplier_id: '',
    supplier_name: '',
    supplier_email: '',
    supplier_phone: '',
    supplier_address: '',
    debit_note_date: new Date().toISOString().split('T')[0],
    reference_invoice_id: '',
    reference_invoice: '',
    reason: 'Return',
    items: [{ item_name: '', quantity: 1, rate: 0, amount: 0 }],
    discount_amount: 0,
    tax_rate: 18,
    status: 'draft',
    notes: ''
  });

  React.useEffect(() => {
    // Load master data
    const loadMasterData = async () => {
      try {
        const [itemsRes, suppliersRes, invoicesRes] = await Promise.all([
          api.items.list('', 100),
          api.master.suppliers.list('', 100),
          api.get('/purchase/invoices', { params: { limit: 200 } })
        ]);
        setMasterItems(itemsRes.data || []);
        setSuppliers(suppliersRes.data || []);
        setInvoices(invoicesRes.data || []);
      } catch (e) {
        console.error('Failed to load master data:', e);
      }
    };
    loadMasterData();

    if (debitNoteId) {
      const load = async () => {
        try {
          const { data } = await api.get(`/buying/debit-notes/${debitNoteId}`);
          setForm({
            supplier_name: data.supplier_name || '',
            supplier_email: data.supplier_email || '',
            supplier_phone: data.supplier_phone || '',
            supplier_address: data.supplier_address || '',
            debit_note_date: data.debit_note_date ? data.debit_note_date.split('T')[0] : new Date().toISOString().split('T')[0],
            reference_invoice: data.reference_invoice || '',
            reason: data.reason || 'Return',
            items: data.items || [{ item_name: '', quantity: 1, rate: 0, amount: 0 }],
            discount_amount: data.discount_amount || 0,
            tax_rate: data.tax_rate || 18,
            status: data.status || 'Draft',
            notes: data.notes || ''
          });
        } catch (e) {
          console.error('Failed to load debit note:', e);
        } finally {
          setLoading(false);
        }
      };
      load();
    } else {
      setLoading(false);
    }
  }, [debitNoteId]);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // If selecting an item from dropdown, auto-populate rate
    if (field === 'item_name' && value) {
      const selectedItem = masterItems.find(item => item.name === value);
      if (selectedItem) {
        newItems[index].rate = selectedItem.unit_price || 0;
        newItems[index].amount = newItems[index].quantity * (selectedItem.unit_price || 0);
      }
    }
    
    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity;
      const rate = field === 'rate' ? parseFloat(value) || 0 : newItems[index].rate;
      newItems[index].amount = quantity * rate;
    }
    
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const selectSupplier = (supplierName) => {
    const supplier = suppliers.find(s => s.name === supplierName);
    if (supplier) {
      setForm(prev => ({
        ...prev,
        supplier_name: supplier.name,
        supplier_email: supplier.email || '',
        supplier_phone: supplier.phone || supplier.mobile || '',
        supplier_address: supplier.billing_address || ''
      }));
    }
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { item_name: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (form.items.length > 1) {
      setForm(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const save = async () => {
    if (!form.supplier_name.trim()) {
      alert('Supplier name is required');
      return;
    }

    if (!form.items.some(item => item.item_name.trim())) {
      alert('At least one item is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        discount_amount: parseFloat(form.discount_amount) || 0,
        tax_rate: parseFloat(form.tax_rate) || 18,
        items: form.items.filter(item => item.item_name.trim()).map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          amount: parseFloat(item.amount) || 0
        }))
      };

      if (debitNoteId) {
        await api.put(`/buying/debit-notes/${debitNoteId}`, payload);
      } else {
        await api.post('/buying/debit-notes', payload);
      }
      
      onSave && onSave();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to save debit note');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount || 0);

  // Calculate totals
  const subtotal = form.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const discountAmount = parseFloat(form.discount_amount) || 0;
  const discountedTotal = subtotal - discountAmount;
  const taxAmount = (discountedTotal * (parseFloat(form.tax_rate) || 0)) / 100;
  const totalAmount = discountedTotal + taxAmount;

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="h-32 bg-gray-100 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {debitNoteId ? 'Edit Debit Note' : 'Create Debit Note'}
          </h1>
        </div>
        <button 
          onClick={save} 
          disabled={saving}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
        >
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Supplier Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                <AutocompleteSearch
                  options={suppliers.map(supplier => ({
                    ...supplier,
                    subtitle: supplier.email || supplier.phone || supplier.mobile
                  }))}
                  value={form.supplier_name}
                  onChange={value => updateForm('supplier_name', value)}
                  onSelect={supplier => {
                    if (supplier && typeof supplier === 'object') {
                      selectSupplier(supplier.name);
                    } else {
                      updateForm('supplier_name', supplier || '');
                    }
                  }}
                  placeholder="Search suppliers..."
                  displayField="name"
                  searchFields={['name', 'email', 'phone', 'mobile']}
                  allowCustom={true}
                  customPlaceholder="Or enter custom supplier name"
                  renderOption={(supplier, index, isHighlighted) => (
                    <div
                      key={supplier.id || index}
                      className={`px-3 py-2 cursor-pointer ${
                        isHighlighted ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (typeof supplier === 'object') {
                          selectSupplier(supplier.name);
                        }
                      }}
                    >
                      <div className="font-medium text-sm">{supplier.name}</div>
                      {supplier.subtitle && (
                        <div className="text-xs text-gray-500">{supplier.subtitle}</div>
                      )}
                    </div>
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.supplier_email}
                  onChange={e => updateForm('supplier_email', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="supplier@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  value={form.supplier_phone}
                  onChange={e => updateForm('supplier_phone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Invoice (Optional)</label>
                <AutocompleteSearch
                  options={invoices}
                  value={form.reference_invoice}
                  onChange={(value) => updateForm('reference_invoice', value)}
                  onSelect={(invoice) => {
                    if (invoice && typeof invoice === 'object') {
                      updateForm('reference_invoice_id', invoice.id);
                      updateForm('reference_invoice', invoice.invoice_number);
                      // Auto-fill supplier if not set
                      if (!form.supplier_name && invoice.supplier_name) {
                        updateForm('supplier_id', invoice.supplier_id);
                        updateForm('supplier_name', invoice.supplier_name);
                        updateForm('supplier_email', invoice.supplier_email || '');
                        updateForm('supplier_phone', invoice.supplier_phone || '');
                      }
                    }
                  }}
                  displayField="invoice_number"
                  searchFields={['invoice_number', 'supplier_name']}
                  placeholder="Type to search purchase invoice..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.debit_note_date}
                  onChange={e => updateForm('debit_note_date', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={form.reason}
                  onChange={e => updateForm('reason', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Return">Return</option>
                  <option value="Quality Issue">Quality Issue</option>
                  <option value="Price Difference">Price Difference</option>
                  <option value="Defective">Defective</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                Items <span className="text-red-500">*</span>
              </h3>
              <button
                onClick={addItem}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
              >
                <Plus size={16} />
                <span>Add Item</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <AutocompleteSearch
                          options={masterItems.map(masterItem => ({
                            ...masterItem,
                            subtitle: `₹${(masterItem.unit_price || 0).toFixed(2)} • ${masterItem.item_code || 'No Code'}`
                          }))}
                          value={item.item_name}
                          onChange={value => updateItem(index, 'item_name', value)}
                          onSelect={selectedItem => {
                            if (selectedItem && typeof selectedItem === 'object') {
                              updateItem(index, 'item_name', selectedItem.name);
                            } else {
                              updateItem(index, 'item_name', selectedItem || '');
                            }
                          }}
                          placeholder="Search items..."
                          displayField="name"
                          searchFields={['name', 'item_code', 'description']}
                          allowCustom={true}
                          customPlaceholder="Or enter custom item name"
                          className="text-sm"
                          renderOption={(masterItem, idx, isHighlighted) => (
                            <div
                              key={masterItem.id || idx}
                              className={`px-3 py-2 cursor-pointer ${
                                isHighlighted ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                if (typeof masterItem === 'object') {
                                  updateItem(index, 'item_name', masterItem.name);
                                }
                              }}
                            >
                              <div className="font-medium text-sm">{masterItem.name}</div>
                              {masterItem.subtitle && (
                                <div className="text-xs text-gray-500">{masterItem.subtitle}</div>
                              )}
                            </div>
                          )}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm text-center"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={e => updateItem(index, 'rate', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm text-right"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {form.items.length > 1 && (
                          <button
                            onClick={() => removeItem(index)}
                            className="p-1 hover:bg-gray-100 rounded text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => updateForm('notes', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount:</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={form.discount_amount}
                    onChange={e => updateForm('discount_amount', e.target.value)}
                    className="w-20 px-2 py-1 border rounded text-sm text-right"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax Rate:</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={form.tax_rate}
                    onChange={e => updateForm('tax_rate', e.target.value)}
                    className="w-16 px-2 py-1 border rounded text-sm text-right"
                    min="0"
                    max="100"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax Amount:</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={form.status}
              onChange={e => updateForm('status', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="Draft">Draft</option>
              <option value="Issued">Issued</option>
              <option value="Accepted">Accepted</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebitNoteForm;
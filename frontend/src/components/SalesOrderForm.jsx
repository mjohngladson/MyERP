import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Send, Search, User, Package } from 'lucide-react';
import { api } from '../services/api';

const SalesOrderForm = ({ orderId, onBack, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [searchCustomers, setSearchCustomers] = useState('');
  const [searchItems, setSearchItems] = useState('');

  const [order, setOrder] = useState({
    order_number: '',
    customer_id: '',
    customer_name: '',
    delivery_date: '',
    shipping_address: '',
    notes: '',
    status: 'draft',
    items: [],
    total_amount: 0,
    company_id: 'default_company'
  });

  useEffect(() => {
    loadCustomers();
    loadItems();
    if (orderId) {
      loadOrder();
    } else {
      generateOrderNumber();
    }
  }, [orderId]);

  const loadCustomers = async () => {
    try {
      const res = await fetch(`${api.getBaseUrl()}/api/sales/customers`);
      const data = await res.json();
      setCustomers(data || []);
    } catch (e) { console.error('customers load failed', e); }
  };
  const loadItems = async () => {
    try {
      const res = await fetch(`${api.getBaseUrl()}/api/pos/products?limit=100`);
      const data = await res.json();
      setItems(data || []);
    } catch (e) { console.error('items load failed', e); }
  };
  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api.getBaseUrl()}/api/sales/orders/${orderId}`);
      const data = await res.json();
      setOrder({ ...data, delivery_date: data.delivery_date ? data.delivery_date.split('T')[0] : '' });
    } catch (e) { console.error('order load failed', e); } finally { setLoading(false); }
  };
  const generateOrderNumber = () => {
    const d = new Date();
    const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setOrder(prev => ({ ...prev, order_number: `SO-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${seq}` }));
  };

  const addItem = () => {
    const newItem = { id: Date.now(), item_id: '', item_name: '', description: '', quantity: 1, rate: 0, amount: 0 };
    const updated = [...order.items, newItem];
    setOrder(prev => ({ ...prev, items: updated, total_amount: calcTotal(updated) }));
  };
  const updateItem = (id, field, value) => {
    const updated = order.items.map(it => {
      if (it.id === id) {
        const u = { ...it, [field]: value };
        if (field === 'item_id') {
          const sel = items.find(i => i.id === value || i.sku === value);
          if (sel) {
            u.item_name = sel.name; u.rate = sel.price || 0;
          }
        }
        if (field === 'quantity' || field === 'rate') {
          u.amount = (u.quantity || 0) * (u.rate || 0);
        }
        return u;
      }
      return it;
    });
    setOrder(prev => ({ ...prev, items: updated, total_amount: calcTotal(updated) }));
  };
  const removeItem = (id) => {
    const updated = order.items.filter(i => i.id !== id);
    setOrder(prev => ({ ...prev, items: updated, total_amount: calcTotal(updated) }));
  };
  const calcTotal = (items) => items.reduce((s, it) => s + (it.amount || 0), 0);

  const selectCustomer = (c) => {
    setOrder(prev => ({ ...prev, customer_id: c.id, customer_name: c.name, shipping_address: c.address || '' }));
  };

  const saveOrder = async (status = 'draft') => {
    setSaving(true);
    try {
      const payload = { ...order, status };
      let res;
      if (orderId) {
        res = await fetch(`${api.getBaseUrl()}/api/sales/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(`${api.getBaseUrl()}/api/sales/orders`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      }
      if (res.ok) {
        const data = await res.json();
        onSave && onSave(data);
        onBack && onBack();
      } else {
        alert('Failed to save sales order');
      }
    } catch (e) {
      console.error('save order failed', e);
      alert('Error saving sales order');
    } finally { setSaving(false); }
  };

  const filteredCustomers = customers.filter(c => (c.name || '').toLowerCase().includes(searchCustomers.toLowerCase()) || (c.email || '').toLowerCase().includes(searchCustomers.toLowerCase()) || (c.phone || '').includes(searchCustomers));
  const filteredItems = items.filter(i => (i.name || '').toLowerCase().includes(searchItems.toLowerCase()) || (i.description || '').toLowerCase().includes(searchItems.toLowerCase()));
  const formatCurrency = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(a || 0);

  if (loading) return (<div className="p-6"><div className="animate-pulse h-40 bg-gray-100 rounded"/></div>);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="h-5 w-5" /><span>Back</span></button>
          <h1 className="text-2xl font-bold text-gray-900">{orderId ? 'Edit Sales Order' : 'Create Sales Order'}</h1>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => saveOrder('draft')} disabled={saving} className="flex items-center space-x-2 px-4 py-2 border rounded-md">{saving ? 'Saving...' : 'Save Draft'}</button>
          <button onClick={() => saveOrder('submitted')} disabled={saving} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md">Submit</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                <input type="text" value={order.order_number} onChange={(e)=>setOrder(prev=>({...prev, order_number: e.target.value}))} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                  <input type="date" value={(order.order_date || new Date().toISOString()).split('T')[0]} onChange={(e)=>setOrder(prev=>({...prev, order_date: e.target.value}))} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                  <input type="date" value={order.delivery_date} onChange={(e)=>setOrder(prev=>({...prev, delivery_date: e.target.value}))} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={order.status||'draft'} onChange={(e)=>setOrder(prev=>({...prev, status: e.target.value}))} className="w-full px-3 py-2 border rounded-md">
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
                <textarea value={order.shipping_address} onChange={(e)=>setOrder(prev=>({...prev, shipping_address: e.target.value}))} rows={2} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={order.notes} onChange={(e)=>setOrder(prev=>({...prev, notes: e.target.value}))} rows={2} className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Customer</label>
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchCustomers} onChange={(e)=>setSearchCustomers(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-2 border rounded-md" />
              </div>
              {searchCustomers && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 ring-1 ring-black ring-opacity-5 overflow-auto">
                  {filteredCustomers.map(c => (
                    <div key={c.id} onClick={()=>{selectCustomer(c); setSearchCustomers('');}} className="cursor-pointer py-2 pl-3 pr-9 hover:bg-blue-600 hover:text-white">
                      <div className="flex items-center"><User className="h-4 w-4 mr-2" /><span className="truncate">{c.name}</span></div>
                      {c.email && (<span className="text-xs text-gray-500">{c.email}</span>)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input type="text" value={order.customer_name} onChange={(e)=>setOrder(prev=>({...prev, customer_name: e.target.value}))} className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Items</h3>
            <button onClick={addItem} className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"><Plus className="h-4 w-4" /><span>Add Item</span></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Amount</th>
                <th className="px-4 py-3 w-12"></th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map(it => (
                  <tr key={it.id}>
                    <td className="px-4 py-4">
                      <select value={it.item_id} onChange={(e)=>updateItem(it.id, 'item_id', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                        <option value="">Select Item</option>
                        {items.map(av => (<option key={av.id} value={av.id}>{av.name}</option>))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <input type="text" value={it.description || ''} onChange={(e)=>updateItem(it.id, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Description" />
                    </td>
                    <td className="px-4 py-4">
                      <input type="number" min="0" step="0.01" value={it.quantity} onChange={(e)=>updateItem(it.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-md text-sm" />
                    </td>
                    <td className="px-4 py-4">
                      <input type="number" min="0" step="0.01" value={it.rate} onChange={(e)=>updateItem(it.id, 'rate', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-md text-sm" />
                    </td>
                    <td className="px-4 py-4"><div className="text-sm font-medium text-gray-900">{formatCurrency(it.amount)}</div></td>
                    <td className="px-4 py-4"><button onClick={()=>removeItem(it.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {order.items.length === 0 && (
            <div className="text-center py-8 text-gray-500"><Package className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>No items added yet. Click "Add Item" to get started.</p></div>
          )}
        </div>

        <div className="border-t pt-6">
          <div className="flex justify-end">
            <div className="w-80 space-y-3">
              <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-bold">{formatCurrency(order.total_amount)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOrderForm;
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { api } from '../services/api';

const QuotationForm = ({ quotationId, onBack, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);

  const [qt, setQt] = useState({
    quotation_number: '',
    customer_id: '',
    customer_name: '',
    quotation_date: '',
    status: 'draft',
    items: [],
    subtotal: 0,
    discount_amount: 0,
    tax_rate: 18,
    tax_amount: 0,
    total_amount: 0,
    company_id: 'default_company'
  });

  useEffect(()=>{
    loadCustomers();
    loadItems();
    if (quotationId) loadQuotation(); else genQtNumber();
  }, [quotationId]);

  const loadCustomers = async ()=>{
    try { const r = await fetch(`${api.getBaseUrl()}/api/sales/customers`); setCustomers(await r.json() || []); } catch(e) {}
  };
  const loadItems = async ()=>{
    try { const r = await fetch(`${api.getBaseUrl()}/api/pos/products?limit=100`); setItems(await r.json() || []); } catch(e) {}
  };
  const loadQuotation = async ()=>{
    setLoading(true);
    try { const r = await fetch(`${api.getBaseUrl()}/api/quotations/${quotationId}`); const d = await r.json(); setQt({ ...d, quotation_date: d.quotation_date ? d.quotation_date.split('T')[0] : '' }); } catch(e){} finally { setLoading(false); }
  };
  const genQtNumber = ()=>{
    const d = new Date();
    setQt(prev=>({ ...prev, quotation_number: `QTN-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}` }));
  };

  const addItem = ()=>{
    const ni = { id: Date.now(), item_id: '', item_name: '', quantity: 1, rate: 0, amount: 0 };
    setQt(prev=>({ ...prev, items: [...prev.items, ni] }));
  };
  const updateItem = (id, field, value) => {
    const updated = qt.items.map(it=>{
      if (it.id === id) {
        const u = { ...it, [field]: value };
        if (field === 'item_id') {
          const sel = items.find(i => i.id === value || i.sku === value);
          if (sel) { u.item_name = sel.name; u.rate = sel.price || 0; }
        }
        if (field === 'quantity' || field === 'rate') { u.amount = (u.quantity||0) * (u.rate||0); }
        return u;
      }
      return it;
    });
    setQt(prev=>({ ...prev, items: updated }));
  };
  const removeItem = (id) => setQt(prev=>({ ...prev, items: prev.items.filter(i=>i.id!==id) }));

  useEffect(()=>{
    const subtotal = qt.items.reduce((s,it)=> s + (it.amount||0), 0);
    const discounted = Math.max(0, subtotal - (qt.discount_amount||0));
    const taxAmt = (discounted * (qt.tax_rate||0)) / 100.0;
    const total = discounted + taxAmt;
    setQt(prev=>({ ...prev, subtotal, tax_amount: taxAmt, total_amount: total }));
  }, [qt.items, qt.discount_amount, qt.tax_rate]);

  const selectCustomer = (c)=> setQt(prev=>({ ...prev, customer_id: c.id, customer_name: c.name }));

  const saveQuotation = async (status='draft')=>{
    setSaving(true);
    try {
      const payload = { ...qt, status };
      let r;
      if (quotationId) {
        r = await fetch(`${api.getBaseUrl()}/api/quotations/${quotationId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      } else {
        r = await fetch(`${api.getBaseUrl()}/api/quotations/`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      }
      if (r.ok) { const data = await r.json(); onSave && onSave(data); onBack && onBack(); } else { alert('Failed to save quotation'); }
    } catch(e){ console.error(e); alert('Error saving quotation'); } finally { setSaving(false); }
  };

  if (loading) return (<div className="p-6"><div className="animate-pulse h-40 bg-gray-100 rounded"/></div>);

  const formatCurrency = (a)=> new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', minimumFractionDigits: 2 }).format(a||0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="h-5 w-5" /><span>Back</span></button>
        <div className="flex items-center space-x-3">
          <button onClick={()=>saveQuotation('draft')} disabled={saving} className="px-4 py-2 border rounded-md">{saving?'Saving...':'Save Draft'}</button>
          <button onClick={()=>saveQuotation('submitted')} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md">Submit</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quotation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Number</label>
                <input type="text" value={qt.quotation_number} onChange={(e)=>setQt(prev=>({...prev, quotation_number: e.target.value}))} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Date</label>
                  <input type="date" value={(qt.quotation_date||new Date().toISOString()).split('T')[0]} onChange={(e)=>setQt(prev=>({...prev, quotation_date: e.target.value}))} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer</h3>
            <div className="space-y-3">
              <select value={qt.customer_id} onChange={(e)=>{
                const c = customers.find(x=>x.id===e.target.value); if(c) selectCustomer(c);
              }} className="w-full px-3 py-2 border rounded-md">
                <option value="">Select Customer</option>
                {customers.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={qt.customer_name} 
                  onChange={(e)=>setQt(prev=>({...prev, customer_name: e.target.value}))} 
                  className="w-full px-3 py-2 border rounded-md" 
                  placeholder="Enter customer name" 
                  required
                />
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {qt.items.map(it => (
                  <tr key={it.id}>
                    <td className="px-4 py-3">
                      <select value={it.item_id} onChange={(e)=>updateItem(it.id, 'item_id', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                        <option value="">Select Item</option>
                        {items.map(av => (<option key={av.id} value={av.id}>{av.name}</option>))}
                      </select>
                    </td>
                    <td className="px-4 py-3"><input type="number" min="0" step="0.01" value={it.quantity} onChange={(e)=>updateItem(it.id,'quantity', parseFloat(e.target.value)||0)} className="w-full px-3 py-2 border rounded-md text-sm" /></td>
                    <td className="px-4 py-3"><input type="number" min="0" step="0.01" value={it.rate} onChange={(e)=>updateItem(it.id,'rate', parseFloat(e.target.value)||0)} className="w-full px-3 py-2 border rounded-md text-sm" /></td>
                    <td className="px-4 py-3"><div className="text-sm font-medium text-gray-900">{formatCurrency(it.amount)}</div></td>
                    <td className="px-4 py-3"><button onClick={()=>removeItem(it.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-start-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(qt.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Discount</span><input type="number" min="0" step="0.01" value={qt.discount_amount} onChange={(e)=>setQt(prev=>({...prev, discount_amount: parseFloat(e.target.value)||0}))} className="w-28 px-2 py-1 border rounded-md text-sm text-right" /></div>
                <div className="flex justify-between"><span className="text-gray-600">Tax Rate (%)</span><input type="number" min="0" step="0.01" value={qt.tax_rate} onChange={(e)=>setQt(prev=>({...prev, tax_rate: parseFloat(e.target.value)||0}))} className="w-28 px-2 py-1 border rounded-md text-sm text-right" /></div>
                <div className="flex justify-between"><span className="text-gray-600">Tax</span><span className="font-medium">{formatCurrency(qt.tax_amount)}</span></div>
                <div className="flex justify-between text-base font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(qt.total_amount)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationForm;
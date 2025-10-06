import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';

const genRowId = () => `${Date.now()}_${Math.floor(Math.random()*1e6)}`;

const toArray = (resp, keys = ['data', 'items', 'results']) => {
  if (Array.isArray(resp)) return resp;
  for (const k of keys) {
    if (resp && Array.isArray(resp[k])) return resp[k];
  }
  return [];
};

const PurchaseInvoiceForm = ({ invoiceId, onBack, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);

  const [inv, setInv] = useState({
    invoice_number: '',
    supplier_id: '',
    supplier_name: '',
    invoice_date: '',
    due_date: '',
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
    loadSuppliers();
    loadItems();
    if (invoiceId) loadInvoice(); else genInvoiceNumber();
    // eslint-disable-next-line
  }, [invoiceId]);

  const loadSuppliers = async ()=>{
    try { 
      const r = await fetch(`${api.getBaseUrl()}/api/reporting/suppliers`);
      const d = await r.json().catch(()=>[]);
      setSuppliers(toArray(d));
    } catch(e){ setSuppliers([]); }
  };
  const loadItems = async ()=>{
    try { 
      const r = await fetch(`${api.getBaseUrl()}/api/pos/products?limit=100`);
      const d = await r.json().catch(()=>[]);
      setItems(toArray(d));
    } catch(e){ setItems([]); }
  };
  const loadInvoice = async ()=>{
    setLoading(true);
    try { 
      const r = await fetch(`${api.getBaseUrl()}/api/purchase/invoices/${invoiceId}`);
      const d = await r.json();
      const normalizedItems = (Array.isArray(d.items) ? d.items : []).map((it) => ({
        id: it.id || it._id || it.item_row_id || genRowId(),
        item_id: it.item_id || it.id || '',
        item_name: it.item_name || it.description || '',
        quantity: typeof it.quantity === 'number' ? it.quantity : parseFloat(it.quantity)||0,
        rate: typeof it.rate === 'number' ? it.rate : parseFloat(it.rate)||0,
        amount: typeof it.amount === 'number' ? it.amount : ((parseFloat(it.quantity)||0) * (parseFloat(it.rate)||0))
      }));
      setInv({ 
        ...d, 
        items: normalizedItems,
        invoice_date: d.invoice_date ? d.invoice_date.split('T')[0] : '', 
        due_date: d.due_date ? d.due_date.split('T')[0] : '' 
      }); 
    } catch(e){ console.error('Failed to load Purchase Invoice', e);} 
    finally { setLoading(false); }
  };
  const genInvoiceNumber = ()=>{
    const d = new Date();
    setInv(prev=>({ ...prev, invoice_number: `PINV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}` }));
  };

  const addItem = ()=>{ const ni = { id: genRowId(), item_id: '', item_name: '', quantity: 1, rate: 0, amount: 0 }; setInv(prev=>({ ...prev, items: [...prev.items, ni] })); };
  const updateItem = (id, field, value)=>{
    const updated = (inv.items||[]).map(it=>{
      if (it.id === id) {
        const u = { ...it, [field]: value };
        if (field === 'item_id') { 
          const sel = (items||[]).find(i => i.id === value || i.sku === value);
          if (sel) { u.item_name = sel.name || sel.item_name || ''; u.rate = sel.price || sel.rate || 0; u.amount = (u.quantity||0) * (u.rate||0); }
        }
        if (field === 'quantity' || field === 'rate') { u.amount = (parseFloat(u.quantity)||0) * (parseFloat(u.rate)||0); }
        return u;
      }
      return it;
    });
    setInv(prev=>({ ...prev, items: updated }));
  };
  const removeItem = (id)=> setInv(prev=>({ ...prev, items: (prev.items||[]).filter(i=>i.id!==id) }));

  useEffect(()=>{
    const subtotal = (inv.items||[]).reduce((s,it)=> s + (parseFloat(it.amount)||0), 0);
    const discounted = Math.max(0, subtotal - (parseFloat(inv.discount_amount)||0));
    const taxAmt = (discounted * (parseFloat(inv.tax_rate)||0)) / 100.0;
    const total = discounted + taxAmt;
    setInv(prev=>({ ...prev, subtotal, tax_amount: taxAmt, total_amount: total }));
    // eslint-disable-next-line
  }, [inv.items, inv.discount_amount, inv.tax_rate]);

  const selectSupplier = (s)=> {
    if (s && s.name) {
      setInv(prev=>({ ...prev, supplier_id: s.id, supplier_name: s.name }));
    }
  };

  const saveInvoice = async (status='draft')=>{
    setSaving(true);
    try {
      const payload = { ...inv, status };
      let r;
      if (invoiceId) { r = await fetch(`${api.getBaseUrl()}/api/purchase/invoices/${invoiceId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); }
      else { r = await fetch(`${api.getBaseUrl()}/api/purchase/invoices`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); }
      const data = await r.json().catch(()=>({}));
      if (r.ok) { onSave && onSave(data); onBack && onBack(); } else { alert(data.detail || 'Failed to save Purchase Invoice'); }
    } catch(e){ console.error(e); alert('Error saving Purchase Invoice'); } finally { setSaving(false); }
  };

  if (loading) return (<div className="p-6"><div className="animate-pulse h-40 bg-gray-100 rounded"/></div>);

  const formatCurrency = (a)=> new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', minimumFractionDigits: 2 }).format(a||0);
  const supplierList = Array.isArray(suppliers) ? suppliers : [];
  const itemList = Array.isArray(items) ? items : [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="h-5 w-5" /><span>Back</span></button>
        <div className="flex items-center space-x-3">
          <button onClick={()=>saveInvoice('draft')} disabled={saving} className="px-4 py-2 border rounded-md">{saving?'Saving...':'Save Draft'}</button>
          <button onClick={()=>saveInvoice('submitted')} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md">Submit</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Invoice</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input type="text" value={inv.invoice_number} onChange={(e)=>setInv(prev=>({...prev, invoice_number: e.target.value}))} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                  <input type="date" value={(inv.invoice_date||new Date().toISOString()).split('T')[0]} onChange={(e)=>setInv(prev=>({...prev, invoice_date: e.target.value}))} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={inv.due_date} onChange={(e)=>setInv(prev=>({...prev, due_date: e.target.value}))} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <select 
                value={inv.supplier_id} 
                onChange={(e)=>{ 
                  const selectedSupplierId = e.target.value;
                  const s = supplierList.find(x=>x.id===selectedSupplierId); 
                  if(s) {
                    selectSupplier(s);
                  } else {
                    setInv(prev=>({...prev, supplier_id: selectedSupplierId}));
                  }
                }} 
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select Supplier</option>
                {supplierList.map(s=> (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Items <span className="text-red-500">*</span>
            </h3>
            <button onClick={addItem} className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"><Plus className="h-4 w-4" /><span>Add Item</span></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Amount</th>
                <th className="px-4 py-3 w-12"></th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(inv.items||[]).map(it => (
                  <tr key={it.id}>
                    <td className="px-4 py-4">
                      <select value={it.item_id} onChange={(e)=>updateItem(it.id, 'item_id', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                        <option value="">Select Item</option>
                        {itemList.map(av => (<option key={av.id} value={av.id}>{av.name}</option>))}
                      </select>
                    </td>
                    <td className="px-4 py-4"><input type="number" min="0" step="0.01" value={it.quantity} onChange={(e)=>updateItem(it.id, 'quantity', parseFloat(e.target.value)||0)} className="w-full px-3 py-2 border rounded-md text-sm" /></td>
                    <td className="px-4 py-4"><input type="number" min="0" step="0.01" value={it.rate} onChange={(e)=>updateItem(it.id, 'rate', parseFloat(e.target.value)||0)} className="w-full px-3 py-2 border rounded-md text-sm" /></td>
                    <td className="px-4 py-4"><div className="text-sm font-medium text-gray-900">{formatCurrency(it.amount)}</div></td>
                    <td className="px-4 py-4"><button onClick={()=>removeItem(it.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button></td>
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
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(inv.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Discount</span><input type="number" min="0" step="0.01" value={inv.discount_amount} onChange={(e)=>setInv(prev=>({...prev, discount_amount: parseFloat(e.target.value)||0}))} className="w-28 px-2 py-1 border rounded-md text-sm text-right" /></div>
                <div className="flex justify-between"><span className="text-gray-600">Tax Rate (%)</span><input type="number" min="0" step="0.01" value={inv.tax_rate} onChange={(e)=>setInv(prev=>({...prev, tax_rate: parseFloat(e.target.value)||0}))} className="w-28 px-2 py-1 border rounded-md text-sm text-right" /></div>
                <div className="flex justify-between"><span className="text-gray-600">Tax</span><span className="font-medium">{formatCurrency(inv.tax_amount)}</span></div>
                <div className="flex justify-between text-base font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(inv.total_amount)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoiceForm;
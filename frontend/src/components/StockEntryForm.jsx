import React from 'react';
import { ChevronLeft, Save } from 'lucide-react';

const StockEntryForm = ({ onBack }) => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) || '';
  const [settings, setSettings] = React.useState({ enable_batches: true, enable_serials: true });
  const [warehouses, setWarehouses] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ type:'receipt', item_id:'', qty:'', rate:'', warehouse_id:'', source_warehouse_id:'', target_warehouse_id:'', batch_id:'', serial_numbers:'' });

  React.useEffect(()=>{
    const load = async () => {
      try {
        const [s,w] = await Promise.all([
          fetch(`${base}/api/stock/settings`).then(r=>r.json()),
          fetch(`${base}/api/stock/warehouses`).then(r=>r.json()),
        ]);
        setSettings(s||{}); setWarehouses(Array.isArray(w)?w:[]);
      } catch(e){ console.error(e); }
    };
    load();
  }, []);

  const validate = () => {
    if (!form.type) return 'Type is required';
    if (!form.item_id.trim()) return 'Item ID is required';
    const q = parseFloat(form.qty); if (!q || q<=0) return 'Quantity must be greater than 0';
    if (form.type==='receipt') {
      if (!form.warehouse_id) return 'Warehouse is required';
      const r = parseFloat(form.rate); if (!r || r<0) return 'Rate must be provided for receipt';
    }
    if (form.type==='issue') {
      if (!form.warehouse_id) return 'Warehouse is required';
    }
    if (form.type==='transfer') {
      if (!form.source_warehouse_id || !form.target_warehouse_id) return 'Source and Target warehouses are required';
      if (form.source_warehouse_id===form.target_warehouse_id) return 'Source and Target cannot be same';
    }
    return null;
  };

  const submit = async () => {
    const err = validate(); if (err) { alert(err); return; }
    setSaving(true);
    try {
      const lines = [{
        item_id: form.item_id.trim(),
        qty: parseFloat(form.qty),
        rate: form.type==='receipt' ? parseFloat(form.rate||'0') : undefined,
        warehouse_id: (form.type!=='transfer') ? form.warehouse_id || undefined : undefined,
        source_warehouse_id: form.type==='transfer' ? form.source_warehouse_id : undefined,
        target_warehouse_id: form.type==='transfer' ? form.target_warehouse_id : undefined,
        batch_id: settings.enable_batches ? (form.batch_id || undefined) : undefined,
        serial_numbers: settings.enable_serials && form.serial_numbers ? form.serial_numbers.split(',').map(s=>s.trim()).filter(Boolean) : []
      }];
      const payload = { type: form.type, lines };
      const res = await fetch(`${base}/api/stock/entries`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      alert('Stock entry saved');
      setForm({ type:'receipt', item_id:'', qty:'', rate:'', warehouse_id:'', source_warehouse_id:'', target_warehouse_id:'', batch_id:'', serial_numbers:'' });
    } catch(e){ console.error('Submit error', e); alert(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20}/></button>
          <h1 className="text-3xl font-bold text-gray-800">Stock Entry</h1>
        </div>
        <button onClick={submit} disabled={saving} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"><Save size={16}/><span>{saving?'Saving...':'Save'}</span></button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 max-w-3xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <select value={form.type} onChange={e=>setForm(f=>({...f, type:e.target.value}))} className="px-3 py-2 border rounded-lg">
            <option value="receipt">Receipt</option>
            <option value="issue">Issue</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Item ID</label>
          <input value={form.item_id} onChange={e=>setForm(f=>({...f, item_id:e.target.value}))} className="w-full px-3 py-2 border rounded" placeholder="Item UUID or code"/>
        </div>
        {form.type==='receipt' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rate (₹)</label>
            <input type="number" min="0" step="0.01" value={form.rate} onChange={e=>setForm(f=>({...f, rate:e.target.value}))} className="w-full px-3 py-2 border rounded" placeholder="0.00"/>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
          <input type="number" min="0" step="0.01" value={form.qty} onChange={e=>setForm(f=>({...f, qty:e.target.value}))} className="w-full px-3 py-2 border rounded" placeholder="0"/>
        </div>
        {form.type!=='transfer' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse</label>
            <select value={form.warehouse_id} onChange={e=>setForm(f=>({...f, warehouse_id:e.target.value}))} className="px-3 py-2 border rounded-lg w-full">
              <option value="">Select</option>
              {warehouses.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source Warehouse</label>
              <select value={form.source_warehouse_id} onChange={e=>setForm(f=>({...f, source_warehouse_id:e.target.value}))} className="px-3 py-2 border rounded-lg w-full">
                <option value="">Select</option>
                {warehouses.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Warehouse</label>
              <select value={form.target_warehouse_id} onChange={e=>setForm(f=>({...f, target_warehouse_id:e.target.value}))} className="px-3 py-2 border rounded-lg w-full">
                <option value="">Select</option>
                {warehouses.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {settings.enable_batches && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Batch ID (optional)</label>
            <input value={form.batch_id} onChange={e=>setForm(f=>({...f, batch_id:e.target.value}))} className="w-full px-3 py-2 border rounded" placeholder="Batch reference"/>
          </div>
        )}
        {settings.enable_serials && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Serial Numbers (comma separated)</label>
            <input value={form.serial_numbers} onChange={e=>setForm(f=>({...f, serial_numbers:e.target.value}))} className="w-full px-3 py-2 border rounded" placeholder="S001, S002"/>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockEntryForm;
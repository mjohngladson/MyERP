import React from 'react';
import { Plus, Edit, Trash2, ChevronLeft, Save, X } from 'lucide-react';

const Warehouses = ({ onBack }) => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) || '';
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [showForm, setShowForm] = React.useState(false);
  const [editRow, setEditRow] = React.useState(null);
  const [form, setForm] = React.useState({ name: '', is_active: true });
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/stock/warehouses`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load warehouses', e);
    } finally { setLoading(false); }
  };
  React.useEffect(()=>{ load(); }, []);

  const openNew = () => { setEditRow(null); setForm({ name: '', is_active: true }); setShowForm(true); };
  const openEdit = (row) => { setEditRow(row); setForm({ name: row.name || '', is_active: !!row.is_active }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditRow(null); };

  const save = async () => {
    if (!form.name.trim()) { alert('Name is required'); return; }
    setSaving(true);
    try {
      if (editRow && editRow.id) {
        const res = await fetch(`${base}/api/stock/warehouses/${editRow.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
        if (!res.ok) throw new Error('Failed to update');
      } else {
        const res = await fetch(`${base}/api/stock/warehouses`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
        if (!res.ok) throw new Error('Failed to create');
      }
      await load();
      setShowForm(false);
    } catch (e) {
      console.error('Save error', e); alert('Failed to save warehouse');
    } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!row?.id) return;
    if (!confirm(`Delete warehouse "${row.name}"?`)) return;
    try {
      const res = await fetch(`${base}/api/stock/warehouses/${row.id}`, { method:'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await load();
    } catch (e) { console.error('Delete error', e); alert('Failed to delete'); }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20}/></button>
          <h1 className="text-3xl font-bold text-gray-800">Warehouses</h1>
        </div>
        <button onClick={openNew} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus size={16}/><span>New Warehouse</span></button>
      </div>

      {loading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded" />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <div className="text-gray-600 mb-2">No warehouses found</div>
          <button onClick={openNew} className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus size={16}/><span>Create</span></button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b text-sm font-medium text-gray-600 grid grid-cols-12 gap-4">
            <div className="col-span-6">Name</div>
            <div className="col-span-3">Active</div>
            <div className="col-span-3">Actions</div>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.map((r)=> (
              <div key={r.id || r._id} className="px-6 py-3 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-6 font-medium text-gray-800">{r.name}</div>
                <div className="col-span-3 text-gray-700">{r.is_active ? 'Yes' : 'No'}</div>
                <div className="col-span-3 flex items-center space-x-2">
                  <button onClick={()=>openEdit(r)} className="p-2 hover:bg-gray-100 rounded" title="Edit"><Edit size={16} className="text-gray-600"/></button>
                  <button onClick={()=>remove(r)} className="p-2 hover:bg-gray-100 rounded" title="Delete"><Trash2 size={16} className="text-red-600"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">{editRow ? 'Edit Warehouse' : 'New Warehouse'}</h3><button onClick={closeForm} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5"/></button></div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} className="w-full px-3 py-2 border rounded" placeholder="Main Warehouse"/>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Active</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only" checked={form.is_active} onChange={e=>setForm(f=>({...f, is_active:e.target.checked}))}/>
                  <span className={`w-11 h-6 rounded-full ${form.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </span>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={closeForm} className="px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{saving?'Saving...':'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
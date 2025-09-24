import React from 'react';
import { ChevronLeft, Users, Search, Mail, Phone, Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '../services/api';

const CustomersList = ({ onBack }) => {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ id:null, name:'', email:'', phone:'', address:'', active:true });

  React.useEffect(()=>{ const t=setTimeout(()=>setDebounced(search),500); return ()=>clearTimeout(t); },[search]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/master/customers', { params: { search: debounced || undefined, limit: 200 } });
      setRows(Array.isArray(data) ? data : []);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };
  React.useEffect(()=>{ load(); }, [debounced]);

  const openNew = () => { setForm({ id:null, name:'', email:'', phone:'', address:'', active:true }); setShowForm(true); };
  const openEdit = (row) => { setForm({ id: row.id, name: row.name||'', email: row.email||'', phone: row.phone||'', address: row.address||'', active: !!row.active }); setShowForm(true); };

  const save = async () => {
    if (!form.name.trim()) { alert('Name is required'); return; }
    try {
      if (form.id) await api.put(`/master/customers/${form.id}`, form);
      else await api.post('/master/customers', form);
      setShowForm(false); load();
    } catch(e){ alert(e?.response?.data?.detail || 'Failed to save'); }
  };
  const remove = async (row) => {
    if (!row?.id) return; if (!confirm(`Delete customer ${row.name}?`)) return;
    try { await api.delete(`/master/customers/${row.id}`); load(); } catch(e){ alert(e?.response?.data?.detail || 'Failed to delete'); }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={20} /></button>
          <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
        </div>
        <button onClick={openNew} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus size={16}/><span>New Customer</span></button>
      </div>
      <div className="mb-4 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"/>
      </div>
      {loading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded" />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <div className="text-gray-600 mb-2">No customers found</div>
          <button onClick={openNew} className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus size={16}/><span>Create</span></button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b text-sm font-medium text-gray-600 grid grid-cols-12 gap-4">
            <div className="col-span-5">Customer</div>
            <div className="col-span-4">Email</div>
            <div className="col-span-3">Phone</div>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.map((c) => (
              <div key={c.id} className="px-6 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50">
                <div className="col-span-5 font-medium text-gray-800">{c.name || 'Customer'}</div>
                <div className="col-span-4 text-gray-700 flex items-center space-x-2"><Mail size={14} className="text-gray-400"/><span>{c.email || '-'}</span></div>
                <div className="col-span-3 text-gray-700 flex items-center space-x-2"><Phone size={14} className="text-gray-400"/><span>{c.phone || '-'}</span></div>
                <div className="col-span-12 md:col-span-12 flex items-center justify-end space-x-2 mt-2">
                  <button onClick={()=>openEdit(c)} className="p-2 hover:bg-gray-100 rounded" title="Edit"><Edit size={16} className="text-gray-600"/></button>
                  <button onClick={()=>remove(c)} className="p-2 hover:bg-gray-100 rounded" title="Delete"><Trash2 size={16} className="text-red-600"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="w-full px-3 py-2 border rounded"/>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="w-full px-3 py-2 border rounded"/>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className="w-full px-3 py-2 border rounded"/>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Address</label>
                <input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} className="w-full px-3 py-2 border rounded"/>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersList;
import React from 'react';
import { ChevronLeft, Package, Search, Tag, Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '../services/api';

const ItemsList = ({ onBack }) => {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ 
    id: null, 
    name: '', 
    item_code: '', 
    category: '', 
    unit_price: 0, 
    active: true 
  });

  React.useEffect(() => { 
    const t = setTimeout(() => setDebounced(search), 500); 
    return () => clearTimeout(t); 
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.items.list(debounced || undefined, 200);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error('Error loading items:', e); 
      setRows([]);
    } finally { 
      setLoading(false); 
    }
  };

  React.useEffect(() => { load(); }, [debounced]);

  const openNew = () => { 
    setForm({ 
      id: null, 
      name: '', 
      item_code: '', 
      category: '', 
      unit_price: 0, 
      active: true 
    }); 
    setShowForm(true); 
  };

  const openEdit = (row) => { 
    setForm({ 
      id: row.id, 
      name: row.name || '', 
      item_code: row.item_code || '', 
      category: row.category || '', 
      unit_price: row.unit_price || 0, 
      active: !!row.active 
    }); 
    setShowForm(true); 
  };

  const save = async () => {
    if (!form.name.trim()) { 
      alert('Name is required'); 
      return; 
    }
    try {
      const formData = {
        ...form,
        unit_price: parseFloat(form.unit_price) || 0
      };
      if (form.id) {
        await api.items.update(form.id, formData);
      } else {
        await api.items.create(formData);
      }
      setShowForm(false); 
      load();
    } catch (e) { 
      alert(e?.response?.data?.detail || 'Failed to save item'); 
    }
  };

  const remove = async (row) => {
    if (!row?.id) return; 
    if (!confirm(`Delete item "${row.name}"?`)) return;
    try { 
      await api.items.delete(row.id); 
      load(); 
    } catch (e) { 
      alert(e?.response?.data?.detail || 'Failed to delete item'); 
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount || 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Items</h1>
        </div>
        <button 
          onClick={openNew} 
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          <span>New Item</span>
        </button>
      </div>

      <div className="mb-4 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search items..." 
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded" />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Items Found</h3>
          <p className="text-gray-600 mb-4">
            {search ? 'Try a different search term' : 'Get started by creating your first item'}
          </p>
          <button 
            onClick={openNew} 
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Create Item</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b text-sm font-medium text-gray-600 grid grid-cols-12 gap-4">
            <div className="col-span-4">Item Name</div>
            <div className="col-span-2">Item Code</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">Actions</div>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.map((item) => (
              <div key={item.id} className="px-6 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50">
                <div className="col-span-4 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Package className="text-purple-600" size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{item.name}</div>
                    {!item.active && (
                      <div className="text-xs text-red-500">Inactive</div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-gray-700">{item.item_code || '-'}</div>
                <div className="col-span-2 text-gray-700">
                  {item.category && (
                    <div className="flex items-center">
                      <Tag size={12} className="mr-1 text-gray-400" />
                      {item.category}
                    </div>
                  )}
                </div>
                <div className="col-span-2 font-semibold text-gray-800">
                  {formatCurrency(item.unit_price)}
                </div>
                <div className="col-span-2 flex items-center space-x-2">
                  <button 
                    onClick={() => openEdit(item)} 
                    className="p-2 hover:bg-gray-100 rounded" 
                    title="Edit"
                  >
                    <Edit size={16} className="text-gray-600" />
                  </button>
                  <button 
                    onClick={() => remove(item)} 
                    className="p-2 hover:bg-gray-100 rounded" 
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {form.id ? 'Edit Item' : 'Create New Item'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Item Name *</label>
                <input 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Item Code</label>
                <input 
                  value={form.item_code} 
                  onChange={e => setForm(f => ({ ...f, item_code: e.target.value }))} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item code/SKU"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Category</label>
                <input 
                  value={form.category} 
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter category"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Unit Price (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={form.unit_price} 
                  onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={form.active} 
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} 
                  id="active-checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="active-checkbox" className="text-sm text-gray-600">
                  Active
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button 
                onClick={() => setShowForm(false)} 
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={save} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {form.id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsList;
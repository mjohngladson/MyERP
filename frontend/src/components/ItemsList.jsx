import React from 'react';
import { ChevronLeft, Package, Search, Tag, Plus, Edit, Trash2, DollarSign, Hash, Layers, Weight } from 'lucide-react';
import { api } from '../services/api';

const ItemsList = ({ onBack }) => {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [showForm, setShowForm] = React.useState(false);
  const [settings, setSettings] = React.useState(null);
  const [form, setForm] = React.useState({
    id: null,
    name: '',
    item_code: '',
    category: '',
    description: '',
    unit_price: 0,
    cost_price: 0,
    uom: 'NOS',
    
    // GST/Tax fields
    hsn_code: '',
    gst_rate: 18,
    
    // Inventory fields
    track_inventory: true,
    min_qty: 0,
    max_qty: 0,
    reorder_level: 0,
    
    // Variant fields
    has_variants: false,
    variant_attributes: [],
    
    // Dimensions & Weight
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
    
    // Status & Settings
    is_service: false,
    is_purchase: true,
    is_sales: true,
    active: true
  });

  React.useEffect(() => { 
    const t = setTimeout(() => setDebounced(search), 500); 
    return () => clearTimeout(t); 
  }, [search]);

  // Load general settings
  const loadSettings = async () => {
    try {
      const { data } = await api.settings.getGeneral();
      console.log('Loaded settings:', data); // Debug log
      setSettings(data);
    } catch (e) {
      console.error('Failed to load settings:', e);
      // Fallback defaults
      setSettings({
        gst_enabled: true,
        default_gst_percent: 18,
        enable_variants: true,
        uoms: ['NOS', 'PCS', 'PCK', 'KG', 'G', 'L', 'ML'],
        payment_terms: ['Net 0', 'Net 15', 'Net 30', 'Net 45'],
      });
    }
  };

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
  React.useEffect(() => { loadSettings(); }, []);

  const openNew = () => { 
    if (!settings) {
      // Settings not loaded yet, wait a bit and try again
      setTimeout(() => openNew(), 500);
      return;
    }
    
    setForm({ 
      id: null,
      name: '',
      item_code: '',
      category: '',
      description: '',
      unit_price: 0,
      cost_price: 0,
      uom: (settings?.uoms && settings.uoms[0]) || 'NOS',
      hsn_code: '',
      gst_rate: settings?.default_gst_percent || 18,
      track_inventory: true,
      min_qty: 0,
      max_qty: 0,
      reorder_level: 0,
      has_variants: false,
      variant_attributes: [],
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
      is_service: false,
      is_purchase: true,
      is_sales: true,
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
      description: row.description || '',
      unit_price: row.unit_price || 0,
      cost_price: row.cost_price || 0,
      uom: row.uom || 'NOS',
      hsn_code: row.hsn_code || '',
      gst_rate: row.gst_rate || settings?.default_gst_percent || 18,
      track_inventory: row.track_inventory !== undefined ? row.track_inventory : true,
      min_qty: row.min_qty || 0,
      max_qty: row.max_qty || 0,
      reorder_level: row.reorder_level || 0,
      has_variants: row.has_variants || false,
      variant_attributes: row.variant_attributes || [],
      weight: row.weight || 0,
      length: row.length || 0,
      width: row.width || 0,
      height: row.height || 0,
      is_service: row.is_service || false,
      is_purchase: row.is_purchase !== undefined ? row.is_purchase : true,
      is_sales: row.is_sales !== undefined ? row.is_sales : true,
      active: row.active !== undefined ? row.active : true
    }); 
    setShowForm(true); 
  };

  const save = async () => {
    if (!form.name.trim()) { 
      alert('Item name is required'); 
      return; 
    }
    try {
      const formData = {
        ...form,
        unit_price: parseFloat(form.unit_price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        gst_rate: parseFloat(form.gst_rate) || 0,
        min_qty: parseFloat(form.min_qty) || 0,
        max_qty: parseFloat(form.max_qty) || 0,
        reorder_level: parseFloat(form.reorder_level) || 0,
        weight: parseFloat(form.weight) || 0,
        length: parseFloat(form.length) || 0,
        width: parseFloat(form.width) || 0,
        height: parseFloat(form.height) || 0,
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

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

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
            <div className="col-span-3">Item Name</div>
            <div className="col-span-2">Item Code</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Price</div>
            {settings?.gst_enabled && (
              <div className="col-span-1">GST %</div>
            )}
            <div className="col-span-2">Actions</div>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.map((item) => (
              <div key={item.id} className="px-6 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50">
                <div className="col-span-3 flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    item.is_service ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    <Package className={`${
                      item.is_service ? 'text-green-600' : 'text-purple-600'
                    }`} size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-500 flex items-center space-x-2">
                      {item.is_service && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">Service</span>}
                      {item.has_variants && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Variants</span>}
                      {!item.active && <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded">Inactive</span>}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-gray-700">
                  <div>{item.item_code || '-'}</div>
                  {item.hsn_code && <div className="text-xs text-gray-500">HSN: {item.hsn_code}</div>}
                </div>
                <div className="col-span-2 text-gray-700">
                  {item.category && (
                    <div className="flex items-center">
                      <Tag size={12} className="mr-1 text-gray-400" />
                      {item.category}
                    </div>
                  )}
                </div>
                <div className="col-span-2 font-semibold text-gray-800">
                  <div>{formatCurrency(item.unit_price)}</div>
                  {item.cost_price > 0 && (
                    <div className="text-xs text-gray-500">Cost: {formatCurrency(item.cost_price)}</div>
                  )}
                </div>
                {settings?.gst_enabled && (
                  <div className="col-span-1 text-gray-700">
                    {item.gst_rate || 0}%
                  </div>
                )}
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {form.id ? 'Edit Item' : 'Create New Item'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 flex items-center">
                  <Package className="mr-2" size={16} />
                  Basic Information
                </h4>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Item Name *</label>
                  <input 
                    value={form.name} 
                    onChange={e => updateForm('name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter item name"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Item Code/SKU</label>
                  <input 
                    value={form.item_code} 
                    onChange={e => updateForm('item_code', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter item code"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <textarea 
                    value={form.description} 
                    onChange={e => updateForm('description', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter item description"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <input 
                    value={form.category} 
                    onChange={e => updateForm('category', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter category"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Unit Price (₹) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={form.unit_price} 
                      onChange={e => updateForm('unit_price', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Cost Price (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={form.cost_price} 
                      onChange={e => updateForm('cost_price', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Unit of Measure</label>
                  <select 
                    value={form.uom} 
                    onChange={e => updateForm('uom', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    {(settings?.uoms || ['NOS', 'PCS', 'PCK', 'KG', 'G', 'L', 'ML']).map(uom => (
                      <option key={uom} value={uom}>{uom}</option>
                    ))}
                  </select>
                  {!settings && <div className="text-xs text-gray-500 mt-1">Loading UoMs...</div>}
                </div>

                {/* Item Type Checkboxes */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={form.is_service} 
                      onChange={e => updateForm('is_service', e.target.checked)}
                      id="is-service"
                    />
                    <label htmlFor="is-service" className="text-sm text-gray-600">Is Service Item</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={form.is_purchase} 
                      onChange={e => updateForm('is_purchase', e.target.checked)}
                      id="is-purchase"
                    />
                    <label htmlFor="is-purchase" className="text-sm text-gray-600">Available for Purchase</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={form.is_sales} 
                      onChange={e => updateForm('is_sales', e.target.checked)}
                      id="is-sales"
                    />
                    <label htmlFor="is-sales" className="text-sm text-gray-600">Available for Sale</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={form.active} 
                      onChange={e => updateForm('active', e.target.checked)}
                      id="active"
                    />
                    <label htmlFor="active" className="text-sm text-gray-600">Active</label>
                  </div>
                </div>
              </div>

              {/* Advanced Information */}
              <div className="space-y-4">
                {/* GST/Tax Information */}
                {settings?.gst_enabled && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-700 flex items-center">
                      <Hash className="mr-2" size={16} />
                      GST & Tax Information
                    </h4>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">HSN/SAC Code</label>
                      <input 
                        value={form.hsn_code} 
                        onChange={e => updateForm('hsn_code', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter HSN/SAC code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">GST Rate (%)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={form.gst_rate} 
                        onChange={e => updateForm('gst_rate', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Inventory Management */}
                {!form.is_service && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-700 flex items-center">
                      <Layers className="mr-2" size={16} />
                      Inventory Management
                    </h4>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <input 
                        type="checkbox" 
                        checked={form.track_inventory} 
                        onChange={e => updateForm('track_inventory', e.target.checked)}
                        id="track-inventory"
                      />
                      <label htmlFor="track-inventory" className="text-sm text-gray-600">Track Inventory</label>
                    </div>

                    {form.track_inventory && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Min Qty</label>
                          <input 
                            type="number" 
                            value={form.min_qty} 
                            onChange={e => updateForm('min_qty', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Max Qty</label>
                          <input 
                            type="number" 
                            value={form.max_qty} 
                            onChange={e => updateForm('max_qty', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Reorder Level</label>
                          <input 
                            type="number" 
                            value={form.reorder_level} 
                            onChange={e => updateForm('reorder_level', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Variants */}
                {settings?.enable_variants && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-700">Item Variants</h4>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={form.has_variants} 
                        onChange={e => updateForm('has_variants', e.target.checked)}
                        id="has-variants"
                      />
                      <label htmlFor="has-variants" className="text-sm text-gray-600">Has Variants (Size, Color, etc.)</label>
                    </div>
                  </div>
                )}

                {/* Dimensions & Weight */}
                {!form.is_service && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-700 flex items-center">
                      <Weight className="mr-2" size={16} />
                      Dimensions & Weight
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Weight (kg)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={form.weight} 
                          onChange={e => updateForm('weight', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Length (cm)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={form.length} 
                          onChange={e => updateForm('length', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Width (cm)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={form.width} 
                          onChange={e => updateForm('width', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Height (cm)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={form.height} 
                          onChange={e => updateForm('height', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                {form.id ? 'Update' : 'Create'} Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsList;
import React from 'react';
import { ChevronLeft, Users, Search, Mail, Phone, Plus, Edit, Trash2, MapPin, Building, CreditCard, Truck } from 'lucide-react';
import { api } from '../services/api';

const SuppliersList = ({ onBack }) => {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [showForm, setShowForm] = React.useState(false);
  const [settings, setSettings] = React.useState(null);
  const [form, setForm] = React.useState({
    id: null,
    name: '',
    supplier_type: 'Company',
    
    // Contact Info
    email: '',
    phone: '',
    mobile: '',
    website: '',
    
    // Address
    billing_address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    
    // GST/Tax Info
    gstin: '',
    pan: '',
    tax_category: 'In State',
    
    // Business Info
    credit_limit: 0,
    payment_terms: 'Net 30',
    
    // Additional Info
    supplier_group: 'All Supplier Groups',
    territory: 'India',
    
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
      setSettings({
        gst_enabled: true,
        payment_terms: ['Net 0', 'Net 15', 'Net 30', 'Net 45']
      });
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.master.suppliers.list(debounced || undefined, 200);
      setRows(Array.isArray(data) ? data : []);
    } catch(e) { 
      console.error('Error loading suppliers:', e); 
      setRows([]);
    } finally { 
      setLoading(false); 
    }
  };

  React.useEffect(() => { load(); }, [debounced]);
  React.useEffect(() => { loadSettings(); }, []);

  const openNew = () => { 
    setForm({ 
      id: null,
      name: '',
      supplier_type: 'Company',
      email: '',
      phone: '',
      mobile: '',
      website: '',
      billing_address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      gstin: '',
      pan: '',
      tax_category: 'In State',
      credit_limit: 0,
      payment_terms: (settings?.payment_terms && settings.payment_terms[0]) || 'Net 30',
      supplier_group: 'All Supplier Groups',
      territory: 'India',
      active: true
    }); 
    setShowForm(true); 
  };

  const openEdit = (row) => { 
    setForm({ 
      id: row.id,
      name: row.name || '',
      supplier_type: row.supplier_type || 'Company',
      email: row.email || '',
      phone: row.phone || '',
      mobile: row.mobile || '',
      website: row.website || '',
      billing_address: row.billing_address || '',
      city: row.city || '',
      state: row.state || '',
      country: row.country || 'India',
      pincode: row.pincode || '',
      gstin: row.gstin || '',
      pan: row.pan || '',
      tax_category: row.tax_category || 'In State',
      credit_limit: row.credit_limit || 0,
      payment_terms: row.payment_terms || 'Net 30',
      supplier_group: row.supplier_group || 'All Supplier Groups',
      territory: row.territory || 'India',
      active: row.active !== undefined ? row.active : true
    }); 
    setShowForm(true); 
  };

  const save = async () => {
    if (!form.name.trim()) { 
      alert('Supplier name is required'); 
      return; 
    }
    try {
      const formData = {
        ...form,
        credit_limit: parseFloat(form.credit_limit) || 0,
      };
      if (form.id) {
        await api.master.suppliers.update(form.id, formData);
      } else {
        await api.master.suppliers.create(formData);
      }
      setShowForm(false); 
      load();
    } catch(e) { 
      alert(e?.response?.data?.detail || 'Failed to save supplier'); 
    }
  };

  const remove = async (row) => {
    if (!row?.id) return; 
    if (!confirm(`Delete supplier "${row.name}"?`)) return;
    try { 
      await api.master.suppliers.delete(row.id); 
      load(); 
    } catch(e) { 
      alert(e?.response?.data?.detail || 'Failed to delete supplier'); 
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20}/>
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Suppliers</h1>
        </div>
        <button 
          onClick={openNew} 
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16}/>
          <span>New Supplier</span>
        </button>
      </div>

      <div className="mb-4 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search suppliers..." 
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded" />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Suppliers Found</h3>
          <p className="text-gray-600 mb-4">
            {search ? 'Try a different search term' : 'Get started by adding your first supplier'}
          </p>
          <button 
            onClick={openNew} 
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Add Supplier</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b text-sm font-medium text-gray-600 grid grid-cols-12 gap-4">
            <div className="col-span-3">Supplier Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Contact</div>
            <div className="col-span-2">Location</div>
            {settings?.gst_enabled && (
              <div className="col-span-1">GSTIN</div>
            )}
            <div className="col-span-2">Actions</div>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.map((supplier)=> (
              <div key={supplier.id} className="px-6 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50">
                <div className="col-span-3 flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    supplier.supplier_type === 'Company' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {supplier.supplier_type === 'Company' ? (
                      <Building className="text-blue-600" size={16} />
                    ) : (
                      <Users className="text-green-600" size={16} />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{supplier.name}</div>
                    <div className="text-xs text-gray-500 flex items-center space-x-2">
                      {supplier.supplier_group !== 'All Supplier Groups' && (
                        <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                          {supplier.supplier_group}
                        </span>
                      )}
                      {!supplier.active && (
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-gray-700">
                  <div className="text-sm">{supplier.supplier_type}</div>
                  <div className="text-xs text-gray-500">{supplier.payment_terms || 'Net 30'}</div>
                </div>
                <div className="col-span-2 text-gray-700">
                  <div className="flex items-center space-x-1 text-sm">
                    {supplier.email && <Mail size={12} />}
                    <span>{supplier.email || '-'}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm">
                    {supplier.phone && <Phone size={12} />}
                    <span>{supplier.phone || supplier.mobile || '-'}</span>
                  </div>
                </div>
                <div className="col-span-2 text-gray-700">
                  <div className="flex items-center space-x-1 text-sm">
                    <MapPin size={12} className="text-gray-400" />
                    <span>{supplier.city || supplier.state || supplier.country || '-'}</span>
                  </div>
                  {supplier.territory !== 'India' && (
                    <div className="text-xs text-gray-500">{supplier.territory}</div>
                  )}
                </div>
                {settings?.gst_enabled && (
                  <div className="col-span-1 text-gray-700 text-sm">
                    {supplier.gstin ? (
                      <div className="font-mono">{supplier.gstin}</div>
                    ) : (
                      '-'
                    )}
                  </div>
                )}
                <div className="col-span-2 flex items-center space-x-2">
                  <button 
                    onClick={() => openEdit(supplier)} 
                    className="p-2 hover:bg-gray-100 rounded" 
                    title="Edit"
                  >
                    <Edit size={16} className="text-gray-600" />
                  </button>
                  <button 
                    onClick={() => remove(supplier)} 
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
              {form.id ? 'Edit Supplier' : 'Create New Supplier'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 flex items-center">
                  <Truck className="mr-2" size={16} />
                  Basic Information
                </h4>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Supplier Name *</label>
                  <input 
                    value={form.name} 
                    onChange={e => updateForm('name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter supplier name"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Supplier Type</label>
                  <select 
                    value={form.supplier_type} 
                    onChange={e => updateForm('supplier_type', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Company">Company</option>
                    <option value="Individual">Individual</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Email</label>
                    <input 
                      type="email"
                      value={form.email} 
                      onChange={e => updateForm('email', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Phone</label>
                    <input 
                      value={form.phone} 
                      onChange={e => updateForm('phone', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Mobile</label>
                    <input 
                      value={form.mobile} 
                      onChange={e => updateForm('mobile', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Mobile number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Website</label>
                    <input 
                      type="url"
                      value={form.website} 
                      onChange={e => updateForm('website', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="https://website.com"
                    />
                  </div>
                </div>

                {/* Address Information */}
                <h4 className="font-medium text-gray-700 flex items-center mt-6">
                  <MapPin className="mr-2" size={16} />
                  Address Information
                </h4>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Billing Address</label>
                  <textarea 
                    value={form.billing_address} 
                    onChange={e => updateForm('billing_address', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Enter billing address"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">City</label>
                    <input 
                      value={form.city} 
                      onChange={e => updateForm('city', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">State</label>
                    <input 
                      value={form.state} 
                      onChange={e => updateForm('state', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Pincode</label>
                    <input 
                      value={form.pincode} 
                      onChange={e => updateForm('pincode', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Country</label>
                  <select 
                    value={form.country} 
                    onChange={e => updateForm('country', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="UAE">UAE</option>
                    <option value="China">China</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={form.active} 
                    onChange={e => updateForm('active', e.target.checked)}
                    id="supplier-active"
                  />
                  <label htmlFor="supplier-active" className="text-sm text-gray-600">Active</label>
                </div>
              </div>

              {/* Business & Advanced Information */}
              <div className="space-y-4">
                {/* GST/Tax Information */}
                {settings?.gst_enabled && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-700 flex items-center">
                      <CreditCard className="mr-2" size={16} />
                      GST & Tax Information
                    </h4>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">GSTIN</label>
                      <input 
                        value={form.gstin} 
                        onChange={e => updateForm('gstin', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="15-character GSTIN"
                        maxLength="15"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">PAN</label>
                      <input 
                        value={form.pan} 
                        onChange={e => updateForm('pan', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="10-character PAN"
                        maxLength="10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Tax Category</label>
                      <select 
                        value={form.tax_category} 
                        onChange={e => updateForm('tax_category', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="In State">In State</option>
                        <option value="Out of State">Out of State</option>
                        <option value="Import">Import</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Business Information */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 flex items-center">
                    <Building className="mr-2" size={16} />
                    Business Information
                  </h4>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Credit Limit (₹)</label>
                    <input 
                      type="number" 
                      value={form.credit_limit} 
                      onChange={e => updateForm('credit_limit', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Terms</label>
                    <select 
                      value={form.payment_terms} 
                      onChange={e => updateForm('payment_terms', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      {(settings?.payment_terms || ['Net 0', 'Net 15', 'Net 30', 'Net 45']).map(term => (
                        <option key={term} value={term}>{term}</option>
                      ))}
                    </select>
                    {!settings && <div className="text-xs text-gray-500 mt-1">Loading payment terms...</div>}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Supplier Group</label>
                    <select 
                      value={form.supplier_group} 
                      onChange={e => updateForm('supplier_group', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="All Supplier Groups">All Supplier Groups</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Services">Services</option>
                      <option value="Raw Material">Raw Material</option>
                      <option value="Consumables">Consumables</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Territory</label>
                    <input 
                      value={form.territory} 
                      onChange={e => updateForm('territory', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter territory"
                    />
                  </div>
                </div>
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
                {form.id ? 'Update' : 'Create'} Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersList;
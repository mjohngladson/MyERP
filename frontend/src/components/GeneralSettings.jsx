import React from 'react';
import { ChevronLeft, Settings as SettingsIcon, Save, Layers, Barcode, Globe, Package, CreditCard } from 'lucide-react';

const GeneralSettings = ({ onBack }) => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) || '';
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [tab, setTab] = React.useState('tax');
  const [settings, setSettings] = React.useState({
    tax_country: 'IN',
    gst_enabled: true,
    default_gst_percent: 18,
    enable_variants: true,
    uoms: ['NOS','PCS','PCK','KG','G','L','ML'],
    payment_terms: ['Net 0','Net 15','Net 30','Net 45'],
    stock: { valuation_method: 'FIFO', allow_negative_stock: false, enable_batches: true, enable_serials: true },
    financial: {
      base_currency: 'INR',
      accounting_standard: 'Indian GAAP',
      fiscal_year_start: 'April',
      multi_currency_enabled: false,
      auto_exchange_rate_update: false,
      enable_auto_journal_entries: true,
      require_payment_approval: false,
      enable_budget_control: false,
      gst_categories: ['Taxable', 'Exempt', 'Zero Rated', 'Nil Rated'],
      gstin: '',
      auto_create_accounts: true,
      default_payment_terms: 'Net 30'
    },
    currencies: [],
    accounting_standards: []
  });

  React.useEffect(()=>{
    const load = async () => {
      try {
        const res = await fetch(`${base}/api/settings/general`);
        const data = await res.json();
        setSettings({
          tax_country: data.tax_country || 'IN',
          gst_enabled: !!data.gst_enabled,
          default_gst_percent: data.default_gst_percent ?? 18,
          enable_variants: !!data.enable_variants,
          uoms: Array.isArray(data.uoms) ? data.uoms : ['NOS','PCS','PCK','KG','G','L','ML'],
          payment_terms: Array.isArray(data.payment_terms) ? data.payment_terms : ['Net 0','Net 15','Net 30','Net 45'],
          stock: {
            valuation_method: data?.stock?.valuation_method || 'FIFO',
            allow_negative_stock: !!(data?.stock?.allow_negative_stock),
            enable_batches: !!(data?.stock?.enable_batches ?? true),
            enable_serials: !!(data?.stock?.enable_serials ?? true),
          }
        });
      } catch(e){ console.error('Load settings failed', e); }
      finally { setLoading(false); }
    };
    load();
  }, [base]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${base}/api/settings/general`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(settings) });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSettings(data);
      alert('Settings saved');
    } catch(e){ alert('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const toggle = (path) => (e) => {
    const checked = e.target.checked;
    setSettings(prev => ({ ...prev, [path[0]]: path.length === 1 ? checked : { ...prev[path[0]], [path[1]]: checked } }));
  };

  if (loading) return <div className="p-6 bg-gray-50 min-h-screen"><div className="animate-pulse h-40 bg-gray-100 rounded"/></div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20}/></button>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center"><SettingsIcon className="mr-2"/> General Settings</h1>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"><Save size={16}/><span>{saving?'Saving...':'Save'}</span></button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setTab('tax')} className={`px-3 py-2 rounded ${tab==='tax'?'bg-blue-600 text-white':'bg-gray-100'}`}><Globe className="inline mr-1" size={16}/> Tax & Compliance</button>
          <button onClick={()=>setTab('items')} className={`px-3 py-2 rounded ${tab==='items'?'bg-blue-600 text-white':'bg-gray-100'}`}><Package className="inline mr-1" size={16}/> Items</button>
          <button onClick={()=>setTab('stock')} className={`px-3 py-2 rounded ${tab==='stock'?'bg-blue-600 text-white':'bg-gray-100'}`}><Layers className="inline mr-1" size={16}/> Stock</button>
          <button onClick={()=>setTab('payments')} className={`px-3 py-2 rounded ${tab==='payments'?'bg-blue-600 text-white':'bg-gray-100'}`}><CreditCard className="inline mr-1" size={16}/> Payments</button>
        </div>
      </div>

      {tab==='tax' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4 max-w-3xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Country</label>
            <select value={settings.tax_country} onChange={e=>setSettings(s=>({...s, tax_country:e.target.value}))} className="px-3 py-2 border rounded-lg">
              <option value="IN">India</option>
              <option value="US">United States</option>
              <option value="AE">UAE</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Enable GST (India)</div>
              <div className="text-xs text-gray-500">Shows GST fields like GSTIN, HSN/SAC, GST%.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" checked={settings.gst_enabled} onChange={e=>setSettings(s=>({...s, gst_enabled:e.target.checked}))}/>
              <div className={`w-11 h-6 rounded-full ${settings.gst_enabled?'bg-blue-600':'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.gst_enabled?'translate-x-5':'translate-x-0'}`}></div></div>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default GST %</label>
            <input type="number" min="0" max="28" step="1" value={settings.default_gst_percent} onChange={e=>setSettings(s=>({...s, default_gst_percent: parseFloat(e.target.value||'0')}))} className="w-40 px-3 py-2 border rounded"/>
          </div>
        </div>
      )}

      {tab==='items' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Enable Variants</div>
              <div className="text-xs text-gray-500">Show variants (size, color, etc.) in items.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" checked={settings.enable_variants} onChange={e=>setSettings(s=>({...s, enable_variants:e.target.checked}))}/>
              <div className={`w-11 h-6 rounded-full ${settings.enable_variants?'bg-blue-600':'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.enable_variants?'translate-x-5':'translate-x-0'}`}></div></div>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">UoMs</label>
            <div className="flex flex-wrap gap-2">
              {settings.uoms.map((u,i)=> (<span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm">{u}</span>))}
            </div>
          </div>
        </div>
      )}

      {tab==='stock' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4 max-w-3xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valuation Method</label>
            <select value={settings.stock.valuation_method} onChange={e=>setSettings(s=>({...s, stock:{...s.stock, valuation_method:e.target.value}}))} className="px-3 py-2 border rounded-lg">
              <option value="FIFO">FIFO</option>
              <option value="MovingAverage">Moving Average</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Allow Negative Stock</div>
              <div className="text-xs text-gray-500">If disabled, issue/transfer will fail when stock is insufficient.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" checked={settings.stock.allow_negative_stock} onChange={e=>setSettings(s=>({...s, stock:{...s.stock, allow_negative_stock:e.target.checked}}))}/>
              <div className={`w-11 h-6 rounded-full ${settings.stock.allow_negative_stock?'bg-blue-600':'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.stock.allow_negative_stock?'translate-x-5':'translate-x-0'}`}></div></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Enable Batches</div>
              <div className="text-xs text-gray-500">Show batch field on stock entries and items.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" checked={settings.stock.enable_batches} onChange={e=>setSettings(s=>({...s, stock:{...s.stock, enable_batches:e.target.checked}}))}/>
              <div className={`w-11 h-6 rounded-full ${settings.stock.enable_batches?'bg-blue-600':'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.stock.enable_batches?'translate-x-5':'translate-x-0'}`}></div></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Enable Serials</div>
              <div className="text-xs text-gray-500">Show serial numbers input on stock entries.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" checked={settings.stock.enable_serials} onChange={e=>setSettings(s=>({...s, stock:{...s.stock, enable_serials:e.target.checked}}))}/>
              <div className={`w-11 h-6 rounded-full ${settings.stock.enable_serials?'bg-blue-600':'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.stock.enable_serials?'translate-x-5':'translate-x-0'}`}></div></div>
            </label>
          </div>
        </div>
      )}

      {tab==='payments' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4 max-w-3xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms Presets</label>
            <div className="flex flex-wrap gap-2">
              {settings.payment_terms.map((p,i)=> (<span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm">{p}</span>))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralSettings;
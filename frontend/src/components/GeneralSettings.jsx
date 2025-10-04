import React from 'react';
import { ChevronLeft, Settings as SettingsIcon, Save, Layers, Barcode, Globe, Package, CreditCard, DollarSign } from 'lucide-react';

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
    timezone: 'Asia/Kolkata',
    date_format: 'DD/MM/YYYY',
    time_format: '12',
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
          timezone: data.timezone || 'Asia/Kolkata',
          date_format: data.date_format || 'DD/MM/YYYY',
          time_format: data.time_format || '12',
          stock: {
            valuation_method: data?.stock?.valuation_method || 'FIFO',
            allow_negative_stock: !!(data?.stock?.allow_negative_stock),
            enable_batches: !!(data?.stock?.enable_batches ?? true),
            enable_serials: !!(data?.stock?.enable_serials ?? true),
          },
          financial: {
            base_currency: data?.financial?.base_currency || 'INR',
            accounting_standard: data?.financial?.accounting_standard || 'Indian GAAP',
            fiscal_year_start: data?.financial?.fiscal_year_start || 'April',
            multi_currency_enabled: !!(data?.financial?.multi_currency_enabled),
            auto_exchange_rate_update: !!(data?.financial?.auto_exchange_rate_update),
            enable_auto_journal_entries: data?.financial?.enable_auto_journal_entries ?? true,
            require_payment_approval: !!(data?.financial?.require_payment_approval),
            enable_budget_control: !!(data?.financial?.enable_budget_control),
            gst_categories: Array.isArray(data?.financial?.gst_categories) ? data.financial.gst_categories : ['Taxable', 'Exempt', 'Zero Rated', 'Nil Rated'],
            gstin: data?.financial?.gstin || '',
            auto_create_accounts: data?.financial?.auto_create_accounts ?? true,
            default_payment_terms: data?.financial?.default_payment_terms || 'Net 30'
          },
          currencies: Array.isArray(data.currencies) ? data.currencies : [],
          accounting_standards: Array.isArray(data.accounting_standards) ? data.accounting_standards : []
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
          <button onClick={()=>setTab('financial')} className={`px-3 py-2 rounded ${tab==='financial'?'bg-blue-600 text-white':'bg-gray-100'}`}><DollarSign className="inline mr-1" size={16}/> Financial</button>
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

      {tab==='financial' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border space-y-6 max-w-4xl">
          {/* Currency Settings */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Currency Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Currency</label>
                <select 
                  value={settings.financial.base_currency} 
                  onChange={e=>setSettings(s=>({...s, financial:{...s.financial, base_currency:e.target.value}}))} 
                  className="px-3 py-2 border rounded-lg w-48"
                >
                  {settings.currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Primary currency for all financial transactions</p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Enable Multi-Currency</div>
                  <div className="text-xs text-gray-500">Allow transactions in multiple currencies</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={settings.financial.multi_currency_enabled} 
                    onChange={e=>setSettings(s=>({...s, financial:{...s.financial, multi_currency_enabled:e.target.checked}}))}
                  />
                  <div className={`w-11 h-6 rounded-full ${settings.financial.multi_currency_enabled?'bg-blue-600':'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.financial.multi_currency_enabled?'translate-x-5':'translate-x-0'}`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Auto Exchange Rate Update</div>
                  <div className="text-xs text-gray-500">Automatically fetch latest exchange rates</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={settings.financial.auto_exchange_rate_update} 
                    onChange={e=>setSettings(s=>({...s, financial:{...s.financial, auto_exchange_rate_update:e.target.checked}}))}
                  />
                  <div className={`w-11 h-6 rounded-full ${settings.financial.auto_exchange_rate_update?'bg-blue-600':'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.financial.auto_exchange_rate_update?'translate-x-5':'translate-x-0'}`}></div>
                  </div>
                </label>
              </div>

              {settings.currencies.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Currencies</label>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {settings.currencies.map(c => (
                      <div key={c.code} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{c.name} ({c.code})</span>
                        <span className="text-sm text-gray-600">
                          {c.symbol} | Rate: {c.rate} {c.is_base && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Base</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Accounting Standards */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Accounting Standards</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Accounting Standard</label>
                <select 
                  value={settings.financial.accounting_standard} 
                  onChange={e=>setSettings(s=>({...s, financial:{...s.financial, accounting_standard:e.target.value}}))} 
                  className="px-3 py-2 border rounded-lg w-full max-w-md"
                >
                  {settings.accounting_standards.map(std => (
                    <option key={std.code} value={std.name}>{std.name} - {std.country}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Select the accounting standard your company follows</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fiscal Year Start</label>
                <select 
                  value={settings.financial.fiscal_year_start} 
                  onChange={e=>setSettings(s=>({...s, financial:{...s.financial, fiscal_year_start:e.target.value}}))} 
                  className="px-3 py-2 border rounded-lg w-48"
                >
                  <option value="January">January</option>
                  <option value="April">April</option>
                  <option value="July">July</option>
                  <option value="October">October</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Start month of your fiscal year</p>
              </div>
            </div>
          </div>

          {/* GST/Tax Compliance */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">GST & Tax Compliance (India)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                <input 
                  type="text" 
                  value={settings.financial.gstin} 
                  onChange={e=>setSettings(s=>({...s, financial:{...s.financial, gstin:e.target.value}}))} 
                  placeholder="22AAAAA0000A1Z5"
                  className="px-3 py-2 border rounded-lg w-full max-w-md"
                />
                <p className="text-xs text-gray-500 mt-1">Your company's GST Identification Number</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GST Categories</label>
                <div className="flex flex-wrap gap-2">
                  {settings.financial.gst_categories.map((cat, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{cat}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Available GST categories for items and transactions</p>
              </div>
            </div>
          </div>

          {/* Automation Settings */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Automation & Controls</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Auto Create Accounts</div>
                  <div className="text-xs text-gray-500">Automatically create accounts for new items, customers, suppliers</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={settings.financial.auto_create_accounts} 
                    onChange={e=>setSettings(s=>({...s, financial:{...s.financial, auto_create_accounts:e.target.checked}}))}
                  />
                  <div className={`w-11 h-6 rounded-full ${settings.financial.auto_create_accounts?'bg-blue-600':'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.financial.auto_create_accounts?'translate-x-5':'translate-x-0'}`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Auto Journal Entries</div>
                  <div className="text-xs text-gray-500">Automatically create journal entries for invoices and payments</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={settings.financial.enable_auto_journal_entries} 
                    onChange={e=>setSettings(s=>({...s, financial:{...s.financial, enable_auto_journal_entries:e.target.checked}}))}
                  />
                  <div className={`w-11 h-6 rounded-full ${settings.financial.enable_auto_journal_entries?'bg-blue-600':'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.financial.enable_auto_journal_entries?'translate-x-5':'translate-x-0'}`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Require Payment Approval</div>
                  <div className="text-xs text-gray-500">Payments require manager approval before processing</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={settings.financial.require_payment_approval} 
                    onChange={e=>setSettings(s=>({...s, financial:{...s.financial, require_payment_approval:e.target.checked}}))}
                  />
                  <div className={`w-11 h-6 rounded-full ${settings.financial.require_payment_approval?'bg-blue-600':'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.financial.require_payment_approval?'translate-x-5':'translate-x-0'}`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Enable Budget Control</div>
                  <div className="text-xs text-gray-500">Enforce budget limits on expenses and purchases</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={settings.financial.enable_budget_control} 
                    onChange={e=>setSettings(s=>({...s, financial:{...s.financial, enable_budget_control:e.target.checked}}))}
                  />
                  <div className={`w-11 h-6 rounded-full ${settings.financial.enable_budget_control?'bg-blue-600':'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.financial.enable_budget_control?'translate-x-5':'translate-x-0'}`}></div>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Payment Terms</label>
                <select 
                  value={settings.financial.default_payment_terms} 
                  onChange={e=>setSettings(s=>({...s, financial:{...s.financial, default_payment_terms:e.target.value}}))} 
                  className="px-3 py-2 border rounded-lg w-48"
                >
                  {settings.payment_terms.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Default payment terms for new transactions</p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <DollarSign className="text-blue-600 mr-3 flex-shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Financial Management</h4>
                <p className="text-xs text-blue-800">
                  These settings control how your financial transactions are processed and recorded. 
                  Changes to currency and accounting standards should be made carefully as they affect all financial reporting.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralSettings;
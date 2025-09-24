import React from 'react';
import { ChevronLeft, Settings as SettingsIcon, Save, Layers, Barcode } from 'lucide-react';

const StockSettings = ({ onBack }) => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ valuation_method: 'FIFO', allow_negative_stock: false, enable_batches: true, enable_serials: true });

  React.useEffect(() => {
    const load = async () => {
      try {
        const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) || '';
        const res = await fetch(`${base}/api/stock/settings`);
        const data = await res.json();
        setForm({
          valuation_method: data.valuation_method || 'FIFO',
          allow_negative_stock: !!data.allow_negative_stock,
          enable_batches: !!data.enable_batches,
          enable_serials: !!data.enable_serials,
        });
      } catch (e) {
        console.error('Failed to load stock settings', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) || '';
      const res = await fetch(`${base}/api/stock/settings`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)});
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setForm({
        valuation_method: data.valuation_method || 'FIFO',
        allow_negative_stock: !!data.allow_negative_stock,
        enable_batches: !!data.enable_batches,
        enable_serials: !!data.enable_serials,
      });
      alert('Stock settings saved');
    } catch (e) {
      console.error('Save error', e);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 bg-gray-50 min-h-screen"><div className="animate-pulse h-40 bg-gray-100 rounded"/></div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20}/></button>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center"><SettingsIcon className="mr-2"/> Stock Settings</h1>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"><Save size={16}/><span>{saving ? 'Saving...' : 'Save'}</span></button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6 max-w-3xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Valuation Method</label>
          <select value={form.valuation_method} onChange={e=>setForm(f=>({...f, valuation_method:e.target.value}))} className="px-3 py-2 border rounded-lg">
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
            <input type="checkbox" className="sr-only" checked={form.allow_negative_stock} onChange={e=>setForm(f=>({...f, allow_negative_stock:e.target.checked}))}/>
            <div className={`w-11 h-6 rounded-full ${form.allow_negative_stock?'bg-blue-600':'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.allow_negative_stock?'translate-x-5':'translate-x-0'}`}></div></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Layers className="text-gray-400 mr-2" size={18}/>
            <div>
              <div className="text-sm font-medium text-gray-700">Enable Batches</div>
              <div className="text-xs text-gray-500">Show batch field on stock entries and items.</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only" checked={form.enable_batches} onChange={e=>setForm(f=>({...f, enable_batches:e.target.checked}))}/>
            <div className={`w-11 h-6 rounded-full ${form.enable_batches?'bg-blue-600':'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.enable_batches?'translate-x-5':'translate-x-0'}`}></div></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Barcode className="text-gray-400 mr-2" size={18}/>
            <div>
              <div className="text-sm font-medium text-gray-700">Enable Serials</div>
              <div className="text-xs text-gray-500">Show serial numbers input on stock entries; optional count.</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only" checked={form.enable_serials} onChange={e=>setForm(f=>({...f, enable_serials:e.target.checked}))}/>
            <div className={`w-11 h-6 rounded-full ${form.enable_serials?'bg-blue-600':'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.enable_serials?'translate-x-5':'translate-x-0'}`}></div></div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default StockSettings;
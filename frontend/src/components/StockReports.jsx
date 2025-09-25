import React from 'react';
import { ChevronLeft, FileText, AlertTriangle } from 'lucide-react';

const StockReports = ({ onBack, embed = false }) => {
  const [tab, setTab] = React.useState('valuation');
  const [loading, setLoading] = React.useState(false);
  const [valuation, setValuation] = React.useState({ rows: [], total_value: 0 });
  const [reorder, setReorder] = React.useState({ rows: [] });

  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) || '';

  const loadValuation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/stock/valuation/report`);
      const data = await res.json();
      // Ensure we always have the expected structure
      setValuation({
        rows: Array.isArray(data?.rows) ? data.rows : [],
        total_value: data?.total_value || 0
      });
    } catch (e) { 
      console.error('Failed to load valuation report:', e); 
      setValuation({ rows: [], total_value: 0 });
    } finally { 
      setLoading(false); 
    }
  };
  
  const loadReorder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/stock/reorder/report`);
      const data = await res.json();
      // Ensure we always have the expected structure
      setReorder({
        rows: Array.isArray(data?.rows) ? data.rows : []
      });
    } catch (e) { 
      console.error('Failed to load reorder report:', e); 
      setReorder({ rows: [] });
    } finally { 
      setLoading(false); 
    }
  };

  React.useEffect(()=>{
    if (tab === 'valuation') loadValuation(); else loadReorder();
  }, [tab]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {!embed && (
        <div className="flex items-center mb-6">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20}/></button>
          <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
        <div className="flex space-x-2">
          <button onClick={()=>setTab('valuation')} className={`px-3 py-2 rounded ${tab==='valuation'?'bg-blue-600 text-white':'bg-gray-100'}`}>Valuation Report</button>
          <button onClick={()=>setTab('reorder')} className={`px-3 py-2 rounded ${tab==='reorder'?'bg-blue-600 text-white':'bg-gray-100'}`}>Reorder Report</button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading...</div>
      ) : tab === 'valuation' ? (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">Total Stock Value</div>
            <div className="text-lg font-semibold">₹ {Math.round(valuation.total_value).toLocaleString('en-IN')}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(valuation?.rows || []).map((r, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2">{r?.item_id || '-'}</td>
                    <td className="px-4 py-2">{r?.warehouse_id || '-'}</td>
                    <td className="px-4 py-2 text-right">{r?.qty || 0}</td>
                    <td className="px-4 py-2 text-right">₹ {Math.round(r?.value || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          {(reorder?.rows || []).length === 0 ? (
            <div className="p-8 text-center text-gray-500">No items below reorder level</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Current Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Suggested Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(reorder?.rows || []).map((r, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{r?.item_name || '-'}</td>
                      <td className="px-4 py-2">{r?.sku || '-'}</td>
                      <td className="px-4 py-2 text-right">{r?.current_qty || 0}</td>
                      <td className="px-4 py-2 text-right">{r?.reorder_level || 0}</td>
                      <td className="px-4 py-2 text-right">{r?.reorder_qty || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockReports;
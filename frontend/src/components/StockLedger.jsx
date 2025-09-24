import React from 'react';
import { ChevronLeft, Search } from 'lucide-react';

const StockLedger = ({ onBack }) => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) || '';
  const [itemId, setItemId] = React.useState('');
  const [warehouseId, setWarehouseId] = React.useState('');
  const [data, setData] = React.useState({ rows: [], balances: {} });
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ item_id: itemId || '', warehouse_id: warehouseId || '' }).toString();
      const res = await fetch(`${base}/api/stock/ledger?${qs}`);
      const d = await res.json();
      setData(d||{rows:[],balances:{}});
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20}/></button>
          <h1 className="text-3xl font-bold text-gray-800">Stock Ledger</h1>
        </div>
        <button onClick={load} className="flex items-center space-x-2 px-4 py-2 border rounded bg-white hover:bg-gray-50"><Search size={16}/><span>Fetch</span></button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 max-w-4xl mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Item ID</label>
          <input value={itemId} onChange={e=>setItemId(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Item UUID"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse ID</label>
          <input value={warehouseId} onChange={e=>setWarehouseId(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Warehouse ID"/>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl p-4 shadow-sm border overflow-x-auto">
          <table className="min-w-[800px] w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map((r,idx)=> (
                <tr key={idx}>
                  <td className="px-4 py-2">{r.timestamp ? new Date(r.timestamp).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2">{r.item_id}</td>
                  <td className="px-4 py-2">{r.warehouse_id}</td>
                  <td className="px-4 py-2 text-right">{r.qty}</td>
                  <td className="px-4 py-2 text-right">{r.rate}</td>
                  <td className="px-4 py-2">{r.voucher_type} {r.voucher_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockLedger;
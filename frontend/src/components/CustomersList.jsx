import React from 'react';
import { ChevronLeft, Users, Search, Mail, Phone } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const CustomersList = ({ onBack }) => {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(()=>{ const t=setTimeout(()=>setDebounced(search),500); return ()=>clearTimeout(t); },[search]);

  const { data, loading, error } = useApi(() =>
    api.get('/sales/customers', { params: { limit: 100 }}).then(r=>r.data)
  , []);

  const customers = (Array.isArray(data) ? data : []).filter(c => {
    const term = debounced.toLowerCase();
    return !term || (c.name||'').toLowerCase().includes(term) || (c.email||'').toLowerCase().includes(term);
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 flex items-center">
        <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={20} /></button>
        <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
      </div>
      <div className="mb-4 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"/>
      </div>
      {loading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded" />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded p-4">Error loading customers</div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="text-gray-400" size={32}/></div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Customers Found</h3>
          <p className="text-gray-600">Try a different search</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b text-sm font-medium text-gray-600 grid grid-cols-12 gap-4">
            <div className="col-span-5">Customer</div>
            <div className="col-span-4">Email</div>
            <div className="col-span-3">Phone</div>
          </div>
          <div className="divide-y divide-gray-100">
            {customers.map((c, idx) => (
              <div key={idx} className="px-6 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50">
                <div className="col-span-5 flex items-center space-x-2"><div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><Users className="text-blue-600" size={16}/></div><div>
                  <div className="font-medium text-gray-800">{c.name || 'Customer'}</div>
                </div></div>
                <div className="col-span-4 text-gray-700 flex items-center space-x-2"><Mail size={14} className="text-gray-400"/><span>{c.email || '-'}</span></div>
                <div className="col-span-3 text-gray-700 flex items-center space-x-2"><Phone size={14} className="text-gray-400"/><span>{c.phone || '-'}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersList;
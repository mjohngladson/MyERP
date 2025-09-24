import React, { useState } from 'react';
import { Plus, Search, Filter, Eye, Edit, Trash2, Calendar, User, DollarSign, ChevronLeft } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const PurchaseInvoicesList = ({ onBack, onViewInvoice, onEditInvoice, onCreateInvoice }) => {
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('invoice_date');
  const [sortDir, setSortDir] = useState('desc');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [debouncedSearch, setDebouncedSearch] = useState('');
  React.useEffect(()=>{ const t = setTimeout(()=> setDebouncedSearch(searchInput), 400); return ()=>clearTimeout(t); }, [searchInput]);

  const { data: invData, loading, error, refetch } = useApi(() =>
    fetch(`${api.getBaseUrl()}/api/purchase/invoices?limit=${pageSize}&skip=${(currentPage-1)*pageSize}&status=${filterStatus!=='all'?filterStatus:''}&search=${encodeURIComponent(debouncedSearch)}&sort_by=${encodeURIComponent(sortBy)}&sort_dir=${encodeURIComponent(sortDir)}&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`)
      .then(r => { if(!r.ok) throw new Error('Failed'); return r.json(); })
  , [pageSize, currentPage, filterStatus, sortBy, sortDir, fromDate, toDate, debouncedSearch]);

  const invoices = Array.isArray(invData) ? invData : (invData?.items || []);
  const totalCount = Array.isArray(invData) ? (invData[0]?._meta?.total_count || invoices.length) : (invData?.total_count || invoices.length);

  const filtered = React.useMemo(()=> {
    const term = (debouncedSearch || '').toLowerCase();
    return invoices.filter(inv => {
      const matchesSearch = term === '' || `${inv.invoice_number||''}`.toLowerCase().includes(term) || `${inv.supplier_name||''}`.toLowerCase().includes(term);
      const d = inv.invoice_date || inv.created_at;
      const dStr = d ? (new Date(d)).toISOString().slice(0,10) : '';
      const inRange = (!fromDate || dStr >= fromDate) && (!toDate || dStr <= toDate);
      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
      return matchesSearch && inRange && matchesStatus;
    });
  }, [invoices, debouncedSearch, fromDate, toDate, filterStatus]);

  const formatCurrency = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(a || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }) : 'N/A';
  const getStatusColor = (s) => ({ draft:'bg-gray-100 text-gray-800', submitted:'bg-blue-100 text-blue-800', paid:'bg-green-100 text-green-800', cancelled:'bg-red-100 text-red-800'})[s] || 'bg-gray-100 text-gray-800';

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen"><div className="animate-pulse h-40 bg-gray-100 rounded"/></div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={20} /></button>
          <h1 className="text-3xl font-bold text-gray-800">Purchase Invoices</h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Search purchase invoices..." value={searchInput} onChange={(e)=>setSearchInput(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="appearance-none bg-white border rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500">
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={()=>{ setSearchInput(''); setFilterStatus('all'); setFromDate(''); setToDate(''); setSortBy('invoice_date'); setSortDir('desc'); setCurrentPage(1); refetch && refetch(); }} className="px-3 py-2 border rounded text-sm bg-white hover:bg-gray-50">Clear Filters</button>
            <select value={pageSize} onChange={(e)=>setPageSize(parseInt(e.target.value))} className="px-3 py-2 border rounded">
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <button onClick={onCreateInvoice} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus size={20} /><span>New Purchase Invoice</span></button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Error loading purchase invoices</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><DollarSign className="text-gray-400" size={32}/></div><h3 className="text-xl font-semibold text-gray-800 mb-2">No Purchase Invoices Found</h3><p className="text-gray-600 mb-6">{searchInput || filterStatus !== 'all' ? 'No purchase invoices match your search.' : 'Create your first purchase invoice.'}</p><button onClick={onCreateInvoice} className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mx-auto"><Plus size={20} /><span>Create Purchase Invoice</span></button></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
              <div className="col-span-3">
                <button className="flex items-center space-x-1" onClick={()=>{ setSortBy('invoice_number'); setSortDir(sortDir==='asc'?'desc':'asc'); }}>
                  <span>Invoice Number</span>
                  <span className={`text-xs ${sortBy==='invoice_number'?'text-blue-600':'text-gray-400'}`}>{sortDir==='asc'?'\u25B2':'\u25BC'}</span>
                </button>
              </div>
              <div className="col-span-3">Supplier</div>
              <div className="col-span-2">
                <button className="flex items-center space-x-1" onClick={()=>{ setSortBy('total_amount'); setSortDir(sortDir==='asc'?'desc':'asc'); }}>
                  <span>Amount</span>
                  <span className={`text-xs ${sortBy==='total_amount'?'text-blue-600':'text-gray-400'}`}>{sortDir==='asc'?'\u25B2':'\u25BC'}</span>
                </button>
              </div>
              <div className="col-span-2">
                <button className="flex items-centered space-x-1" onClick={()=>{ setSortBy('invoice_date'); setSortDir(sortDir==='asc'?'desc':'asc'); }}>
                  <span>Date</span>
                  <span className={`text-xs ${sortBy==='invoice_date'?'text-blue-600':'text-gray-400'}`}>{sortDir==='asc'?'\u25B2':'\u25BC'}</span>
                </button>
              </div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map(inv => (
              <div key={inv.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <div className="font-medium text-gray-800">{inv.invoice_number}</div>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center space-x-2"><div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><User className="text-blue-600" size={16}/></div><div><div className="font-medium text-gray-800">{inv.supplier_name}</div><div className="text-xs text-gray-500">Supplier</div></div></div>
                  </div>
                  <div className="col-span-2"><div className="font-semibold text-gray-800">{formatCurrency(inv.total_amount)}</div></div>
                  <div className="col-span-2"><div className="flex items-center space-x-1 text-gray-600"><Calendar size={16}/><span className="text-sm">{formatDate(inv.invoice_date || inv.created_at)}</span></div></div>
                  <div className="col-span-1"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>{(inv.status||'draft').charAt(0).toUpperCase()+ (inv.status||'draft').slice(1)}</span></div>
                  <div className="col-span-1"><div className="flex items-center space-x-2"><button onClick={()=>onViewInvoice && onViewInvoice(inv)} className="p-1 hover:bg-gray-100 rounded-md" title="View"><Eye size={16} className="text-gray-600"/></button><button onClick={()=>onEditInvoice && onEditInvoice(inv)} className="p-1 hover:bg-gray-100 rounded-md" title="Edit"><Edit size={16} className="text-gray-600"/></button><button onClick={async()=>{ if (!window.confirm(`Delete ${inv.invoice_number}?`)) return; const res = await fetch(`${api.getBaseUrl()}/api/purchase/invoices/${inv.id}`, { method:'DELETE' }); const data = await res.json().catch(()=>({})); if (res.ok) { refetch && refetch(); } else { alert(data.detail || 'Failed to delete'); } }} className="p-1 hover:bg-gray-100 rounded-md" title="Delete"><Trash2 size={16} className="text-red-600"/></button></div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoices.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div>Showing {((currentPage-1)*pageSize)+1} to {Math.min(currentPage*pageSize, totalCount)} of {totalCount}</div>
          <div className="space-x-2">
            <button onClick={()=>setCurrentPage(Math.max(1,currentPage-1))} disabled={currentPage<=1} className="px-3 py-2 border rounded disabled:opacity-50">Previous</button>
            <button onClick={()=>setCurrentPage(currentPage+1)} disabled={invoices.length < pageSize} className="px-3 py-2 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseInvoicesList;
import React, { useState } from 'react';
import { Plus, Search, Filter, Eye, Edit, Trash2, Calendar, User, DollarSign, ChevronLeft, Send, X } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const SalesOrdersList = ({ onBack, onViewOrder, onEditOrder, onCreateOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState(null);
  const [sendEmail, setSendEmail] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [includePdf, setIncludePdf] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [sortBy, setSortBy] = useState('order_date');
  const [sortDir, setSortDir] = useState('desc');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Debounce search input to avoid choppy typing & excessive requests
  const [debouncedSearch, setDebouncedSearch] = useState('');
  React.useEffect(()=>{ const t = setTimeout(()=> setDebouncedSearch(searchTerm), 250); return ()=>clearTimeout(t); }, [searchTerm]);

  const { data: ordersData, loading, error, refetch } = useApi(() =>
    fetch(`${api.getBaseUrl()}/api/sales/orders?limit=${pageSize}&skip=${(currentPage-1)*pageSize}&status=${filterStatus!=='all'?filterStatus:''}&search=${encodeURIComponent(debouncedSearch)}&sort_by=${encodeURIComponent(sortBy)}&sort_dir=${encodeURIComponent(sortDir)}&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`)
      .then(r => { if(!r.ok) throw new Error('Failed'); return r.json(); })
  , [pageSize, currentPage, filterStatus, sortBy, sortDir, fromDate, toDate, debouncedSearch]);

  const orders = Array.isArray(ordersData) ? ordersData : (ordersData?.items || []);
  const totalCount = Array.isArray(ordersData) ? (ordersData[0]?._meta?.total_count || orders.length) : (ordersData?.total_count || orders.length);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = searchTerm === '' || `${o.order_number||''}`.toLowerCase().includes(searchTerm.toLowerCase()) || `${o.customer_name||''}`.toLowerCase().includes(searchTerm.toLowerCase());
    // date filter also applied server-side; we additionally guard client-side for immediate feedback
    const d = o.order_date || o.created_at;
    const dStr = d ? (new Date(d)).toISOString().slice(0,10) : '';
    const inRange = (!fromDate || dStr >= fromDate) && (!toDate || dStr <= toDate);
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && inRange && matchesStatus;
  });

  const formatCurrency = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(a || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }) : 'N/A';
  const getStatusColor = (s) => ({ draft:'bg-gray-100 text-gray-800', submitted:'bg-blue-100 text-blue-800', fulfilled:'bg-green-100 text-green-800', cancelled:'bg-red-100 text-red-800'})[s] || 'bg-gray-100 text-gray-800';

  const openSend = (order) => { setSendTarget(order); setSendEmail(order.customer_email || ''); setSendPhone(order.customer_phone || ''); setIncludePdf(false); setSendOpen(true); };
  const closeSend = () => { setSendOpen(false); setSending(false); };
  const submitSend = async () => {
    if (!sendTarget) return; if (!sendEmail && !sendPhone) { alert('Provide email or phone'); return; }
    setSending(true);
    try {
      const res = await fetch(`${api.getBaseUrl()}/api/sales/orders/${sendTarget.id}/send`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: sendEmail, phone: sendPhone, include_pdf: includePdf, subject: emailSubject || undefined, message: emailMessage || undefined })});
      const data = await res.json();
      if (res.ok && data.success) { alert('Order sent successfully'); setSendOpen(false); refetch && refetch(); } else { alert(data.detail || data.message || 'Failed to send'); }
    } catch (e) { console.error(e); alert('Error sending'); } finally { setSending(false); }
  };

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
          <h1 className="text-3xl font-bold text-gray-800">Sales Orders</h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="appearance-none bg-white border rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500">
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          <div className="flex items-center space-x-2">

            <div className="hidden lg:flex items-center space-x-2 mr-2">
              <label className="text-sm text-gray-600">From</label>
              <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} className="px-2 py-2 border rounded text-sm" />
              <label className="text-sm text-gray-600">To</label>
              <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} className="px-2 py-2 border rounded text-sm" />
            </div>
            <select value={pageSize} onChange={(e)=>setPageSize(parseInt(e.target.value))} className="px-3 py-2 border rounded">
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <button onClick={onCreateOrder} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus size={20} /><span>New Sales Order</span></button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Error loading sales orders</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><DollarSign className="text-gray-400" size={32}/></div><h3 className="text-xl font-semibold text-gray-800 mb-2">No Sales Orders Found</h3><p className="text-gray-600 mb-6">{searchTerm || filterStatus !== 'all' ? 'No orders match your search.' : 'Create your first sales order.'}</p><button onClick={onCreateOrder} className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mx-auto"><Plus size={20} /><span>Create Sales Order</span></button></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
              <div className="col-span-3">
                <button className="flex items-center space-x-1" onClick={()=>{ setSortBy('order_number'); setSortDir(sortDir==='asc'?'desc':'asc'); }}>
                  <span>Order Number</span>
                  <span className={`text-xs ${sortBy==='order_number'?'text-blue-600':'text-gray-400'}`}>{sortDir==='asc'?'▲':'▼'}</span>
                </button>
              </div>
              <div className="col-span-3">Customer</div>
              <div className="col-span-2">
                <button className="flex items-center space-x-1" onClick={()=>{ setSortBy('total_amount'); setSortDir(sortDir==='asc'?'desc':'asc'); }}>
                  <span>Amount</span>
                  <span className={`text-xs ${sortBy==='total_amount'?'text-blue-600':'text-gray-400'}`}>{sortDir==='asc'?'▲':'▼'}</span>
                </button>
              </div>
              <div className="col-span-2">
                <button className="flex items-center space-x-1" onClick={()=>{ setSortBy('order_date'); setSortDir(sortDir==='asc'?'desc':'asc'); }}>
                  <span>Date</span>
                  <span className={`text-xs ${sortBy==='order_date'?'text-blue-600':'text-gray-400'}`}>{sortDir==='asc'?'▲':'▼'}</span>
                </button>
              </div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredOrders.map(order => (
              <div key={order.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <div className="font-medium text-gray-800">{order.order_number}</div>
                    {order.sent_at && (
                      <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Sent {order.sent_via ? `via ${Array.isArray(order.sent_via) ? order.sent_via.join(', ') : order.sent_via}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center space-x-2"><div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><User className="text-blue-600" size={16}/></div><div><div className="font-medium text-gray-800">{order.customer_name}</div><div className="text-xs text-gray-500">Customer</div></div></div>
                  </div>
                  <div className="col-span-2"><div className="font-semibold text-gray-800">{formatCurrency(order.total_amount)}</div></div>
                  <div className="col-span-2"><div className="flex items-center space-x-1 text-gray-600"><Calendar size={16}/><span className="text-sm">{formatDate(order.order_date || order.created_at)}</span></div></div>
                  <div className="col-span-1"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{order.status.charAt(0).toUpperCase()+order.status.slice(1)}</span></div>
                  <div className="col-span-1"><div className="flex items-center space-x-2"><button onClick={()=>onViewOrder && onViewOrder(order)} className="p-1 hover:bg-gray-100 rounded-md" title="View"><Eye size={16} className="text-gray-600"/></button><button onClick={()=>onEditOrder && onEditOrder(order)} className="p-1 hover:bg-gray-100 rounded-md" title="Edit"><Edit size={16} className="text-gray-600"/></button><button onClick={()=>openSend(order)} className="p-1 hover:bg-gray-100 rounded-md" title="Send"><Send size={16} className="text-gray-600"/></button><button onClick={()=>{ if(confirm(`Delete ${order.order_number}?`)){ /* TODO: hook delete */ }}} className="p-1 hover:bg-gray-100 rounded-md" title="Delete"><Trash2 size={16} className="text-red-600"/></button></div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div>Showing {((currentPage-1)*pageSize)+1} to {Math.min(currentPage*pageSize, totalCount)} of {totalCount}</div>
          <div className="space-x-2">
            <button onClick={()=>setCurrentPage(Math.max(1,currentPage-1))} disabled={currentPage<=1} className="px-3 py-2 border rounded disabled:opacity-50">Previous</button>
            <button onClick={()=>setCurrentPage(currentPage+1)} disabled={orders.length < pageSize} className="px-3 py-2 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {sendOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Send Sales Order</h3><button onClick={closeSend} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5"/></button></div>
            <div className="space-y-3">
              <div><label className="block text-sm text-gray-600 mb-1">To Email</label><input type="email" value={sendEmail} onChange={(e)=>setSendEmail(e.target.value)} className="w-full px-3 py-2 border rounded-md" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Phone (SMS)</label><input type="tel" value={sendPhone} onChange={(e)=>setSendPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="+91 98765 43210" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Email Subject (optional)</label><input type="text" value={emailSubject} onChange={(e)=>setEmailSubject(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Sales Order {#} from Your Company" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Email Message (optional)</label><textarea value={emailMessage} onChange={(e)=>setEmailMessage(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-md" placeholder="Dear Customer, Please find your sales order below."></textarea></div>
              <div className="flex items-center space-x-2"><input id="include_pdf" type="checkbox" checked={includePdf} onChange={(e)=>setIncludePdf(e.target.checked)} /><label htmlFor="include_pdf" className="text-sm text-gray-700">Attach PDF to email</label></div>
              <p className="text-xs text-gray-500">At least one of Email or Phone is required. SMS requires E.164 format and Twilio setup.</p>
            </div>
            <div className="mt-6 flex justify-end space-x-2"><button onClick={closeSend} className="px-4 py-2 border rounded-md">Cancel</button><button onClick={submitSend} disabled={sending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{sending ? 'Sending...' : 'Send'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrdersList;
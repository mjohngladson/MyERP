import React, { useState } from 'react';
import { 
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  DollarSign,
  ChevronLeft,
  FileText,
  Send,
  RefreshCw,
  TrendingUp,
  X
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const SalesInvoicesList = ({ onBack, onViewInvoice, onEditInvoice, onCreateInvoice }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showStats, setShowStats] = useState(false);
  const [sortBy, setSortBy] = useState('invoice_date');
  const [sortDir, setSortDir] = useState('desc');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [sendOpen, setSendOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState(null);
  const [sendEmail, setSendEmail] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [includePdf, setIncludePdf] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  
  // Debounced search for smooth typing (500ms)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  React.useEffect(()=>{ const t = setTimeout(()=> setDebouncedSearch(searchTerm), 500); return ()=>clearTimeout(t); }, [searchTerm]);

  const { data: invoicesData, loading, error, refetch } = useApi(() => 
    fetch(`${api.getBaseUrl()}/api/invoices/?limit=${pageSize}&skip=${(currentPage - 1) * pageSize}&status=${filterStatus !== 'all' ? filterStatus : ''}&search=${encodeURIComponent(debouncedSearch)}&sort_by=${encodeURIComponent(sortBy)}&sort_dir=${encodeURIComponent(sortDir)}&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
  , [currentPage, pageSize, filterStatus, debouncedSearch, sortBy, sortDir, fromDate, toDate]);

  // Filter-aware stats, fetched only when showStats is true
  const { data: stats } = useApi(() => {
    if (!showStats) return Promise.resolve({});
    const qs = new URLSearchParams({
      status: filterStatus !== 'all' ? filterStatus : '',
      search: debouncedSearch || '',
      from_date: fromDate || '',
      to_date: toDate || ''
    });
    return fetch(`${api.getBaseUrl()}/api/invoices/stats/overview?${qs.toString()}`)
      .then(res => res.ok ? res.json() : {})
      .catch(() => ({}));
  }, [showStats, filterStatus, debouncedSearch, fromDate, toDate]);

  const invoicesList = Array.isArray(invoicesData) ? invoicesData : (invoicesData?.items || invoicesData?.data || []);
  const totalCount = (Array.isArray(invoicesData) ? (invoicesData[0]?._meta?.total_count || invoicesData?.total_count) : (invoicesData?.total_count || invoicesData?.meta?.total_count)) || (invoicesList?.length || 0);
  const totalPages = Math.ceil(totalCount / pageSize);

  const filteredInvoices = invoicesList.filter(invoice => {
    if (!invoice) return false;
    const term = (debouncedSearch || '').toLowerCase();
    const matchesSearch = term === '' || 
      (invoice.invoice_number || '').toLowerCase().includes(term) ||
      (invoice.customer_name || '').toLowerCase().includes(term);
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount || 0);
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
  const getStatusColor = (status) => ({ draft:'bg-gray-100 text-gray-800', submitted:'bg-blue-100 text-blue-800', paid:'bg-green-100 text-green-800', overdue:'bg-red-100 text-red-800', cancelled:'bg-red-100 text-red-800'})[status] || 'bg-gray-100 text-gray-800';

  const openSend = (invoice) => {
    setSendTarget(invoice);
    setSendEmail(invoice.customer_email || '');
    setSendPhone(invoice.customer_phone || '');
    setIncludePdf(false);
    setSendOpen(true);
  };
  const closeSend = () => { setSendOpen(false); setSending(false);} 

  const submitSend = async () => {
    if (!sendTarget) return;
    if (!sendEmail && !sendPhone) {
      alert('Please provide at least an email or phone to send');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${api.getBaseUrl()}/api/invoices/${sendTarget.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sendEmail, phone: sendPhone, include_pdf: includePdf, subject: emailSubject || undefined, message: emailMessage || undefined })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Invoice sent successfully via email' + (sendPhone ? ' (SMS sent if configured)' : ''));
        setSendOpen(false);
        refetch && refetch();
      } else {
        const errEmail = data?.errors?.email ? ` Email: ${data.errors.email}` : '';
        const errSms = data?.errors?.sms ? ` SMS: ${data.errors.sms}` : '';
        alert((data.detail || data.message || 'Failed to send invoice') + errEmail + errSms);
        refetch && refetch();
      }
    } catch (e) {
      alert('Error sending invoice');
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Invoices</h1>
        </div>
        <div className="animate-pulse space-y-4">{[...Array(5)].map((_, i) => (<div key={i} className="h-16 bg-gray-200 rounded" />))}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Invoices</h1>
        </div>
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">Failed to load invoices</p>
          <button onClick={refetch} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900"><ChevronLeft className="h-5 w-5" /></button>
            <h1 className="text-3xl font-bold text-gray-800">Sales Invoices</h1>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">{totalCount} total</span>
          </div>
          <div className="flex space-x-3">
            <button onClick={onCreateInvoice} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              <span>New Invoice</span>
            </button>
          </div>
        </div>

        {/* Stats Toggle */}
        <div className="mb-3 flex justify-end">
          <button onClick={()=>setShowStats(s=>!s)} className="inline-flex items-center space-x-2 px-3 py-1.5 border rounded-md text-sm bg-white hover:bg-gray-50">
            <span>{showStats ? 'Hide insights' : 'Show insights'}</span>
          </button>
        </div>

        {/* Stats Cards */}
        {showStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total Invoices</p><p className="text-2xl font-bold text-gray-900">{stats.total_invoices || 0}</p></div><FileText className="h-8 w-8 text-blue-600" /></div></div>
            <div className="bg-white p-4 rounded-lg border border-gray-200"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total Amount</p><p className="text-2xl font-bold text-green-600">{formatCurrency(stats.total_amount || 0)}</p></div><TrendingUp className="h-8 w-8 text-green-600" /></div></div>
            <div className="bg-white p-4 rounded-lg border border-gray-200"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Submitted</p><p className="text-2xl font-bold text-blue-600">{stats.submitted_count || 0}</p></div><Calendar className="h-8 w-8 text-blue-600" /></div></div>
            <div className="bg-white p-4 rounded-lg border border-gray-200"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Paid</p><p className="text-2xl font-bold text-green-600">{stats.paid_count || 0}</p></div><DollarSign className="h-8 w-8 text-green-600" /></div></div>
          </div>
        )}

        {/* Filters - match other modules layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="hidden lg:flex items-center space-x-2 mr-2">
              <label className="text-sm text-gray-600">From</label>
              <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} className="px-2 py-2 border rounded text-sm" />
              <label className="text-sm text-gray-600">To</label>
              <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} className="px-2 py-2 border rounded text-sm" />
            </div>
            <div>
              <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="appearance-none bg-white border rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500">
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={()=>{ setSearchTerm(''); setFilterStatus('all'); setFromDate(''); setToDate(''); setSortBy('invoice_date'); setSortDir('desc'); setCurrentPage(1); refetch && refetch(); }} className="px-3 py-2 border rounded text-sm bg-white hover:bg-gray-50">Clear Filters</button>
            <select value={pageSize} onChange={(e)=>setPageSize(parseInt(e.target.value))} className="px-3 py-2 border rounded">
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <button onClick={onCreateInvoice} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" /><span>New Invoice</span></button>
          </div>
        </div>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><FileText className="text-gray-400" size={32}/></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Sales Invoices Found</h3>
            <p className="text-gray-600 mb-6">{searchTerm || filterStatus !== 'all' ? 'No invoices match your search.' : 'Create your first sales invoice.'}</p>
            {(!searchTerm && filterStatus === 'all') && (
              <button onClick={onCreateInvoice} className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mx-auto">
                <Plus size={20} /><span>Create Invoice</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button className="flex items-center space-x-1" onClick={()=>{ setSortBy('invoice_number'); setSortDir(sortDir==='asc'?'desc':'asc'); }}>
                      <span>Invoice</span>
                      <span className={`text-xs ${sortBy==='invoice_number'?'text-blue-600':'text-gray-400'}`}>{sortDir==='asc'?'▲':'▼'}</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button className="flex items-center space-x-1" onClick={()=>{ setSortBy('invoice_date'); setSortDir(sortDir==='asc'?'desc':'asc'); }}>
                      <span>Date</span>
                      <span className={`text-xs ${sortBy==='invoice_date'?'text-blue-600':'text-gray-400'}`}>{sortDir==='asc'?'▲':'▼'}</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button className="flex items-center space-x-1" onClick={()=>{ setSortBy('total_amount'); setSortDir(sortDir==='asc'?'desc':'asc'); }}>
                      <span>Amount</span>
                      <span className={`text-xs ${sortBy==='total_amount'?'text-blue-600':'text-gray-400'}`}>{sortDir==='asc'?'▲':'▼'}</span>
                    </button>
                  </th>
                  {/* Removed Actions header to save space; actions remain as icons */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id || invoice.invoice_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.invoice_number || 'N/A'}</div>
                          {invoice.pos_metadata && (<div className="text-xs text-gray-500">PoS: {invoice.pos_metadata.pos_transaction_id}</div>)}
                          {invoice.sent_at && (<div className="text-xs text-green-600">Sent: {formatDate(invoice.sent_at)}</div>)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">{invoice.customer_name || 'Unknown'}</div>
                          {invoice.customer_email && (<div className="text-xs text-gray-500">{invoice.customer_email}</div>)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.invoice_date || invoice.created_at)}</td>
                    {/* Hide Due Date column to reduce width */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>{(invoice.status || 'draft').charAt(0).toUpperCase() + (invoice.status || 'draft').slice(1)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</div>
                      {invoice.sent_at && (
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Sent {invoice.sent_via ? `via ${Array.isArray(invoice.sent_via) ? invoice.sent_via.join(', ') : invoice.sent_via}` : ''}
                        </div>
                      )}
                      {invoice.last_send_errors && (invoice.last_send_errors.email || invoice.last_send_errors.sms) && (
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={(invoice.last_send_errors.email || '') + ' ' + (invoice.last_send_errors.sms || '')}>
                          Send failed
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => onViewInvoice && onViewInvoice(invoice)} className="text-blue-600 hover:text-blue-900 p-1" title="View Invoice"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => onEditInvoice && onEditInvoice(invoice)} className="text-green-600 hover:text-green-900 p-1" title="Edit Invoice"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => onEditInvoice && onEditInvoice(invoice)} className="text-purple-600 hover:text-purple-900 p-1" title="Send Invoice"><Send className="h-4 w-4" /></button>
                        <button onClick={() => { if (confirm(`Delete invoice ${invoice.invoice_number}?`)) {/* TODO: hook delete */} }} className="text-red-600 hover:text-red-900 p-1" title="Delete Invoice"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} invoices</div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage <= 1} className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <div className="flex space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (pageNum > totalPages) return null;
                return (
                  <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-3 py-2 text-sm rounded-md ${pageNum === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}>{pageNum}</button>
                );
              })}
            </div>
            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= totalPages} className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}


      </div>

      {/* Send Modal */}
      {sendOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send Invoice</h3>
              <button onClick={closeSend} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">To Email</label>
                <input type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="customer@email.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone (SMS)</label>
                <input type="tel" value={sendPhone} onChange={(e) => setSendPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email Subject (optional)</label>
                <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Invoice {#} from Your Company" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email Message (optional)</label>
                <textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={3} placeholder="Dear Customer, Please find your invoice below."></textarea>
              </div>
              <div className="flex items-center space-x-2">
                <input id="include_pdf" type="checkbox" checked={includePdf} onChange={(e) => setIncludePdf(e.target.checked)} />
                <label htmlFor="include_pdf" className="text-sm text-gray-700">Attach PDF to email</label>
              </div>
              <p className="text-xs text-gray-500 mt-1">At least one of Email or Phone is required. SMS requires provider configuration (Twilio set).</p>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={closeSend} className="px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={submitSend} disabled={sending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{sending ? 'Sending...' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInvoicesList;
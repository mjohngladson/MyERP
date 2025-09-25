import React from 'react';
import { ChevronLeft, FileText, Search, Plus, Edit, Trash2, Eye, Calendar, User, DollarSign, ChevronUp, ChevronDown, Send, Mail, MessageSquare } from 'lucide-react';
import { api } from '../services/api';

const CreditNotesList = ({ onBack, onViewCreditNote, onEditCreditNote, onCreateCreditNote }) => {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [stats, setStats] = React.useState({
    total_notes: 0,
    total_amount: 0,
    draft_count: 0,
    issued_count: 0,
    applied_count: 0
  });
  const [statsCollapsed, setStatsCollapsed] = React.useState(false);
  const [showSendModal, setShowSendModal] = React.useState(false);
  const [sendingNote, setSendingNote] = React.useState(null);
  const [sendMethod, setSendMethod] = React.useState('email');
  const [sendContact, setSendContact] = React.useState('');

  React.useEffect(() => { 
    const t = setTimeout(() => setDebounced(search), 500); 
    return () => clearTimeout(t); 
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const searchParams = { limit: 50 };
      if (debounced) searchParams.search = debounced;

      const [listRes, statsRes] = await Promise.all([
        api.get('/sales/credit-notes', { params: searchParams }),
        api.get('/sales/credit-notes/stats/overview', { params: debounced ? { search: debounced } : {} })
      ]);
      
      setRows(Array.isArray(listRes.data) ? listRes.data : []);
      setStats(statsRes.data || stats);
    } catch (e) { 
      console.error('Error loading credit notes:', e); 
      setRows([]);
    } finally { 
      setLoading(false); 
    }
  };

  React.useEffect(() => { load(); }, [debounced]);

  const remove = async (row) => {
    if (!row?.id) return; 
    if (!confirm(`Delete credit note "${row.credit_note_number}"?`)) return;
    try { 
      await api.delete(`/sales/credit-notes/${row.id}`); 
      load(); 
    } catch (e) { 
      alert(e?.response?.data?.detail || 'Failed to delete credit note'); 
    }
  };

  const openSendModal = (note) => {
    setSendingNote(note);
    setSendContact(note.customer_email || '');
    setSendMethod('email');
    setShowSendModal(true);
  };

  const sendNote = async () => {
    if (!sendingNote?.id) return;
    if (!sendContact.trim()) {
      alert('Please enter email or phone number');
      return;
    }

    try {
      const payload = {
        method: sendMethod,
        [sendMethod === 'email' ? 'email' : 'phone']: sendContact
      };

      await api.post(`/sales/credit-notes/${sendingNote.id}/send`, payload);
      setShowSendModal(false);
      load(); // Refresh to show updated send status
      alert('Credit note sent successfully!');
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to send credit note');
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount || 0);

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-IN');
    } catch {
      return '-';
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      issued: 'bg-yellow-100 text-yellow-800',
      applied: 'bg-green-100 text-green-800'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Credit Notes</h1>
        </div>
        <button 
          onClick={onCreateCreditNote} 
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          <span>New Credit Note</span>
        </button>
      </div>

      {/* Collapsible Stats Cards */}
      <div className="mb-6">
        <button
          onClick={() => setStatsCollapsed(!statsCollapsed)}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 mb-3"
        >
          {statsCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          <span className="font-medium">Statistics {debounced && '(Filtered)'}</span>
        </button>
        
        {!statsCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Total Notes</div>
              <div className="text-2xl font-semibold text-gray-800">{stats.total_notes}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="text-2xl font-semibold text-gray-800">{formatCurrency(stats.total_amount)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Draft</div>
              <div className="text-2xl font-semibold text-gray-600">{stats.draft_count}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Issued</div>
              <div className="text-2xl font-semibold text-yellow-600">{stats.issued_count}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Applied</div>
              <div className="text-2xl font-semibold text-green-600">{stats.applied_count}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search credit notes..." 
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded" />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Credit Notes Found</h3>
          <p className="text-gray-600 mb-4">
            {search ? 'Try a different search term' : 'Get started by creating your first credit note'}
          </p>
          <button 
            onClick={onCreateCreditNote} 
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Create Credit Note</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b text-sm font-medium text-gray-600 grid grid-cols-12 gap-4">
            <div className="col-span-3">Credit Note</div>
            <div className="col-span-2">Customer</div>
            <div className="col-span-2">Reference Invoice</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1">Amount</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Actions</div>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.map((note) => (
              <div key={note.id} className="px-6 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50">
                <div className="col-span-3 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <FileText className="text-red-600" size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{note.credit_note_number}</div>
                    <div className="text-xs text-gray-500 flex items-center space-x-2">
                      <span>{note.reason || 'Return'}</span>
                      {note.last_sent_at && (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded" title={`Last sent: ${formatRelativeTime(note.last_sent_at)}`}>
                          Sent {formatRelativeTime(note.last_sent_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-gray-700 min-w-0">
                  <div className="font-medium truncate">{note.customer_name}</div>
                  {note.customer_email && (
                    <div className="text-xs text-gray-500 truncate">{note.customer_email}</div>
                  )}
                </div>
                <div className="col-span-2 text-gray-700 min-w-0">
                  <div className="truncate">{note.reference_invoice || '-'}</div>
                </div>
                <div className="col-span-2 text-gray-700">
                  <div className="flex items-center space-x-1 text-sm">
                    <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                    <span>{formatDate(note.credit_note_date || note.created_at)}</span>
                  </div>
                </div>
                <div className="col-span-1 font-semibold text-gray-800">
                  {formatCurrency(note.total_amount)}
                </div>
                <div className="col-span-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(note.status)}`}>
                    {note.status || 'Draft'}
                  </span>
                </div>
                <div className="col-span-1 flex items-center space-x-1">
                  <button 
                    onClick={() => onViewCreditNote && onViewCreditNote(note)} 
                    className="p-1 hover:bg-gray-100 rounded" 
                    title="View"
                  >
                    <Eye size={14} className="text-gray-600" />
                  </button>
                  <button 
                    onClick={() => onEditCreditNote && onEditCreditNote(note)} 
                    className="p-1 hover:bg-gray-100 rounded" 
                    title="Edit"
                  >
                    <Edit size={14} className="text-gray-600" />
                  </button>
                  <button 
                    onClick={() => openSendModal(note)} 
                    className="p-1 hover:bg-gray-100 rounded" 
                    title="Send"
                  >
                    <Send size={14} className="text-blue-600" />
                  </button>
                  <button 
                    onClick={() => remove(note)} 
                    className="p-1 hover:bg-gray-100 rounded" 
                    title="Delete"
                  >
                    <Trash2 size={14} className="text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && sendingNote && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Send Credit Note {sendingNote.credit_note_number}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Send Method</label>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSendMethod('email')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md border ${
                      sendMethod === 'email' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300'
                    }`}
                  >
                    <Mail size={16} />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={() => setSendMethod('sms')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md border ${
                      sendMethod === 'sms' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300'
                    }`}
                  >
                    <MessageSquare size={16} />
                    <span>SMS</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {sendMethod === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <input
                  type={sendMethod === 'email' ? 'email' : 'tel'}
                  value={sendContact}
                  onChange={e => setSendContact(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder={sendMethod === 'email' ? 'customer@email.com' : '+91 9876543210'}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button 
                onClick={() => setShowSendModal(false)} 
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={sendNote} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Send Credit Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditNotesList;
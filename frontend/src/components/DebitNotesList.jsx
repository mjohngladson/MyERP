import React from 'react';
import { ChevronLeft, FileText, Search, Plus, Edit, Trash2, Eye, Calendar, Truck, DollarSign } from 'lucide-react';
import { api } from '../services/api';

const DebitNotesList = ({ onBack, onViewDebitNote, onEditDebitNote, onCreateDebitNote }) => {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [stats, setStats] = React.useState({
    total_notes: 0,
    total_amount: 0,
    draft_count: 0,
    issued_count: 0,
    accepted_count: 0
  });

  React.useEffect(() => { 
    const t = setTimeout(() => setDebounced(search), 500); 
    return () => clearTimeout(t); 
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/buying/debit-notes', { params: { search: debounced || undefined, limit: 50 } }),
        api.get('/buying/debit-notes/stats/overview')
      ]);
      
      setRows(Array.isArray(listRes.data) ? listRes.data : []);
      setStats(statsRes.data || stats);
    } catch (e) { 
      console.error('Error loading debit notes:', e); 
      setRows([]);
    } finally { 
      setLoading(false); 
    }
  };

  React.useEffect(() => { load(); }, [debounced]);

  const remove = async (row) => {
    if (!row?.id) return; 
    if (!confirm(`Delete debit note "${row.debit_note_number}"?`)) return;
    try { 
      await api.delete(`/buying/debit-notes/${row.id}`); 
      load(); 
    } catch (e) { 
      alert(e?.response?.data?.detail || 'Failed to delete debit note'); 
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
      accepted: 'bg-green-100 text-green-800'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Debit Notes</h1>
        </div>
        <button 
          onClick={onCreateDebitNote} 
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          <span>New Debit Note</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
          <div className="text-sm text-gray-600">Accepted</div>
          <div className="text-2xl font-semibold text-green-600">{stats.accepted_count}</div>
        </div>
      </div>

      <div className="mb-4 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search debit notes..." 
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
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Debit Notes Found</h3>
          <p className="text-gray-600 mb-4">
            {search ? 'Try a different search term' : 'Get started by creating your first debit note'}
          </p>
          <button 
            onClick={onCreateDebitNote} 
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Create Debit Note</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b text-sm font-medium text-gray-600 grid grid-cols-12 gap-4">
            <div className="col-span-3">Debit Note</div>
            <div className="col-span-2">Supplier</div>
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
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <FileText className="text-orange-600" size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{note.debit_note_number}</div>
                    <div className="text-xs text-gray-500">{note.reason || 'Return'}</div>
                  </div>
                </div>
                <div className="col-span-2 text-gray-700 min-w-0">
                  <div className="font-medium truncate">{note.supplier_name}</div>
                  {note.supplier_email && (
                    <div className="text-xs text-gray-500 truncate">{note.supplier_email}</div>
                  )}
                </div>
                <div className="col-span-2 text-gray-700 min-w-0">
                  <div className="truncate">{note.reference_invoice || '-'}</div>
                </div>
                <div className="col-span-2 text-gray-700">
                  <div className="flex items-center space-x-1 text-sm">
                    <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                    <span>{formatDate(note.debit_note_date || note.created_at)}</span>
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
                    onClick={() => onViewDebitNote && onViewDebitNote(note)} 
                    className="p-1 hover:bg-gray-100 rounded" 
                    title="View"
                  >
                    <Eye size={14} className="text-gray-600" />
                  </button>
                  <button 
                    onClick={() => onEditDebitNote && onEditDebitNote(note)} 
                    className="p-1 hover:bg-gray-100 rounded" 
                    title="Edit"
                  >
                    <Edit size={14} className="text-gray-600" />
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
    </div>
  );
};

export default DebitNotesList;
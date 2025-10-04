import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  CheckCircle,
  FileText,
  Filter,
  Calendar,
  Download
} from 'lucide-react';
import { api } from '../services/api';

const JournalEntries = ({ onNavigate }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    loadData();
  }, [statusFilter, voucherTypeFilter, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entriesRes, accountsRes] = await Promise.all([
        api.get('/financial/journal-entries', {
          params: {
            ...(statusFilter && { status: statusFilter }),
            ...(voucherTypeFilter && { voucher_type: voucherTypeFilter }),
            ...(dateRange.from && { from_date: dateRange.from }),
            ...(dateRange.to && { to_date: dateRange.to }),
            limit: 50
          }
        }),
        api.get('/financial/accounts')
      ]);
      
      setEntries(entriesRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setEntries([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-yellow-100 text-yellow-800',
      'posted': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredEntries = entries
    .filter(entry =>
      entry.entry_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'description':
          aValue = a.description?.toLowerCase() || '';
          bValue = b.description?.toLowerCase() || '';
          break;
        case 'amount':
          aValue = a.total_debit || 0;
          bValue = b.total_debit || 0;
          break;
        case 'voucher_type':
          aValue = a.voucher_type?.toLowerCase() || '';
          bValue = b.voucher_type?.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.status?.toLowerCase() || '';
          bValue = b.status?.toLowerCase() || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setVoucherTypeFilter('');
    setDateRange({ from: '', to: '' });
    setSortConfig({ key: null, direction: 'asc' });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return '⇅';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handlePostEntry = async (entryId) => {
    try {
      await api.post(`/financial/journal-entries/${entryId}/post`);
      alert('Journal entry posted successfully!');
      loadData();
    } catch (error) {
      console.error('Error posting entry:', error);
      alert('Failed to post journal entry');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-6"></div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
              <p className="text-gray-600 mt-1">Manage accounting journal entries</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('/financial')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                ← Back to Financial
              </button>
              <button
                onClick={() => setShowEntryForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={20} />
                <span>New Entry</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="bg-white rounded-lg shadow-sm">
          {filteredEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entry Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{entry.entry_number}</div>
                          <div className="text-sm text-gray-600">{formatDate(entry.posting_date)}</div>
                          {entry.voucher_type !== 'Journal Entry' && (
                            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded mt-1 inline-block">
                              {entry.voucher_type}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{entry.description}</div>
                        {entry.reference && (
                          <div className="text-xs text-gray-500">Ref: {entry.reference}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{formatCurrency(entry.total_debit)}</div>
                        <div className="text-xs text-gray-500">
                          Dr: {formatCurrency(entry.total_debit)} | Cr: {formatCurrency(entry.total_credit)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                          {entry.status}
                        </span>
                        {entry.is_auto_generated && (
                          <div className="text-xs text-gray-500 mt-1">Auto Generated</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {/* View details */}}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="View Entry"
                          >
                            <Eye size={16} />
                          </button>
                          {entry.status === 'draft' && (
                            <>
                              <button
                                onClick={() => setEditingEntry(entry)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                                title="Edit Entry"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handlePostEntry(entry.id)}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                                title="Post Entry"
                              >
                                <CheckCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <FileText size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Journal Entries</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter || dateRange.from ? 
                  'No entries match your search criteria.' : 
                  'Create your first journal entry to get started.'
                }
              </p>
              <button
                onClick={() => setShowEntryForm(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Journal Entry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Journal Entry Form Modal */}
      {showEntryForm && (
        <JournalEntryFormModal
          entry={editingEntry}
          accounts={accounts}
          onSave={() => {
            setShowEntryForm(false);
            setEditingEntry(null);
            loadData();
          }}
          onClose={() => {
            setShowEntryForm(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
};

// Journal Entry Form Modal Component
const JournalEntryFormModal = ({ entry, accounts, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    entry_number: '',
    posting_date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    accounts: [
      { account_id: '', account_name: '', debit_amount: 0, credit_amount: 0, description: '' },
      { account_id: '', account_name: '', debit_amount: 0, credit_amount: 0, description: '' }
    ]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setFormData({
        ...entry,
        posting_date: new Date(entry.posting_date).toISOString().split('T')[0]
      });
    }
  }, [entry]);

  const addAccount = () => {
    setFormData({
      ...formData,
      accounts: [
        ...formData.accounts,
        { account_id: '', account_name: '', debit_amount: 0, credit_amount: 0, description: '' }
      ]
    });
  };

  const removeAccount = (index) => {
    if (formData.accounts.length > 2) {
      const newAccounts = formData.accounts.filter((_, i) => i !== index);
      setFormData({ ...formData, accounts: newAccounts });
    }
  };

  const updateAccount = (index, field, value) => {
    const newAccounts = [...formData.accounts];
    if (field === 'account_id') {
      const selectedAccount = accounts.find(acc => acc.id === value);
      newAccounts[index].account_id = value;
      newAccounts[index].account_name = selectedAccount ? selectedAccount.account_name : '';
    } else {
      newAccounts[index][field] = value;
    }
    setFormData({ ...formData, accounts: newAccounts });
  };

  const getTotalDebits = () => {
    return formData.accounts.reduce((sum, acc) => sum + parseFloat(acc.debit_amount || 0), 0);
  };

  const getTotalCredits = () => {
    return formData.accounts.reduce((sum, acc) => sum + parseFloat(acc.credit_amount || 0), 0);
  };

  const isBalanced = () => {
    return Math.abs(getTotalDebits() - getTotalCredits()) < 0.01;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isBalanced()) {
      alert('Journal entry must be balanced (Total Debits = Total Credits)');
      return;
    }

    setSaving(true);
    try {
      if (entry) {
        await api.put(`/financial/journal-entries/${entry.id}`, formData);
      } else {
        await api.post('/financial/journal-entries', formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      alert('Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {entry ? 'Edit Journal Entry' : 'Create Journal Entry'}
          </h3>
        </div>
        
        <div className="overflow-y-auto max-h-[70vh]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Number
                </label>
                <input
                  type="text"
                  value={formData.entry_number}
                  onChange={(e) => setFormData({ ...formData, entry_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Auto-generated if empty"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posting Date *
                </label>
                <input
                  type="date"
                  value={formData.posting_date}
                  onChange={(e) => setFormData({ ...formData, posting_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                required
              />
            </div>

            {/* Accounts Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Account Lines</h4>
                <button
                  type="button"
                  onClick={addAccount}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  + Add Line
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Debit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Credit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.accounts.map((account, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">
                          <select
                            value={account.account_id}
                            onChange={(e) => updateAccount(index, 'account_id', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                            required
                          >
                            <option value="">Select Account</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.account_code} - {acc.account_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={account.description}
                            onChange={(e) => updateAccount(index, 'description', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={account.debit_amount}
                            onChange={(e) => updateAccount(index, 'debit_amount', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={account.credit_amount}
                            onChange={(e) => updateAccount(index, 'credit_amount', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {formData.accounts.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeAccount(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Debits:</span>
                      <span className="ml-2">₹{getTotalDebits().toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Total Credits:</span>
                      <span className="ml-2">₹{getTotalCredits().toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Difference:</span>
                    <span className={`ml-2 ${isBalanced() ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Math.abs(getTotalDebits() - getTotalCredits()).toFixed(2)}
                    </span>
                    {isBalanced() && <span className="ml-2 text-green-600">✓ Balanced</span>}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !isBalanced()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JournalEntries;
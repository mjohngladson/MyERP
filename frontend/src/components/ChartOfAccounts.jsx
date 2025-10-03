import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Calculator,
  Filter,
  Download
} from 'lucide-react';
import { api } from '../services/api';

const ChartOfAccounts = ({ onNavigate }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState('');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const accountTypes = [
    'All Types',
    'Asset',
    'Liability', 
    'Equity',
    'Income',
    'Expense'
  ];

  useEffect(() => {
    loadAccounts();
  }, [selectedAccountType]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedAccountType && selectedAccountType !== 'All Types') {
        params.account_type = selectedAccountType;
      }

      const response = await api.get('/financial/accounts', { params });
      const accountsData = response.data || [];
      
      // Group accounts by type for better organization
      const groupedAccounts = groupAccountsByType(accountsData);
      setAccounts(groupedAccounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const groupAccountsByType = (accountsData) => {
    const groups = {
      'Asset': [],
      'Liability': [],
      'Equity': [],
      'Income': [],
      'Expense': []
    };

    accountsData.forEach(account => {
      if (groups[account.root_type]) {
        groups[account.root_type].push(account);
      }
    });

    // Convert to array format for rendering
    return Object.entries(groups)
      .filter(([type, accounts]) => accounts.length > 0)
      .map(([type, accounts]) => ({
        type,
        accounts: accounts.sort((a, b) => a.account_code.localeCompare(b.account_code))
      }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getAccountTypeColor = (type) => {
    const colors = {
      'Asset': 'text-blue-600 bg-blue-100',
      'Liability': 'text-red-600 bg-red-100',
      'Equity': 'text-green-600 bg-green-100',
      'Income': 'text-purple-600 bg-purple-100',
      'Expense': 'text-orange-600 bg-orange-100'
    };
    return colors[type] || 'text-gray-600 bg-gray-100';
  };

  const getBalanceColor = (account) => {
    const balance = account.account_balance || 0;
    if (balance === 0) return 'text-gray-500';
    
    // Assets and Expenses: positive is normal (black), negative is red
    if (account.root_type === 'Asset' || account.root_type === 'Expense') {
      return balance > 0 ? 'text-gray-900' : 'text-red-600';
    }
    // Liabilities, Equity, Income: negative is normal (black), positive is red
    else {
      return balance < 0 ? 'text-gray-900' : 'text-red-600';
    }
  };

  const filteredAccounts = accounts.map(group => ({
    ...group,
    accounts: group.accounts.filter(account =>
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_code.includes(searchTerm)
    )
  })).filter(group => group.accounts.length > 0);

  const toggleGroup = (type) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedGroups(newExpanded);
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setShowAccountForm(true);
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setShowAccountForm(true);
  };

  const handleInitializeChart = async () => {
    try {
      await api.post('/financial/initialize');
      alert('Chart of accounts initialized successfully!');
      loadAccounts();
    } catch (error) {
      console.error('Error initializing chart:', error);
      alert('Failed to initialize chart of accounts');
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
              <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
              <p className="text-gray-600 mt-1">Manage your company's chart of accounts</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('/financial')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                ← Back to Financial
              </button>
              <button
                onClick={handleInitializeChart}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Initialize Chart
              </button>
              <button
                onClick={handleCreateAccount}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={20} />
                <span>Add Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search accounts by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={selectedAccountType}
                onChange={(e) => setSelectedAccountType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {accountTypes.map(type => (
                  <option key={type} value={type === 'All Types' ? '' : type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Accounts List */}
        <div className="bg-white rounded-lg shadow-sm">
          {filteredAccounts.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredAccounts.map((group) => (
                <div key={group.type}>
                  {/* Group Header */}
                  <div 
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleGroup(group.type)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedGroups.has(group.type) ? 
                          <ChevronDown size={20} className="text-gray-500" /> : 
                          <ChevronRight size={20} className="text-gray-500" />
                        }
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAccountTypeColor(group.type)}`}>
                            {group.type}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">{group.type} Accounts</h3>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {group.accounts.length} account{group.accounts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Group Accounts */}
                  {expandedGroups.has(group.type) && (
                    <div className="divide-y divide-gray-100">
                      {group.accounts.map((account) => (
                        <div 
                          key={account.id} 
                          className="p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-mono text-gray-500 w-16">
                                  {account.account_code}
                                </span>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{account.account_name}</h4>
                                  {account.is_group && (
                                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded mt-1 inline-block">
                                      Group Account
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className={`font-medium ${getBalanceColor(account)}`}>
                                  {formatCurrency(account.account_balance)}
                                </p>
                                <p className="text-xs text-gray-500">Current Balance</p>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditAccount(account)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit Account"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => onNavigate(`/financial/accounts/${account.id}`)}
                                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Calculator size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounts Found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedAccountType ? 
                  'No accounts match your search criteria.' : 
                  'Get started by initializing your chart of accounts or creating your first account.'
                }
              </p>
              <div className="flex justify-center space-x-3">
                {!searchTerm && !selectedAccountType && (
                  <button
                    onClick={handleInitializeChart}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Initialize Chart of Accounts
                  </button>
                )}
                <button
                  onClick={handleCreateAccount}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Form Modal */}
      {showAccountForm && (
        <AccountFormModal
          account={editingAccount}
          onSave={() => {
            setShowAccountForm(false);
            loadAccounts();
          }}
          onClose={() => setShowAccountForm(false)}
        />
      )}
    </div>
  );
};

// Account Form Modal Component
const AccountFormModal = ({ account, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_type: 'Asset',
    root_type: 'Asset',
    is_group: false,
    opening_balance: 0,
    currency: 'INR'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData({ ...account });
    }
  }, [account]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (account) {
        await api.put(`/financial/accounts/${account.id}`, formData);
      } else {
        await api.post('/financial/accounts', formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {account ? 'Edit Account' : 'Create New Account'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Code *
            </label>
            <input
              type="text"
              value={formData.account_code}
              onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name *
            </label>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type *
            </label>
            <select
              value={formData.root_type}
              onChange={(e) => setFormData({ 
                ...formData, 
                root_type: e.target.value, 
                account_type: e.target.value 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opening Balance
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_group"
              checked={formData.is_group}
              onChange={(e) => setFormData({ ...formData, is_group: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_group" className="ml-2 block text-sm text-gray-700">
              This is a group account (has child accounts)
            </label>
          </div>
        </form>
        
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
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChartOfAccounts;
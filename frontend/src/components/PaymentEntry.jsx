import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Trash2,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  Filter,
  Download,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import PaymentAllocationForm from './PaymentAllocationForm';

const PaymentEntry = ({ onNavigate }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [viewingPayment, setViewingPayment] = useState(null);
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [allocatingPayment, setAllocatingPayment] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    loadData();
  }, [typeFilter, statusFilter, methodFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, customersRes, suppliersRes] = await Promise.all([
        api.get('/financial/payments', {
          params: {
            ...(typeFilter && { payment_type: typeFilter }),
            ...(statusFilter && { status: statusFilter }),
            limit: 50
          }
        }),
        api.get('/master/customers'),
        api.get('/master/suppliers')
      ]);
      
      setPayments(paymentsRes.data || []);
      setCustomers(customersRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setPayments([]);
      setCustomers([]);
      setSuppliers([]);
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

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) {
      return;
    }
    
    try {
      await api.delete(`/financial/payments/${paymentId}`);
      alert('Payment deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert(error.response?.data?.detail || 'Failed to delete payment');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setMethodFilter('');
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

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-yellow-100 text-yellow-800',
      'submitted': 'bg-blue-100 text-blue-800',
      'paid': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentTypeColor = (type) => {
    return type === 'Receive' ? 'text-green-600' : 'text-red-600';
  };

  const filteredPayments = payments
    .filter(payment => {
      // Search filter
      const matchesSearch = payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.party_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Method filter
      const matchesMethod = !methodFilter || payment.payment_method === methodFilter;
      
      return matchesSearch && matchesMethod;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'party':
          aValue = a.party_name?.toLowerCase() || '';
          bValue = b.party_name?.toLowerCase() || '';
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'method':
          aValue = a.payment_method?.toLowerCase() || '';
          bValue = b.payment_method?.toLowerCase() || '';
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
              <h1 className="text-2xl font-bold text-gray-900">Payment Entries</h1>
              <p className="text-gray-600 mt-1">Record payments received and made</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('/financial')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                ← Back to Financial
              </button>
              <button
                onClick={() => setShowPaymentForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={20} />
                <span>Record Payment</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Received</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    payments
                      .filter(p => p.payment_type === 'Receive' && p.status === 'paid')
                      .reduce((sum, p) => sum + (p.amount || 0), 0)
                  )}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <ArrowDownCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    payments
                      .filter(p => p.payment_type === 'Pay' && p.status === 'paid')
                      .reduce((sum, p) => sum + (p.amount || 0), 0)
                  )}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <ArrowUpCircle className="text-red-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Cash Flow</p>
                <p className={`text-2xl font-bold ${
                  payments.reduce((sum, p) => 
                    sum + (p.payment_type === 'Receive' ? p.amount : -p.amount), 0
                  ) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(
                    payments.reduce((sum, p) => 
                      sum + (p.payment_type === 'Receive' ? p.amount : -p.amount), 0
                    )
                  )}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="text-blue-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Filter size={14} />
              <span>Clear Filters</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="Receive">Received</option>
                <option value="Pay">Paid</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Net Banking">Net Banking</option>
              </select>
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
                <option value="submitted">Submitted</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-lg shadow-sm">
          {filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Details
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('party')}
                      title="Click to sort"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Party</span>
                        <span className="text-gray-400">{getSortIcon('party')}</span>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('amount')}
                      title="Click to sort"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Amount</span>
                        <span className="text-gray-400">{getSortIcon('amount')}</span>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('method')}
                      title="Click to sort"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Method</span>
                        <span className="text-gray-400">{getSortIcon('method')}</span>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('status')}
                      title="Click to sort"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        <span className="text-gray-400">{getSortIcon('status')}</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{payment.payment_number}</div>
                          <div className="text-sm text-gray-600">{formatDate(payment.payment_date)}</div>
                          <div className={`text-xs font-medium ${getPaymentTypeColor(payment.payment_type)}`}>
                            {payment.payment_type === 'Receive' ? '↓' : '↑'} {payment.payment_type}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{payment.party_name}</div>
                          <div className="text-sm text-gray-600">{payment.party_type}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-medium ${getPaymentTypeColor(payment.payment_type)}`}>
                          {payment.payment_type === 'Receive' ? '+' : '-'}{formatCurrency(payment.amount)}
                        </div>
                        {payment.currency !== 'INR' && (
                          <div className="text-xs text-gray-500">
                            {payment.currency} @ {payment.exchange_rate}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{payment.payment_method}</div>
                        {payment.reference_number && (
                          <div className="text-xs text-gray-500">Ref: {payment.reference_number}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                        {payment.unallocated_amount > 0 && (
                          <div className="text-xs text-orange-600 mt-1">
                            Unallocated: {formatCurrency(payment.unallocated_amount)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setViewingPayment(payment)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="View Payment"
                          >
                            <Eye size={16} />
                          </button>
                          {(payment.status === 'draft' || payment.status === 'submitted') && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingPayment(payment);
                                  setShowPaymentForm(true);
                                }}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                                title="Edit Payment"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(payment.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete Payment"
                              >
                                <Trash2 size={16} />
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
              <CreditCard size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || typeFilter || statusFilter ? 
                  'No payments match your search criteria.' : 
                  'Record your first payment to get started.'
                }
              </p>
              <button
                onClick={() => setShowPaymentForm(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Record Payment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <PaymentFormModal
          payment={editingPayment}
          customers={customers}
          suppliers={suppliers}
          onSave={() => {
            setShowPaymentForm(false);
            setEditingPayment(null);
            loadData();
          }}
          onClose={() => {
            setShowPaymentForm(false);
            setEditingPayment(null);
          }}
        />
      )}

      {/* View Payment Modal */}
      {viewingPayment && (
        <PaymentViewModal
          payment={viewingPayment}
          onClose={() => setViewingPayment(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

// Payment Form Modal Component
const PaymentFormModal = ({ payment, customers, suppliers, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    payment_type: 'Receive',
    party_type: 'Customer',
    party_id: '',
    party_name: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'Cash',
    reference_number: '',
    currency: 'INR',
    exchange_rate: 1.0,
    status: 'paid',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  const paymentMethods = [
    'Cash',
    'Bank Transfer',
    'Credit Card',
    'Debit Card',
    'UPI',
    'Cheque',
    'Net Banking'
  ];

  useEffect(() => {
    if (payment) {
      setFormData({
        ...payment,
        payment_date: new Date(payment.payment_date).toISOString().split('T')[0]
      });
    }
  }, [payment]);

  const handlePartyChange = (partyId) => {
    const parties = formData.party_type === 'Customer' ? customers : suppliers;
    const selectedParty = parties.find(p => p.id === partyId);
    
    setFormData({
      ...formData,
      party_id: partyId,
      party_name: selectedParty ? selectedParty.name : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (payment) {
        await api.put(`/financial/payments/${payment.id}`, formData);
      } else {
        await api.post('/financial/payments', formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const getParties = () => {
    return formData.party_type === 'Customer' ? customers : suppliers;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {payment ? 'Edit Payment' : 'Record Payment'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type *
              </label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  payment_type: e.target.value,
                  party_type: e.target.value === 'Receive' ? 'Customer' : 'Supplier'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Receive">Receive (Money In)</option>
                <option value="Pay">Pay (Money Out)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party Type *
              </label>
              <select
                value={formData.party_type}
                onChange={(e) => setFormData({ ...formData, party_type: e.target.value, party_id: '', party_name: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Customer">Customer</option>
                <option value="Supplier">Supplier</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.party_type} *
            </label>
            <select
              value={formData.party_id}
              onChange={(e) => handlePartyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select {formData.party_type}</option>
              {getParties().map(party => (
                <option key={party.id} value={party.id}>
                  {party.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Bank ref, cheque no, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="paid">Paid</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Set to 'Paid' for completed payments</p>
            </div>
            <div></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
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
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Payment View Modal Component
const PaymentViewModal = ({ payment, onClose, formatCurrency, formatDate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
            <p className="text-sm text-gray-600 mt-1">{payment.payment_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Payment Type Badge */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                payment.payment_type === 'Receive' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {payment.payment_type === 'Receive' ? '↓' : '↑'} {payment.payment_type}
              </span>
            </div>
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                payment.status === 'paid' 
                  ? 'bg-green-100 text-green-800' 
                  : payment.status === 'submitted'
                  ? 'bg-blue-100 text-blue-800'
                  : payment.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : 'Unknown'}
              </span>
            </div>
          </div>

          {/* Amount Section */}
          <div className="bg-gray-50 p-6 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-2">Payment Amount</p>
            <p className={`text-4xl font-bold ${
              payment.payment_type === 'Receive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {payment.payment_type === 'Receive' ? '+' : '-'}{formatCurrency(payment.amount)}
            </p>
            {payment.currency !== 'INR' && (
              <p className="text-sm text-gray-600 mt-2">
                {payment.currency} @ Rate: {payment.exchange_rate} = {formatCurrency(payment.base_amount)} INR
              </p>
            )}
          </div>

          {/* Payment Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Party Type</label>
              <p className="text-gray-900 font-medium">{payment.party_type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Party Name</label>
              <p className="text-gray-900 font-medium">{payment.party_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Payment Date</label>
              <p className="text-gray-900 font-medium">{formatDate(payment.payment_date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Payment Method</label>
              <p className="text-gray-900 font-medium">{payment.payment_method}</p>
            </div>
            {payment.reference_number && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Reference Number</label>
                <p className="text-gray-900 font-medium">{payment.reference_number}</p>
              </div>
            )}
            {payment.bank_account_id && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Bank Account</label>
                <p className="text-gray-900 font-medium">{payment.bank_account_id}</p>
              </div>
            )}
          </div>

          {/* Allocation Details */}
          {payment.unallocated_amount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Unallocated Amount</p>
                  <p className="text-xs text-orange-600 mt-1">This amount hasn't been allocated to any invoice</p>
                </div>
                <p className="text-lg font-bold text-orange-800">{formatCurrency(payment.unallocated_amount)}</p>
              </div>
            </div>
          )}

          {payment.allocated_invoices && payment.allocated_invoices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Allocated to Invoices</label>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                {payment.allocated_invoices.map((inv, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <span className="text-sm text-gray-900">{inv.invoice_id}</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(inv.allocated_amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {payment.description && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{payment.description}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <span className="font-medium">Created:</span> {formatDate(payment.created_at)}
              </div>
              {payment.updated_at && (
                <div>
                  <span className="font-medium">Updated:</span> {formatDate(payment.updated_at)}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => {
              setAllocatingPayment(payment);
              setShowAllocationForm(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <DollarSign size={16} />
            <span>Allocate Payment</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentEntry;
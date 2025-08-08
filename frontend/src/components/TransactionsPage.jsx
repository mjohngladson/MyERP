import React, { useState } from 'react';
import { 
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const TransactionsPage = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const { data: transactions, loading, error, refetch } = useApi(() => api.dashboard.getTransactions(50));

  const filteredTransactions = transactions ? transactions.filter(transaction => {
    const matchesSearch = transaction.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.party_name && transaction.party_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || transaction.type === filterType;
    return matchesSearch && matchesType;
  }) : [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'sales_invoice':
        return <ArrowUpRight className="text-green-600" size={20} />;
      case 'purchase_order':
        return <ArrowDownLeft className="text-red-600" size={20} />;
      case 'payment_entry':
        return <DollarSign className="text-blue-600" size={20} />;
      case 'stock_entry':
        return <FileText className="text-purple-600" size={20} />;
      default:
        return <FileText className="text-gray-600" size={20} />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'sales_invoice':
        return 'bg-green-50 border-green-200';
      case 'purchase_order':
        return 'bg-red-50 border-red-200';
      case 'payment_entry':
        return 'bg-blue-50 border-blue-200';
      case 'stock_entry':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTransactionType = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white p-4 rounded-lg">
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'sales_invoice' || t.type === 'payment_entry')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'purchase_order')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">All Transactions</h1>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="sales_invoice">Sales Invoice</option>
              <option value="purchase_order">Purchase Order</option>
              <option value="payment_entry">Payment Entry</option>
              <option value="stock_entry">Stock Entry</option>
            </select>
            <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">Total Transactions</div>
            <FileText className="text-gray-400" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-800">{filteredTransactions.length}</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">Total Income</div>
            <TrendingUp className="text-green-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">Total Expenses</div>
            <TrendingDown className="text-red-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">Net Amount</div>
            <DollarSign className="text-blue-500" size={20} />
          </div>
          <div className={`text-3xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalIncome - totalExpenses)}
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Error loading transactions: {error}</p>
          <button 
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Transactions Found</h3>
          <p className="text-gray-600">
            {searchTerm || filterType !== 'all' 
              ? 'No transactions match your search criteria.' 
              : 'No transactions available.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} className={`bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow ${getTransactionColor(transaction.type)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {formatTransactionType(transaction.type)}
                    </h3>
                    <div className="text-gray-600">
                      <div className="font-medium">{transaction.reference_number}</div>
                      {transaction.party_name && (
                        <div className="text-sm">{transaction.party_name}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800 mb-1">
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Calendar size={14} />
                    <span className="text-sm">{formatDate(transaction.date)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
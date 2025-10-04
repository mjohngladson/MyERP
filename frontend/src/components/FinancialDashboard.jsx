import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calculator,
  FileText,
  CreditCard,
  PieChart,
  BarChart3,
  Settings,
  Plus,
  Eye,
  Edit
} from 'lucide-react';
import { api } from '../services/api';

const FinancialDashboard = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState({
    accounts: [],
    journalEntries: [],
    payments: [],
    reports: {
      trialBalance: null,
      profitLoss: null,
      balanceSheet: null
    }
  });
  const [quickStats, setQuickStats] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashBalance: 0,
    totalReceived: 0,
    totalPaid: 0
  });

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const [accountsRes, entriesRes, paymentsRes, pnlRes, balanceSheetRes] = await Promise.all([
        api.get('/financial/accounts'),
        api.get('/financial/journal-entries?limit=5'),
        api.get('/financial/payments?limit=5'),
        api.get('/financial/reports/profit-loss'),
        api.get('/financial/reports/balance-sheet')
      ]);

      const accounts = accountsRes.data || [];
      const entries = entriesRes.data || [];
      const payments = paymentsRes.data || [];
      const pnl = pnlRes.data || {};
      const balanceSheet = balanceSheetRes.data || {};

      setFinancialData({
        accounts,
        journalEntries: entries,
        payments,
        reports: {
          profitLoss: pnl,
          balanceSheet
        }
      });

      // Calculate quick stats
      const assets = accounts.filter(acc => acc.root_type === 'Asset');
      const liabilities = accounts.filter(acc => acc.root_type === 'Liability');
      const cashAccounts = accounts.filter(acc => acc.account_name.toLowerCase().includes('cash'));

      setQuickStats({
        totalAssets: balanceSheet.total_assets || 0,
        totalLiabilities: balanceSheet.total_liabilities || 0,
        totalIncome: pnl.total_income || 0,
        totalExpenses: pnl.total_expenses || 0,
        netProfit: pnl.net_profit || 0,
        cashBalance: cashAccounts.reduce((sum, acc) => sum + (acc.account_balance || 0), 0)
      });

    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusColor = (type, amount) => {
    if (type === 'profit') {
      return amount >= 0 ? 'text-green-600' : 'text-red-600';
    }
    return 'text-gray-900';
  };

  const quickActions = [
    {
      title: 'New Journal Entry',
      description: 'Create manual journal entry',
      icon: FileText,
      color: 'bg-blue-500',
      action: () => onNavigate('/financial/journal-entries/new')
    },
    {
      title: 'Record Payment',
      description: 'Record payment received/made',
      icon: CreditCard,
      color: 'bg-green-500',
      action: () => onNavigate('/financial/payments/new')
    },
    {
      title: 'Chart of Accounts',
      description: 'Manage accounts',
      icon: Calculator,
      color: 'bg-purple-500',
      action: () => onNavigate('/financial/accounts')
    },
    {
      title: 'Financial Reports',
      description: 'View P&L, Balance Sheet',
      icon: BarChart3,
      color: 'bg-orange-500',
      action: () => onNavigate('/financial/reports')
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
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
              <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
              <p className="text-gray-600 mt-1">Comprehensive accounting and financial reporting</p>
            </div>
            <button
              onClick={() => onNavigate('/financial/settings')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Assets</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(quickStats.totalAssets)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cash Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(quickStats.cashBalance)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(quickStats.totalIncome)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <PieChart className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${getStatusColor('profit', quickStats.netProfit)}`}>
                  {formatCurrency(quickStats.netProfit)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${quickStats.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {quickStats.netProfit >= 0 ? (
                  <TrendingUp className="text-green-600" size={24} />
                ) : (
                  <TrendingDown className="text-red-600" size={24} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className={`p-2 ${action.color} rounded-lg`}>
                      <action.icon className="text-white" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{action.title}</p>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Journal Entries */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Journal Entries</h3>
                  <button
                    onClick={() => onNavigate('/financial/journal-entries')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View All
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {financialData.journalEntries.length > 0 ? (
                  financialData.journalEntries.map((entry, index) => (
                    <div key={entry.id || index} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{entry.entry_number}</p>
                          <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(entry.posting_date).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(entry.total_debit)}</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            entry.status === 'posted' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p>No journal entries yet</p>
                    <button
                      onClick={() => onNavigate('/financial/journal-entries/new')}
                      className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Create your first entry
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
                  <button
                    onClick={() => onNavigate('/financial/payments')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View All
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {financialData.payments.length > 0 ? (
                  financialData.payments.map((payment, index) => (
                    <div key={payment.id || index} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{payment.payment_number}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {payment.payment_type} - {payment.party_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            payment.payment_type === 'Receive' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {payment.payment_type === 'Receive' ? '+' : '-'}{formatCurrency(payment.amount)}
                          </p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
                    <p>No payments recorded yet</p>
                    <button
                      onClick={() => onNavigate('/financial/payments/new')}
                      className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Record your first payment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
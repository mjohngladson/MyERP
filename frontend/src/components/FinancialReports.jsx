import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  FileText,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  Calculator
} from 'lucide-react';
import { api } from '../services/api';

const FinancialReports = ({ onNavigate }) => {
  const [activeReport, setActiveReport] = useState('trial-balance');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  
  // This ensures "to" date defaults to today
  const [reportData, setReportData] = useState({});

  const reports = [
    {
      id: 'trial-balance',
      name: 'Trial Balance',
      description: 'List of all accounts with their debit and credit balances',
      icon: Calculator,
      color: 'blue'
    },
    {
      id: 'profit-loss',
      name: 'Profit & Loss',
      description: 'Income and expenses for a specific period',
      icon: TrendingUp,
      color: 'green'
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      description: 'Financial position at a specific date',
      icon: PieChart,
      color: 'purple'
    }
  ];

  useEffect(() => {
    loadReport();
  }, [activeReport, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let response;
      const params = activeReport === 'trial-balance' 
        ? { as_of_date: dateRange.to }
        : { from_date: dateRange.from, to_date: dateRange.to };

      switch (activeReport) {
        case 'trial-balance':
          response = await api.get('/financial/reports/trial-balance', { params });
          break;
        case 'profit-loss':
          response = await api.get('/financial/reports/profit-loss', { params });
          break;
        case 'balance-sheet':
          response = await api.get('/financial/reports/balance-sheet', { params: { as_of_date: dateRange.to } });
          break;
        default:
          return;
      }
      
      setReportData({ ...reportData, [activeReport]: response.data });
    } catch (error) {
      console.error('Error loading report:', error);
      setReportData({ ...reportData, [activeReport]: null });
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReportColor = (reportId) => {
    const report = reports.find(r => r.id === reportId);
    return report?.color || 'gray';
  };

  const renderTrialBalance = (data) => {
    if (!data) return <div className="text-center text-gray-500 py-8">No data available</div>;

    return (
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Trial Balance</h3>
          <p className="text-sm text-gray-600">As of {formatDate(data.as_of_date)}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Account Code</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Account Name</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Debit Balance</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Credit Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts?.map((account, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{account.account_code}</td>
                  <td className="border border-gray-300 px-4 py-2">{account.account_name}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {account.debit_balance > 0 ? formatCurrency(account.debit_balance) : '-'}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {account.credit_balance > 0 ? formatCurrency(account.credit_balance) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="border border-gray-300 px-4 py-3" colSpan="2">TOTAL</td>
                <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(data.total_debits)}</td>
                <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(data.total_credits)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Balance Check:</span>
            {data.is_balanced ? (
              <span className="text-green-600 flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                Balanced (Debits = Credits)
              </span>
            ) : (
              <span className="text-red-600 flex items-center">
                <span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                Unbalanced (Difference: {formatCurrency(Math.abs(data.total_debits - data.total_credits))})
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProfitLoss = (data) => {
    if (!data) return <div className="text-center text-gray-500 py-8">No data available</div>;

    return (
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profit & Loss Statement</h3>
          <p className="text-sm text-gray-600">
            For the period {formatDate(data.from_date)} to {formatDate(data.to_date)}
          </p>
        </div>

        <div className="space-y-6">
          {/* Income Section */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 bg-green-50 p-3 rounded-lg">INCOME</h4>
            <div className="space-y-2">
              {data.income?.length > 0 ? (
                data.income.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-700">{item.account_name}</span>
                    <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">No income recorded</div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-gray-300 font-semibold">
                <span>Total Income</span>
                <span className="text-green-600">{formatCurrency(data.total_income)}</span>
              </div>
            </div>
          </div>

          {/* Expenses Section */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 bg-red-50 p-3 rounded-lg">EXPENSES</h4>
            <div className="space-y-2">
              {data.expenses?.length > 0 ? (
                data.expenses.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-700">{item.account_name}</span>
                    <span className="font-medium text-red-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">No expenses recorded</div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-gray-300 font-semibold">
                <span>Total Expenses</span>
                <span className="text-red-600">{formatCurrency(data.total_expenses)}</span>
              </div>
            </div>
          </div>

          {/* Net Profit/Loss */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-lg font-bold">
              <span>Net {data.net_profit >= 0 ? 'Profit' : 'Loss'}</span>
              <span className={data.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(Math.abs(data.net_profit))}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Calculation: Income ({formatCurrency(data.total_income)}) - Expenses ({formatCurrency(data.total_expenses)})
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = (data) => {
    if (!data) return <div className="text-center text-gray-500 py-8">No data available</div>;

    return (
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Balance Sheet</h3>
          <p className="text-sm text-gray-600">As of {formatDate(data.as_of_date)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assets */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 bg-blue-50 p-3 rounded-lg">ASSETS</h4>
            <div className="space-y-2">
              {data.assets?.length > 0 ? (
                data.assets.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-700">{item.account_name}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">No assets recorded</div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-gray-300 font-semibold">
                <span>Total Assets</span>
                <span className="text-blue-600">{formatCurrency(data.total_assets)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div>
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 bg-red-50 p-3 rounded-lg">LIABILITIES</h4>
              <div className="space-y-2">
                {data.liabilities?.length > 0 ? (
                  data.liabilities.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-700">{item.account_name}</span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 italic">No liabilities recorded</div>
                )}
                <div className="flex justify-between py-2 border-t-2 border-gray-300 font-semibold">
                  <span>Total Liabilities</span>
                  <span className="text-red-600">{formatCurrency(data.total_liabilities)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3 bg-green-50 p-3 rounded-lg">EQUITY</h4>
              <div className="space-y-2">
                {data.equity?.length > 0 ? (
                  data.equity.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-700">{item.account_name}</span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 italic">No equity recorded</div>
                )}
                <div className="flex justify-between py-2 border-t-2 border-gray-300 font-semibold">
                  <span>Total Equity</span>
                  <span className="text-green-600">{formatCurrency(data.total_equity)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Liabilities & Equity</span>
                <span>{formatCurrency(data.total_liabilities_equity)}</span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Balance Check: {Math.abs(data.total_assets - data.total_liabilities_equity) < 1 ? 
                  '✓ Balanced' : 
                  `⚠ Unbalanced (Difference: ${formatCurrency(Math.abs(data.total_assets - data.total_liabilities_equity))})`
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
              <p className="text-gray-600 mt-1">Generate and view financial statements</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('/financial')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                ← Back to Financial
              </button>
              <button
                onClick={loadReport}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Report Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Available Reports</h3>
              <div className="space-y-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setActiveReport(report.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeReport === report.id
                        ? `bg-${report.color}-100 text-${report.color}-800 border border-${report.color}-200`
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <report.icon 
                        size={20} 
                        className={activeReport === report.id ? `text-${report.color}-600` : 'text-gray-400'} 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Date Filters */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Date Range</h4>
                <div className="space-y-3">
                  {activeReport !== 'trial-balance' && activeReport !== 'balance-sheet' && (
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">From Date</label>
                      <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      {activeReport === 'profit-loss' ? 'To Date' : 'As of Date'}
                    </label>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="animate-spin mr-3" size={24} />
                  <span className="text-gray-600">Loading report...</span>
                </div>
              ) : (
                <div>
                  {activeReport === 'trial-balance' && renderTrialBalance(reportData['trial-balance'])}
                  {activeReport === 'profit-loss' && renderProfitLoss(reportData['profit-loss'])}
                  {activeReport === 'balance-sheet' && renderBalanceSheet(reportData['balance-sheet'])}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, Download, Calendar, Filter,
  ChevronLeft, RefreshCw, Share2, Printer, Eye, Settings,
  Target, Users, DollarSign, Package, ArrowUp, ArrowDown
} from 'lucide-react';
import { api } from '../services/api';

const AdvancedReporting = ({ onBack }) => {
  const [selectedReport, setSelectedReport] = useState('sales_overview');
  const [dateRange, setDateRange] = useState('30d');
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reportTypes = [
    {
      id: 'sales_overview',
      name: 'Sales Overview',
      description: 'Comprehensive sales performance analysis',
      icon: TrendingUp,
      category: 'Sales'
    },
    {
      id: 'financial_summary',
      name: 'Financial Summary',
      description: 'Revenue, expenses, and profit analysis',
      icon: DollarSign,
      category: 'Finance'
    },
    {
      id: 'customer_analysis',
      name: 'Customer Analysis',
      description: 'Customer behavior and segmentation',
      icon: Users,
      category: 'CRM'
    },
    {
      id: 'inventory_report',
      name: 'Inventory Report',
      description: 'Stock levels, movement, and valuation',
      icon: Package,
      category: 'Inventory'
    },
    {
      id: 'performance_metrics',
      name: 'Performance Metrics',
      description: 'KPI dashboard and goal tracking',
      icon: Target,
      category: 'Analytics'
    }
  ];

  useEffect(() => {
    loadReportData();
  }, [selectedReport, dateRange]);

  const getDaysFromRange = (range) => {
    const rangeDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    return rangeDays[range] || 30;
  };

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const days = getDaysFromRange(dateRange);
      let response;
      
      switch (selectedReport) {
        case 'sales_overview':
          response = await api.reports.salesOverview(days);
          break;
        case 'financial_summary':
          response = await api.reports.financialSummary(days);
          break;
        case 'customer_analysis':
          response = await api.reports.customerAnalysis(days);
          break;
        case 'inventory_report':
          response = await api.reports.inventoryReport();
          break;
        case 'performance_metrics':
          response = await api.reports.performanceMetrics(days);
          break;
        default:
          setReportData({});
          return;
      }
      
      setReportData(response.data || {});
    } catch (error) {
      console.error('Error loading report data:', error);
      setError(`Failed to load ${selectedReport.replace('_', ' ')} report. Please try again.`);
      setReportData({});
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const exportReport = (format) => {
    console.log(`Exporting report as ${format}`);
    // Implement export functionality
  };

  const renderSalesOverview = () => {
    const data = reportData;
    
    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Sales</h3>
              <DollarSign className="text-blue-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.totalSales)}</div>
            <div className="flex items-center mt-2 text-sm">
              <ArrowUp className="text-green-500 mr-1" size={14} />
              <span className="text-green-600">{formatPercentage(data.growthRate)}</span>
              <span className="text-gray-500 ml-1">vs last period</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Orders</h3>
              <Target className="text-green-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{data.totalOrders}</div>
            <div className="text-sm text-gray-500 mt-2">This period</div>
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg Order Value</h3>
              <TrendingUp className="text-purple-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.avgOrderValue)}</div>
            <div className="text-sm text-gray-500 mt-2">Per order</div>
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Growth Rate</h3>
              <ArrowUp className="text-orange-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatPercentage(data.growthRate)}</div>
            <div className="text-sm text-gray-500 mt-2">Month over month</div>
          </div>
        </div>

        {/* Sales Trend Chart */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Sales Trend vs Target</h3>
          <div className="h-64 flex items-end justify-between space-x-4">
            {data.salesTrend?.map((item, index) => {
              const maxValue = Math.max(...data.salesTrend.map(d => Math.max(d.sales, d.target)));
              const salesHeight = (item.sales / maxValue) * 200;
              const targetHeight = (item.target / maxValue) * 200;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                  <div className="flex items-end space-x-1 w-full justify-center">
                    <div
                      className="bg-blue-500 rounded-t w-4 hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ height: `${salesHeight}px` }}
                      title={`Sales: ${formatCurrency(item.sales)}`}
                    ></div>
                    <div
                      className="bg-gray-300 rounded-t w-4 hover:bg-gray-400 transition-colors cursor-pointer"
                      style={{ height: `${targetHeight}px` }}
                      title={`Target: ${formatCurrency(item.target)}`}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{item.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Actual Sales</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span className="text-gray-600">Target</span>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Top Performing Products</h3>
          <div className="space-y-4">
            {data.topProducts?.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{product.name}</h4>
                    <p className="text-sm text-gray-500">Revenue: {formatCurrency(product.revenue)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${product.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(product.growth)}
                  </span>
                  {product.growth > 0 ? (
                    <ArrowUp className="text-green-500" size={14} />
                  ) : (
                    <ArrowDown className="text-red-500" size={14} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFinancialSummary = () => {
    const data = reportData;
    
    return (
      <div className="space-y-6">
        {/* Financial Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.totalRevenue)}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Expenses</h3>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.totalExpenses)}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Net Profit</h3>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.netProfit)}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Profit Margin</h3>
            <div className="text-2xl font-bold text-green-600">{data.profitMargin}%</div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Expense Breakdown</h3>
          <div className="space-y-4">
            {data.expenses?.map((expense, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{expense.category}</span>
                  <span className="text-sm text-gray-600">{formatCurrency(expense.amount)} ({expense.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${expense.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      );
    }

    switch (selectedReport) {
      case 'sales_overview':
        return renderSalesOverview();
      case 'financial_summary':
        return renderFinancialSummary();
      default:
        return (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Report Coming Soon</h3>
            <p className="text-gray-600">This report is currently under development.</p>
          </div>
        );
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-800">Advanced Reporting</h1>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {reportTypes.map(report => (
                <option key={report.id} value={report.id}>
                  {report.name}
                </option>
              ))}
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadReportData}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => exportReport('pdf')}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div>
        {renderReport()}
      </div>
    </div>
  );
};

export default AdvancedReporting;
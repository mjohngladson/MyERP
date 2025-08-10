import React, { useState, useEffect } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, Download, Calendar, Filter,
  ChevronLeft, RefreshCw, Share2, Printer, Eye, Settings,
  Target, Users, DollarSign, Package, ArrowUp, ArrowDown
} from 'lucide-react';
import { api, networkUtils } from '../services/api';

const AdvancedReporting = ({ onBack }) => {
  const [selectedReport, setSelectedReport] = useState('sales_overview');
  const [dateRange, setDateRange] = useState('30d');
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Listen for network status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
      // Check network connectivity first
      const connectionStatus = await networkUtils.getConnectionStatus();
      if (!connectionStatus.online) {
        setError(connectionStatus.message);
        setReportData({});
        setLoading(false);
        return;
      }

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
      
      // Handle different types of errors
      let errorMessage = `Failed to load ${selectedReport.replace('_', ' ')} report.`;
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.networkError || !error.response) {
        errorMessage = 'Network Error: Unable to connect to server. Please check your connection.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Report endpoint not found. Please contact support.';
      } else if (error.message?.includes('offline')) {
        errorMessage = 'You are currently offline. Please check your internet connection.';
      }
      
      setError(errorMessage);
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
    if (value == null || isNaN(value)) return '0.0%';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const exportReport = async (format) => {
    try {
      const days = getDaysFromRange(dateRange);
      const response = await api.reports.export(selectedReport, format, days);
      
      if (response.data.download_url) {
        // In a real implementation, you'd redirect to the download URL
        alert(`Report export initiated. Export ID: ${response.data.export_id}`);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    }
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

  const renderCustomerAnalysis = () => {
    const data = reportData;
    
    return (
      <div className="space-y-6">
        {/* Customer Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Customers</h3>
            <div className="text-2xl font-bold text-gray-800">{data.totalCustomers || 0}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Active Customers</h3>
            <div className="text-2xl font-bold text-green-600">{data.activeCustomers || 0}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">New Customers</h3>
            <div className="text-2xl font-bold text-blue-600">{data.newCustomers || 0}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Churn Rate</h3>
            <div className="text-2xl font-bold text-red-600">{data.churnRate || 0}%</div>
          </div>
        </div>

        {/* Customer Segments */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Customer Segments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.segments?.map((segment, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">{segment.name}</h4>
                <p className="text-sm text-gray-600 mb-1">{segment.count} customers</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(segment.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderInventoryReport = () => {
    const data = reportData;
    
    return (
      <div className="space-y-6">
        {/* Inventory Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Items</h3>
            <div className="text-2xl font-bold text-gray-800">{data.totalItems || 0}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Stock Value</h3>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.totalStockValue || 0)}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Low Stock Items</h3>
            <div className="text-2xl font-bold text-orange-600">{data.lowStockCount || 0}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Out of Stock</h3>
            <div className="text-2xl font-bold text-red-600">{data.outOfStockCount || 0}</div>
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Top Items by Value</h3>
          <div className="space-y-4">
            {data.topItems?.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="text-purple-600" size={16} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                    <p className="text-sm text-gray-500">Code: {item.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{formatCurrency(item.total_value || 0)}</p>
                  <p className="text-sm text-gray-500">{item.stock_qty} units</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        {data.lowStockItems?.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <ArrowDown className="text-orange-500 mr-2" size={20} />
              Low Stock Alert
            </h3>
            <div className="space-y-3">
              {data.lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                    <p className="text-sm text-gray-500">Code: {item.code}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-orange-600 font-bold">{item.stock_qty} units</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPerformanceMetrics = () => {
    const data = reportData;
    
    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.kpis?.map((kpi, index) => (
            <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-2">{kpi.name}</h3>
              <div className="text-2xl font-bold text-gray-800 mb-2">
                {kpi.unit === 'currency' ? formatCurrency(kpi.value || 0) : 
                 kpi.unit === 'percentage' ? `${(kpi.value || 0).toFixed(1)}%` :
                 kpi.unit === 'ratio' ? (kpi.value || 0).toFixed(2) : (kpi.value || 0)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Target: {kpi.unit === 'currency' ? formatCurrency(kpi.target || 0) : 
                           kpi.unit === 'percentage' ? `${kpi.target || 0}%` :
                           kpi.unit === 'ratio' ? (kpi.target || 0).toFixed(2) : (kpi.target || 0)}
                </span>
                <span className={`text-sm font-medium ${(kpi.achievement || 0) >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                  {(kpi.achievement || 0).toFixed(0)}%
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${(kpi.achievement || 0) >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, kpi.achievement || 0)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Sales</h3>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.totalSales || 0)}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Active Customers</h3>
            <div className="text-2xl font-bold text-gray-800">{data.activeCustomers || 0}</div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Inventory Turnover</h3>
            <div className="text-2xl font-bold text-gray-800">{data.inventoryTurnover?.toFixed(2) || '0.00'}x</div>
          </div>
        </div>

        {/* Weekly Performance Chart */}
        {data.weeklyPerformance && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Weekly Performance Trend</h3>
            <div className="h-48 flex items-end justify-between space-x-4">
              {data.weeklyPerformance.map((week, index) => {
                const maxValue = Math.max(...data.weeklyPerformance.map(w => w.sales));
                const height = maxValue > 0 ? (week.sales / maxValue) * 150 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                    <div
                      className="bg-blue-500 rounded-t w-full hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ height: `${height}px` }}
                      title={`Sales: ${formatCurrency(week.sales)}, Orders: ${week.orders}`}
                    ></div>
                    <span className="text-xs text-gray-600 font-medium">{week.week}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <BarChart3 className="w-16 h-16 text-red-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Error Loading Statistics</h3>
          <p className="text-red-600 text-center mb-4 max-w-md">{error}</p>
          
          {/* Additional help for network issues */}
          {(error.includes('Network Error') || error.includes('offline') || !isOnline) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 max-w-md">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Troubleshooting Tips:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Verify the server is running</li>
                <li>• Try refreshing the page</li>
                <li>• Contact support if the issue persists</li>
              </ul>
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={loadReportData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    switch (selectedReport) {
      case 'sales_overview':
        return renderSalesOverview();
      case 'financial_summary':
        return renderFinancialSummary();
      case 'customer_analysis':
        return renderCustomerAnalysis();
      case 'inventory_report':
        return renderInventoryReport();
      case 'performance_metrics':
        return renderPerformanceMetrics();
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

            {/* Network Status Indicator */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
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
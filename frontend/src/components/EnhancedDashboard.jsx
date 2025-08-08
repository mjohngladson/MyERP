import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Package, FileText, 
  ArrowUpRight, ArrowDownRight, MoreVertical, Bell, AlertTriangle, 
  CheckCircle, Info, RefreshCw, Calendar, Target, Zap, Award
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const EnhancedDashboard = ({ onViewAllTransactions }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [dateRange, setDateRange] = useState('7d');
  
  // API hooks for dashboard data
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = 
    useApi(() => api.dashboard.getStats());
  
  const { data: transactions, loading: transactionsLoading, refetch: refetchTransactions } = 
    useApi(() => api.dashboard.getTransactions(6));
  
  const { data: notifications, loading: notificationsLoading } = 
    useApi(() => currentUser ? api.dashboard.getNotifications(currentUser.id, 6) : Promise.resolve({ data: [] }), [currentUser]);
  
  const { data: reports, loading: reportsLoading } = 
    useApi(() => api.dashboard.getReports());

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await api.auth.getCurrentUser();
        setCurrentUser(response.data);
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    };
    getCurrentUser();
  }, []);

  // Enhanced KPIs with trends and comparisons
  const enhancedKPIs = [
    {
      title: 'Revenue',
      value: stats?.sales_orders || 0,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'blue',
      target: 500000,
      description: 'vs last month'
    },
    {
      title: 'Active Deals',
      value: 24,
      change: '+8.2%',
      trend: 'up',
      icon: Target,
      color: 'green',
      target: 30,
      description: 'in pipeline'
    },
    {
      title: 'Customer Satisfaction',
      value: 4.8,
      change: '+0.2',
      trend: 'up',
      icon: Award,
      color: 'yellow',
      target: 5.0,
      description: 'average rating',
      format: 'rating'
    },
    {
      title: 'Task Completion',
      value: 85,
      change: '+5%',
      trend: 'up',
      icon: CheckCircle,
      color: 'purple',
      target: 95,
      description: 'completion rate',
      format: 'percentage'
    }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatValue = (value, format) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return `${value}%`;
      case 'rating':
        return `${value}/5.0`;
      default:
        return typeof value === 'number' ? value.toLocaleString() : value;
    }
  };

  const getProgressPercentage = (value, target, format) => {
    if (format === 'percentage') return value;
    if (format === 'rating') return (value / 5) * 100;
    return Math.min((value / target) * 100, 100);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'error': return <AlertTriangle className="text-red-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  const refreshData = async () => {
    await Promise.all([refetchStats(), refetchTransactions()]);
  };

  const quickActions = [
    { title: 'New Sales Order', color: 'bg-blue-500', icon: FileText },
    { title: 'Add Customer', color: 'bg-green-500', icon: Users },
    { title: 'Stock Entry', color: 'bg-purple-500', icon: Package },
    { title: 'Create Invoice', color: 'bg-orange-500', icon: DollarSign }
  ];

  if (statsLoading && !stats) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Enhanced Welcome Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {currentUser?.name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-gray-600">Here's what's happening with your business today.</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Date Range Selector */}
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1d">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={refreshData}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {enhancedKPIs.map((kpi, index) => {
          const IconComponent = kpi.icon;
          const progress = getProgressPercentage(kpi.value, kpi.target, kpi.format);
          
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${kpi.color}-100`}>
                  <IconComponent className={`text-${kpi.color}-600`} size={24} />
                </div>
                <div className={`flex items-center text-sm font-medium ${
                  kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.trend === 'up' ? (
                    <ArrowUpRight size={16} className="mr-1" />
                  ) : (
                    <ArrowDownRight size={16} className="mr-1" />
                  )}
                  {kpi.change}
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-600 mb-1">{kpi.title}</h3>
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {formatValue(kpi.value, kpi.format)}
                </div>
                <p className="text-xs text-gray-500">{kpi.description}</p>
              </div>
              
              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`bg-${kpi.color}-500 h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Target: {formatValue(kpi.target, kpi.format)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <button
                key={index}
                className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 text-left group"
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="text-white" size={20} />
                </div>
                <h3 className="font-medium text-gray-800">{action.title}</h3>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Recent Transactions</h2>
              <button 
                onClick={onViewAllTransactions}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {transactionsLoading ? (
              <div className="p-6 text-center text-gray-500">Loading transactions...</div>
            ) : transactions && transactions.length > 0 ? (
              transactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">
                            {transaction.type.replace('_', ' ').toUpperCase()}
                          </h3>
                          <p className="text-sm text-gray-600">{transaction.reference_number}</p>
                          {transaction.party_name && (
                            <p className="text-xs text-gray-500">{transaction.party_name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{formatCurrency(transaction.amount)}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                      <div className="text-xs text-green-600 font-medium">Completed</div>
                    </div>
                    <button className="ml-4 p-1 hover:bg-gray-100 rounded-md">
                      <MoreVertical size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">No transactions found</div>
            )}
          </div>
        </div>

        {/* Enhanced Notifications Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Activity Feed</h2>
              <Bell size={20} className="text-gray-400" />
            </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {notificationsLoading ? (
              <div className="p-4 text-center text-gray-500">Loading notifications...</div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{notification.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            )}
          </div>
          <div className="p-4 border-t border-gray-100">
            <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All Activity
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Performance Analytics</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Revenue</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Expenses</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Profit</span>
            </div>
          </div>
        </div>
        
        {reportsLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Loading analytics...
          </div>
        ) : reports && reports.length > 0 ? (
          <div className="grid grid-cols-6 gap-4 h-64">
            {reports.map((data, index) => (
              <div key={index} className="flex flex-col items-center justify-end space-y-2">
                <div className="flex flex-col items-center space-y-1 w-full relative">
                  {/* Profit bar */}
                  <div 
                    className="w-6 bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer" 
                    style={{ height: `${Math.max((data.profit / 30000) * 120, 8)}px` }}
                    title={`Profit: ${formatCurrency(data.profit)}`}
                  ></div>
                  {/* Expenses bar */}
                  <div 
                    className="w-6 bg-red-500 hover:bg-red-600 transition-colors cursor-pointer" 
                    style={{ height: `${Math.max((data.purchases / 1000), 8)}px` }}
                    title={`Expenses: ${formatCurrency(data.purchases)}`}
                  ></div>
                  {/* Revenue bar */}
                  <div 
                    className="w-6 bg-blue-500 rounded-b hover:bg-blue-600 transition-colors cursor-pointer" 
                    style={{ height: `${Math.max((data.sales / 1000), 8)}px` }}
                    title={`Revenue: ${formatCurrency(data.sales)}`}
                  ></div>
                </div>
                <span className="text-xs text-gray-600 font-medium">{data.month}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No analytics data available
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDashboard;
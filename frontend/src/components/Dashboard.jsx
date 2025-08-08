import React, { useState, useEffect } from 'react';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  BarChart3,
  Plus
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const Dashboard = ({ onViewAllTransactions, onAdvancedReporting }) => {
  const [currentUser, setCurrentUser] = useState(null);
  
  // API hooks for dashboard data
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = 
    useApi(() => api.dashboard.getStats());
  
  const { data: transactions, loading: transactionsLoading, refetch: refetchTransactions } = 
    useApi(() => api.dashboard.getTransactions(4));
  
  const { data: notifications, loading: notificationsLoading } = 
    useApi(() => currentUser ? api.dashboard.getNotifications(currentUser.id, 4) : Promise.resolve({ data: [] }), [currentUser]);
  
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

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'error': return <AlertTriangle className="text-red-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
    await Promise.all([
      refetchStats(),
      refetchTransactions()
    ]);
  };

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
      {/* Welcome section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your business today.</p>
        </div>
        <button
          onClick={refreshData}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsError ? (
          <div className="col-span-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Error loading statistics: {statsError}</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Sales Orders</h3>
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="text-green-600" size={20} />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats ? formatCurrency(stats.sales_orders) : '₹ 0'}
                  </p>
                  <div className="flex items-center mt-1">
                    <ArrowUpRight className="text-green-600 mr-1" size={16} />
                    <span className="text-sm font-medium text-green-600">+12%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Purchase Orders</h3>
                <div className="p-2 rounded-lg bg-red-100">
                  <TrendingDown className="text-red-600" size={20} />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats ? formatCurrency(stats.purchase_orders) : '₹ 0'}
                  </p>
                  <div className="flex items-center mt-1">
                    <ArrowDownRight className="text-red-600 mr-1" size={16} />
                    <span className="text-sm font-medium text-red-600">-5%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Outstanding Amount</h3>
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="text-green-600" size={20} />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats ? formatCurrency(stats.outstanding_amount) : '₹ 0'}
                  </p>
                  <div className="flex items-center mt-1">
                    <ArrowUpRight className="text-green-600 mr-1" size={16} />
                    <span className="text-sm font-medium text-green-600">+8%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Stock Value</h3>
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="text-green-600" size={20} />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats ? formatCurrency(stats.stock_value) : '₹ 0'}
                  </p>
                  <div className="flex items-center mt-1">
                    <ArrowUpRight className="text-green-600 mr-1" size={16} />
                    <span className="text-sm font-medium text-green-600">+15%</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => window.location.hash = '#advanced-reporting'}
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
            >
              <BarChart3 className="text-blue-600 group-hover:text-blue-700 mb-2" size={24} />
              <span className="text-sm font-medium text-blue-800 group-hover:text-blue-900">Advanced Reports</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group">
              <Plus className="text-green-600 group-hover:text-green-700 mb-2" size={24} />
              <span className="text-sm font-medium text-green-800 group-hover:text-green-900">Create Order</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group">
              <Users className="text-purple-600 group-hover:text-purple-700 mb-2" size={24} />
              <span className="text-sm font-medium text-purple-800 group-hover:text-purple-900">Add Customer</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors group">
              <Package className="text-orange-600 group-hover:text-orange-700 mb-2" size={24} />
              <span className="text-sm font-medium text-orange-800 group-hover:text-orange-900">Stock Entry</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
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

        {/* Notifications panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
              <Bell size={20} className="text-gray-400" />
            </div>
          </div>
          <div className="divide-y divide-gray-100">
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
              View All Notifications
            </button>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Monthly Performance</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Sales</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Purchases</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Profit</span>
            </div>
          </div>
        </div>
        
        {/* Simple bar chart representation */}
        {reportsLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Loading chart data...
          </div>
        ) : reports && reports.length > 0 ? (
          <div className="grid grid-cols-6 gap-4 h-64">
            {reports.map((data, index) => (
              <div key={index} className="flex flex-col items-center justify-end space-y-2">
                <div className="flex flex-col items-center space-y-1 w-full">
                  <div 
                    className="w-4 bg-green-500 rounded-t" 
                    style={{ height: `${Math.max((data.profit / 30000) * 100, 5)}px` }}
                  ></div>
                  <div 
                    className="w-4 bg-red-500" 
                    style={{ height: `${Math.max((data.purchases / 1000), 5)}px` }}
                  ></div>
                  <div 
                    className="w-4 bg-blue-500 rounded-b" 
                    style={{ height: `${Math.max((data.sales / 1000), 5)}px` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600 font-medium">{data.month}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No chart data available
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
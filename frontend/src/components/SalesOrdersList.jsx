import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  DollarSign,
  ChevronLeft
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const SalesOrdersList = ({ onBack, onViewOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const { data: orders, loading, error, refetch } = useApi(() => api.sales.getOrders(50));
  const { data: customers } = useApi(() => api.sales.getCustomers());

  const filteredOrders = orders ? orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
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
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <h1 className="text-3xl font-bold text-gray-800">Sales Orders</h1>
        </div>
        
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          
          {/* Create button */}
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Sales Order</span>
          </button>
        </div>
      </div>

      {/* Orders list */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Error loading sales orders: {error}</p>
          <button 
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Sales Orders Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterStatus !== 'all' 
              ? 'No orders match your search criteria.' 
              : 'Create your first sales order to get started.'
            }
          </p>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto">
            <Plus size={20} />
            <span>Create Sales Order</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
              <div className="col-span-3">Order Number</div>
              <div className="col-span-3">Customer</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          
          {/* Table body */}
          <div className="divide-y divide-gray-100">
            {filteredOrders.map((order) => (
              <div key={order.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <div className="font-medium text-gray-800">{order.order_number}</div>
                    <div className="text-sm text-gray-500">ID: {order.id.slice(0, 8)}...</div>
                  </div>
                  
                  <div className="col-span-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="text-blue-600" size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{order.customer_name}</div>
                        <div className="text-sm text-gray-500">Customer</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="font-semibold text-gray-800">{formatCurrency(order.total_amount)}</div>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Calendar size={16} />
                      <span className="text-sm">{formatDate(order.order_date)}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="col-span-1">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewOrder && onViewOrder(order)}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                        title="View Order"
                      >
                        <Eye size={16} className="text-gray-600" />
                      </button>
                      <button
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                        title="More Options"
                      >
                        <MoreVertical size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Summary */}
      {filteredOrders.length > 0 && (
        <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600">Total Orders</div>
              <div className="text-2xl font-bold text-gray-800">{filteredOrders.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Value</div>
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.total_amount, 0))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Average Order Value</div>
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.total_amount, 0) / filteredOrders.length)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrdersList;
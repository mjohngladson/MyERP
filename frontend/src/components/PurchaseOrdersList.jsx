import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Eye, Edit, Calendar, 
  ChevronLeft, ShoppingCart, Building, Truck
} from 'lucide-react';

const PurchaseOrdersList = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock purchase orders data
  const purchaseOrders = [
    {
      id: '1',
      order_number: 'PO-2024-00001',
      supplier_name: 'XYZ Suppliers',
      total_amount: 15000,
      order_date: '2024-01-14',
      expected_date: '2024-01-25',
      status: 'submitted',
      items_count: 3
    },
    {
      id: '2',
      order_number: 'PO-2024-00002', 
      supplier_name: 'ABC Materials',
      total_amount: 25000,
      order_date: '2024-01-18',
      expected_date: '2024-01-28',
      status: 'received',
      items_count: 5
    },
    {
      id: '3',
      order_number: 'PO-2024-00003',
      supplier_name: 'Global Supplies',
      total_amount: 18500,
      order_date: '2024-01-22',
      expected_date: '2024-02-05',
      status: 'draft',
      items_count: 2
    }
  ];

  const filteredOrders = purchaseOrders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft': return <Edit className="text-gray-500" size={16} />;
      case 'submitted': return <ShoppingCart className="text-blue-500" size={16} />;
      case 'received': return <Truck className="text-green-500" size={16} />;
      case 'cancelled': return <MoreVertical className="text-red-500" size={16} />;
      default: return <ShoppingCart className="text-gray-500" size={16} />;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Purchase Orders</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search purchase orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Orders</div>
          <div className="text-2xl font-bold text-gray-800">{filteredOrders.length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Value</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.total_amount, 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Pending Orders</div>
          <div className="text-2xl font-bold text-orange-600">
            {filteredOrders.filter(order => order.status === 'submitted').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Received Orders</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredOrders.filter(order => order.status === 'received').length}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="text-purple-600" size={24} />
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{order.order_number}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center space-x-1">
                      <Building size={14} />
                      <span>{order.supplier_name}</span>
                    </div>
                    <span>•</span>
                    <span>{order.items_count} items</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {formatCurrency(order.total_amount)}
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(order.status)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar size={14} />
                    <span>Order Date: {formatDate(order.order_date)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Truck size={14} />
                    <span>Expected: {formatDate(order.expected_date)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                    <Eye size={16} className="text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                    <Edit size={16} className="text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                    <MoreVertical size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PurchaseOrdersList;
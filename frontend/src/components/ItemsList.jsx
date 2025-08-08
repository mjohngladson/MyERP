import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Eye, Edit, Package, 
  ChevronLeft, AlertCircle, CheckCircle, Tag
} from 'lucide-react';

const ItemsList = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Mock items data
  const items = [
    {
      id: '1',
      item_code: 'PROD-A-001',
      item_name: 'Product A',
      description: 'High quality product A for manufacturing',
      unit_price: 100,
      stock_qty: 50,
      reorder_level: 10,
      category: 'Raw Material',
      unit: 'Nos',
      status: 'active'
    },
    {
      id: '2',
      item_code: 'PROD-B-001', 
      item_name: 'Product B',
      description: 'Premium product B for retail',
      unit_price: 200,
      stock_qty: 5,
      reorder_level: 15,
      category: 'Finished Goods',
      unit: 'Nos',
      status: 'low_stock'
    },
    {
      id: '3',
      item_code: 'SRV-001',
      item_name: 'Consulting Service',
      description: 'Professional consulting service',
      unit_price: 1500,
      stock_qty: 0,
      reorder_level: 0,
      category: 'Service',
      unit: 'Hour',
      status: 'active'
    }
  ];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.item_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStockStatus = (item) => {
    if (item.category === 'Service') return 'service';
    if (item.stock_qty <= item.reorder_level) return 'low';
    if (item.stock_qty <= item.reorder_level * 2) return 'medium';
    return 'good';
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'low': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'good': return 'bg-green-100 text-green-800';
      case 'service': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusText = (status) => {
    switch (status) {
      case 'low': return 'Low Stock';
      case 'medium': return 'Medium Stock';
      case 'good': return 'Good Stock';
      case 'service': return 'Service Item';
      default: return 'Unknown';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Items</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Raw Material">Raw Material</option>
                <option value="Finished Goods">Finished Goods</option>
                <option value="Service">Service</option>
              </select>
            </div>
          </div>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Items</div>
          <div className="text-2xl font-bold text-gray-800">{filteredItems.length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Low Stock Items</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredItems.filter(item => getStockStatus(item) === 'low').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Stock Value</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(filteredItems.reduce((sum, item) => sum + (item.unit_price * item.stock_qty), 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Service Items</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredItems.filter(item => item.category === 'Service').length}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const stockStatus = getStockStatus(item);
          return (
            <div key={item.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{item.item_name}</h3>
                    <p className="text-sm text-gray-500">{item.item_code}</p>
                  </div>
                </div>
                
                <div className="relative">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{item.description}</p>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Unit Price</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(item.unit_price)}</span>
                </div>
                
                {item.category !== 'Service' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Stock Qty</span>
                    <span className="font-semibold text-gray-800">{item.stock_qty} {item.unit}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Category</span>
                  <span className="text-sm font-medium text-gray-800">{item.category}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(stockStatus)}`}>
                    {getStockStatusText(stockStatus)}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Item Code: {item.item_code}</span>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                      <Edit size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ItemsList;
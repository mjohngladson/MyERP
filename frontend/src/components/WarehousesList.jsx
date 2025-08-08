import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Eye, Edit, MapPin, 
  ChevronLeft, Warehouse, Package, TrendingUp, AlertTriangle
} from 'lucide-react';

const WarehousesList = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock warehouses data
  const warehouses = [
    {
      id: '1',
      warehouse_name: 'Main Warehouse',
      warehouse_code: 'WH-001',
      address: '123 Industrial Area, Mumbai, Maharashtra',
      manager: 'John Doe',
      phone: '+91 9876543210',
      capacity: 10000,
      occupied: 7500,
      total_items: 156,
      low_stock_items: 8,
      status: 'Active'
    },
    {
      id: '2',
      warehouse_name: 'Production Warehouse',
      warehouse_code: 'WH-002', 
      address: '456 Manufacturing Zone, Pune, Maharashtra',
      manager: 'Jane Smith',
      phone: '+91 9876543211',
      capacity: 5000,
      occupied: 3200,
      total_items: 89,
      low_stock_items: 3,
      status: 'Active'
    },
    {
      id: '3',
      warehouse_name: 'Store Warehouse',
      warehouse_code: 'WH-003',
      address: '789 Retail District, Delhi, Delhi',
      manager: 'Mike Johnson',
      phone: '+91 9876543212',
      capacity: 8000,
      occupied: 6800,
      total_items: 234,
      low_stock_items: 15,
      status: 'Active'
    },
    {
      id: '4',
      warehouse_name: 'Secondary Storage',
      warehouse_code: 'WH-004',
      address: '321 Storage Complex, Bangalore, Karnataka',
      manager: 'Sarah Wilson',
      phone: '+91 9876543213',
      capacity: 3000,
      occupied: 450,
      total_items: 45,
      low_stock_items: 2,
      status: 'Inactive'
    }
  ];

  const filteredWarehouses = warehouses.filter(warehouse => {
    return warehouse.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           warehouse.warehouse_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
           warehouse.manager.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getOccupancyPercentage = (occupied, capacity) => {
    return Math.round((occupied / capacity) * 100);
  };

  const getOccupancyColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getOccupancyBgColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Under Maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Warehouses</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search warehouses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Warehouse</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Warehouses</div>
          <div className="text-2xl font-bold text-gray-800">{filteredWarehouses.length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Capacity</div>
          <div className="text-2xl font-bold text-gray-800">
            {filteredWarehouses.reduce((sum, wh) => sum + wh.capacity, 0).toLocaleString()} sq ft
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Active Warehouses</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredWarehouses.filter(wh => wh.status === 'Active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Low Stock Alerts</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredWarehouses.reduce((sum, wh) => sum + wh.low_stock_items, 0)}
          </div>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredWarehouses.map((warehouse) => {
          const occupancyPercentage = getOccupancyPercentage(warehouse.occupied, warehouse.capacity);
          
          return (
            <div key={warehouse.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              {/* Warehouse header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Warehouse className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{warehouse.warehouse_name}</h3>
                    <p className="text-sm text-gray-500">{warehouse.warehouse_code}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(warehouse.status)}`}>
                    {warehouse.status}
                  </span>
                  <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* Location and manager */}
              <div className="space-y-2 mb-4">
                <div className="flex items-start space-x-2 text-sm text-gray-600">
                  <MapPin size={16} className="mt-0.5" />
                  <span>{warehouse.address}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Manager: {warehouse.manager} • {warehouse.phone}
                </div>
              </div>
              
              {/* Occupancy bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Space Utilization</span>
                  <span className={`text-sm font-medium ${getOccupancyColor(occupancyPercentage)}`}>
                    {occupancyPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getOccupancyBgColor(occupancyPercentage)}`}
                    style={{ width: `${occupancyPercentage}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>{warehouse.occupied.toLocaleString()} sq ft used</span>
                  <span>{warehouse.capacity.toLocaleString()} sq ft total</span>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Package className="text-blue-600" size={16} />
                  </div>
                  <div className="text-lg font-bold text-gray-800">{warehouse.total_items}</div>
                  <div className="text-xs text-gray-600">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <TrendingUp className="text-green-600" size={16} />
                  </div>
                  <div className="text-lg font-bold text-gray-800">{occupancyPercentage}%</div>
                  <div className="text-xs text-gray-600">Occupied</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <AlertTriangle className="text-red-600" size={16} />
                  </div>
                  <div className="text-lg font-bold text-red-600">{warehouse.low_stock_items}</div>
                  <div className="text-xs text-gray-600">Low Stock</div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Code: {warehouse.warehouse_code}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" title="View Details">
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" title="Edit Warehouse">
                      <Edit size={16} className="text-gray-600" />
                    </button>
                    <button className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm">
                      <Package size={14} />
                      <span>Stock</span>
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

export default WarehousesList;
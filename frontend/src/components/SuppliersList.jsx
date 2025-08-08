import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Eye, Edit, Mail, 
  Phone, MapPin, ChevronLeft, Building, Truck
} from 'lucide-react';

const SuppliersList = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock suppliers data
  const suppliers = [
    {
      id: '1',
      name: 'XYZ Suppliers',
      email: 'contact@xyzsuppliers.com',
      phone: '+91 9876543210',
      address: '123 Industrial Area, Mumbai, Maharashtra',
      category: 'Raw Materials',
      created_at: '2024-01-10',
      total_orders: 5,
      total_amount: 125000,
      last_order_date: '2024-01-22'
    },
    {
      id: '2',
      name: 'ABC Materials',
      email: 'sales@abcmaterials.com', 
      phone: '+91 9876543211',
      address: '456 Supply Street, Delhi, Delhi',
      category: 'Equipment',
      created_at: '2024-01-15',
      total_orders: 3,
      total_amount: 85000,
      last_order_date: '2024-01-20'
    },
    {
      id: '3',
      name: 'Global Supplies',
      email: 'info@globalsupplies.com',
      phone: '+91 9876543212',
      address: '789 Trade Center, Bangalore, Karnataka', 
      category: 'Services',
      created_at: '2024-01-05',
      total_orders: 8,
      total_amount: 210000,
      last_order_date: '2024-01-25'
    }
  ];

  const filteredSuppliers = suppliers.filter(supplier => {
    return supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           supplier.category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Suppliers</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Supplier</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Suppliers</div>
          <div className="text-2xl font-bold text-gray-800">{filteredSuppliers.length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Purchase Value</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(filteredSuppliers.reduce((sum, supplier) => sum + supplier.total_amount, 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Orders</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredSuppliers.reduce((sum, supplier) => sum + supplier.total_orders, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Active Suppliers</div>
          <div className="text-2xl font-bold text-green-600">{filteredSuppliers.length}</div>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            {/* Supplier header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{supplier.name}</h3>
                  <p className="text-sm text-gray-500">{supplier.category}</p>
                </div>
              </div>
              
              <div className="relative">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Contact details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-3 text-gray-600">
                <Mail size={16} />
                <span className="text-sm">{supplier.email}</span>
              </div>
              
              <div className="flex items-center space-x-3 text-gray-600">
                <Phone size={16} />
                <span className="text-sm">{supplier.phone}</span>
              </div>
              
              <div className="flex items-start space-x-3 text-gray-600">
                <MapPin size={16} className="mt-0.5" />
                <span className="text-sm">{supplier.address}</span>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-800">{supplier.total_orders}</div>
                <div className="text-xs text-gray-600">Orders</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-800">{formatCurrency(supplier.total_amount)}</div>
                <div className="text-xs text-gray-600">Total Value</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-800">
                  {new Date(supplier.last_order_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs text-gray-600">Last Order</div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Added {new Date(supplier.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" title="View Details">
                    <Eye size={16} className="text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" title="Edit Supplier">
                    <Edit size={16} className="text-gray-600" />
                  </button>
                  <button className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm">
                    <Truck size={14} />
                    <span>New PO</span>
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

export default SuppliersList;
import React, { useState } from 'react';
import { 
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  Building
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const CustomersList = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: customers, loading, error, refetch } = useApi(() => api.sales.getCustomers());

  const filteredCustomers = customers ? customers.filter(customer => {
    return customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           customer.email.toLowerCase().includes(searchTerm.toLowerCase());
  }) : [];

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
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
          <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
        </div>
        
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Customers grid */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Error loading customers: {error}</p>
          <button 
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Customers Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'No customers match your search criteria.' 
              : 'Add your first customer to get started.'
            }
          </p>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto">
            <Plus size={20} />
            <span>Add Customer</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              {/* Customer header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{customer.name}</h3>
                    <p className="text-sm text-gray-500">Customer ID: {customer.id.slice(0, 8)}...</p>
                  </div>
                </div>
                
                <div className="relative">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* Customer details */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-gray-600">
                  <Mail size={16} />
                  <span className="text-sm">{customer.email}</span>
                </div>
                
                {customer.phone && (
                  <div className="flex items-center space-x-3 text-gray-600">
                    <Phone size={16} />
                    <span className="text-sm">{customer.phone}</span>
                  </div>
                )}
                
                {customer.address && (
                  <div className="flex items-start space-x-3 text-gray-600">
                    <MapPin size={16} className="mt-0.5" />
                    <span className="text-sm">{customer.address}</span>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Created {new Date(customer.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" title="View Details">
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" title="Edit Customer">
                      <Edit size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Summary */}
      {filteredCustomers.length > 0 && (
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-600">Total Customers</div>
              <div className="text-3xl font-bold text-gray-800">{filteredCustomers.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Recent Customers</div>
              <div className="text-3xl font-bold text-gray-800">
                {filteredCustomers.filter(c => {
                  const createdAt = new Date(c.created_at);
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  return createdAt > thirtyDaysAgo;
                }).length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersList;
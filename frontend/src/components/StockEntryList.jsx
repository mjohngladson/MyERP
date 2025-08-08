import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Eye, Edit, Calendar, 
  ChevronLeft, Package, ArrowUp, ArrowDown, RotateCcw, Truck
} from 'lucide-react';

const StockEntryList = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPurpose, setFilterPurpose] = useState('all');

  // Mock stock entries data
  const stockEntries = [
    {
      id: '1',
      entry_number: 'STE-2024-00001',
      purpose: 'Material Receipt',
      date: '2024-01-20',
      warehouse: 'Main Warehouse',
      total_value: 25000,
      items_count: 3,
      reference: 'PO-2024-00001',
      status: 'Submitted'
    },
    {
      id: '2',
      entry_number: 'STE-2024-00002',
      purpose: 'Material Issue',
      date: '2024-01-22',
      warehouse: 'Production Warehouse',
      total_value: 15000,
      items_count: 2,
      reference: 'WO-2024-00001',
      status: 'Submitted'
    },
    {
      id: '3',
      entry_number: 'STE-2024-00003',
      purpose: 'Stock Transfer',
      date: '2024-01-25',
      warehouse: 'Store Warehouse',
      total_value: 8500,
      items_count: 4,
      reference: 'ST-2024-00001',
      status: 'Draft'
    },
    {
      id: '4',
      entry_number: 'STE-2024-00004',
      purpose: 'Stock Reconciliation',
      date: '2024-01-28',
      warehouse: 'Main Warehouse',
      total_value: 12000,
      items_count: 6,
      reference: 'SR-2024-00001',
      status: 'Submitted'
    }
  ];

  const filteredEntries = stockEntries.filter(entry => {
    const matchesSearch = entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPurpose = filterPurpose === 'all' || entry.purpose === filterPurpose;
    return matchesSearch && matchesPurpose;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPurposeIcon = (purpose) => {
    switch (purpose) {
      case 'Material Receipt': return <ArrowDown className="text-green-600" size={20} />;
      case 'Material Issue': return <ArrowUp className="text-red-600" size={20} />;
      case 'Stock Transfer': return <Truck className="text-blue-600" size={20} />;
      case 'Stock Reconciliation': return <RotateCcw className="text-purple-600" size={20} />;
      default: return <Package className="text-gray-600" size={20} />;
    }
  };

  const getPurposeColor = (purpose) => {
    switch (purpose) {
      case 'Material Receipt': return 'bg-green-50 border-green-200';
      case 'Material Issue': return 'bg-red-50 border-red-200';
      case 'Stock Transfer': return 'bg-blue-50 border-blue-200';
      case 'Stock Reconciliation': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Submitted': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
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
          <h1 className="text-3xl font-bold text-gray-800">Stock Entry</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search stock entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="relative">
              <select
                value={filterPurpose}
                onChange={(e) => setFilterPurpose(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Purposes</option>
                <option value="Material Receipt">Material Receipt</option>
                <option value="Material Issue">Material Issue</option>
                <option value="Stock Transfer">Stock Transfer</option>
                <option value="Stock Reconciliation">Stock Reconciliation</option>
              </select>
            </div>
          </div>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Stock Entry</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Entries</div>
          <div className="text-2xl font-bold text-gray-800">{filteredEntries.length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Value</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(filteredEntries.reduce((sum, entry) => sum + entry.total_value, 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Receipts</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredEntries.filter(entry => entry.purpose === 'Material Receipt').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Issues</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredEntries.filter(entry => entry.purpose === 'Material Issue').length}
          </div>
        </div>
      </div>

      {/* Stock Entries List */}
      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <div key={entry.id} className={`bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow ${getPurposeColor(entry.purpose)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border-2">
                  {getPurposeIcon(entry.purpose)}
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{entry.entry_number}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span className="font-medium">{entry.purpose}</span>
                    <span>•</span>
                    <span>{entry.warehouse}</span>
                    <span>•</span>
                    <span>{entry.items_count} items</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {formatCurrency(entry.total_value)}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(entry.status)}`}>
                  {entry.status}
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar size={14} />
                    <span>Date: {new Date(entry.date).toLocaleDateString()}</span>
                  </div>
                  <span>Reference: {entry.reference}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded-md transition-colors">
                    <Eye size={16} className="text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded-md transition-colors">
                    <Edit size={16} className="text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded-md transition-colors">
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

export default StockEntryList;
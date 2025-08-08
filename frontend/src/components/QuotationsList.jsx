import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Eye, Edit, Calendar, User, DollarSign, 
  ChevronLeft, FileText, Clock, CheckCircle, XCircle
} from 'lucide-react';

const QuotationsList = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock quotations data
  const quotations = [
    {
      id: '1',
      quotation_number: 'QTN-2024-00001',
      customer_name: 'ABC Corp',
      total_amount: 50000,
      quotation_date: '2024-01-15',
      valid_till: '2024-02-15',
      status: 'sent',
      items_count: 3
    },
    {
      id: '2', 
      quotation_number: 'QTN-2024-00002',
      customer_name: 'XYZ Ltd',
      total_amount: 75000,
      quotation_date: '2024-01-20',
      valid_till: '2024-02-20',
      status: 'accepted',
      items_count: 5
    }
  ];

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch = quotation.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quotation.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || quotation.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft': return <Clock className="text-gray-500" size={16} />;
      case 'sent': return <FileText className="text-blue-500" size={16} />;
      case 'accepted': return <CheckCircle className="text-green-500" size={16} />;
      case 'rejected': return <XCircle className="text-red-500" size={16} />;
      default: return <FileText className="text-gray-500" size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
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
          <h1 className="text-3xl font-bold text-gray-800">Quotations</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search quotations..."
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
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Quotations List */}
      <div className="space-y-4">
        {filteredQuotations.map((quotation) => (
          <div key={quotation.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-blue-600" size={24} />
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{quotation.quotation_number}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span>{quotation.customer_name}</span>
                    <span>•</span>
                    <span>{quotation.items_count} items</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {formatCurrency(quotation.total_amount)}
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(quotation.status)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                    {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Date: {new Date(quotation.quotation_date).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Valid till: {new Date(quotation.valid_till).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                    <Eye size={16} className="text-gray-600" />
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

export default QuotationsList;
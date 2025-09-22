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
  ChevronLeft,
  FileText
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const SalesInvoicesList = ({ onBack, onViewInvoice }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Fetch sales invoices from the new endpoint
  const { data: invoices, loading, error, refetch } = useApi(() => 
    fetch(`${import.meta.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL}/api/invoices/`)
      .then(res => res.json())
      .catch(err => {
        console.error('Error fetching invoices:', err);
        return [];
      })
  );

  const filteredInvoices = invoices ? invoices.filter(invoice => {
    const matchesSearch = (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (invoice.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  }) : [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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
      case 'paid': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Invoices</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Invoices</h1>
        </div>
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">Failed to load invoices</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Invoices</h1>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            {filteredInvoices.length} invoices
          </span>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <select
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sales Invoices Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first sales invoice.'
            }
          </p>
          {(!searchTerm && filterStatus === 'all') && (
            <button className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">Invoice Number</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">PoS Info</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id || invoice.invoice_number} className="px-6 py-4 hover:bg-gray-50">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-2">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {invoice.invoice_number || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{invoice.customer_name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {formatDate(invoice.invoice_date || invoice.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status || 'draft'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    {invoice.pos_metadata && (
                      <div className="text-xs text-gray-500">
                        <div>PoS: {invoice.pos_metadata.pos_transaction_id || 'N/A'}</div>
                        <div>Store: {invoice.pos_metadata.store_location || 'N/A'}</div>
                      </div>
                    )}
                  </div>
                  <div className="col-span-1">
                    <div className="flex items-center space-x-2">
                      <button 
                        className="p-1 text-gray-400 hover:text-gray-600"
                        onClick={() => onViewInvoice && onViewInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInvoicesList;
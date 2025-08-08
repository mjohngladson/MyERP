import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Eye, Edit, Mail, 
  Phone, MapPin, ChevronLeft, UserPlus, Target, Star, Clock
} from 'lucide-react';

const LeadsList = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock leads data
  const leads = [
    {
      id: '1',
      lead_name: 'Tech Solutions Inc',
      contact_person: 'Robert Brown',
      email: 'robert@techsolutions.com',
      phone: '+91 9876543210',
      source: 'Website',
      status: 'Open',
      expected_value: 150000,
      lead_date: '2024-01-20',
      next_contact: '2024-01-25',
      rating: 'Hot'
    },
    {
      id: '2',
      lead_name: 'Digital Marketing Co',
      contact_person: 'Sarah Davis',
      email: 'sarah@digitalmarketing.com',
      phone: '+91 9876543211',
      source: 'Referral',
      status: 'Qualified',
      expected_value: 85000,
      lead_date: '2024-01-18',
      next_contact: '2024-01-22',
      rating: 'Warm'
    },
    {
      id: '3',
      lead_name: 'Innovation Labs',
      contact_person: 'Mark Wilson',
      email: 'mark@innovationlabs.com',
      phone: '+91 9876543212',
      source: 'Social Media',
      status: 'Converted',
      expected_value: 250000,
      lead_date: '2024-01-15',
      next_contact: null,
      rating: 'Hot'
    }
  ];

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'Qualified': return 'bg-yellow-100 text-yellow-800';
      case 'Converted': return 'bg-green-100 text-green-800';
      case 'Lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Hot': return 'text-red-600';
      case 'Warm': return 'text-yellow-600';
      case 'Cold': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getRatingIcon = (rating) => {
    const color = getRatingColor(rating);
    return <Star className={color} size={16} fill="currentColor" />;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Leads</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search leads..."
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
                <option value="Open">Open</option>
                <option value="Qualified">Qualified</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Leads</div>
          <div className="text-2xl font-bold text-gray-800">{filteredLeads.length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Expected Value</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(filteredLeads.reduce((sum, lead) => sum + lead.expected_value, 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Hot Leads</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredLeads.filter(lead => lead.rating === 'Hot').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Converted</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredLeads.filter(lead => lead.status === 'Converted').length}
          </div>
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Target className="text-orange-600" size={24} />
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-800 text-lg">{lead.lead_name}</h3>
                    {getRatingIcon(lead.rating)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <UserPlus size={14} />
                      <span>{lead.contact_person}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail size={14} />
                      <span>{lead.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone size={14} />
                      <span>{lead.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {formatCurrency(lead.expected_value)}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <span>Source: {lead.source}</span>
                  <span>•</span>
                  <span>Lead Date: {new Date(lead.lead_date).toLocaleDateString()}</span>
                  {lead.next_contact && (
                    <>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>Next: {new Date(lead.next_contact).toLocaleDateString()}</span>
                      </div>
                    </>
                  )}
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

export default LeadsList;
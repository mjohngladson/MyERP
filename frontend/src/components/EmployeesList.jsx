import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Eye, Edit, Mail, 
  Phone, MapPin, ChevronLeft, User, Calendar, Briefcase
} from 'lucide-react';

const EmployeesList = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');

  // Mock employees data
  const employees = [
    {
      id: '1',
      employee_id: 'EMP-001',
      name: 'John Doe',
      email: 'john.doe@company.com',
      phone: '+91 9876543210',
      department: 'Engineering',
      designation: 'Software Engineer',
      join_date: '2023-06-15',
      salary: 75000,
      status: 'Active',
      address: '123 Tech Street, Bangalore'
    },
    {
      id: '2',
      employee_id: 'EMP-002',
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      phone: '+91 9876543211', 
      department: 'Sales',
      designation: 'Sales Manager',
      join_date: '2023-04-20',
      salary: 65000,
      status: 'Active',
      address: '456 Business Ave, Mumbai'
    },
    {
      id: '3',
      employee_id: 'EMP-003',
      name: 'Mike Johnson',
      email: 'mike.johnson@company.com',
      phone: '+91 9876543212',
      department: 'HR',
      designation: 'HR Executive',
      join_date: '2023-08-10',
      salary: 50000,
      status: 'Active',
      address: '789 Corporate Lane, Delhi'
    },
    {
      id: '4',
      employee_id: 'EMP-004',
      name: 'Sarah Wilson',
      email: 'sarah.wilson@company.com',
      phone: '+91 9876543213',
      department: 'Finance',
      designation: 'Accountant',
      join_date: '2023-03-12',
      salary: 55000,
      status: 'On Leave',
      address: '321 Finance District, Chennai'
    }
  ];

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
    return matchesSearch && matchesDepartment;
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
      case 'Active': return 'bg-green-100 text-green-800';
      case 'On Leave': return 'bg-yellow-100 text-yellow-800';
      case 'Inactive': return 'bg-red-100 text-red-800';
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
          <h1 className="text-3xl font-bold text-gray-800">Employees</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="relative">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Employee</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Employees</div>
          <div className="text-2xl font-bold text-gray-800">{filteredEmployees.length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Active Employees</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredEmployees.filter(emp => emp.status === 'Active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">On Leave</div>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredEmployees.filter(emp => emp.status === 'On Leave').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Departments</div>
          <div className="text-2xl font-bold text-blue-600">
            {new Set(filteredEmployees.map(emp => emp.department)).size}
          </div>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div key={employee.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            {/* Employee header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{employee.name}</h3>
                  <p className="text-sm text-gray-500">{employee.employee_id}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                  {employee.status}
                </span>
                <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Job details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-3 text-gray-600">
                <Briefcase size={16} />
                <div>
                  <span className="text-sm font-medium">{employee.designation}</span>
                  <p className="text-xs text-gray-500">{employee.department}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 text-gray-600">
                <Mail size={16} />
                <span className="text-sm">{employee.email}</span>
              </div>
              
              <div className="flex items-center space-x-3 text-gray-600">
                <Phone size={16} />
                <span className="text-sm">{employee.phone}</span>
              </div>
              
              <div className="flex items-center space-x-3 text-gray-600">
                <Calendar size={16} />
                <span className="text-sm">Joined {new Date(employee.join_date).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Salary info */}
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly Salary</span>
                <span className="text-lg font-bold text-gray-800">{formatCurrency(employee.salary)}</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {employee.department} • {employee.designation}
                </span>
                <div className="flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" title="View Profile">
                    <Eye size={16} className="text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" title="Edit Employee">
                    <Edit size={16} className="text-gray-600" />
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

export default EmployeesList;
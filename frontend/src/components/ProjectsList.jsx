import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Eye, Edit, Calendar, 
  ChevronLeft, FolderOpen, Users, Clock, CheckCircle, AlertCircle
} from 'lucide-react';

const ProjectsList = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock projects data
  const projects = [
    {
      id: '1',
      project_name: 'Website Redesign',
      client: 'ABC Corp',
      start_date: '2024-01-15',
      end_date: '2024-03-15',
      status: 'In Progress',
      priority: 'High',
      progress: 65,
      budget: 500000,
      team_members: 5,
      tasks_total: 25,
      tasks_completed: 16
    },
    {
      id: '2',
      project_name: 'Mobile App Development',
      client: 'XYZ Ltd',
      start_date: '2024-02-01',
      end_date: '2024-06-01',
      status: 'Planning',
      priority: 'Medium',
      progress: 15,
      budget: 750000,
      team_members: 8,
      tasks_total: 40,
      tasks_completed: 6
    },
    {
      id: '3',
      project_name: 'Database Migration',
      client: 'DEF Inc',
      start_date: '2023-12-01',
      end_date: '2024-01-31',
      status: 'Completed',
      priority: 'High',
      progress: 100,
      budget: 300000,
      team_members: 3,
      tasks_total: 15,
      tasks_completed: 15
    },
    {
      id: '4',
      project_name: 'Security Audit',
      client: 'GHI Corp',
      start_date: '2024-01-20',
      end_date: '2024-02-20',
      status: 'Overdue',
      priority: 'Critical',
      progress: 45,
      budget: 200000,
      team_members: 4,
      tasks_total: 20,
      tasks_completed: 9
    }
  ];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
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
      case 'Planning': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'On Hold': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'text-red-600';
      case 'High': return 'text-orange-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Planning': return <Clock className="text-blue-500" size={16} />;
      case 'In Progress': return <Clock className="text-yellow-500" size={16} />;
      case 'Completed': return <CheckCircle className="text-green-500" size={16} />;
      case 'Overdue': return <AlertCircle className="text-red-500" size={16} />;
      default: return <Clock className="text-gray-500" size={16} />;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Projects</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search projects..."
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
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Projects</div>
          <div className="text-2xl font-bold text-gray-800">{filteredProjects.length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredProjects.filter(p => p.status === 'In Progress').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredProjects.filter(p => p.status === 'Completed').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Overdue</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredProjects.filter(p => p.status === 'Overdue').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Budget</div>
          <div className="text-lg font-bold text-gray-800">
            {formatCurrency(filteredProjects.reduce((sum, p) => sum + p.budget, 0))}
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FolderOpen className="text-blue-600" size={24} />
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 text-xl mb-1">{project.project_name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Client: {project.client}</span>
                    <span>•</span>
                    <span className={`font-medium ${getPriorityColor(project.priority)}`}>
                      {project.priority} Priority
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xl font-bold text-gray-800 mb-2">{formatCurrency(project.budget)}</div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(project.status)}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-medium text-gray-800">{project.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>
            
            {/* Project details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar size={14} />
                <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar size={14} />
                <span>End: {new Date(project.end_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users size={14} />
                <span>{project.team_members} members</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle size={14} />
                <span>{project.tasks_completed}/{project.tasks_total} tasks</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-500">
                    Tasks: {project.tasks_completed} of {project.tasks_total} completed
                  </span>
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

export default ProjectsList;
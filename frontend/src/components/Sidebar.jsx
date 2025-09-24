import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Calculator, 
  Users, 
  FolderOpen, 
  Cog, 
  UserCheck,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Menu
} from 'lucide-react';
import { mockModules } from '../mockData';

const iconComponents = {
  TrendingUp,
  ShoppingCart,
  Package,
  Calculator,
  Users,
  FolderOpen,
  Cog,
  UserCheck
};

const Sidebar = ({ isOpen, toggleSidebar, activeModule, setActiveModule, onSubItemClick }) => {
  const [expandedModules, setExpandedModules] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
    // Do not change activeModule here; only expand/collapse the module
  };

  const handleSubItemClick = (moduleId, subItem) => {
    if (onSubItemClick) {
      onSubItemClick(moduleId, subItem);
    }
    // For accessible keyboard users, also collapse after navigation for better UX on mobile
    setExpandedModules(prev => ({ ...prev, [moduleId]: false }));
  };

  const filteredModules = (mockModules || []).filter(module => 
    module && module.name && module.items &&
    (module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.items.some(item => item && item.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-lg z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        ${collapsed ? 'w-16' : 'w-64'} lg:${collapsed ? 'w-16' : 'w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className={`text-xl font-bold text-gray-800 transition-opacity ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>GiLi</h1>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setCollapsed(!collapsed)}
                  className="hidden lg:inline-flex p-2 hover:bg-gray-100 rounded-md"
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {collapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}            
                </button>
                <button 
                  onClick={toggleSidebar}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
                >
                  <Menu size={20} />
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className={`mt-4 relative transition-all ${collapsed ? 'opacity-0 pointer-events-none h-0' : 'opacity-100 h-auto'}`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Modules */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {/* Dashboard item */}
              <button
                onClick={() => setActiveModule('dashboard')}
                className={`
                  w-full flex items-center space-x-3 p-3 rounded-lg
                  transition-all duration-200 hover:bg-gray-50
                  ${activeModule === 'dashboard' ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                `}
              >
                <div 
                  className="p-2 rounded-md"
                  style={{ backgroundColor: `#2563eb15`, color: '#2563eb' }}
                >
                  <TrendingUp size={20} />
                </div>
                <span className={`font-medium text-gray-700 transition-opacity ${collapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100'}`}>Dashboard</span>
              </button>

              {filteredModules.map((module) => {
                const IconComponent = iconComponents[module.icon];
                const isExpanded = expandedModules[module.id];
                const isActive = activeModule === module.id;
                
                return (
                  <div key={module.id}>
                    <button
                      onClick={() => toggleModule(module.id)}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-lg
                        transition-all duration-200 hover:bg-gray-50
                        ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="p-2 rounded-md"
                          style={{ backgroundColor: `${module.color}15`, color: module.color }}
                        >
                          <IconComponent size={20} />
                        </div>
                        <span className={`font-medium text-gray-700 transition-opacity ${collapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100'}`}>{module.name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400" />
                      )}
                    </button>
                    
                    {/* Module items */}
                    <div className={`
                      overflow-hidden transition-all duration-300 relative z-10
                      ${collapsed ? 'max-h-0 opacity-0 pointer-events-none' : (isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0')}
                    `}>
                      <div className="ml-6 mt-1 space-y-1">
                        {(module.items || []).map((item, index) => (
                          <button
                            key={index}
                            onClick={() => handleSubItemClick(module.id, item)}
                            className="w-full text-left p-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors relative z-20 cursor-pointer"
                            style={{ pointerEvents: 'auto' }}
                          >
                            {item || 'Unnamed Item'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              GiLi v1.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
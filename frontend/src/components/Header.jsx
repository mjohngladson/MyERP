import React, { useState, useEffect } from 'react';
import { 
  Menu,
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Search,
  Plus,
  FileText,
  Receipt,
  ShoppingCart,
  Package
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GlobalSearch from './GlobalSearch';

const Header = ({ toggleSidebar, onProfileClick = () => {}, onSettingsClick = () => {}, onNavigate = () => {} }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  
  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  const handleProfileClick = () => {
    onProfileClick();
    setShowUserMenu(false);
  };

  const handleSettingsClick = () => {
    onSettingsClick();
    setShowUserMenu(false);
  };

  const handleSearchClick = () => {
    setShowSearch(true);
  };

  const handleSearchNavigate = (path) => {
    try {
      onNavigate(path);
    } catch (e) {
      // no-op fallback if navigation not provided
    }
  };

  // Global keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);
  
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Menu size={20} />
        </button>
        
        {/* Global search */}
        <div className="hidden md:flex items-center bg-gray-50 rounded-lg px-3 py-2 w-96 cursor-text hover:bg-gray-100 transition-colors" onClick={handleSearchClick}>
          <Search size={18} className="text-gray-400 mr-2" />
          <span className="text-sm text-gray-500 flex-1">Search anything...</span>
          <kbd className="hidden sm:inline-block bg-white px-2 py-1 text-xs text-gray-500 rounded border">Ctrl K</kbd>
        </div>
      </div>
      
      {/* Right section */}
      <div className="flex items-center space-x-4">
        {/* Quick create button */}
        <div className="hidden sm:flex items-center space-x-2">
          <div className="relative group">
            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={16} />
              <span className="text-sm font-medium">Create</span>
            </button>
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
              <button onClick={() => onNavigate('/sales/orders')} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:bg-gray-50">
                <ShoppingCart size={14} className="text-gray-600" />
                <span>Sales Order</span>
              </button>
              <button onClick={() => onNavigate('/sales/invoices')} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:bg-gray-50">
                <Receipt size={14} className="text-gray-600" />
                <span>Sales Invoice</span>
              </button>
              <button onClick={() => onNavigate('/buying/purchase-orders')} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:bg-gray-50">
                <FileText size={14} className="text-gray-600" />
                <span>Purchase Order</span>
              </button>
              <button onClick={() => onNavigate('/buying/purchase-invoices')} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:bg-gray-50">
                <Receipt size={14} className="text-gray-600" />
                <span>Purchase Invoice</span>
              </button>
              <button onClick={() => onNavigate('/stock/entry')} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:bg-gray-50">
                <Package size={14} className="text-gray-600" />
                <span>Stock Entry</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {[
                  { title: 'New sales order received', time: '2 hours ago', type: 'success' },
                  { title: 'Payment overdue reminder', time: '4 hours ago', type: 'warning' },
                  { title: 'Low stock alert', time: '6 hours ago', type: 'error' }
                ].map((notification, index) => (
                  <div key={index} className="p-4 border-b border-gray-50 hover:bg-gray-50">
                    <p className="text-sm text-gray-800 font-medium">{notification.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 text-center border-t border-gray-100">
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'}
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-800">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500">{user?.role || 'User'}</p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>
          
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              <div className="py-2">
                <button 
                  onClick={handleProfileClick}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>
                <button 
                  onClick={handleSettingsClick}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
                <hr className="my-2" />
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Global Search Modal */}
      {showSearch && (
        <GlobalSearch 
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onNavigate={handleSearchNavigate}
        />
      )}
      
      {/* Click outside handlers */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </header>
  );
};

export default Header;
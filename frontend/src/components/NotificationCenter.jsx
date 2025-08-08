import React, { useState, useEffect } from 'react';
import {
  Bell, X, Check, AlertCircle, Info, CheckCircle, AlertTriangle,
  Clock, Filter, Archive, Star, Trash2, MoreVertical, ChevronLeft
} from 'lucide-react';

const NotificationCenter = ({ onBack }) => {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'New Sales Order Received',
      message: 'Sales Order SO-2024-001 has been created by ABC Corp for ₹25,000',
      type: 'success',
      category: 'sales',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      starred: false,
      actions: [
        { label: 'View Order', action: 'view_order', primary: true },
        { label: 'Approve', action: 'approve' }
      ]
    },
    {
      id: '2',
      title: 'Payment Overdue Alert',
      message: 'Invoice SINV-2024-001 from ABC Corp is overdue by 5 days. Amount: ₹25,000',
      type: 'warning',
      category: 'finance',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      read: false,
      starred: true,
      actions: [
        { label: 'Send Reminder', action: 'send_reminder', primary: true },
        { label: 'View Invoice', action: 'view_invoice' }
      ]
    },
    {
      id: '3',
      title: 'Low Stock Alert',
      message: 'Product A (PROD-A-001) stock is running low. Current stock: 5 units, Reorder level: 10 units',
      type: 'error',
      category: 'inventory',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      read: true,
      starred: false,
      actions: [
        { label: 'Reorder Now', action: 'reorder', primary: true },
        { label: 'Update Stock', action: 'update_stock' }
      ]
    },
    {
      id: '4',
      title: 'Monthly Report Generated',
      message: 'Your monthly sales report for January 2024 has been generated and is ready for download',
      type: 'info',
      category: 'reports',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      starred: false,
      actions: [
        { label: 'Download Report', action: 'download_report', primary: true }
      ]
    },
    {
      id: '5',
      title: 'New Customer Registration',
      message: 'XYZ Corp has registered as a new customer and is pending approval',
      type: 'info',
      category: 'crm',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      starred: false,
      actions: [
        { label: 'Approve Customer', action: 'approve_customer', primary: true },
        { label: 'View Details', action: 'view_customer' }
      ]
    }
  ]);

  const [filter, setFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());

  const getNotificationIcon = (type) => {
    const iconProps = { size: 20 };
    
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" {...iconProps} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" {...iconProps} />;
      case 'error':
        return <AlertCircle className="text-red-500" {...iconProps} />;
      case 'info':
      default:
        return <Info className="text-blue-500" {...iconProps} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'error':
        return 'border-l-red-500 bg-red-50';
      case 'info':
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'starred':
        return notification.starred;
      case 'read':
        return notification.read;
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationAction = (notificationId, action) => {
    console.log(`Performing action: ${action} on notification: ${notificationId}`);
    
    // Mark notification as read when action is performed
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const toggleStar = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, starred: !n.starred } : n
      )
    );
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    );
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(notificationId);
      return newSet;
    });
  };

  const toggleSelect = (notificationId) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
  };

  const clearSelection = () => {
    setSelectedNotifications(new Set());
  };

  const deleteSelected = () => {
    setNotifications(prev =>
      prev.filter(n => !selectedNotifications.has(n.id))
    );
    setSelectedNotifications(new Set());
  };

  const markSelectedAsRead = () => {
    setNotifications(prev =>
      prev.map(n =>
        selectedNotifications.has(n.id) ? { ...n, read: true } : n
      )
    );
    setSelectedNotifications(new Set());
  };

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
          <div className="flex items-center space-x-3">
            <Bell size={28} className="text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
              <p className="text-gray-600">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Filter Buttons */}
            <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'unread', label: 'Unread' },
                { value: 'starred', label: 'Starred' },
                { value: 'read', label: 'Read' }
              ].map(filterOption => (
                <button
                  key={filterOption.value}
                  onClick={() => setFilter(filterOption.value)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === filterOption.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {filterOption.label}
                  {filterOption.value === 'unread' && unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {selectedNotifications.size > 0 ? (
              <>
                <span className="text-sm text-gray-600">
                  {selectedNotifications.size} selected
                </span>
                <button
                  onClick={markSelectedAsRead}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Check size={16} />
                  <span>Mark Read</span>
                </button>
                <button
                  onClick={deleteSelected}
                  className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
                <button
                  onClick={clearSelection}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={selectAll}
                  className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Select All
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Check size={16} />
                    <span>Mark All Read</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No notifications</h3>
            <p className="text-gray-600">
              {filter === 'all' ? 'You\'re all caught up!' : `No ${filter} notifications found.`}
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl shadow-sm border-l-4 transition-all duration-200 hover:shadow-md ${
                notification.read ? 'border-l-gray-300' : getNotificationColor(notification.type)
              } ${!notification.read ? 'shadow-md' : ''}`}
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Selection Checkbox */}
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={() => toggleSelect(notification.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* Notification Icon */}
                  <div className="pt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-semibold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notification.title}
                        {!notification.read && (
                          <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                        )}
                      </h3>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => toggleStar(notification.id)}
                          className={`p-1 rounded transition-colors ${
                            notification.starred
                              ? 'text-yellow-500 hover:text-yellow-600'
                              : 'text-gray-400 hover:text-yellow-500'
                          }`}
                        >
                          <Star size={16} fill={notification.starred ? 'currentColor' : 'none'} />
                        </button>
                        <span className="text-sm text-gray-500">{formatTimeAgo(notification.timestamp)}</span>
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <p className={`mb-4 ${notification.read ? 'text-gray-600' : 'text-gray-700'}`}>
                      {notification.message}
                    </p>

                    {/* Action Buttons */}
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="flex items-center space-x-3">
                        {notification.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => handleNotificationAction(notification.id, action.action)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              action.primary
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
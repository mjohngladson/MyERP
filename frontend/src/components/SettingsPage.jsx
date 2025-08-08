import React, { useState } from 'react';
import { 
  Settings, ChevronLeft, Bell, Shield, Eye, Globe, 
  Palette, Save, Moon, Sun, Monitor
} from 'lucide-react';

const SettingsPage = ({ onBack }) => {
  const [settings, setSettings] = useState({
    // Notification Settings
    emailNotifications: true,
    pushNotifications: false,
    taskReminders: true,
    weeklyReports: true,
    
    // Privacy Settings
    profileVisibility: 'team',
    activityStatus: true,
    dataSharing: false,
    
    // Appearance Settings
    theme: 'light',
    language: 'en',
    dateFormat: 'dd/mm/yyyy',
    currency: 'INR',
    
    // System Settings
    twoFactorAuth: false,
    sessionTimeout: '30',
    autoSave: true,
    compactView: false
  });

  const [activeTab, setActiveTab] = useState('notifications');
  const [saving, setSaving] = useState(false);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      // Show success message
    }, 1000);
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'system', label: 'System', icon: Settings }
  ];

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Notification Preferences</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Email Notifications</label>
            <p className="text-xs text-gray-500">Receive notifications via email</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${settings.emailNotifications ? 'bg-blue-600' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.emailNotifications ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Push Notifications</label>
            <p className="text-xs text-gray-500">Receive push notifications in browser</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${settings.pushNotifications ? 'bg-blue-600' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.pushNotifications ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Task Reminders</label>
            <p className="text-xs text-gray-500">Get reminded about pending tasks</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.taskReminders}
              onChange={(e) => handleSettingChange('taskReminders', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${settings.taskReminders ? 'bg-blue-600' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.taskReminders ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Weekly Reports</label>
            <p className="text-xs text-gray-500">Receive weekly activity reports</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.weeklyReports}
              onChange={(e) => handleSettingChange('weeklyReports', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${settings.weeklyReports ? 'bg-blue-600' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.weeklyReports ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Privacy & Security</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
          <select
            value={settings.profileVisibility}
            onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="public">Public</option>
            <option value="team">Team Only</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Show Activity Status</label>
            <p className="text-xs text-gray-500">Let others see when you're online</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.activityStatus}
              onChange={(e) => handleSettingChange('activityStatus', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${settings.activityStatus ? 'bg-blue-600' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.activityStatus ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Data Sharing</label>
            <p className="text-xs text-gray-500">Share analytics data to improve service</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.dataSharing}
              onChange={(e) => handleSettingChange('dataSharing', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${settings.dataSharing ? 'bg-blue-600' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.dataSharing ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Two-Factor Authentication</label>
            <p className="text-xs text-gray-500">Add an extra layer of security</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.twoFactorAuth}
              onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${settings.twoFactorAuth ? 'bg-blue-600' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.twoFactorAuth ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Appearance & Display</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleSettingChange('theme', value)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  settings.theme === value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <div className="text-sm font-medium text-gray-700">{label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={settings.language}
            onChange={(e) => handleSettingChange('language', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
          <select
            value={settings.dateFormat}
            onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="dd/mm/yyyy">DD/MM/YYYY</option>
            <option value="mm/dd/yyyy">MM/DD/YYYY</option>
            <option value="yyyy-mm-dd">YYYY-MM-DD</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={settings.currency}
            onChange={(e) => handleSettingChange('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="INR">Indian Rupee (₹)</option>
            <option value="USD">US Dollar ($)</option>
            <option value="EUR">Euro (€)</option>
            <option value="GBP">British Pound (£)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">System Preferences</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout</label>
          <select
            value={settings.sessionTimeout}
            onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
            <option value="0">Never</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Auto Save</label>
            <p className="text-xs text-gray-500">Automatically save changes</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${settings.autoSave ? 'bg-blue-600' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.autoSave ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Compact View</label>
            <p className="text-xs text-gray-500">Use compact interface layout</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.compactView}
              onChange={(e) => handleSettingChange('compactView', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${settings.compactView ? 'bg-blue-600' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.compactView ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'notifications':
        return renderNotificationSettings();
      case 'privacy':
        return renderPrivacySettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'system':
        return renderSystemSettings();
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <nav className="space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:w-3/4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            {renderActiveTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
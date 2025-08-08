import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import { Toaster } from './components/ui/toaster';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const helloWorldApi = async () => {
    try {
      const response = await axios.get(`${API}/`);
      console.log(response.data.message);
    } catch (e) {
      console.error(e, `errored out requesting / api`);
    }
  };

  useEffect(() => {
    helloWorldApi();
  }, []);

  const renderActiveComponent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      default:
        return (
          <div className="p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {activeModule.charAt(0).toUpperCase() + activeModule.slice(1)} Module
              </h2>
              <p className="text-gray-600 mb-6">
                This module is currently under development. Please check back later for full functionality.
              </p>
              <div className="text-sm text-gray-500">
                Module ID: {activeModule}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <BrowserRouter>
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            activeModule={activeModule}
            setActiveModule={setActiveModule}
          />
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
            {/* Header */}
            <Header toggleSidebar={toggleSidebar} />
            
            {/* Main content */}
            <main className="flex-1 overflow-auto">
              {renderActiveComponent()}
            </main>
          </div>
        </div>
        <Toaster />
      </BrowserRouter>
    </div>
  );
}

export default App;
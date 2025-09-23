import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProfilePage from './components/ProfilePage';
import SettingsPage from './components/SettingsPage';
import SalesInvoicesList from './components/SalesInvoicesList';
import SalesInvoiceForm from './components/SalesInvoiceForm';
import SalesInvoiceView from './components/SalesInvoiceView';
import SalesOrdersList from './components/SalesOrdersList';
import SalesOrderForm from './components/SalesOrderForm';
import CustomersList from './components/CustomersList';
import QuotationsList from './components/QuotationsList';
import ItemsList from './components/ItemsList';
import PurchaseOrdersList from './components/PurchaseOrdersList';
import SuppliersList from './components/SuppliersList';
import TransactionsPage from './components/TransactionsPage';
import LeadsList from './components/LeadsList';
import ProjectsList from './components/ProjectsList';
import StockEntryList from './components/StockEntryList';
import WarehousesList from './components/WarehousesList';
import EmployeesList from './components/EmployeesList';
import AdvancedReporting from './components/AdvancedReporting';
import { Toaster } from './components/ui/toaster';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MainApp = () => {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState(null);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const helloWorldApi = async () => {
    try { const response = await axios.get(`${API}/`); console.log(response.data.message); } catch (e) { console.error(e, `errored out requesting / api`); }
  };

  useEffect(() => { if (isAuthenticated) { helloWorldApi(); } }, [isAuthenticated]);

  const handleModuleClick = (moduleId) => { setActiveModule(moduleId); setActiveView(moduleId); };

  const handleSubItemClick = (moduleId, subItem) => {
    setActiveModule(moduleId);
    if (moduleId === 'sales') {
      switch (subItem) {
        case 'Sales Order': setActiveView('sales-orders'); break;
        case 'Quotation': setActiveView('quotations'); break;
        case 'Customer': setActiveView('customers'); break;
        case 'Item': setActiveView('items'); break;
        case 'Sales Invoice': setActiveView('sales-invoices'); break;
        default: setActiveView('sales');
      }
    } else if (moduleId === 'buying') {
      switch (subItem) {
        case 'Purchase Order': setActiveView('purchase-orders'); break;
        case 'Supplier': setActiveView('suppliers'); break;
        case 'Purchase Invoice': setActiveView('purchase-invoices'); break;
        case 'Purchase Receipt': setActiveView('purchase-receipts'); break;
        default: setActiveView('buying');
      }
    } else if (moduleId === 'stock') {
      switch (subItem) {
        case 'Stock Entry': setActiveView('stock-entry'); break;
        case 'Item': setActiveView('items'); break;
        case 'Warehouse': setActiveView('warehouses'); break;
        case 'Stock Reconciliation': setActiveView('stock-reconciliation'); break;
        default: setActiveView('stock');
      }
    } else if (moduleId === 'accounts') {
      switch (subItem) {
        case 'Chart of Accounts': setActiveView('chart-of-accounts'); break;
        case 'Journal Entry': setActiveView('journal-entry'); break;
        case 'Payment Entry': setActiveView('payment-entry'); break;
        case 'General Ledger': setActiveView('general-ledger'); break;
        default: setActiveView('accounts');
      }
    } else if (moduleId === 'crm') {
      switch (subItem) {
        case 'Lead': setActiveView('leads'); break;
        case 'Opportunity': setActiveView('opportunities'); break;
        case 'Customer': setActiveView('customers'); break;
        case 'Contact': setActiveView('contacts'); break;
        case 'Campaign': setActiveView('campaigns'); break;
        default: setActiveView('crm');
      }
    } else if (moduleId === 'projects') {
      switch (subItem) {
        case 'Project': setActiveView('projects'); break;
        case 'Task': setActiveView('tasks'); break;
        case 'Timesheet': setActiveView('timesheets'); break;
        case 'Project Update': setActiveView('project-updates'); break;
        default: setActiveView('projects');
      }
    } else if (moduleId === 'manufacturing') {
      switch (subItem) {
        case 'BOM': setActiveView('bom'); break;
        case 'Work Order': setActiveView('work-orders'); break;
        case 'Production Plan': setActiveView('production-plans'); break;
        case 'Job Card': setActiveView('job-cards'); break;
        default: setActiveView('manufacturing');
      }
    } else if (moduleId === 'hr') {
      switch (subItem) {
        case 'Employee': setActiveView('employees'); break;
        case 'Attendance': setActiveView('attendance'); break;
        case 'Leave Application': setActiveView('leave-applications'); break;
        case 'Salary Slip': setActiveView('salary-slips'); break;
        default: setActiveView('hr');
      }
    } else {
      setActiveView(moduleId);
    }
  };

  const renderActiveComponent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard onViewAllTransactions={() => setActiveView('all-transactions')} onAdvancedReporting={() => setActiveView('advanced-reporting')} />;
      case 'profile': return <ProfilePage onBack={() => setActiveView('dashboard')} />;
      case 'settings': return <SettingsPage onBack={() => setActiveView('dashboard')} />;
      // Sales
      case 'sales-orders':
        return (
          <SalesOrdersList onBack={() => setActiveView('dashboard')} onViewOrder={(order)=>{setSelectedItem(order); /* could add view */}} onEditOrder={(order)=>{setSelectedItem(order); setActiveView('sales-order-edit');}} onCreateOrder={()=>setActiveView('sales-order-form')} />
        );
      case 'sales-order-form':
        return <SalesOrderForm onBack={() => setActiveView('sales-orders')} onSave={() => setActiveView('sales-orders')} />;
      case 'sales-order-edit':
        return <SalesOrderForm orderId={selectedItem?.id} onBack={() => setActiveView('sales-orders')} onSave={() => setActiveView('sales-orders')} />;
      case 'sales-invoices':
        return <SalesInvoicesList onBack={() => setActiveView('dashboard')} onCreateInvoice={() => setActiveView('sales-invoice-form')} onEditInvoice={(invoice) => { setSelectedItem(invoice); setActiveView('sales-invoice-edit'); }} onViewInvoice={(invoice) => { setSelectedItem(invoice); setActiveView('sales-invoice-view'); }} />;
      case 'sales-invoice-form':
        return <SalesInvoiceForm onBack={() => setActiveView('sales-invoices')} onSave={() => setActiveView('sales-invoices')} />;
      case 'sales-invoice-edit':
        return <SalesInvoiceForm invoiceId={selectedItem?.id} onBack={() => setActiveView('sales-invoices')} onSave={() => setActiveView('sales-invoices')} />;
      // Buying
      case 'purchase-orders': return <PurchaseOrdersList onBack={() => setActiveView('dashboard')} />;
      case 'suppliers': return <SuppliersList onBack={() => setActiveView('dashboard')} />;
      // Stock
      case 'stock-entry': return <StockEntryList onBack={() => setActiveView('dashboard')} />;
      case 'warehouses': return <WarehousesList onBack={() => setActiveView('dashboard')} />;
      // CRM
      case 'leads': return <LeadsList onBack={() => setActiveView('dashboard')} />;
      // Projects
      case 'projects': return <ProjectsList onBack={() => setActiveView('dashboard')} />;
      // HR
      case 'employees': return <EmployeesList onBack={() => setActiveView('dashboard')} />;
      // Other
      case 'all-transactions': return <TransactionsPage onBack={() => setActiveView('dashboard')} />;
      case 'advanced-reporting': return <AdvancedReporting onBack={() => setActiveView('dashboard')} />;
      default:
        return (
          <div className="p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{activeView.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h2>
              <p className="text-gray-600 mb-6">This feature is currently under development. Please check back later for full functionality.</p>
              <div className="text-sm text-gray-500 mb-4">Module: {activeModule} | View: {activeView}</div>
              <button onClick={() => setActiveView('dashboard')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Back to Dashboard</button>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) { return <LoginPage />; }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} activeModule={activeModule} setActiveModule={handleModuleClick} onSubItemClick={handleSubItemClick} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header toggleSidebar={toggleSidebar} onProfileClick={() => setActiveView('profile')} onSettingsClick={() => setActiveView('settings')} />
        <main className="flex-1 overflow-auto">{renderActiveComponent()}</main>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <MainApp />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SalesOrdersList from './components/SalesOrdersList';
import SalesOrderForm from './components/SalesOrderForm';
import SalesOrderView from './components/SalesOrderView';
import SalesInvoicesList from './components/SalesInvoicesList';
import SalesInvoiceForm from './components/SalesInvoiceForm';
import SalesInvoiceView from './components/SalesInvoiceView';
import QuotationsList from './components/QuotationsList';
import QuotationForm from './components/QuotationForm';
import QuotationView from './components/QuotationView';
import PurchaseOrdersList from './components/PurchaseOrdersList';
import PurchaseOrderForm from './components/PurchaseOrderForm';
import PurchaseOrderView from './components/PurchaseOrderView';
import PurchaseInvoicesList from './components/PurchaseInvoicesList';
import PurchaseInvoiceForm from './components/PurchaseInvoiceForm';
import PurchaseInvoiceView from './components/PurchaseInvoiceView';
import LoginPage from './components/LoginPage';
import ProfilePage from './components/ProfilePage';
import SettingsPage from './components/SettingsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [pageState, setPageState] = useState({
    salesOrderView: null,
    salesOrderEdit: null,
    invoiceView: null,
    invoiceEdit: null,
    quotationView: null,
    quotationEdit: null,
    purchaseOrderView: null,
    purchaseOrderEdit: null,
    purchaseInvoiceView: null,
    purchaseInvoiceEdit: null,
  });

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;

      // Sales Orders
      case 'sales-order-list':
        return (
          <SalesOrdersList
            onBack={() => setActiveModule('dashboard')}
            onViewOrder={(o) => { setPageState(ps => ({...ps, salesOrderView: o})); setActiveModule('sales-order-view'); }}
            onEditOrder={(o) => { setPageState(ps => ({...ps, salesOrderEdit: o})); setActiveModule('sales-order-form'); }}
            onCreateOrder={() => { setPageState(ps => ({...ps, salesOrderEdit: null})); setActiveModule('sales-order-form'); }}
          />
        );
      case 'sales-order-form':
        return <SalesOrderForm orderId={pageState.salesOrderEdit?.id} onBack={() => setActiveModule('sales-order-list')} onSave={() => setActiveModule('sales-order-list')} />;
      case 'sales-order-view':
        return <SalesOrderView orderId={pageState.salesOrderView?.id} initialOrder={pageState.salesOrderView} onBack={() => setActiveModule('sales-order-list')} />;

      // Sales Invoices
      case 'sales-invoice-list':
        return <SalesInvoicesList onBack={() => setActiveModule('dashboard')} />;
      case 'sales-invoice-form':
        return <SalesInvoiceForm invoiceId={pageState.invoiceEdit?.id} onBack={() => setActiveModule('sales-invoice-list')} onSave={() => setActiveModule('sales-invoice-list')} />;
      case 'sales-invoice-view':
        return <SalesInvoiceView invoiceId={pageState.invoiceView?.id} initialInvoice={pageState.invoiceView} onBack={() => setActiveModule('sales-invoice-list')} />;

      // Quotations
      case 'quotation-list':
        return (
          <QuotationsList
            onBack={() => setActiveModule('dashboard')}
            onViewQuotation={(q) => { setPageState(ps => ({...ps, quotationView: q})); setActiveModule('quotation-view'); }}
            onEditQuotation={(q) => { setPageState(ps => ({...ps, quotationEdit: q})); setActiveModule('quotation-form'); }}
            onCreateQuotation={() => { setPageState(ps => ({...ps, quotationEdit: null})); setActiveModule('quotation-form'); }}
          />
        );
      case 'quotation-form':
        return <QuotationForm quotationId={pageState.quotationEdit?.id} onBack={() => setActiveModule('quotation-list')} onSave={() => setActiveModule('quotation-list')} />;
      case 'quotation-view':
        return <QuotationView quotationId={pageState.quotationView?.id} initialQuotation={pageState.quotationView} onBack={() => setActiveModule('quotation-list')} />;

      // Purchase Orders
      case 'purchase-order-list':
        return (
          <PurchaseOrdersList
            onBack={() => setActiveModule('dashboard')}
            onViewOrder={(o) => { setPageState(ps => ({...ps, purchaseOrderView: o})); setActiveModule('purchase-order-view'); }}
            onEditOrder={(o) => { setPageState(ps => ({...ps, purchaseOrderEdit: o})); setActiveModule('purchase-order-form'); }}
            onCreateOrder={() => { setPageState(ps => ({...ps, purchaseOrderEdit: null})); setActiveModule('purchase-order-form'); }}
          />
        );
      case 'purchase-order-form':
        return <PurchaseOrderForm orderId={pageState.purchaseOrderEdit?.id} onBack={() => setActiveModule('purchase-order-list')} onSave={() => setActiveModule('purchase-order-list')} />;
      case 'purchase-order-view':
        return <PurchaseOrderView orderId={pageState.purchaseOrderView?.id} initialOrder={pageState.purchaseOrderView} onBack={() => setActiveModule('purchase-order-list')} />;

      // Purchase Invoices
      case 'purchase-invoice-list':
        return (
          <PurchaseInvoicesList
            onBack={() => setActiveModule('dashboard')}
            onViewInvoice={(inv) => { setPageState(ps => ({...ps, purchaseInvoiceView: inv})); setActiveModule('purchase-invoice-view'); }}
            onEditInvoice={(inv) => { setPageState(ps => ({...ps, purchaseInvoiceEdit: inv})); setActiveModule('purchase-invoice-form'); }}
            onCreateInvoice={() => { setPageState(ps => ({...ps, purchaseInvoiceEdit: null})); setActiveModule('purchase-invoice-form'); }}
          />
        );
      case 'purchase-invoice-form':
        return <PurchaseInvoiceForm invoiceId={pageState.purchaseInvoiceEdit?.id} onBack={() => setActiveModule('purchase-invoice-list')} onSave={() => setActiveModule('purchase-invoice-list')} />;
      case 'purchase-invoice-view':
        return <PurchaseInvoiceView invoiceId={pageState.purchaseInvoiceView?.id} initialInvoice={pageState.purchaseInvoiceView} onBack={() => setActiveModule('purchase-invoice-list')} />;

      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;

      default:
        return <Dashboard />;
    }
  };

  const handleSubItemClick = (moduleId, subItem) => {
    const id = (moduleId || '').toString().toLowerCase();
    const mapById = {
      sales: {
        'Sales Order': 'sales-order-list',
        'Sales Invoice': 'sales-invoice-list',
        'Quotation': 'quotation-list',
      },
      buying: {
        'Purchase Order': 'purchase-order-list',
        'Purchase Invoice': 'purchase-invoice-list',
      }
    };
    const key = mapById[id]?.[subItem];
    if (key) {
      setActiveModule(key);
    }
  };

  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onSubItemClick={handleSubItemClick}
      />
      <div className="flex-1 ml-0 lg:ml-0 flex flex-col min-h-screen">
        <Header 
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          onProfileClick={() => setActiveModule('profile')} 
          onSettingsClick={() => setActiveModule('settings')} 
          onNavigate={(path) => {
            const routes = {
              '/sales/orders': 'sales-order-list',
              '/sales/quotations': 'quotation-list',
              '/sales/invoices': 'sales-invoice-list',
              '/buying/purchase-orders': 'purchase-order-list',
              '/buying/purchase-invoices': 'purchase-invoice-list',
            };
            const key = routes[path];
            if (key) setActiveModule(key);
          }}
        />
        <main className="flex-1">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
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
import CreditNotesList from './components/CreditNotesList';
import CreditNoteForm from './components/CreditNoteForm';
import DebitNotesList from './components/DebitNotesList';
import DebitNoteForm from './components/DebitNoteForm';
import CreditNoteView from './components/CreditNoteView';
import DebitNoteView from './components/DebitNoteView';
import LoginPage from './components/LoginPage';
import ProfilePage from './components/ProfilePage';
import SettingsPage from './components/SettingsPage';
import ItemsList from './components/ItemsList';
import CustomersList from './components/CustomersList';
import SuppliersList from './components/SuppliersList';
import Warehouses from './components/Warehouses';
import StockEntryForm from './components/StockEntryForm';
import StockLedger from './components/StockLedger';
import StockReports from './components/StockReports';
import GeneralSettings from './components/GeneralSettings';
import FinancialDashboard from './components/FinancialDashboard';
import ChartOfAccounts from './components/ChartOfAccounts';
import JournalEntries from './components/JournalEntries';
import PaymentEntry from './components/PaymentEntry';
import FinancialReports from './components/FinancialReports';
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
    creditNoteView: null,
    creditNoteEdit: null,
    debitNoteView: null,
    debitNoteEdit: null,
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
        return <SalesInvoicesList onBack={() => setActiveModule('dashboard')} onViewInvoice={(inv)=>{ setPageState(ps=>({...ps, invoiceView: inv})); setActiveModule('sales-invoice-view'); }} onEditInvoice={(inv)=>{ setPageState(ps=>({...ps, invoiceEdit: inv})); setActiveModule('sales-invoice-form'); }} />;
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

      // Credit Notes
      case 'credit-note-list':
        return (
          <CreditNotesList
            onBack={() => setActiveModule('dashboard')}
            onViewCreditNote={(note) => { setPageState(ps => ({...ps, creditNoteView: note})); setActiveModule('credit-note-view'); }}
            onEditCreditNote={(note) => { setPageState(ps => ({...ps, creditNoteEdit: note})); setActiveModule('credit-note-form'); }}
            onCreateCreditNote={() => { setPageState(ps => ({...ps, creditNoteEdit: null})); setActiveModule('credit-note-form'); }}
          />
        );
      case 'credit-note-form':
        return <CreditNoteForm creditNoteId={pageState.creditNoteEdit?.id} onBack={() => setActiveModule('credit-note-list')} onSave={() => setActiveModule('credit-note-list')} />;
      case 'credit-note-view':
        return <CreditNoteView creditNoteId={pageState.creditNoteView?.id} onBack={() => setActiveModule('credit-note-list')} />;

      // Debit Notes
      case 'debit-note-list':
        return (
          <DebitNotesList
            onBack={() => setActiveModule('dashboard')}
            onViewDebitNote={(note) => { setPageState(ps => ({...ps, debitNoteView: note})); setActiveModule('debit-note-view'); }}
            onEditDebitNote={(note) => { setPageState(ps => ({...ps, debitNoteEdit: note})); setActiveModule('debit-note-form'); }}
            onCreateDebitNote={() => { setPageState(ps => ({...ps, debitNoteEdit: null})); setActiveModule('debit-note-form'); }}
          />
        );
      case 'debit-note-form':
        return <DebitNoteForm debitNoteId={pageState.debitNoteEdit?.id} onBack={() => setActiveModule('debit-note-list')} onSave={() => setActiveModule('debit-note-list')} />;
      case 'debit-note-view':
        return <DebitNoteView debitNoteId={pageState.debitNoteView?.id} onBack={() => setActiveModule('debit-note-list')} />;

      case 'profile':
        return <ProfilePage onBack={() => setActiveModule('dashboard')} />;
      case 'settings':
        return <GeneralSettings onBack={() => setActiveModule('dashboard')} />;
      case 'items-list':
        return <ItemsList onBack={() => setActiveModule('dashboard')} />;
      case 'customers-list':
        return <CustomersList onBack={() => setActiveModule('dashboard')} />;
      case 'suppliers-list':
        return <SuppliersList onBack={() => setActiveModule('dashboard')} />;
      case 'warehouses':
        return <Warehouses onBack={() => setActiveModule('dashboard')} />;
      case 'stock-entry':
        return <StockEntryForm onBack={() => setActiveModule('dashboard')} />;
      case 'stock-ledger':
        return <StockLedger onBack={() => setActiveModule('dashboard')} />;
      case 'reports':
        return <StockReports onBack={() => setActiveModule('dashboard')} />;
      case 'general-settings':
        return <GeneralSettings onBack={() => setActiveModule('dashboard')} />;

      // Financial Management
      case 'financial':
        return <FinancialDashboard onNavigate={(path) => {
          const routes = {
            '/financial/accounts': 'financial-accounts',
            '/financial/journal-entries': 'financial-journal-entries',
            '/financial/payments': 'financial-payments',
            '/financial/reports': 'financial-reports',
            '/financial/settings': 'financial-settings'
          };
          const key = routes[path];
          if (key) {
            setActiveModule(key);
          }
        }} />;
      case 'financial-accounts':
        return <ChartOfAccounts onNavigate={(path) => {
          if (path === '/financial') {
            setActiveModule('financial');
          } else if (path.startsWith('/financial/accounts/')) {
            // Handle individual account view
            const accountId = path.split('/').pop();
            // Add account view logic here when component is created
          }
        }} />;
      case 'financial-journal-entries':
        return <JournalEntries onNavigate={(path) => {
          if (path === '/financial') {
            setActiveModule('financial');
          }
        }} />;
      case 'financial-payments':
        return <PaymentEntry onNavigate={(path) => {
          if (path === '/financial') {
            setActiveModule('financial');
          }
        }} />;
      case 'financial-reports':
        return <FinancialReports onNavigate={(path) => {
          if (path === '/financial') {
            setActiveModule('financial');
          }
        }} />;

      default:
        return <Dashboard />;
    }
  };

  const handleSubItemClick = (moduleId, subItem) => {
    const id = (moduleId || '').toString().toLowerCase();
    const mapById = {
      reports: { 'Reports': 'reports' },
      sales: {
        'Sales Order': 'sales-order-list',
        'Sales Invoice': 'sales-invoice-list',
        'Quotation': 'quotation-list',
        'Customer': 'customers-list',
        'Item': 'items-list',
        'Credit Note': 'credit-note-list',
      },
      buying: {
        'Purchase Order': 'purchase-order-list',
        'Purchase Invoice': 'purchase-invoice-list',
        'Supplier': 'suppliers-list',
        'Debit Note': 'debit-note-list',
      },
      stock: {
        'Item': 'items-list',
        'Warehouse': 'warehouses',
        'Stock Entry': 'stock-entry',
        'Stock Reconciliation': 'stock-ledger',
      },
      financial: {
        'Financial Dashboard': 'financial',
        'Chart of Accounts': 'financial-accounts',
        'Journal Entry': 'financial-journal-entries',
        'Payment Entry': 'financial-payments',
        'Financial Reports': 'financial-reports'
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
          onNavigate={(path) => {
            const routes = {
              '/sales/orders': 'sales-order-list',
              '/sales/quotations': 'quotation-list',
              '/sales/invoices': 'sales-invoice-list',
              '/buying/purchase-orders': 'purchase-order-list',
              '/buying/purchase-invoices': 'purchase-invoice-list',
              '/buying/suppliers': 'suppliers-list',
              '/stock/items': 'items-list',
              '/stock/entry': 'stock-entry',
              '/sales/customers': 'customers-list',
              '/reports': 'reports',
            };
            const key = routes[path];
            if (key) {
              setActiveModule(key);
            }
          }}
        />
        { /* Listen to dashboard KPI navigation events */ }
        <DashboardNavigationBridge onNavigate={(path)=>{
          const routes = {
            '/sales/orders': 'sales-order-list',
            '/sales/invoices': 'sales-invoice-list',
            '/buying/purchase-orders': 'purchase-order-list',
            '/stock/items': 'items-list'
          };
          const key = routes[path];
          if (key) setActiveModule(key);
        }} />
        <main className="flex-1">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function DashboardNavigationBridge({ onNavigate }) {
  React.useEffect(() => {
    const handler = (e) => {
      const path = e && e.detail;
      if (path && onNavigate) onNavigate(path);
    };
    window.addEventListener('gili:navigate', handler);
    return () => window.removeEventListener('gili:navigate', handler);
  }, [onNavigate]);
  return null;
}


function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
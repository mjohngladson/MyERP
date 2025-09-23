import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
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
import LoginPage from './components/LoginPage';

function App() {
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

      default:
        return <Dashboard />;
    }
  };

  const handleSubItemClick = (moduleId, subItem) => {
    // Map sidebar items to activeModule keys
    const map = {
      Sales: {
        'Sales Order': 'sales-order-list',
        'Sales Invoice': 'sales-invoice-list',
        'Quotation': 'quotation-list',
      },
      Buying: {
        'Purchase Order': 'purchase-order-list',
      }
    };
    const key = map[moduleId]?.[subItem];
    if (key) setActiveModule(key);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onSubItemClick={handleSubItemClick}
      />
      <main className="flex-1 ml-0 lg:ml-0">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
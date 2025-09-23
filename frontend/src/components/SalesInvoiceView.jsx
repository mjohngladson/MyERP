import React, { useEffect, useState } from 'react';
import { ChevronLeft, Printer } from 'lucide-react';
import { api } from '../services/api';

const SalesInvoiceView = ({ invoiceId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${api.getBaseUrl()}/api/invoices/${invoiceId}`);
        const data = await res.json();
        setInvoice(data);
      } catch (e) {
        console.error('Failed to load invoice', e);
      } finally {
        setLoading(false);
      }
    };
    if (invoiceId) load();
  }, [invoiceId]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount || 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">View Invoice</h1>
        </div>
        <div className="h-32 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">View Invoice</h1>
        </div>
        <div className="text-gray-500">Invoice not found</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Invoice {invoice.invoice_number}</h1>
        </div>
        <button onClick={() => window.print()} className="no-print inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Printer className="h-4 w-4" />
          <span>Print</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <img src="https://dummyimage.com/140x40/1f2937/ffffff&text=Your+Logo" alt="Logo" className="h-10" />
            <div className="mt-2 font-semibold">Your Company</div>
            <div className="text-sm text-gray-500">123 Business Street<br/>City, State, ZIP</div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <div>Invoice No: <span className="font-medium text-gray-900">{invoice.invoice_number}</span></div>
            <div>Date: {new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString('en-IN')}</div>
            <div>Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '-'}</div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-500">Bill To</div>
            <div className="font-medium">{invoice.customer_name || 'Customer'}</div>
            <div className="text-sm text-gray-600">{invoice.customer_email}</div>
            <div className="text-sm text-gray-600">{invoice.customer_phone}</div>
            <div className="text-sm text-gray-600">{invoice.customer_address}</div>
          </div>
        </div>

        {/* Items */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items?.map((it, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2">{it.item_name || it.description || 'Item'}</td>
                  <td className="px-4 py-2 text-center">{it.quantity}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(it.rate)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(it.amount || (it.quantity * it.rate))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-80 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="font-medium">{formatCurrency(invoice.discount_amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Tax ({invoice.tax_rate || 18}%)</span><span className="font-medium">{formatCurrency(invoice.tax_amount)}</span></div>
            <div className="flex justify-between text-base font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(invoice.total_amount)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoiceView;
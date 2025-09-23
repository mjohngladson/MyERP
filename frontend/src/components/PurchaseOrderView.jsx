import React, { useEffect, useState } from 'react';
import { ChevronLeft, Printer } from 'lucide-react';
import { api } from '../services/api';

const PurchaseOrderView = ({ orderId, initialOrder, onBack }) => {
  const [loading, setLoading] = useState(!initialOrder);
  const [order, setOrder] = useState(initialOrder || null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orderId) return;
      setLoading(!order);
      try {
        const res = await fetch(`${api.getBaseUrl()}/api/purchase/orders/${orderId}`);
        if (!res.ok) throw new Error('Failed to load purchase order');
        const data = await res.json();
        if (!cancelled) setOrder(data);
      } catch (e) {
        console.error('Failed to load purchase order', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orderId]);

  const formatCurrency = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(a || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900"><ChevronLeft className="h-5 w-5" /></button>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Order {order?.order_number || ''}</h1>
        </div>
        <button onClick={() => window.print()} className="no-print inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"><Printer className="h-4 w-4" /><span>Print</span></button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        {!order && (<div className="h-32 bg-gray-100 animate-pulse rounded" />)}
        {order && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <img src="https://dummyimage.com/140x40/1f2937/ffffff&text=Your+Logo" alt="Logo" className="h-10" />
                <div className="mt-2 font-semibold">Your Company</div>
                <div className="text-sm text-gray-500">123 Business Street<br/>City, State, ZIP</div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>PO No: <span className="font-medium text-gray-900">{order.order_number}</span></div>
                <div>Date: {formatDate(order.order_date || order.created_at)}</div>
                <div>Expected: {formatDate(order.expected_date)}</div>
                <div>Status: <span className="font-medium text-gray-900">{(order.status||'draft').charAt(0).toUpperCase()+ (order.status||'draft').slice(1)}</span></div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500">Supplier</div>
                <div className="font-medium">{order.supplier_name || 'Supplier'}</div>
                <div className="text-sm text-gray-600">{order.supplier_email}</div>
                <div className="text-sm text-gray-600">{order.supplier_phone}</div>
                <div className="text-sm text-gray-600">{order.supplier_address}</div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items?.map((it, idx) => (
                    <tr key={idx}><td className="px-4 py-2">{it.item_name || it.description || 'Item'}</td><td className="px-4 py-2 text-center">{it.quantity}</td><td className="px-4 py-2 text-right">{formatCurrency(it.rate)}</td><td className="px-4 py-2 text-right">{formatCurrency(it.amount || (it.quantity*it.rate))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end"><div className="w-80 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="font-medium">{formatCurrency(order.discount_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tax</span><span className="font-medium">{formatCurrency(order.tax_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-800 font-semibold">Total</span><span className="font-semibold">{formatCurrency(order.total_amount)}</span></div>
            </div></div>
          </>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderView;
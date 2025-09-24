import React, { useEffect, useState } from 'react';
import { ChevronLeft, Printer, Package, Calendar, User, DollarSign } from 'lucide-react';
import { api } from '../services/api';

const SalesOrderView = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/sales/orders/${orderId}`);
        setOrder(data);
      } catch (e) {
        console.error('Error loading sales order', e);
      } finally { 
        setLoading(false); 
      }
    };
    if (orderId) load();
  }, [orderId]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount || 0);

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-yellow-100 text-yellow-800',
      fulfilled: 'bg-green-100 text-green-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="h-32 bg-gray-100 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold ml-2">Order Not Found</h1>
        </div>
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <p className="text-gray-600">The requested sales order could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            Sales Order {order.order_number}
          </h1>
        </div>
        <button 
          onClick={() => window.print()} 
          className="no-print inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          <span>Print</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{order.order_number}</h2>
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar size={16} />
                    <span>Date: {formatDate(order.order_date || order.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User size={16} />
                    <span>Customer: {order.customer_name || 'Walk-in Customer'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
                  {order.status || 'Draft'}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Package className="mr-2" size={20} />
                Order Items
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-800">
                            {item.item_name || item.description || 'Item'}
                          </div>
                          {item.item_code && (
                            <div className="text-sm text-gray-500">Code: {item.item_code}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {item.quantity || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {formatCurrency(item.rate || item.unit_price)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {formatCurrency(item.amount || (item.quantity * (item.rate || item.unit_price || 0)))}
                      </td>
                    </tr>
                  ))}
                  {(!order.items || order.items.length === 0) && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        No items in this order
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="mr-2" size={20} />
              Customer Details
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Name:</span>
                <span className="ml-2 text-gray-600">{order.customer_name || 'Walk-in Customer'}</span>
              </div>
              {order.customer_email && (
                <div>
                  <span className="font-medium">Email:</span>
                  <span className="ml-2 text-gray-600">{order.customer_email}</span>
                </div>
              )}
              {order.customer_phone && (
                <div>
                  <span className="font-medium">Phone:</span>
                  <span className="ml-2 text-gray-600">{order.customer_phone}</span>
                </div>
              )}
              {order.customer_address && (
                <div>
                  <span className="font-medium">Address:</span>
                  <span className="ml-2 text-gray-600">{order.customer_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="mr-2" size={20} />
              Order Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(order.discount_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({order.tax_rate || 18}%):</span>
                <span className="font-medium">{formatCurrency(order.tax_amount)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-base font-semibold">
                <span>Total Amount:</span>
                <span className="text-lg">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {(order.notes || order.terms) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
              <div className="space-y-3 text-sm">
                {order.notes && (
                  <div>
                    <span className="font-medium block">Notes:</span>
                    <span className="text-gray-600 mt-1 block">{order.notes}</span>
                  </div>
                )}
                {order.terms && (
                  <div>
                    <span className="font-medium block">Terms & Conditions:</span>
                    <span className="text-gray-600 mt-1 block">{order.terms}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesOrderView;
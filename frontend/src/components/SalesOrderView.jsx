import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
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
      } finally { setLoading(false); }
    };
    if (orderId) load();
  }, [orderId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!order) return <div className="p-6">Order not found</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <button onClick={onBack} className="mb-4 p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20}/></button>
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h1 className="text-2xl font-bold mb-2">{order.order_number}</h1>
        <div className="text-gray-600">Customer: {order.customer_name}</div>
        <div className="text-gray-600">Date: {order.order_date ? new Date(order.order_date).toLocaleString() : '-'}</div>
        <div className="mt-4 font-semibold">Total: ₹{order.total_amount}</div>
      </div>
    </div>
  );
};

export default SalesOrderView;
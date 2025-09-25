import React, { useEffect, useState } from 'react';
import { ChevronLeft, Printer, FileText, Calendar, User, DollarSign } from 'lucide-react';
import { api } from '../services/api';

const CreditNoteView = ({ creditNoteId, onBack }) => {
  const [creditNote, setCreditNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/sales/credit-notes/${creditNoteId}`);
        setCreditNote(data);
      } catch (e) {
        console.error('Error loading credit note', e);
      } finally { 
        setLoading(false); 
      }
    };
    if (creditNoteId) load();
  }, [creditNoteId]);

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
      issued: 'bg-yellow-100 text-yellow-800',
      applied: 'bg-green-100 text-green-800'
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

  if (!creditNote) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold ml-2">Credit Note Not Found</h1>
        </div>
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <p className="text-gray-600">The requested credit note could not be found.</p>
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
            Credit Note {creditNote.credit_note_number}
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
        {/* Credit Note Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{creditNote.credit_note_number}</h2>
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar size={16} />
                    <span>Date: {formatDate(creditNote.credit_note_date || creditNote.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User size={16} />
                    <span>Customer: {creditNote.customer_name}</span>
                  </div>
                </div>
                {creditNote.reference_invoice && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Reference Invoice:</span> {creditNote.reference_invoice}
                  </div>
                )}
                {creditNote.reason && (
                  <div className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">Reason:</span> {creditNote.reason}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(creditNote.status)}`}>
                  {creditNote.status || 'Draft'}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FileText className="mr-2" size={20} />
                Credit Note Items
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
                  {(creditNote.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">
                          {item.item_name || 'Item'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {item.quantity || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  {(!creditNote.items || creditNote.items.length === 0) && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        No items in this credit note
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {creditNote.notes && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-600">{creditNote.notes}</p>
            </div>
          )}
        </div>

        {/* Credit Note Summary Sidebar */}
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
                <span className="ml-2 text-gray-600">{creditNote.customer_name}</span>
              </div>
              {creditNote.customer_email && (
                <div>
                  <span className="font-medium">Email:</span>
                  <span className="ml-2 text-gray-600">{creditNote.customer_email}</span>
                </div>
              )}
              {creditNote.customer_phone && (
                <div>
                  <span className="font-medium">Phone:</span>
                  <span className="ml-2 text-gray-600">{creditNote.customer_phone}</span>
                </div>
              )}
              {creditNote.customer_address && (
                <div>
                  <span className="font-medium">Address:</span>
                  <span className="ml-2 text-gray-600">{creditNote.customer_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Credit Note Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="mr-2" size={20} />
              Credit Note Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(creditNote.subtotal)}</span>
              </div>
              {creditNote.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(creditNote.discount_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({creditNote.tax_rate || 18}%):</span>
                <span className="font-medium">{formatCurrency(creditNote.tax_amount)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-base font-semibold">
                <span>Credit Amount:</span>
                <span className="text-lg text-red-600">{formatCurrency(creditNote.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditNoteView;
import React, { useState, useEffect } from 'react';
import { DollarSign, Save, X, Plus, Trash2, AlertCircle } from 'lucide-react';

const PaymentAllocationForm = ({ payment, onClose, onSuccess }) => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) || '';
  
  const [invoices, setInvoices] = useState([]);
  const [allocations, setAllocations] = useState([{ invoice_id: '', allocated_amount: 0, notes: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingAllocations, setExistingAllocations] = useState([]);

  useEffect(() => {
    loadInvoices();
    loadExistingAllocations();
  }, []);

  const loadInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch unpaid/partially paid invoices for the same party
      const isCustomer = payment.party_type === 'Customer';
      const partyQuery = isCustomer 
        ? `customer_id=${payment.party_id}` 
        : `supplier_id=${payment.party_id}`;
      
      // Use correct endpoint based on party type
      const endpoint = isCustomer 
        ? `${base}/api/invoices?${partyQuery}&limit=100`
        : `${base}/api/purchase/invoices?${partyQuery}&limit=100`;
      
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Filter for unpaid or partially paid invoices
      const unpaidInvoices = (Array.isArray(data) ? data : data.invoices || []).filter(
        inv => inv.payment_status !== 'Paid'
      );
      setInvoices(unpaidInvoices);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  };

  const loadExistingAllocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${base}/api/financial/payment-allocation/payments/${payment.id}/allocations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setExistingAllocations(data.allocations || []);
    } catch (err) {
      console.error('Failed to load existing allocations:', err);
    }
  };

  const addAllocation = () => {
    setAllocations([...allocations, { invoice_id: '', allocated_amount: 0, notes: '' }]);
  };

  const removeAllocation = (index) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index, field, value) => {
    const updated = [...allocations];
    updated[index][field] = value;
    setAllocations(updated);
  };

  const getInvoiceOutstanding = (invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return 0;
    
    const allocated = existingAllocations
      .filter(a => a.invoice_id === invoiceId)
      .reduce((sum, a) => sum + parseFloat(a.allocated_amount || 0), 0);
    
    return parseFloat(invoice.total_amount || 0) - allocated;
  };

  const handleSubmit = async () => {
    setError('');
    
    // Validation
    const validAllocations = allocations.filter(a => a.invoice_id && a.allocated_amount > 0);
    if (validAllocations.length === 0) {
      setError('Please add at least one allocation');
      return;
    }

    // Check total doesn't exceed unallocated amount
    const totalAllocating = validAllocations.reduce((sum, a) => sum + parseFloat(a.allocated_amount || 0), 0);
    const currentUnallocated = parseFloat(payment.unallocated_amount || payment.amount || 0);
    
    if (totalAllocating > currentUnallocated) {
      setError(`Total allocation (₹${totalAllocating.toFixed(2)}) exceeds available amount (₹${currentUnallocated.toFixed(2)})`);
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${base}/api/financial/payment-allocation/allocate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_id: payment.id,
          allocations: validAllocations
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to allocate payment');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalAllocating = allocations.reduce((sum, a) => sum + parseFloat(a.allocated_amount || 0), 0);
  const availableAmount = parseFloat(payment.unallocated_amount || payment.amount || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center sticky top-0">
          <div className="flex items-center">
            <DollarSign className="mr-2" size={24} />
            <h2 className="text-xl font-bold">Allocate Payment</h2>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-2 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Payment Number:</span>
                <span className="ml-2 font-medium">{payment.payment_number}</span>
              </div>
              <div>
                <span className="text-gray-600">Party:</span>
                <span className="ml-2 font-medium">{payment.party_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <span className="ml-2 font-medium text-green-600">₹{parseFloat(payment.amount || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Available to Allocate:</span>
                <span className="ml-2 font-medium text-blue-600">₹{availableAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Existing Allocations */}
          {existingAllocations.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h3 className="font-semibold text-gray-800 mb-2">Existing Allocations</h3>
              <div className="space-y-2">
                {existingAllocations.map((alloc, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-700">{alloc.invoice_number}</span>
                    <span className="font-medium text-gray-900">₹{parseFloat(alloc.allocated_amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="text-red-600 mr-2 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Allocations Form */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">New Allocations</h3>
              <button
                onClick={addAllocation}
                className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
              >
                <Plus size={16} />
                <span>Add Invoice</span>
              </button>
            </div>

            {allocations.map((alloc, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Invoice Selector */}
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={alloc.invoice_id}
                      onChange={(e) => updateAllocation(index, 'invoice_id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Select Invoice</option>
                      {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} - ₹{parseFloat(inv.total_amount || 0).toFixed(2)} 
                          {inv.payment_status ? ` (${inv.payment_status})` : ''}
                        </option>
                      ))}
                    </select>
                    {alloc.invoice_id && (
                      <p className="text-xs text-gray-500 mt-1">
                        Outstanding: ₹{getInvoiceOutstanding(alloc.invoice_id).toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={alloc.allocated_amount}
                      onChange={(e) => updateAllocation(index, 'allocated_amount', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Notes */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={alloc.notes}
                      onChange={(e) => updateAllocation(index, 'notes', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Optional notes"
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-1 flex items-end justify-center">
                    <button
                      onClick={() => removeAllocation(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">Total Allocating:</span>
              <span className="text-xl font-bold text-blue-600">₹{totalAllocating.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="font-medium text-gray-700">Remaining Unallocated:</span>
              <span className={`text-lg font-semibold ${(availableAmount - totalAllocating) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{(availableAmount - totalAllocating).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || totalAllocating === 0}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            <Save size={16} />
            <span>{loading ? 'Allocating...' : 'Allocate Payment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentAllocationForm;

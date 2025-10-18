import React, { useState, useEffect } from 'react';
import { 
  Upload, RefreshCw, FileText, CheckCircle, XCircle, AlertCircle, 
  ChevronLeft, Download, Trash2, Eye, Filter, X 
} from 'lucide-react';

const BankReconciliation = ({ onBack }) => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) || '';
  
  const [statements, setStatements] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${base}/api/financial/bank/statements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStatements(data.statements || []);
    } catch (err) {
      console.error('Failed to load statements:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setUploading(true);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bank_account_id', 'default_bank');
      formData.append('bank_name', 'Default Bank');

      const res = await fetch(`${base}/api/financial/bank/upload-statement`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      alert(data.message || 'Statement uploaded successfully');
      loadStatements();
      e.target.value = ''; // Reset file input
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const viewStatement = async (statement) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${base}/api/financial/bank/statements/${statement.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      setSelectedStatement(statement);
      setTransactions(data.transactions || []);
      setUnmatchedOnly(false);
    } catch (err) {
      console.error('Failed to load statement:', err);
    } finally {
      setLoading(false);
    }
  };

  const autoMatch = async () => {
    if (!selectedStatement) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${base}/api/financial/bank/auto-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statement_id: selectedStatement.id })
      });

      const data = await res.json();
      alert(data.message || 'Auto-matching completed');
      
      // Reload statement details
      viewStatement(selectedStatement);
      loadStatements();
    } catch (err) {
      alert('Auto-matching failed');
    } finally {
      setLoading(false);
    }
  };

  const unmatchTransaction = async (txnId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${base}/api/financial/bank/unmatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transaction_id: txnId })
      });

      if (!res.ok) throw new Error('Unmatch failed');
      
      // Reload statement details
      viewStatement(selectedStatement);
      loadStatements();
    } catch (err) {
      alert('Failed to unmatch transaction');
    } finally {
      setLoading(false);
    }
  };

  const deleteStatement = async (statementId) => {
    if (!window.confirm('Are you sure you want to delete this statement and all its transactions?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${base}/api/financial/bank/statements/${statementId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Delete failed');
      
      alert('Statement deleted successfully');
      loadStatements();
      if (selectedStatement?.id === statementId) {
        setSelectedStatement(null);
        setTransactions([]);
      }
    } catch (err) {
      alert('Failed to delete statement');
    }
  };

  const viewReport = async () => {
    if (!selectedStatement) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${base}/api/financial/bank/reconciliation-report?statement_id=${selectedStatement.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  const filteredTransactions = unmatchedOnly 
    ? transactions.filter(t => !t.is_matched) 
    : transactions;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Bank Reconciliation</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
            <Upload size={16} />
            <span>{uploading ? 'Uploading...' : 'Upload Statement'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          
          <button
            onClick={loadStatements}
            className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statements List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Bank Statements</h2>
          
          {statements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No statements uploaded yet</p>
              <p className="text-sm mt-1">Upload a CSV file to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {statements.map((stmt) => (
                <div
                  key={stmt.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStatement?.id === stmt.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => viewStatement(stmt)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm truncate" title={stmt.file_name}>
                        {stmt.file_name}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(stmt.upload_date)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStatement(stmt.id);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{stmt.total_transactions} txns</span>
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center text-green-600">
                        <CheckCircle size={12} className="mr-1" />
                        {stmt.matched_count}
                      </span>
                      <span className="flex items-center text-orange-600">
                        <XCircle size={12} className="mr-1" />
                        {stmt.unmatched_count}
                      </span>
                    </div>
                  </div>
                  
                  {stmt.status && (
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        stmt.status === 'fully_matched' 
                          ? 'bg-green-100 text-green-800'
                          : stmt.status === 'partially_matched'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {stmt.status.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transactions View */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
          {!selectedStatement ? (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <div className="text-center">
                <FileText size={64} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No statement selected</p>
                <p className="text-sm mt-1">Select a statement from the list to view transactions</p>
              </div>
            </div>
          ) : (
            <div>
              {/* Statement Header */}
              <div className="border-b p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{selectedStatement.file_name}</h2>
                    <p className="text-sm text-gray-600">{selectedStatement.bank_name}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={autoMatch}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm disabled:bg-green-400"
                    >
                      <CheckCircle size={14} />
                      <span>Auto Match</span>
                    </button>
                    
                    <button
                      onClick={viewReport}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:bg-blue-400"
                    >
                      <Eye size={14} />
                      <span>Report</span>
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-600 text-xs">Total Transactions</p>
                    <p className="font-bold text-lg">{selectedStatement.total_transactions}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-gray-600 text-xs">Matched</p>
                    <p className="font-bold text-lg text-green-600">{selectedStatement.matched_count}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-gray-600 text-xs">Unmatched</p>
                    <p className="font-bold text-lg text-orange-600">{selectedStatement.unmatched_count}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-gray-600 text-xs">Match Rate</p>
                    <p className="font-bold text-lg text-blue-600">
                      {selectedStatement.total_transactions > 0 
                        ? Math.round((selectedStatement.matched_count / selectedStatement.total_transactions) * 100) 
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* Filter */}
                <div className="mt-4 flex items-center space-x-2">
                  <Filter size={16} className="text-gray-600" />
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={unmatchedOnly}
                      onChange={(e) => setUnmatchedOnly(e.target.checked)}
                      className="form-checkbox"
                    />
                    <span className="text-sm text-gray-700">Show unmatched only</span>
                  </label>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No transactions to display</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Reference</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Debit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Credit</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTransactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {formatDate(txn.transaction_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={txn.description}>
                              {txn.description}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{txn.reference || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">
                            {txn.debit_amount > 0 ? formatCurrency(txn.debit_amount) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">
                            {txn.credit_amount > 0 ? formatCurrency(txn.credit_amount) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {txn.is_matched ? (
                              <div className="flex flex-col items-center">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                  <CheckCircle size={12} className="mr-1" />
                                  Matched
                                </span>
                                {txn.matched_entry_number && (
                                  <span className="text-xs text-gray-500 mt-1">{txn.matched_entry_number}</span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                                <XCircle size={12} className="mr-1" />
                                Unmatched
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {txn.is_matched && (
                              <button
                                onClick={() => unmatchTransaction(txn.id)}
                                disabled={loading}
                                className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                              >
                                Unmatch
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {report && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Reconciliation Report</h2>
              <button onClick={() => setReport(null)} className="hover:bg-blue-700 p-2 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{report.summary.total_transactions}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Matched</p>
                  <p className="text-2xl font-bold text-green-600">{report.summary.matched_count}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Unmatched</p>
                  <p className="text-2xl font-bold text-orange-600">{report.summary.unmatched_count}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Match Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{report.summary.matched_percentage.toFixed(1)}%</p>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">Financial Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Matched Transactions</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Debit:</span>
                        <span className="font-medium text-red-600">{formatCurrency(report.summary.matched_debit_total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Credit:</span>
                        <span className="font-medium text-green-600">{formatCurrency(report.summary.matched_credit_total)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Unmatched Transactions</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Debit:</span>
                        <span className="font-medium text-red-600">{formatCurrency(report.summary.unmatched_debit_total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Credit:</span>
                        <span className="font-medium text-green-600">{formatCurrency(report.summary.unmatched_credit_total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
              <button
                onClick={() => setReport(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankReconciliation;

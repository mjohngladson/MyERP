import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Clock, FileText, Users, Package, DollarSign, 
  ArrowRight, X, Filter, Star, Calendar, Building, ShoppingCart, Receipt, Truck
} from 'lucide-react';
import { api } from '../services/api';

const GlobalSearch = ({ isOpen, onClose, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([
    'Sales Order SO-2024-001',
    'Customer ABC Corp',
    'Product A',
    'Invoice SINV-2024-001'
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showFullResults, setShowFullResults] = useState(false);
  const searchInputRef = useRef(null);
  const debounceTimer = useRef(null);

  // Icon mapping for different types
  const getTypeIcon = (type) => {
    const icons = {
      customer: Users,
      supplier: Truck,
      item: Package,
      sales_order: ShoppingCart,
      quotation: FileText,
      purchase_order: Receipt,
      purchase_invoice: DollarSign,
      credit_note: FileText,
      debit_note: FileText,
      transaction: FileText,
      invoice: DollarSign,
      sales_invoice: DollarSign,
      employee: Users
    };
    return icons[type] || FileText;
  };

  // Color mapping for different types
  const getTypeColor = (type) => {
    const colors = {
      customer: 'blue',
      supplier: 'green',
      item: 'purple',
      sales_order: 'orange',
      quotation: 'cyan',
      purchase_order: 'indigo',
      purchase_invoice: 'red',
      credit_note: 'pink',
      debit_note: 'yellow',
      transaction: 'gray',
      invoice: 'orange',
      sales_invoice: 'orange',
      employee: 'indigo'
    };
    return colors[type] || 'gray';
  };

  // Fetch suggestions for autocomplete
  const fetchSuggestions = async (searchQuery) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.search.suggestions(searchQuery);
      const list = response?.data?.suggestions || response?.data || response?.suggestions || [];
      setSuggestions(list);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch full search results
  const fetchSearchResults = async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.search.global(searchQuery);
      const apiResults = (response && response.data && (response.data.results || response.data)) || [];
      const arr = Array.isArray(apiResults) ? apiResults : [];

      const transformedResults = arr.map(result => ({
        id: result.id || result._id || result.url || result.title,
        type: result.type || 'transaction',
        title: result.title || result.text || 'Result',
        subtitle: result.subtitle || result.category || '',
        description: result.description || '',
        icon: getTypeIcon(result.type || 'transaction'),
        color: getTypeColor(result.type || 'transaction'),
        category: ((result.type || 'Result').charAt(0).toUpperCase() + (result.type || 'Result').slice(1).replace('_', ' ')),
        path: result.url,
        relevance: result.relevance || 0
      }));
      
      setResults(transformedResults);
    } catch (error) {
      console.error('Error fetching search results:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new timer for debounced search
    debounceTimer.current = setTimeout(() => {
      if (searchTerm.length >= 2) {
        if (!showFullResults) {
          fetchSuggestions(searchTerm);
        } else {
          fetchSearchResults(searchTerm);
        }
      } else {
        setSuggestions([]);
        setResults([]);
        setSelectedIndex(-1);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm, showFullResults]);

  const handleKeyDown = (e) => {
    const items = showFullResults ? results : suggestions;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        if (showFullResults && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        } else if (suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
      } else if (searchTerm.trim().length >= 2) {
        // Enter without selection shows full results
        setShowFullResults(true);
        fetchSearchResults(searchTerm);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const inferPathFromType = (result) => {
    switch (result.type) {
      case 'sales_order':
        return '/sales/orders';
      case 'invoice':
      case 'sales_invoice':
        return '/sales/invoices';
      case 'purchase_order':
        return '/buying/purchase-orders';
      case 'purchase_invoice':
        return '/buying/purchase-invoices';
      case 'item':
        return '/stock/items';
      case 'customer':
        return '/sales/customers';
      case 'supplier':
        return '/buying/suppliers';
      default:
        return '/';
    }
  };


  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.title || suggestion.text || suggestion);
    setShowFullResults(true);
    fetchSearchResults(suggestion.title || suggestion.text || suggestion);
  };

  const handleResultClick = (result) => {
    // Add to recent searches
    const newRecent = [result.title, ...recentSearches.filter(s => s !== result.title)].slice(0, 5);
    setRecentSearches(newRecent);
    try { localStorage.setItem('gili_recent_searches', JSON.stringify(newRecent)); } catch (e) { /* no-op */ }
    
    if (onNavigate) {
      // Navigate to individual detail pages based on result type and ID
      let path;
      switch (result.type) {
        case 'customer':
          path = `/sales/customers/${result.id}`;
          break;
        case 'supplier':
          path = `/buying/suppliers/${result.id}`;
          break;
        case 'item':
          path = `/stock/items/${result.id}`;
          break;
        case 'sales_order':
          path = `/sales/orders/${result.id}`;
          break;
        case 'sales_invoice':
        case 'invoice':
          path = `/sales/invoices/${result.id}`;
          break;
        case 'purchase_order':
          path = `/buying/purchase-orders/${result.id}`;
          break;
        case 'purchase_invoice':
          path = `/buying/purchase-invoices/${result.id}`;
          break;
        case 'quotation':
          path = `/sales/quotations/${result.id}`;
          break;
        case 'credit_note':
          path = `/sales/credit-notes/${result.id}`;
          break;
        case 'debit_note':
          path = `/buying/debit-notes/${result.id}`;
          break;
        default:
          path = result.path || inferPathFromType(result);
      }
      onNavigate(path);
    }
    onClose();
  };

  const handleRecentClick = (searchTerm) => {
    setSearchTerm(searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setResults([]);
    setSuggestions([]);
    setSelectedIndex(-1);
    setShowFullResults(false);
  };

  const groupedResults = results.reduce((groups, result) => {
    const category = result.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(result);
    return groups;
  }, {});

  if (!isOpen) return null;

  // Close on global escape
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div className="w-full max-w-2xl mx-4" onClick={(e)=>e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Search Input */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search anything... (customers, orders, items, invoices)"
                className="w-full pl-10 pr-12 py-3 border-0 focus:outline-none text-lg"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results or Recent Searches */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Searching...</p>
              </div>
            ) : searchTerm.length >= 2 ? (
              showFullResults ? (
                // Full Search Results
                <div className="py-2">
                  {results.length === 0 ? (
                    <div className="p-8 text-center">
                      <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No results found</p>
                      <p className="text-gray-400 text-sm">Try different keywords or check spelling</p>
                    </div>
                  ) : (
                    <div>
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-sm font-medium text-gray-700">Search Results ({results.length})</h3>
                      </div>
                      {results.map((result, index) => {
                        const IconComponent = result.icon;
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-50 transition-colors ${
                              index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                          >
                            <div className={`w-10 h-10 bg-${result.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <IconComponent className={`text-${result.color}-600`} size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-800 truncate">{result.title}</div>
                              <div className="text-sm text-gray-500 truncate">{result.subtitle}</div>
                              {result.description && (
                                <div className="text-xs text-gray-400 truncate mt-0.5">{result.description}</div>
                              )}
                            </div>
                            <ArrowRight size={14} className="text-gray-400" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // Suggestions/Autocomplete
                <div className="py-2">
                  {suggestions.length === 0 ? (
                    <div className="p-6 text-center">
                      <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Type more to see suggestions</p>
                    </div>
                  ) : (
                    <div>
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-sm font-medium text-gray-700">Suggestions</h3>
                      </div>
                      {suggestions.map((suggestion, index) => {
                        const IconComponent = getTypeIcon(suggestion.type);
                        const color = getTypeColor(suggestion.type);
                        return (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-50 transition-colors ${
                              index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                          >
                            <div className={`w-6 h-6 bg-${color}-100 rounded flex items-center justify-center flex-shrink-0`}>
                              <IconComponent className={`text-${color}-600`} size={14} />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm text-gray-800">{suggestion.text}</span>
                              <span className="text-xs text-gray-500 ml-2">in {suggestion.category}</span>
                            </div>
                            <ArrowRight size={12} className="text-gray-400" />
                          </button>
                        );
                      })}
                      
                      {searchTerm.length >= 2 && (
                        <button
                          onClick={() => {
                            setShowFullResults(true);
                            fetchSearchResults(searchTerm);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 border-t border-gray-100 flex items-center text-blue-600"
                        >
                          <Search size={16} className="mr-3" />
                          <span className="text-sm font-medium">
                            Search all for "{searchTerm}"
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            ) : (
              // Recent Searches
              <div className="py-2">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center">
                    <Clock className="mr-2" size={16} />
                    Recent Searches
                  </h3>
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentClick(search)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-50 transition-colors"
                  >
                    <Clock className="text-gray-400" size={16} />
                    <span className="text-gray-700">{search}</span>
                  </button>
                ))}
                
                {/* Quick Actions */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 mt-4">
                  <h3 className="text-sm font-medium text-gray-700">Quick Actions</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4">
                  <button onClick={() => { onNavigate('/sales/orders'); onClose(); }} className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <FileText className="text-blue-600" size={16} />
                    <span className="text-sm font-medium text-blue-800">New Sales Order</span>
                  </button>
                  <button onClick={() => { onNavigate('/sales/customers'); onClose(); }} className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <Users className="text-green-600" size={16} />
                    <span className="text-sm font-medium text-green-800">Add Customer</span>
                  </button>
                  <button onClick={() => { onNavigate('/stock/entry'); onClose(); }} className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                    <Package className="text-purple-600" size={16} />
                    <span className="text-sm font-medium text-purple-800">Stock Entry</span>
                  </button>
                  <button onClick={() => { onNavigate('/sales/invoices'); onClose(); }} className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                    <DollarSign className="text-orange-600" size={16} />
                    <span className="text-sm font-medium text-orange-800">Create Invoice</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <kbd className="bg-white px-2 py-1 rounded border text-gray-600">↑↓</kbd>
                  <span>navigate</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="bg-white px-2 py-1 rounded border text-gray-600">enter</kbd>
                  <span>select</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="bg-white px-2 py-1 rounded border text-gray-600">esc</kbd>
                  <span>close</span>
                </span>
              </div>
              <span>Search across all modules</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
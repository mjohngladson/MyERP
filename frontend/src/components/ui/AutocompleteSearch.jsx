import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const AutocompleteSearch = ({
  options = [],
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search...',
  displayField = 'name',
  searchFields = ['name'],
  className = '',
  disabled = false,
  allowCustom = true,
  customPlaceholder = 'Or enter custom value',
  loading = false,
  noResultsText = 'No results found',
  renderOption = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
      return;
    }

    const filtered = options.filter(option => {
      return searchFields.some(field => {
        const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], option);
        return fieldValue?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
    });

    setFilteredOptions(filtered);
    setHighlightedIndex(-1);
  }, [searchTerm, options, searchFields]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCustomInput(false);
        if (!value && searchTerm) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, searchTerm]);

  // Update search term when value changes externally
  useEffect(() => {
    if (value) {
      const selectedOption = options.find(option => 
        (typeof option === 'string' ? option : option[displayField]) === value
      );
      if (selectedOption) {
        setSearchTerm(typeof selectedOption === 'string' ? selectedOption : selectedOption[displayField]);
        setShowCustomInput(false);
      } else if (allowCustom) {
        setSearchTerm(value);
        setShowCustomInput(true);
      }
    } else {
      setSearchTerm('');
      setShowCustomInput(false);
    }
  }, [value, options, displayField, allowCustom]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    onChange?.(newValue);

    // Show custom input if no exact match and custom is allowed
    if (allowCustom && newValue) {
      const hasExactMatch = options.some(option => 
        (typeof option === 'string' ? option : option[displayField]).toLowerCase() === newValue.toLowerCase()
      );
      setShowCustomInput(!hasExactMatch);
    }
  };

  const handleOptionSelect = (option) => {
    const displayValue = typeof option === 'string' ? option : option[displayField];
    setSearchTerm(displayValue);
    setIsOpen(false);
    setShowCustomInput(false);
    setHighlightedIndex(-1);
    
    onSelect?.(option);
    onChange?.(displayValue);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        } else if (allowCustom && searchTerm) {
          // Allow selecting custom value with Enter
          setIsOpen(false);
          setShowCustomInput(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    setSearchTerm('');
    setShowCustomInput(false);
    setIsOpen(false);
    onChange?.('');
    onSelect?.(null);
    inputRef.current?.focus();
  };

  const defaultRenderOption = (option, index) => {
    const displayValue = typeof option === 'string' ? option : option[displayField];
    const isHighlighted = index === highlightedIndex;
    
    return (
      <div
        key={typeof option === 'string' ? option : option.id || index}
        className={`px-3 py-2 cursor-pointer text-sm ${
          isHighlighted ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
        }`}
        onClick={() => handleOptionSelect(option)}
        onMouseEnter={() => setHighlightedIndex(index)}
      >
        {displayValue}
        {typeof option === 'object' && option.subtitle && (
          <div className="text-xs text-gray-500 mt-1">{option.subtitle}</div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-8 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
        />
        
        {/* Icons */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {loading && (
            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
          )}
          {searchTerm && !disabled && (
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-gray-100 rounded"
              type="button"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
          {!loading && (
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => 
              renderOption ? renderOption(option, index, highlightedIndex === index) : defaultRenderOption(option, index)
            )
          ) : searchTerm ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              {noResultsText}
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              Start typing to search...
            </div>
          )}
        </div>
      )}

      {/* Custom Input (when no exact match found) */}
      {showCustomInput && allowCustom && (
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder={customPlaceholder}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2 text-sm bg-blue-50"
        />
      )}
    </div>
  );
};

export default AutocompleteSearch;
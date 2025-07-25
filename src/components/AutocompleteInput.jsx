import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../utils/icons.jsx';

const AutocompleteInput = ({ 
  value, 
  onChange, 
  onSelect,
  suggestions = [],
  placeholder = '',
  className = '',
  required = false,
  t = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter suggestions based on current input
  const filteredSuggestions = useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 10); // Show top 10 when empty
    
    const query = value.toLowerCase();
    return suggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(query)
      )
      .slice(0, 10) // Limit to 10 suggestions
      .sort((a, b) => {
        // Prioritize suggestions that start with the query
        const aStarts = a.toLowerCase().startsWith(query);
        const bStarts = b.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
  }, [value, suggestions]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  // Handle input blur (with delay to allow clicks on suggestions)
  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion);
    if (onSelect) onSelect(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      
      case 'Enter':
      case 'Tab':
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          e.preventDefault();
          const selectedSuggestion = filteredSuggestions[highlightedIndex];
          handleSuggestionClick(selectedSuggestion);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedItem = listRef.current.children[highlightedIndex];
      if (highlightedItem) {
        highlightedItem.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
          required={required}
          autoComplete="off"
        />
        
        {/* Autocomplete indicator */}
        {filteredSuggestions.length > 0 && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <Icon 
              name="chevronDown" 
              size={16} 
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <ul ref={listRef} className="py-1">
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
                  index === highlightedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
          
          {/* Hint text */}
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Icon name="keyboard" size={12} />
              <span>
                {t.useArrowKeysToNavigate || 'Use ↑↓ to navigate, Enter/Tab to select, Esc to close'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;

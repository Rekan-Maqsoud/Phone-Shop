import React, { useState, useRef, useEffect, useMemo } from 'react';

export default function SearchableSelect({ 
  options = [], 
  value = '', 
  onChange, 
  placeholder = 'Search or select...', 
  className = '',
  disabled = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  // Memoize filtered options to prevent infinite re-renders
  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return options;
    } else {
      return options.filter(option => 
        option.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [searchTerm, options]);

  // Update search term when value changes externally
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    if (disabled) return;
    
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // Call onChange immediately for better responsiveness
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleOptionClick = (option) => {
    setSearchTerm(option);
    setIsOpen(false);
    
    // Call onChange immediately
    if (onChange) {
      onChange(option);
    }
    
    // Blur input after selection
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleOptionClick(filteredOptions[0]);
      } else if (searchTerm) {
        // Allow custom values even if no matches
        handleOptionClick(searchTerm);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      />
      
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              onClick={() => handleOptionClick(option)}
              className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
            >
              {option}
            </div>
          ))}
        </div>
      )}
      
      {isOpen && !disabled && filteredOptions.length === 0 && searchTerm && (
        <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            No matches found. Press Enter to use "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useRef, useEffect } from 'react';

// Legacy ProductSearchForm - keeping for backward compatibility
// New cashier uses the simplified CashierSearchForm in CashierContent.jsx
export default function ProductSearchForm({
  t,
  theme,
  search,
  quantity,
  loading,
  suggestions,
  showSuggestions,
  selectedSuggestionIndex,
  isDebt,
  customerName,
  handleSearchInput,
  handleQuantityInput,
  handleSearchSubmit,
  handleSuggestionClick,
  setShowSuggestions,
  setIsDebt,
  setCustomerName
}) {
  const inputRef = useRef();

  // Ensure input focus management
  useEffect(() => {
    // Focus the input on mount and when suggestions close
    if (inputRef.current && !showSuggestions && !loading.price) {
      // Use a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showSuggestions, loading.price]);

  // Re-focus input when search is cleared
  useEffect(() => {
    if (!search && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [search]);

  return (
    <div className="w-full max-w-6xl">
      <form onSubmit={handleSearchSubmit} className="flex gap-3 items-center">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            className="w-full border-2 border-blue-300 dark:border-blue-700 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 shadow-lg transition-all"
            placeholder={t.searchProducts || 'Search products...'}
            value={search}
            onChange={handleSearchInput}
            autoFocus
            disabled={loading.price}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {/* Suggestions overlay */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-2 w-full z-50 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-xl shadow-2xl animate-fade-in overflow-hidden max-h-60 overflow-y-auto">
              {suggestions.map((p, idx) => (
                <button
                  key={p.id ? p.id + '-' + (p.model || idx) : idx}
                  type="button"
                  onClick={() => handleSuggestionClick(p)}
                  className={`flex w-full items-center justify-between px-4 py-3 transition-colors text-left border-b last:border-b-0 border-blue-100 dark:border-blue-800 ${
                    idx === selectedSuggestionIndex
                      ? 'bg-blue-500 text-white dark:bg-blue-600'
                      : 'hover:bg-blue-50 dark:hover:bg-blue-900 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100'
                  }`}
                >
                  <div>
                    <span className={`font-bold ${
                      idx === selectedSuggestionIndex ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {p.name}
                    </span>
                    <div className="flex gap-2 mt-1">
                      {p.model && <span className={`text-sm px-2 py-1 rounded ${
                        idx === selectedSuggestionIndex ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>{p.model}</span>}
                      {p.ram && <span className={`text-sm px-2 py-1 rounded ${
                        idx === selectedSuggestionIndex ? 'bg-purple-400 text-white' : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
                      }`}>{p.ram}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      idx === selectedSuggestionIndex ? 'text-white' : 'text-green-600 dark:text-green-400'
                    }`}>
                      ${p.buying_price || 0}
                    </div>
                    <div className={`text-sm ${
                      idx === selectedSuggestionIndex ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      Stock: {p.stock}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quantity Input */}
        <div className="w-20">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={handleQuantityInput}
            className="w-full border-2 border-blue-300 dark:border-blue-700 rounded-xl px-3 py-2 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 shadow-lg transition-all"
            placeholder={t.quantity || 'Qty'}
            disabled={loading.price}
          />
        </div>

        {/* Add Button */}
        <button
          type="submit"
          disabled={loading.price || !search.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading.price ? '...' : t.add || 'Add'}
        </button>
      </form>
    </div>
  );
}

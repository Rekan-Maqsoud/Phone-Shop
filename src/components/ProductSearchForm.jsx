import React, { useRef } from 'react';

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

  return (
    <div className="w-full max-w-3xl mx-auto mb-4 mt-2">
      <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2 items-center bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-2xl p-3 border border-white/20 relative">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 border-2 border-blue-300 dark:border-blue-700 rounded-xl px-4 py-2 text-xl font-semibold focus:outline-none focus:ring-4 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 dark:placeholder-gray-400 placeholder-gray-400 dark:placeholder-gray-400 shadow-md transition-all"
          placeholder={t.enterProductName || 'Enter product name'}
          value={search}
          onChange={handleSearchInput}
          autoFocus
          disabled={loading.price}
          onFocus={() => setShowSuggestions(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        />
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={handleQuantityInput}
          className="w-20 border-2 border-blue-300 dark:border-blue-700 rounded-xl px-2 py-2 text-xl font-semibold focus:outline-none focus:ring-4 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 shadow-md transition-all"
          placeholder={t.quantity || 'Qty'}
          disabled={loading.price}
          style={{ maxWidth: 80 }}
        />
        {/* Suggestions overlay */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 top-full mt-2 w-full z-50 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-xl shadow-2xl animate-fade-in overflow-hidden">
            {suggestions.map((p, idx) => (
              <button
                key={p.id ? p.id + '-' + (p.model || idx) : idx}
                type="button"
                onClick={() => handleSuggestionClick(p)}
                className={`flex w-full items-center justify-between px-6 py-3 transition-colors rounded-none text-left border-b last:border-b-0 border-blue-100 dark:border-blue-800 ${
                  idx === selectedSuggestionIndex
                    ? 'bg-blue-500 text-white dark:bg-blue-600'
                    : 'hover:bg-blue-50 dark:hover:bg-blue-900 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100'
                }`}
              >
                <div>
                  <span className={`font-bold text-lg ${
                    idx === selectedSuggestionIndex ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {p.name}
                  </span>
                  {p.model && <span className={`ml-2 text-sm ${
                    idx === selectedSuggestionIndex ? 'text-blue-100' : 'text-gray-500'
                  }`}>{p.model}</span>}
                  {p.ram && <span className={`ml-2 text-sm ${
                    idx === selectedSuggestionIndex ? 'text-purple-200' : 'text-purple-500'
                  }`}>{p.ram}</span>}
                  {p.storage && <span className={`ml-2 text-sm ${
                    idx === selectedSuggestionIndex ? 'text-green-200' : 'text-green-500'
                  }`}>{p.storage}</span>}
                </div>
                <span className={`font-bold text-lg ${
                  idx === selectedSuggestionIndex ? 'text-white' : 'text-blue-600 dark:text-blue-300'
                }`}>
                  ${p.price}
                </span>
              </button>
            ))}
          </div>
        )}
        <button
          type="submit"
          className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:scale-105 hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 disabled:opacity-60 text-lg"
          disabled={loading.price}
        >
          {loading.price ? '...' : t.add}
        </button>
      </form>
      {/* Debt Control and Customer Name */}
      <div className="flex flex-wrap items-center gap-2 mt-2 justify-center md:justify-start">
        <label className={`flex items-center gap-2 cursor-pointer select-none text-lg font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
          <input
            type="checkbox"
            checked={isDebt}
            onChange={() => setIsDebt(!isDebt)}
            className="form-checkbox h-5 w-5 text-yellow-600 accent-yellow-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-600 transition"
          />
          {t.debt || 'Debt'}
        </label>
        {/* Customer Name for all sales */}
        <input
          type="text"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          placeholder={isDebt ? (t.customerName || 'Customer name (required)') : (t.customerNameOptional || 'Customer name (optional)')}
          className={`border-2 ${isDebt ? 'border-yellow-400' : 'border-blue-300'} dark:border-blue-700 rounded-xl px-3 py-2 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 text-lg font-semibold shadow focus:outline-none focus:ring-2 ${isDebt ? 'focus:ring-yellow-400 dark:focus:ring-yellow-600' : 'focus:ring-blue-400'} transition`}
          required={isDebt}
        />
      </div>
    </div>
  );
}

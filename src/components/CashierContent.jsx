import React, { useMemo, useState, memo } from 'react';

export default function CashierContent({
  t,
  theme,
  admin,
  products,
  clock,
  total,
  items,
  loading,
  isDebt,
  handleCompleteSale,
  search,
  quantity,
  suggestions,
  showSuggestions,
  selectedSuggestionIndex,
  customerName,
  handleSearchInput,
  handleQuantityInput,
  handleSearchSubmit,
  handleSuggestionClick,
  setShowSuggestions,
  setIsDebt,
  setCustomerName,
  setItems,
  deleteItem,
  showToast,
  isRTL,
  notoFont,
  allItems,
  addOrUpdateItem
}) {
  // Loading fallback
  if (admin.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-2xl text-gray-500 dark:text-gray-300">
        {t.loading}
      </div>
    );
  }

  // No products fallback
  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-2xl text-gray-500 dark:text-gray-300">
        {t.noProducts}
      </div>
    );
  }

  // Formal, wide cashier layout for production use
  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* Left Panel - Cart and Checkout */}
      <div className="w-96 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t.cashier}
            </h1>
            <div className="text-right">
              <div className="text-base text-gray-500 dark:text-gray-400">
                {clock.toLocaleDateString()}
              </div>
              <div className="text-base text-gray-500 dark:text-gray-400">
                {clock.toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          {/* Back to Admin Button */}
          <button
            onClick={() => admin.goToAdmin()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ← {t.backToAdmin}
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t.cart} ({items.length} {t.items})
          </h2>
          
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">🛒</div>
              <p>{t.emptyCart}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.uniqueId || index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 text-lg leading-tight">
                        {item.name}
                      </h3>
                      {(item.brand || item.model || item.ram || item.storage) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.brand && (
                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                              {item.brand}
                            </span>
                          )}
                          {item.model && (
                            <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded">
                              {item.model}
                            </span>
                          )}
                          {item.ram && (
                            <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
                              {item.ram}
                            </span>
                          )}
                          {item.storage && (
                            <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded">
                              {item.storage}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteItem(item.uniqueId)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-base">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newItems = [...items];
                          if (newItems[index].quantity > 1) {
                            newItems[index].quantity -= 1;
                            setItems(newItems);
                          }
                        }}
                        className="w-6 h-6 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium text-gray-900 dark:text-gray-100">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          const newItems = [...items];
                          if (newItems[index].quantity < item.stock) {
                            newItems[index].quantity += 1;
                            setItems(newItems);
                          }
                        }}
                        className="w-6 h-6 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            const newItems = [...items];
                            newItems[index].price = newPrice;
                            newItems[index].selling_price = newPrice; // Update selling_price to ensure total calculation is correct
                            setItems(newItems);
                            
                            // Sound alert and red text if selling under buying price
                            if (newPrice < (item.buying_price || 0)) {
                              import('../utils/sounds.js').then(({ playWarningSound }) => {
                                playWarningSound();
                              });
                            }
                          }}
                          className={`w-16 text-xs text-right bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            item.price < (item.buying_price || 0) 
                              ? 'text-red-600 dark:text-red-400 border-red-500 bg-red-50 dark:bg-red-900/20' 
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">× {item.quantity}</span>
                      </div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
          {/* Customer Name - Required for all sales */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.customerName} *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t.enterCustomerName}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Payment Type */}
          <div className="mb-4">
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.paymentType}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsDebt(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                  !isDebt
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                💳 {t.cash}
              </button>
              <button
                onClick={() => setIsDebt(true)}
                className={`flex-1 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                  isDebt
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                📝 {t.credit}
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="mb-4 text-center">
            <div className="text-lg text-gray-500 dark:text-gray-400 mb-1">
              {t.total}
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              ${total.toFixed(2)}
            </div>
          </div>

          {/* Complete Sale Button */}
          <button
            onClick={handleCompleteSale}
            disabled={items.length === 0 || !customerName.trim() || loading.sale}
            className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading.sale 
              ? t.processing 
              : isDebt 
                ? t.addToCredit 
                : t.completeSale
            }
          </button>
        </div>
      </div>

      {/* Right Panel - Product Search and Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Bar */}
        <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <CashierSearchForm
            t={t}
            search={search}
            quantity={quantity}
            loading={loading}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            selectedSuggestionIndex={selectedSuggestionIndex}
            handleSearchInput={handleSearchInput}
            handleQuantityInput={handleQuantityInput}
            handleSearchSubmit={handleSearchSubmit}
            handleSuggestionClick={handleSuggestionClick}
            setShowSuggestions={setShowSuggestions}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 min-h-0">
          <ProductCardsGrid
            t={t}
            allItems={allItems}
            search={search}
            addOrUpdateItem={addOrUpdateItem}
            showToast={showToast}
          />
        </div>
      </div>
    </div>
  );
}

// Simplified search form for cashier - only product search, no checkout controls
function CashierSearchForm({
  t,
  search,
  quantity,
  loading,
  suggestions,
  showSuggestions,
  selectedSuggestionIndex,
  handleSearchInput,
  handleQuantityInput,
  handleSearchSubmit,
  handleSuggestionClick,
  setShowSuggestions
}) {
  return (
    <div className="w-full">
      <form onSubmit={handleSearchSubmit} className="flex gap-3 items-center">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full border-2 border-blue-300 dark:border-blue-700 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 shadow-lg transition-all"
            placeholder={t.searchProducts}
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
                      ${p.price || p.buying_price || 0}
                    </div>
                    <div className={`text-sm ${
                      idx === selectedSuggestionIndex ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {t.stockLabel}: {p.stock}
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
            className="w-full border-2 border-blue-300 dark:border-blue-700 rounded-xl px-3 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 shadow-lg transition-all"
            placeholder={t.quantity}
            disabled={loading.price}
          />
        </div>

        {/* Add Button */}
        <button
          type="submit"
          disabled={loading.price || !search.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading.price ? '...' : t.add}
        </button>
      </form>
    </div>
  );
}

// New Product Cards Grid Component - Optimized for wide layout
function ProductCardsGrid({ t, allItems, search, addOrUpdateItem, showToast }) {
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  
  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Search filter
      const matchesSearch = !search.trim() || 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(search.toLowerCase())) ||
        (item.model && item.model.toLowerCase().includes(search.toLowerCase()));
      
      // Brand filter  
      const matchesBrand = !brandFilter || 
        (item.brand && item.brand.toLowerCase().includes(brandFilter.toLowerCase()));
      
      // Category filter
      const matchesCategory = !categoryFilter || 
        item.category === categoryFilter || 
        item.itemType === categoryFilter;
        
      // Stock filter
      const matchesStock = !stockFilter || 
        (stockFilter === 'in-stock' && item.stock > 0) ||
        (stockFilter === 'low-stock' && item.stock > 0 && item.stock <= 5) ||
        (stockFilter === 'out-of-stock' && item.stock === 0);
      
      return matchesSearch && matchesBrand && matchesCategory && matchesStock;
    });
  }, [allItems, search, brandFilter, categoryFilter, stockFilter]);

  // Get unique brands for filter dropdown
  const availableBrands = useMemo(() => {
    const brands = [...new Set(allItems.map(item => item.brand).filter(Boolean))];
    return brands.sort();
  }, [allItems]);

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      {/* Compact Filters Bar */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t.allBrands}</option>
              {availableBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t.allCategories}</option>
              <option value="product">{t.phones}</option>
              <option value="accessory">{t.accessories}</option>
            </select>
          </div>
          <div className="flex-1">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t.allStock}</option>
              <option value="in-stock">{t.inStock}</option>
              <option value="low-stock">{t.lowStock}</option>
              <option value="out-of-stock">{t.outOfStock}</option>
            </select>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {filteredItems.length} {t.of} {allItems.length} {t.items}
          </div>
        </div>
      </div>

      {/* Product Grid - Optimized for horizontal layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📱</div>
              <div className="text-xl font-semibold mb-2">{t.noItemsFound}</div>
              <div className="text-sm">{t.tryDifferentFilters}</div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-blue-400/40 scrollbar-track-transparent">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 p-2">
              {filteredItems.map((item) => (
                <ProductCard
                  key={item.uniqueId || `${item.id}-${item.brand}-${item.model}`}
                  item={item}
                  t={t}
                  addOrUpdateItem={addOrUpdateItem}
                  showToast={showToast}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Product Card Component - Memoized for performance
const ProductCard = memo(function ProductCard({ item, t, addOrUpdateItem, showToast }) {
  const handleAddToCart = () => {
    if (item.stock <= 0) {
      showToast(t.outOfStock, 'error');
      return;
    }
    addOrUpdateItem(item, false, 1);
    showToast(`${item.name} ${t.addedToCart}`, 'success');
  };

  const isOutOfStock = item.stock <= 0;
  const isLowStock = item.stock > 0 && item.stock <= 5;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 transition-all duration-200 hover:scale-105 hover:shadow-xl ${isOutOfStock ? 'opacity-60' : ''}`}>
      {/* Header with status */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">
          {item.itemType === 'product' ? '📱' : '🎧'}
        </span>
        {isLowStock && !isOutOfStock && (
          <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
            {t.lowStock}
          </span>
        )}
        {isOutOfStock && (
          <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
            {t.outOfStock}
          </span>
        )}
      </div>
      
      {/* Item Name - Truncated */}
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-lg leading-tight h-12 overflow-hidden line-clamp-2">
        {item.name}
      </h3>
      
      {/* Key details - Brand, RAM, Storage */}
      <div className="space-y-1 mb-3 text-sm text-gray-600 dark:text-gray-400">
        {item.brand && (
          <div className="truncate font-medium text-gray-800 dark:text-gray-200">
            {item.brand}
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {item.ram && (
            <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded">
              {item.ram}
            </span>
          )}
          {item.storage && (
            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
              {item.storage}
            </span>
          )}
        </div>
      </div>
      
      {/* Price and Stock */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-lg font-bold text-green-600 dark:text-green-400">
          ${item.price || item.buying_price || 0}
        </span>
        <span className={`text-sm font-semibold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-blue-600 dark:text-blue-400'}`}>
          {item.stock}
        </span>
      </div>
      
      {/* Add Button - Compact */}
      <button
        onClick={handleAddToCart}
        disabled={isOutOfStock}
        className={`w-full py-1.5 px-2 rounded-lg font-bold text-xs transition-all duration-200 focus:outline-none focus:ring-2 ${
          isOutOfStock
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-blue-500 hover:scale-105 focus:ring-blue-300 shadow-md hover:shadow-lg'
        }`}
      >
        {isOutOfStock ? '✕' : '+'}
      </button>
    </div>
  );
});
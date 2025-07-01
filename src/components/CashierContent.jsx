import React, { useMemo, useState } from 'react';
import CashierSidebar from './CashierSidebar';
import CashierTopBar from './CashierTopBar';
import ProductSearchForm from './ProductSearchForm';

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
        {t.loading || 'Loading...'}
      </div>
    );
  }

  // No products fallback
  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-2xl text-gray-500 dark:text-gray-300">
        {t.noProducts || 'No products found.'}
      </div>
    );
  }

  // Main content
  return (
    <>
      {/* Enhanced Interactive Sidebar */}
      <CashierSidebar 
        t={t}
        clock={clock}
        total={total}
        items={items}
        loading={loading}
        isDebt={isDebt}
        handleCompleteSale={handleCompleteSale}
        setItems={setItems}
        deleteItem={deleteItem}
        showToast={showToast}
      />
      {/* Main Area */}
      <main className="flex-1 flex flex-col items-center justify-start p-8 min-h-0 h-screen bg-transparent relative z-0 overflow-hidden">
        {/* Top Bar */}
        <CashierTopBar 
          t={t}
          clock={clock}
          admin={admin}
        />
        {/* Scan/Search Card */}
        <ProductSearchForm
          t={t}
          theme={theme}
          search={search}
          quantity={quantity}
          loading={loading}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          selectedSuggestionIndex={selectedSuggestionIndex}
          isDebt={isDebt}
          customerName={customerName}
          handleSearchInput={handleSearchInput}
          handleQuantityInput={handleQuantityInput}
          handleSearchSubmit={handleSearchSubmit}
          handleSuggestionClick={handleSuggestionClick}
          setShowSuggestions={setShowSuggestions}
          setIsDebt={setIsDebt}
          setCustomerName={setCustomerName}
        />
        {/* Product Cards Grid */}
        <ProductCardsGrid
          t={t}
          allItems={allItems}
          search={search}
          addOrUpdateItem={addOrUpdateItem}
          showToast={showToast}
        />
      </main>
    </>
  );
}

// New Product Cards Grid Component
function ProductCardsGrid({ t, allItems, search, addOrUpdateItem, showToast }) {
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  
  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Search filter
      const matchesSearch = !search.trim() || 
        item.name.toLowerCase().includes(search.toLowerCase());
      
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
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full min-h-0">
      {/* Advanced Filters */}
      <div className="mb-2 p-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              {t.filterByBrand || 'Filter by Brand'}
            </label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
            >
              <option value="">{t.allBrands || 'All Brands'}</option>
              {availableBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              {t.filterByCategory || 'Filter by Category'}
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
            >
              <option value="">{t.allCategories || 'All Categories'}</option>
              <option value="product">{t.phones || 'Phones'}</option>
              <option value="accessory">{t.accessories || 'Accessories'}</option>
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              {t.filterByStock || 'Filter by Stock'}
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
            >
              <option value="">{t.allStock || 'All Stock'}</option>
              <option value="in-stock">{t.inStock || 'In Stock'}</option>
              <option value="low-stock">{t.lowStock || 'Low Stock (≤5)'}</option>
              <option value="out-of-stock">{t.outOfStock || 'Out of Stock'}</option>
            </select>
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {t.showingItems || 'Showing'} {filteredItems.length} {t.of || 'of'} {allItems.length} {t.items || 'items'}
        </div>
      </div>
      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 flex-1 min-h-0 overflow-y-auto pr-2 pb-8 scrollbar-thin scrollbar-thumb-blue-400/40 scrollbar-track-transparent">
        {filteredItems.map((item) => (
          <ProductCard
            key={item.uniqueId}
            item={item}
            t={t}
            addOrUpdateItem={addOrUpdateItem}
            showToast={showToast}
          />
        ))}
      </div>
      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="text-6xl mb-4">📱</div>
          <div className="text-xl font-semibold mb-2">{t.noItemsFound || 'No items found'}</div>
          <div className="text-sm">{t.tryDifferentFilters || 'Try adjusting your search or filters'}</div>
        </div>
      )}
    </div>
  );
}

// Individual Product Card Component
function ProductCard({ item, t, addOrUpdateItem, showToast }) {
  const handleAddToCart = () => {
    if (item.stock <= 0) {
      showToast(t.outOfStock || 'This item is out of stock', 'error');
      return;
    }
    addOrUpdateItem(item, false, 1);
    showToast(`${item.name} ${t.addedToCart || 'added to cart'}`, 'success');
  };

  const isOutOfStock = item.stock <= 0;
  const isLowStock = item.stock > 0 && item.stock <= 5;

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${isOutOfStock ? 'opacity-60' : ''}`}>
      {/* Item Type Icon */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">
          {item.itemType === 'product' ? '📱' : '🎧'}
        </span>
        {isLowStock && !isOutOfStock && (
          <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full animate-pulse">
            {t.lowStock || 'Low'}
          </span>
        )}
        {isOutOfStock && (
          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
            {t.outOfStock || 'Out'}
          </span>
        )}
      </div>
      
      {/* Item Name */}
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm leading-tight h-10 overflow-hidden">
        {item.name}
      </h3>
      
      {/* Item Details */}
      <div className="space-y-1 mb-3 text-xs text-gray-600 dark:text-gray-400">
        {item.brand && (
          <div className="flex justify-between">
            <span>{t.brand || 'Brand'}:</span>
            <span className="font-medium">{item.brand}</span>
          </div>
        )}
        {item.ram && (
          <div className="flex justify-between">
            <span>{t.ram || 'RAM'}:</span>
            <span className="font-medium">{item.ram}</span>
          </div>
        )}
        {item.storage && (
          <div className="flex justify-between">
            <span>{t.storage || 'Storage'}:</span>
            <span className="font-medium">{item.storage}</span>
          </div>
        )}
        {item.type && (
          <div className="flex justify-between">
            <span>{t.type || 'Type'}:</span>
            <span className="font-medium">{item.type}</span>
          </div>
        )}
      </div>
      
      {/* Price and Stock */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-lg font-bold text-green-600 dark:text-green-400">
          ${item.price}
        </span>
        <span className={`text-sm font-semibold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-blue-600 dark:text-blue-400'}`}>
          {t.stock || 'Stock'}: {item.stock}
        </span>
      </div>
      
      {/* Add Button */}
      <button
        onClick={handleAddToCart}
        disabled={isOutOfStock}
        className={`w-full py-2 px-4 rounded-xl font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
          isOutOfStock
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-blue-500 hover:scale-105 focus:ring-blue-300 shadow-lg hover:shadow-xl'
        }`}
      >
        {isOutOfStock ? (t.outOfStock || 'Out of Stock') : (
          <span className="flex items-center justify-center gap-2">
            <span>+</span>
            {t.addToCart || 'Add to Cart'}
          </span>
        )}
      </button>
    </div>
  );
}

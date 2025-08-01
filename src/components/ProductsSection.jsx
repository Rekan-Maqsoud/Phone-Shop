import React, { useState, useMemo } from 'react';
import ProductTable from './ProductTable';
import QuickAddProduct from './QuickAddProduct';
import ExchangeRateIndicator from './ExchangeRateIndicator';
import { useData } from '../contexts/DataContext';
import { searchProducts, getProductSearchString } from '../utils/productUtils';
import { Icon } from '../utils/icons.jsx';

export default function ProductsSection({ t, admin, handleEditProduct, handleArchiveToggle, loading }) {
  const { products } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  
  // Filter products based on search term and brand
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      if (!product || product.archived) return false;
      
      const matchesBrand = !brandFilter || 
        (product.brand && product.brand.toLowerCase().includes(brandFilter.toLowerCase()));
      
      return matchesBrand;
    });
    
    // Apply search using the enhanced search function
    if (searchTerm) {
      // Use the enhanced search but modify it to include archived filter
      filtered = filtered.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        const searchString = getProductSearchString(product);
        
        return searchString.includes(searchLower);
      });
    }
    
    return filtered;
  }, [products, searchTerm, brandFilter]);

  // Get unique brands for filter dropdown
  const availableBrands = useMemo(() => {
    const brands = [...new Set(products.filter(p => p && !p.archived && p.brand).map(p => p.brand))];
  
    return brands.sort();
  }, [products]);
  
  return (
    <div className="w-full h-full p-8 space-y-8">
      {/* Quick Add Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <QuickAddProduct t={t} onAdd={admin.handleAddProduct} loading={loading} onToast={admin.setToast} showConfirm={admin.showConfirm} />
      </div>
      
      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex flex-row gap-4 items-center">
          {/* Exchange Rate Indicator */}
          <div className="block">
            <ExchangeRateIndicator t={t} showModal={true} size="sm" onToast={admin.setToast} />
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <input
                type="text"
                placeholder={t.searchProducts || 'Search products...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {/* Brand Filter */}
          <div className="w-full md:w-48">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
            >
              <option value="">{t.allBrands || 'All Brands'}</option>
              {availableBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
          
          {/* Clear Filters */}
          {(searchTerm || brandFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setBrandFilter('');
              }}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              {t.clearFilters || 'Clear Filters'}
            </button>
          )}
        </div>
      </div>
      
      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {t.products} {filteredProducts.length > 0 && `(${filteredProducts.length})`}
          </h3>
        </div>
        
        {/* Products Table */}
        <ProductTable
          title=""
          products={filteredProducts}
          t={t}
          lowStockThreshold={admin.lowStockThreshold}
          onEdit={handleEditProduct}
          onArchive={p => handleArchiveToggle(p, true)}
          isArchived={false}
        />
      </div>
    </div>
  );
}

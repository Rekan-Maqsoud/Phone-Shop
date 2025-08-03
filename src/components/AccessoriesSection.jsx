import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { getAccessoryIcon } from '../utils/accessoryUtils';
import QuickAddAccessory from './QuickAddAccessory';
import { Icon } from '../utils/icons.jsx';
import { formatCurrency } from '../utils/exchangeRates';

const AccessoriesSection = ({ 
  t, 
  admin, 
  handleArchiveToggle, 
  handleEditAccessory,
  loading 
}) => {
  const { accessories } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Filter accessories based on search term, brand, and type
  const filteredAccessories = useMemo(() => {
    return accessories.filter(accessory => {
      if (accessory.archived) return false;
      
      const matchesSearch = !searchTerm || 
        accessory.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBrand = !brandFilter || 
        (accessory.brand && accessory.brand.toLowerCase().includes(brandFilter.toLowerCase()));
      
      const matchesType = !typeFilter || 
        (accessory.type && accessory.type.toLowerCase().includes(typeFilter.toLowerCase()));
      
      return matchesSearch && matchesBrand && matchesType;
    });
  }, [accessories, searchTerm, brandFilter, typeFilter]);

  // Get unique brands and types for filter dropdowns
  const availableBrands = useMemo(() => {
    const brands = [...new Set(accessories.filter(a => !a.archived && a.brand).map(a => a.brand))];
    return brands.sort();
  }, [accessories]);

  const availableTypes = useMemo(() => {
    const types = [...new Set(accessories.filter(a => !a.archived && a.type).map(a => a.type))];
    return types.sort();
  }, [accessories]);
  
  return (
    <div className="w-full h-full p-8 space-y-8">
      {/* Quick Add Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <QuickAddAccessory 
          t={t} 
          onAdd={admin.handleAddAccessory} 
          loading={loading} 
          admin={admin}
          showConfirm={admin.showConfirm}
          accessories={accessories}
        />
      </div>
      
      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search Bar */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <input
                type="text"
                placeholder={t.searchAccessories}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-100"
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
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>
          </div>
          
          {/* Brand Filter */}
          <div className="w-48">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-100"
            >
              <option value="">{t.allBrands}</option>
              {availableBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
          
          {/* Type Filter */}
          <div className="w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-100"
            >
              <option value="">{t.allTypes}</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          {/* Clear Filters */}
          {(searchTerm || brandFilter || typeFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setBrandFilter('');
                setTypeFilter('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition whitespace-nowrap"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
        
        {/* Results Summary */}
        {(searchTerm || brandFilter || typeFilter) && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {t.showing} {filteredAccessories.length} {t.of} {accessories.filter(a => !a.archived).length} {t.accessories}
          </div>
        )}
      </div>
      
      {filteredAccessories.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          {searchTerm || brandFilter || typeFilter ? (
            <>
              <p className="text-xl">{t.noAccessoriesFound || 'No accessories found'}</p>
              <p className="text-sm mt-2">{t.tryDifferentSearch || 'Try different search criteria'}</p>
            </>
          ) : (
            <>
              <p className="text-xl">{t.noAccessories || 'No accessories yet'}</p>
              <p className="text-sm mt-2">{t.addFirstAccessory || 'Add your first accessory to get started'}</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">{t.name}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.brand || 'Brand'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.type || 'Type'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.currency || 'Currency'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.buyingPrice || 'Cost'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.stock}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.inventoryValue || 'Inventory Value'}</th>
                  <th className="px-6 py-4 text-center font-bold">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccessories.map((accessory, idx) => (
                  <tr key={accessory.id} className={`border-b dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800/50'} hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors`}>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          {getAccessoryIcon(accessory.type) === 'headphones' && (
                            <path d="M12,1C7,1 3,5 3,10V17A3,3 0 0,0 6,20H8V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H16V20H18A3,3 0 0,0 21,17V10C21,5 17,1 12,1Z"/>
                          )}
                          {getAccessoryIcon(accessory.type) === 'phone' && (
                            <path d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z"/>
                          )}
                          {getAccessoryIcon(accessory.type) === 'cable' && (
                            <path d="M8,3V4H16V3H18V4A2,2 0 0,1 16,6H15V7H16A1,1 0 0,1 17,8V16A1,1 0 0,1 16,17H8A1,1 0 0,1 7,16V8A1,1 0 0,1 8,7H9V6H8A2,2 0 0,1 6,4V3H8M10,5V9H14V5H10Z"/>
                          )}
                          {(!['headphones', 'phone', 'cable'].includes(getAccessoryIcon(accessory.type))) && (
                            <path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/>
                          )}
                        </svg>
                        {accessory.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{accessory.brand || '-'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{accessory.type || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {accessory.currency || 'USD'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-semibold">{formatCurrency(Number(accessory.buying_price || 0), accessory.currency)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        accessory.stock <= 2 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        accessory.stock <= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {accessory.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency((Number(accessory.buying_price || 0)) * (Number(accessory.stock || 0)), accessory.currency)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEditAccessory && handleEditAccessory(accessory)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                          disabled={loading}
                        >
                          {t.edit || 'Edit'}
                        </button>
                        <button
                          onClick={() => handleArchiveToggle(accessory, true)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                          disabled={loading}
                        >
                          {t.archive || 'Archive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessoriesSection;

import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

const AccessoriesSection = ({ 
  t, 
  admin, 
  handleArchiveToggle, 
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.accessories || 'Accessories'}</h2>
        <button
          onClick={() => {
            admin.setEditAccessory(null);
            admin.setShowAccessoryModal(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:scale-105 hover:from-emerald-600 hover:to-green-600 transition-all duration-200"
        >
          {t.addAccessory || 'Add Accessory'}
        </button>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="bg-white/70 dark:bg-gray-800/90 rounded-xl p-4 shadow border border-white/30 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search Bar */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <input
                type="text"
                placeholder={t.searchAccessories || 'Search accessories by name...'}
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
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-100"
            >
              <option value="">{t.allBrands || 'All Brands'}</option>
              {availableBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
          
          {/* Type Filter */}
          <div className="w-full md:w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-100"
            >
              <option value="">{t.allTypes || 'All Types'}</option>
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
              {t.clearFilters || 'Clear Filters'}
            </button>
          )}
        </div>
        
        {/* Results Summary */}
        {(searchTerm || brandFilter || typeFilter) && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {t.showing || 'Showing'} {filteredAccessories.length} {t.of || 'of'} {accessories.filter(a => !a.archived).length} {t.accessories || 'accessories'}
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
        <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">{t.name}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.brand || 'Brand'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.type || 'Type'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.buyingPrice || 'Cost'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.stock}</th>
                  <th className="px-6 py-4 text-center font-bold">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccessories.map((accessory, idx) => (
                  <tr key={accessory.id} className={`border-b dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800/50'} hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors`}>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{accessory.name}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{accessory.brand || '-'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{accessory.type || '-'}</td>
                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-semibold">${accessory.buying_price || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        accessory.stock <= 2 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        accessory.stock <= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {accessory.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            admin.setEditAccessory(accessory);
                            admin.setShowAccessoryModal(true);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                        >
                          {t.edit}
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

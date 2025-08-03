import React, { useState, useMemo } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useSmartSuggestions } from '../utils/smartSuggestions';
import SearchableSelect from './SearchableSelect';

const ACCESSORY_TYPES = [
  'Charger',
  'Cable',
  'Case',
  'Screen Protector',
  'Headphones',
  'Earbuds',
  'Power Bank',
  'Car Charger',
  'Wireless Charger',
  'Adapter',
  'Stand',
  'Speaker',
  'Memory Card',
  'SIM Card',
  'Phone Ring',
  'Mount',
  'Stylus',
  'Cleaning Kit'
];

const ACCESSORY_BRANDS = [
  'Apple',
  'Samsung',
  'Anker',
  'Belkin',
  'Spigen',
  'OtterBox',
  'Logitech',
  'JBL',
  'Sony',
  'Huawei',
  'Xiaomi',
  'OnePlus',
  'Google',
  'Bose',
  'Generic'
];

export default function QuickAddAccessory({ onAdd, accessories = [], loading, t, admin = null, showConfirm = null }) {
  const { t: contextT } = useLocale();
  // Use passed t prop or fallback to context
  const translations = t || contextT;
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [stock, setStock] = useState('1');

  // Use smart suggestions - get all data for accessories
  const { 
    accessoryBrands, 
    accessoryTypes, 
    getAccessoryModelsForBrand,
    allBrands // This includes brands from both products and accessories
  } = useSmartSuggestions();

  // Get suggestions for accessories - combine predefined with data-driven suggestions
  const accessoryBrandSuggestions = useMemo(() => {
    const dataBasedSuggestions = allBrands || []; // Use all brands, not just accessory brands
    return [...new Set([...ACCESSORY_BRANDS, ...dataBasedSuggestions])];
  }, [allBrands]);

  const accessoryTypeSuggestions = useMemo(() => {
    const dataBasedSuggestions = accessoryTypes || [];
    return [...new Set([...ACCESSORY_TYPES, ...dataBasedSuggestions])];
  }, [accessoryTypes]);

  const currentModelOptions = useMemo(() => {
    const dataBasedSuggestions = getAccessoryModelsForBrand ? getAccessoryModelsForBrand(brand) : [];
    return [...new Set([...dataBasedSuggestions])];
  }, [getAccessoryModelsForBrand, brand]);

  const brandOptions = useMemo(() => accessoryBrandSuggestions, [accessoryBrandSuggestions]);
  const typeOptions = useMemo(() => accessoryTypeSuggestions, [accessoryTypeSuggestions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('[QuickAddAccessory] Form submitted with data:', {
      brand,
      model,
      type,
      buyingPrice,
      currency,
      stock
    });
    
    if (!brand.trim()) {
      if (admin?.setToast) {
        admin.setToast(translations.pleaseEnterBrand || 'Please enter brand', 'error');
      }
      return;
    }
    
    if (!type.trim()) {
      if (admin?.setToast) {
        admin.setToast(translations.pleaseEnterType || 'Please enter type', 'error');
      }
      return;
    }
    
    if (!buyingPrice || isNaN(buyingPrice) || parseFloat(buyingPrice) <= 0) {
      if (admin?.setToast) {
        admin.setToast(translations.pleaseEnterValidPrice || 'Please enter a valid price', 'error');
      }
      return;
    }
    
    if (!stock || isNaN(stock) || parseInt(stock) <= 0) {
      if (admin?.setToast) {
        admin.setToast(translations.pleaseEnterValidStock || 'Please enter valid stock', 'error');
      }
      return;
    }

    // Generate name from brand, model, and type
    const nameParts = [brand.trim()];
    if (model.trim()) {
      nameParts.push(model.trim());
    }
    nameParts.push(type.trim());
    const generatedName = nameParts.join(' ');

    const accessoryData = {
      name: generatedName,
      brand: brand.trim(),
      model: model.trim() || null, // Use null instead of 'N/A' for consistency
      type: type.trim(),
      buying_price: parseFloat(buyingPrice), // Match database field name
      currency,
      stock: parseInt(stock),
      archived: 0 // Explicitly set archived status
    };

    onAdd(accessoryData);
    
    // Reset form
    setBrand('');
    setModel('');
    setType('');
    setBuyingPrice('');
    setStock('1');
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
        </svg>
        {translations.quickAddAccessory || 'Quick Add Accessory'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Row: Brand and Model */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.brand || 'Brand'}
            </label>
            <SearchableSelect
              options={brandOptions}
              value={brand}
              onChange={setBrand}
              placeholder={t.selectBrand || 'Select Brand'}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.model || 'Model'}
            </label>
            <SearchableSelect
              options={currentModelOptions}
              value={model}
              onChange={setModel}
              placeholder={t.selectModel || 'Select or type model'}
              className="w-full"
            />
          </div>
        </div>

        {/* Second Row: Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t.type || 'Type'}
          </label>
          <SearchableSelect
            options={typeOptions}
            value={type}
            onChange={setType}
            placeholder={t.selectType || 'Select Type'}
            className="w-full"
          />
        </div>

        {/* Third Row: Price, Currency and Stock */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {translations.buyingPrice || 'Buying Price'}
            </label>
            <input
              type="number"
              step="0.01"
              value={buyingPrice}
              onChange={e => setBuyingPrice(e.target.value)}
              placeholder="0.00"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {translations.currency || 'Currency'}
            </label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="USD">USD</option>
              <option value="IQD">IQD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {translations.stock || 'Stock'}
            </label>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
              placeholder="1"
              min="1"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={loading}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/>
            </svg>
            {loading ? (t.adding || 'Adding...') : (t.addAccessory || 'Add Accessory')}
          </button>
        </div>
      </form>
    </div>
  );
}

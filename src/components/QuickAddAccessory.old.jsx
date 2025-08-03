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
  'Other'
];

const ACCESSORY_BRANDS = [
  'Apple',
  'Samsung',
  'Anker',
  'Belkin',
  'UGREEN',
  'Baseus',
  'Spigen',
  'OtterBox',
  'JBL',
  'Sony',
  'Bose',
  'Generic',
  'Other'
];

export default function QuickAddAccessory({ onAdd, accessories = [], loading, t, admin = null, showConfirm = null }) {
  const { t: contextT } = useLocale();
  // Use passed t prop or fallback to context
  const translations = t || contextT;
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [stock, setStock] = useState(1);

  // Smart suggestions
  const { 
    accessoryBrands, 
    getAccessoryModelsForBrand, 
    accessoryTypes 
  } = useSmartSuggestions();

  // Combine predefined brands with suggestions
  const brandOptions = useMemo(() => {
    const allBrands = [...new Set([...ACCESSORY_BRANDS, ...accessoryBrands])];
    return allBrands.filter(b => b !== 'Other').concat(['Other']);
  }, [accessoryBrands]);

  // Combine predefined types with suggestions
  const typeOptions = useMemo(() => {
    const allTypes = [...new Set([...ACCESSORY_TYPES, ...accessoryTypes])];
    return allTypes.filter(t => t !== 'Other').concat(['Other']);
  }, [accessoryTypes]);

  // Get model suggestions for current brand
  const currentModelOptions = useMemo(() => {
    if (!brand || brand === 'Other') return [];
    const models = getAccessoryModelsForBrand(brand);
    return models.length > 0 ? [...models, 'Other'] : [];
  }, [brand, getAccessoryModelsForBrand]);

  const isOtherBrand = brand === 'Other';
  const isOtherModel = model === 'Other';
  const isOtherType = type === 'Other';

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('[QuickAddAccessory] Form submitted with data:', {
      name,
      brand: isOtherBrand ? customBrand : brand,
      model: isOtherModel ? customModel : model,
      type: isOtherType ? customType : type,
      buyingPrice,
      currency,
      stock
    });
    
    const finalBrand = isOtherBrand ? customBrand : brand;
    const finalModel = isOtherModel ? customModel : model;
    const finalType = isOtherType ? customType : type;
    
    const accessoryData = {
      name: name || `${finalBrand} ${finalType || 'Accessory'}`,
      buying_price: buyingPrice ? parseFloat(buyingPrice) : 0,
      price: buyingPrice ? parseFloat(buyingPrice) : 0, // Use buying price as selling price for accessories
      stock: stock ? parseInt(stock, 10) : 1,
      brand: finalBrand,
      model: finalModel || name, // Use name as model fallback for consistency
      type: finalType,
      currency: currency,
      category: 'accessories',
      archived: 0
    };
    
    console.log('[QuickAddAccessory] Adding accessory:', accessoryData);
    onAdd(accessoryData);
    
    // Reset form
    setName('');
    setBrand('');
    setCustomBrand('');
    setModel('');
    setCustomModel('');
    setType('');
    setCustomType('');
    setBuyingPrice('');
    setCurrency('USD');
    setStock(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/>
        </svg>
        {translations.quickAddAccessory || 'Quick Add Accessory'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Row: Name and Brand */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {translations.name || 'Name'} *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={translations.accessoryName || 'Accessory Name'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
          
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
        </div>

        {/* Custom brand input if needed */}
        {isOtherBrand && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.customBrand || 'Custom Brand'} *
            </label>
            <input
              type="text"
              value={customBrand}
              onChange={e => setCustomBrand(e.target.value)}
              placeholder={t.enterBrand || 'Enter Brand Name'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
        )}

        {/* Second Row: Model and Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.model || 'Model'}
            </label>
            <SearchableSelect
              options={currentModelOptions}
              value={model}
              onChange={setModel}
              placeholder={t.selectModel || 'Select Model'}
              className="w-full"
              disabled={!brand || brand === 'Other'}
            />
          </div>
          
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
        </div>

        {/* Custom model input if needed */}
        {isOtherModel && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.customModel || 'Custom Model'} *
            </label>
            <input
              type="text"
              value={customModel}
              onChange={e => setCustomModel(e.target.value)}
              placeholder={t.enterModel || 'Enter Model'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
        )}

        {/* Custom type input if needed */}
        {isOtherType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.customType || 'Custom Type'} *
            </label>
            <input
              type="text"
              value={customType}
              onChange={e => setCustomType(e.target.value)}
              placeholder={t.enterType || 'Enter Type'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
        )}

        {/* Third Row: Price, Currency and Stock */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.buyingPrice || 'Buying Price'} *
            </label>
            <input 
              type="number" 
              step="0.01"
              value={buyingPrice} 
              onChange={e => setBuyingPrice(e.target.value)} 
              placeholder={t.buyingPrice || 'Buying Price'} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400" 
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.currency || 'Currency'}
            </label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="USD">{t?.usd || 'USD'}</option>
              <option value="IQD">{t?.iqd || 'د.ع IQD'}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.stock || 'Stock'} *
            </label>
            <input 
              type="number" 
              min="1" 
              value={stock} 
              onChange={e => setStock(e.target.value)} 
              placeholder={t.stock || 'Stock'} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400" 
              required 
            />
          </div>
        </div>

        {/* Submit Button */}
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

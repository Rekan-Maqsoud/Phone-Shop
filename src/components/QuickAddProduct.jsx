import React, { useState, useMemo } from 'react';
import { phoneBrands } from './phoneBrands';
import SearchableSelect from './SearchableSelect';

export default function QuickAddProduct({ t, onAdd, loading }) {
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [currency, setCurrency] = useState('IQD');
  const [stock, setStock] = useState(1);

  // Memoize options to prevent recreating arrays on every render
  const brandOptions = useMemo(() => phoneBrands.map(brand => brand.name), []);
  const ramOptions = useMemo(() => ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '18GB', '24GB'], []);
  const storageOptions = useMemo(() => ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'], []);

  const isOtherBrand = brand === 'Other';
  const isOtherModel = model === 'Other';
  const models = !isOtherBrand && brand ? phoneBrands.find(b => b.name === brand)?.models || [] : [];

  const handleSubmit = e => {
    e.preventDefault();
    // Ask for confirmation if RAM or Storage is empty
    if (!ram || !storage) {
      const proceed = window.confirm(t.missingRamStorageConfirm || 'RAM or Storage is empty. Are you sure you want to add this product?');
      if (!proceed) return;
    }
    
    const finalBrand = isOtherBrand ? customBrand : brand;
    const finalModel = isOtherModel || isOtherBrand ? customModel : model;
    
    onAdd({
      name: finalModel || `${finalBrand} Phone`, // Fallback name if model is empty
      buying_price: buyingPrice ? parseFloat(buyingPrice) : 0,
      stock: stock ? parseInt(stock, 10) : 1,
      ram,
      storage,
      brand: finalBrand,
      model: finalModel,
      currency: currency,
      category: 'phones'
    });
    
    // Reset form
    setBrand(''); 
    setCustomBrand(''); 
    setModel(''); 
    setCustomModel(''); 
    setRam(''); 
    setStorage(''); 
    setBuyingPrice('');
    setCurrency('IQD');
    setStock(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        <span>⚡</span>
        {t.quickAddProduct || 'Quick Add Product'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Row: Brand and Model */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.company || 'Brand'} *
            </label>
            <SearchableSelect
              options={[...brandOptions, 'Other']}
              value={brand}
              onChange={(value) => {
                setBrand(value);
                setModel('');
                setCustomBrand('');
              }}
              placeholder={t?.selectBrand || 'Select or type brand...'}
            />
          </div>
          
          {isOtherBrand ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.customBrand || 'Custom Brand'} *
              </label>
              <input
                type="text"
                value={customBrand}
                onChange={e => setCustomBrand(e.target.value)}
                placeholder={t.company}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.model || 'Model'} *
              </label>
              <SearchableSelect
                key={`model_${brand}`} // Force re-render when brand changes
                options={brand ? [...models, 'Other'] : []}
                value={model}
                onChange={(value) => setModel(value)}
                placeholder={brand ? (t?.selectModel || 'Select or type model...') : (t?.selectBrandFirst || 'Select brand first')}
              />
            </div>
          )}
        </div>

        {/* Custom model input if needed */}
        {(isOtherModel || isOtherBrand) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.customModel || 'Custom Model'} *
            </label>
            <input
              type="text"
              value={customModel}
              onChange={e => setCustomModel(e.target.value)}
              placeholder={t.model}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
        )}

        {/* Second Row: Specs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.ramPlaceholder || 'RAM'}
            </label>
            <SearchableSelect
              options={ramOptions}
              value={ram}
              onChange={(value) => setRam(value)}
              placeholder={t?.selectRAM || 'Select or type RAM...'}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.storagePlaceholder || 'Storage'}
            </label>
            <SearchableSelect
              options={storageOptions}
              value={storage}
              onChange={(value) => setStorage(value)}
              placeholder={t?.selectStorage || 'Select or type storage...'}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.currency || 'Currency'}
            </label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="IQD">💰 IQD</option>
              <option value="USD">💵 USD</option>
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" 
              required 
            />
          </div>
        </div>

        {/* Price Section */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.buyingPrice || 'Price'} *
            </label>
            <input 
              type="number" 
              step="0.01"
              value={buyingPrice} 
              onChange={e => setBuyingPrice(e.target.value)} 
              placeholder={t.buyingPrice || 'Price'} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" 
              required 
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={loading}
          >
            <span>➕</span>
            {loading ? (t.adding || 'Adding...') : (t.addProduct || 'Add Product')}
          </button>
        </div>
      </form>
    </div>
  );
}

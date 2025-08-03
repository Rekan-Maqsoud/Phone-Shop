import React, { useState, useMemo } from 'react';
import { phoneBrands } from './phoneBrands';
import SearchableSelect from './SearchableSelect';
import { useSmartSuggestions } from '../utils/smartSuggestions';

export default function QuickAddProduct({ t, onAdd, loading, onToast = null, showConfirm = null, admin = null }) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [currency, setCurrency] = useState('IQD');
  const [stock, setStock] = useState(1);

  // Get smart suggestions from existing data
  const { 
    productBrands, 
    getProductModelsForBrand, 
    existingRamOptions, 
    existingStorageOptions 
  } = useSmartSuggestions();

  // Combine predefined brands with existing data brands
  const brandOptions = useMemo(() => {
    const predefinedBrands = phoneBrands.map(brand => brand.name);
    const allBrands = [...new Set([...predefinedBrands, ...productBrands])];
    return allBrands.sort((a, b) => a.localeCompare(b));
  }, [productBrands]);

  // Combine predefined RAM options with existing data
  const ramOptions = useMemo(() => {
    const predefinedRam = ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '18GB', '24GB', '32GB', '64GB'];
    const allRam = [...new Set([...predefinedRam, ...existingRamOptions])];
    return allRam.sort((a, b) => {
      const aNum = parseInt(a.replace(/[^\d]/g, ''));
      const bNum = parseInt(b.replace(/[^\d]/g, ''));
      return aNum - bNum;
    });
  }, [existingRamOptions]);

  // Combine predefined storage options with existing data
  const storageOptions = useMemo(() => {
    const predefinedStorage = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
    const allStorage = [...new Set([...predefinedStorage, ...existingStorageOptions])];
    return allStorage.sort((a, b) => {
      const aNum = parseInt(a.replace(/[^\d]/g, ''));
      const bNum = parseInt(b.replace(/[^\d]/g, ''));
      return aNum - bNum;
    });
  }, [existingStorageOptions]);

  // Get models for selected brand - combine predefined and existing data
  const models = useMemo(() => {
    if (!brand) return [];
    
    // Get predefined models
    const predefinedModels = phoneBrands.find(b => b.name === brand)?.models || [];
    
    // Get existing models from data
    const existingModels = getProductModelsForBrand(brand);
    
    // Combine and deduplicate
    const allModels = [...new Set([...predefinedModels, ...existingModels])];
    return allModels.sort((a, b) => a.localeCompare(b));
  }, [brand, getProductModelsForBrand]);

  const handleSubmit = e => {
    e.preventDefault();
    console.log('🚀 [QuickAddProduct] Form submitted with:', {
      brand, model, ram, storage, buyingPrice, currency, stock
    });
    
    // Ask for confirmation if RAM or Storage is empty
    if (!ram || !storage) {
      const message = t.missingRamStorageConfirm || 'RAM or Storage is empty. Are you sure you want to add this product?';
      
      if (typeof showConfirm === 'function') {
        showConfirm(message, () => {
          submitProduct();
        });
        return;
      } else {
        // If showConfirm isn't available, use admin.setToast to warn instead
        console.warn('[QuickAddProduct] showConfirm function not available, using toast warning');
        if (admin?.setToast) {
          admin.setToast('Warning: ' + message, 'warning');
        } else {
          // Final fallback to confirm
          const proceed = confirm(message);
          if (!proceed) return;
        }
      }
    }
    
    submitProduct();
  };
  
  const submitProduct = () => {
    const productData = {
      name: model || `${brand} Phone`, // Fallback name if model is empty
      buying_price: buyingPrice ? parseFloat(buyingPrice) : 0,
      stock: stock ? parseInt(stock, 10) : 1,
      ram,
      storage,
      brand: brand,
      model: model,
      currency: currency,
      category: 'phones'
    };
    
    console.log('📦 [QuickAddProduct] Adding product:', productData);
    onAdd(productData);
    
    // Reset form
    setBrand(''); 
    setModel(''); 
    setRam(''); 
    setStorage(''); 
    setBuyingPrice('');
    setCurrency('IQD');
    setStock(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
        </svg>
        {t.quickAddProduct || 'Quick Add Product'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Row: Brand and Model */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.company || 'Brand'} *
            </label>
            <SearchableSelect
              options={brandOptions}
              value={brand}
              onChange={(value) => {
                setBrand(value);
                setModel('');
              }}
              placeholder={t?.selectBrand || 'Select or type brand...'}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.model || 'Model'} *
            </label>
            <SearchableSelect
              key={`model_${brand}`} // Force re-render when brand changes
              options={brand ? models : []}
              value={model}
              onChange={(value) => setModel(value)}
              placeholder={brand ? (t?.selectModel || 'Select or type model...') : (t?.selectBrandFirst || 'Select brand first')}
            />
          </div>
        </div>

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
              <option value="IQD">{t?.iqd || 'د.ع IQD'}</option>
              <option value="USD">{t?.usd || 'USD'}</option>
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

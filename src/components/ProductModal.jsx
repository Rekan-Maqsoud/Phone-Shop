import React, { useRef, useEffect, useState, useMemo } from 'react';
import { phoneBrands } from './phoneBrands';
import SearchableSelect from './SearchableSelect';
import ConfirmModal from './ConfirmModal';

export default function ProductModal({
  show,
  t,
  onClose,
  onSubmit,
  initialProduct,
  loading
}) {
  const isEdit = !!initialProduct;
  const [image, setImage] = useState(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [multiCurrency, setMultiCurrency] = useState({ enabled: false, usdBuyingPrice: 0, iqdBuyingPrice: 0 });
  const nameRef = useRef();

  // Memoize options to prevent recreating arrays on every render
  const brandOptions = useMemo(() => phoneBrands.map(brand => brand.name), []);
  const ramOptions = useMemo(() => ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '18GB', '24GB', '32GB', '64GB'], []);
  const storageOptions = useMemo(() => ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'], []);

  // Initialize state when modal opens or product changes
  useEffect(() => {
    if (show && initialProduct) {
      setBrand(initialProduct.brand || '');
      setModel(initialProduct.model || '');
      setRam(initialProduct.ram || '');
      setStorage(initialProduct.storage || '');
      setMultiCurrency({ enabled: false, usdBuyingPrice: 0, iqdBuyingPrice: 0 });
    } else if (show && !initialProduct) {
      // Reset for new product
      setBrand('');
      setModel('');
      setRam('');
      setStorage('');
      setMultiCurrency({ enabled: false, usdBuyingPrice: 0, iqdBuyingPrice: 0 });
    }
  }, [show, initialProduct?.id]); // Use id to detect product changes

  // Clear model when brand changes
  const handleBrandChange = (value) => {
    setBrand(value);
    if (value !== brand) {
      setModel(''); // Clear model when brand changes
    }
  };

  // Handle model change
  const handleModelChange = (value) => {
    setModel(value);
  };

  useEffect(() => {
    if (show && nameRef.current) nameRef.current.focus();
  }, [show]);

  if (!show) return null;
  // DEBUG: Show modal is rendering
  return (
    <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/40 flex items-center justify-center z-50 transition-opacity duration-200 animate-modal-in" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 scale-95 animate-modal-in" tabIndex="-1">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          {isEdit ? `${t.edit} ${t.products}` : t.addProductTitle}
        </h2>
        <form onSubmit={async e => {
          e.preventDefault();
          const form = e.target;
          
          let product;
          if (multiCurrency.enabled) {
            // Multi-currency product
            if ((multiCurrency.usdBuyingPrice <= 0 && multiCurrency.iqdBuyingPrice <= 0)) {
              // Show error if no prices are set
              alert(t.pleaseSetPrices || 'Please set at least one price');
              return;
            }
            
            product = {
              name: form.name.value,
              buying_price: multiCurrency.usdBuyingPrice || multiCurrency.iqdBuyingPrice,
              stock: parseInt(form.stock.value, 10),
              ram: ram || undefined,
              storage: storage || undefined,
              model: model || undefined,
              brand: brand || undefined,
              category: form.category.value || 'phones',
              currency: 'MULTI', // Special currency to indicate multi-currency product
              multi_currency_pricing: {
                usd_buying_price: multiCurrency.usdBuyingPrice,
                iqd_buying_price: multiCurrency.iqdBuyingPrice
              },
              ...(isEdit ? { id: initialProduct.id, archived: initialProduct.archived ?? 0 } : {})
            };
          } else {
            // Single currency product
            product = {
              name: form.name.value,
              buying_price: parseFloat(form.buying_price.value) || 0,
              stock: parseInt(form.stock.value, 10),
              ram: ram || undefined,
              storage: storage || undefined,
              model: model || undefined,
              brand: brand || undefined,
              category: form.category.value || 'phones',
              currency: form.currency.value || 'IQD',
              ...(isEdit ? { id: initialProduct.id, archived: initialProduct.archived ?? 0 } : {})
            };
          }
          
          // Check if RAM or Storage is empty and show confirmation
          if ((!ram || ram.trim() === '') || (!storage || storage.trim() === '')) {
            setPendingProduct(product);
            setShowConfirm(true);
            return;
          }
          
          await onSubmit(product);
        }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Product Name - Full width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.name || 'Product Name'} *
            </label>
            <input 
              name="name" 
              type="text" 
              placeholder={t.name} 
              key={`name_${initialProduct?.id || 'new'}`}
              defaultValue={initialProduct?.name || ''} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" 
              required 
              ref={nameRef} 
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.brand || 'Brand'}
            </label>
            <SearchableSelect
              options={brandOptions}
              value={brand}
              onChange={handleBrandChange}
              placeholder={t.selectBrand || 'Select or type brand...'}
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.model || 'Model'}
            </label>
            <SearchableSelect
              key={`model_${brand}_${model}`} // Force re-render when brand or model changes
              options={brand ? (phoneBrands.find(b => b.name === brand)?.models || []) : []}
              value={model}
              onChange={handleModelChange}
              placeholder={brand ? (t.selectModel || 'Select or type model...') : 'Select brand first'}
              disabled={!brand}
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.price || 'Price'} *
            </label>
            {!multiCurrency.enabled ? (
              <input 
                name="buying_price" 
                type="number" 
                step="0.01" 
                placeholder={t.price || 'Price'} 
                key={`buying_price_${initialProduct?.id || 'new'}`}
                defaultValue={initialProduct?.buying_price || ''} 
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" 
                required 
              />
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">USD Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={multiCurrency.usdBuyingPrice}
                    onChange={(e) => setMultiCurrency(prev => ({ ...prev, usdBuyingPrice: Number(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">IQD Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={multiCurrency.iqdBuyingPrice}
                    onChange={(e) => setMultiCurrency(prev => ({ ...prev, iqdBuyingPrice: Number(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.stock || 'Stock'} *
            </label>
            <input 
              name="stock" 
              type="number" 
              step="1" 
              placeholder={t.stock} 
              key={`stock_${initialProduct?.id || 'new'}`}
              defaultValue={initialProduct?.stock || ''} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" 
              required 
            />
          </div>

          {/* RAM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.ramSpecs || 'RAM'}
            </label>
            <SearchableSelect
              options={ramOptions}
              value={ram}
              onChange={setRam}
              placeholder={t.selectRAM || 'Select or type RAM...'}
            />
          </div>

          {/* Storage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.storageSpecs || 'Storage'}
            </label>
            <SearchableSelect
              options={storageOptions}
              value={storage}
              onChange={setStorage}
              placeholder={t.selectStorage || 'Select or type storage...'}
            />
          </div>

          {/* Currency Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t.currency || 'Currency'}
            </label>
            
            {/* Single Currency Selection */}
            {!multiCurrency.enabled && (
              <select 
                name="currency" 
                key={`currency_${initialProduct?.id || 'new'}`}
                defaultValue={initialProduct?.currency || 'IQD'}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="USD">💵 USD</option>
                <option value="IQD">💰 IQD</option>
              </select>
            )}

            {/* Multi-Currency Toggle */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-3">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t?.multiCurrencyPricing || 'Multi-Currency Pricing'}
                </label>
                <button
                  type="button"
                  onClick={() => setMultiCurrency(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    multiCurrency.enabled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {multiCurrency.enabled ? (t?.enabled || 'Enabled') : (t?.disabled || 'Disabled')}
                </button>
              </div>
              
              {multiCurrency.enabled && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t?.multiCurrencyNote || 'Set prices in both USD and IQD. The system will use the appropriate price based on the selected currency during sales.'}
                </div>
              )}
            </div>
          </div>

          {/* Category - Full width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.category || 'Category'}
            </label>
            <select 
              name="category" 
              key={`category_${initialProduct?.id || 'new'}`}
              defaultValue={initialProduct?.category || 'phones'} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="phones">Phones</option>
              <option value="tablets">Tablets</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>

          {/* Action Buttons - Full width */}
          <div className="md:col-span-2 flex justify-end gap-3 mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            >
              {t.cancel}
            </button>
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" 
              disabled={loading}
            >
              {loading ? t.loading : t.save}
            </button>
          </div>
        </form>
      </div>
      
      <ConfirmModal
        open={showConfirm}
        message={t.missingRamStorageConfirm || 'RAM or Storage is empty. Are you sure you want to add this product?'}
        onConfirm={async () => {
          setShowConfirm(false);
          if (pendingProduct) {
            await onSubmit(pendingProduct);
            setPendingProduct(null);
          }
        }}
        onCancel={() => {
          setShowConfirm(false);
          setPendingProduct(null);
        }}
        t={t}
      />
    </div>
  );
}

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
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
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
    } else if (show && !initialProduct) {
      // Reset for new product
      setBrand('');
      setModel('');
      setRam('');
      setStorage('');
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
          
          const product = {
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.currency || 'Currency'}
            </label>
            <select 
              name="currency" 
              key={`currency_${initialProduct?.id || 'new'}`}
              defaultValue={initialProduct?.currency || 'IQD'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="USD">💵 USD</option>
              <option value="IQD">💰 IQD</option>
            </select>
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

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { phoneBrands } from './phoneBrands';
import SearchableSelect from './SearchableSelect';

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
  const [brand, setBrand] = useState(initialProduct?.brand || '');
  const [model, setModel] = useState(initialProduct?.model || '');
  const [ram, setRam] = useState(initialProduct?.ram || '');
  const [storage, setStorage] = useState(initialProduct?.storage || '');
  const nameRef = useRef();

  // Memoize options to prevent recreating arrays on every render
  const brandOptions = useMemo(() => phoneBrands.map(brand => brand.name), []);
  const ramOptions = useMemo(() => ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '18GB', '24GB'], []);
  const storageOptions = useMemo(() => ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'], []);

  // Clear model when brand changes
  const handleBrandChange = (value) => {
    console.log('Brand changing from:', brand, 'to:', value);
    setBrand(value);
    if (value !== brand) {
      setModel(''); // Clear model when brand changes
      console.log('Model cleared due to brand change');
    }
  };

  // Handle model change
  const handleModelChange = (value) => {
    console.log('Model changing to:', value);
    setModel(value);
  };

  useEffect(() => {
    if (show && nameRef.current) nameRef.current.focus();
  }, [show]);

  useEffect(() => {
    // Reset brand and model when modal is opened with new product data
    if (show) {
      setBrand(initialProduct?.brand || '');
      setModel(initialProduct?.model || '');
      setRam(initialProduct?.ram || '');
      setStorage(initialProduct?.storage || '');
    }
  }, [show, initialProduct?.brand, initialProduct?.model, initialProduct?.ram, initialProduct?.storage]);

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
            price: parseFloat(form.price.value),
            buying_price: parseFloat(form.buying_price.value) || parseFloat(form.price.value), // Default to price if not specified
            stock: parseInt(form.stock.value, 10),
            ram: ram || undefined,
            storage: storage || undefined,
            model: model || undefined,
            brand: brand || undefined,
            category: form.category.value || 'phones',
            ...(isEdit ? { id: initialProduct.id, archived: initialProduct.archived ?? 0 } : {})
          };
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

          {/* Buying Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.buyingPrice || 'Buying Price'}
            </label>
            <input 
              name="buying_price" 
              type="number" 
              step="0.01" 
              placeholder={t.buyingPrice || 'Buying Price'} 
              defaultValue={initialProduct?.buying_price || ''} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" 
            />
          </div>

          {/* Selling Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.sellingPrice || 'Selling Price'} *
            </label>
            <input 
              name="price" 
              type="number" 
              step="0.01" 
              placeholder={t.sellingPrice || 'Selling Price'} 
              defaultValue={initialProduct?.price || ''} 
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

          {/* Category - Full width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.category || 'Category'}
            </label>
            <select 
              name="category" 
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
    </div>
  );
}

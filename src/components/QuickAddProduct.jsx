import React, { useState } from 'react';
import { phoneBrands } from './phoneBrands';

const RAM_OPTIONS = [
  '', '2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '18GB', '24GB', '32GB', '64GB'
];
const STORAGE_OPTIONS = [
  '', '8GB', '16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'
];

export default function QuickAddProduct({ t, onAdd, loading }) {
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(1); // Add stock state

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
    onAdd({
      name: isOtherModel || isOtherBrand ? customModel : model,
      price: price ? parseFloat(price) : 0,
      stock: stock ? parseInt(stock, 10) : 1,
      ram,
      storage,
      brand: isOtherBrand ? customBrand : brand,
      // Do NOT send id or archived
    });
    setBrand(''); setCustomBrand(''); setModel(''); setCustomModel(''); setRam(''); setStorage(''); setPrice(''); setStock(1);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2 items-center bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 w-full">
      <select
        value={brand}
        onChange={e => { setBrand(e.target.value); setModel(''); setCustomBrand(''); }}
        className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 min-w-[120px]"
        required
      >
        <option value="" disabled>{t.company || 'Company'}</option>
        {phoneBrands.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
        <option value="Other">{t.other || 'Other'}</option>
      </select>
      {isOtherBrand && (
        <input
          type="text"
          value={customBrand}
          onChange={e => setCustomBrand(e.target.value)}
          placeholder={t.company || 'Company'}
          className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 min-w-[120px]"
          required
        />
      )}
      {/* Model dropdown or text input */}
      {isOtherBrand ? (
        <input
          type="text"
          value={customModel}
          onChange={e => setCustomModel(e.target.value)}
          placeholder={t.model || 'Model'}
          className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 min-w-[120px]"
          required
        />
      ) : (
        <>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 min-w-[120px]"
            required
            disabled={!brand}
          >
            <option value="" disabled>{t.model || 'Model'}</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
            <option value="Other">{t.other || 'Other'}</option>
          </select>
          {isOtherModel && (
            <input
              type="text"
              value={customModel}
              onChange={e => setCustomModel(e.target.value)}
              placeholder={t.model || 'Model'}
              className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 min-w-[120px]"
              required
            />
          )}
        </>
      )}
      {/* RAM dropdown */}
      <select
        value={ram}
        onChange={e => setRam(e.target.value)}
        className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 min-w-[80px]"
      >
        <option value="">RAM (e.g. 8GB)</option>
        {RAM_OPTIONS.map(opt => opt && <option key={opt} value={opt}>{opt}</option>)}
      </select>
      {/* Storage dropdown */}
      <select
        value={storage}
        onChange={e => setStorage(e.target.value)}
        className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 min-w-[80px]"
      >
        <option value="">Storage (e.g. 128GB)</option>
        {STORAGE_OPTIONS.map(opt => opt && <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={t.price} className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 min-w-[80px]" required />
      {/* Stock input */}
      <input type="number" min="1" value={stock} onChange={e => setStock(e.target.value)} placeholder={t.stock || 'Stock'} className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 min-w-[70px]" required />
      <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition min-w-[80px]" disabled={loading}>{t.addProduct}</button>
    </form>
  );
}

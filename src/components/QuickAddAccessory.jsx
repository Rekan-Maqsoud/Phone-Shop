import React, { useState } from 'react';

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

export default function QuickAddAccessory({ t, onAdd, loading }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [stock, setStock] = useState(1);

  const isOtherBrand = brand === 'Other';
  const isOtherType = type === 'Other';

  const handleSubmit = e => {
    e.preventDefault();
    
    const finalBrand = isOtherBrand ? customBrand : brand;
    const finalType = isOtherType ? customType : type;
    
    onAdd({
      name: name,
      buying_price: buyingPrice ? parseFloat(buyingPrice) : 0,
      price: buyingPrice ? parseFloat(buyingPrice) : 0, // Use buying price as selling price for accessories
      stock: stock ? parseInt(stock, 10) : 1,
      brand: finalBrand,
      model: name, // Use name as model for consistency
      type: finalType,
      currency: currency,
      category: 'accessories',
      archived: 0
    });
    
    // Reset form
    setName('');
    setBrand('');
    setCustomBrand('');
    setType('');
    setCustomType('');
    setBuyingPrice('');
    setCurrency('USD');
    setStock(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        <span>🎧</span>
        {t.quickAddAccessory || 'Quick Add Accessory'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Row: Name and Brand */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.name || 'Name'} *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.accessoryName || 'Accessory Name'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.brand || 'Brand'}
            </label>
            <select
              value={brand}
              onChange={e => { setBrand(e.target.value); setCustomBrand(''); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">{t.selectBrand || 'Select Brand'}</option>
              {ACCESSORY_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
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

        {/* Second Row: Type and Currency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.type || 'Type'}
            </label>
            <select
              value={type}
              onChange={e => { setType(e.target.value); setCustomType(''); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">{t.selectType || 'Select Type'}</option>
              {ACCESSORY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
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
              <option value="USD">💵 USD</option>
              <option value="IQD">💰 IQD</option>
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

        {/* Third Row: Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          {/* Submit Button */}
          <div className="flex items-end">
            <button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              <span>🎧</span>
              {loading ? (t.adding || 'Adding...') : (t.addAccessory || 'Add Accessory')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

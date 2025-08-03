import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useSmartSuggestions } from '../utils/smartSuggestions';
import SearchableSelect from './SearchableSelect';
import ConfirmModal from './ConfirmModal';

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

export default function AccessoryModal({
  show,
  t,
  onClose,
  onSubmit,
  initialAccessory,
  loading,
  onToast
}) {
  const isEdit = !!initialAccessory;
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [stock, setStock] = useState('1');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAccessory, setPendingAccessory] = useState(null);
  const nameRef = useRef();

  // Use smart suggestions
  const { 
    accessoryBrands, 
    accessoryTypes, 
    getAccessoryModelsForBrand,
    allBrands
  } = useSmartSuggestions();

  // Get suggestions for accessories - combine predefined with data-driven suggestions
  const accessoryBrandSuggestions = useMemo(() => {
    const dataBasedSuggestions = allBrands || [];
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

  // Initialize state when modal opens or accessory changes
  useEffect(() => {
    if (show && initialAccessory) {
      setName(initialAccessory.name || '');
      setBrand(initialAccessory.brand || '');
      setModel(initialAccessory.model || '');
      setType(initialAccessory.type || '');
      setBuyingPrice(initialAccessory.buying_price?.toString() || '');
      setCurrency(initialAccessory.currency || 'USD');
      setStock(initialAccessory.stock?.toString() || '1');
    } else if (show && !initialAccessory) {
      // Reset for new accessory
      setName('');
      setBrand('');
      setModel('');
      setType('');
      setBuyingPrice('');
      setCurrency('USD');
      setStock('1');
    }
  }, [show, initialAccessory?.id]);

  // Focus name field when modal opens
  useEffect(() => {
    if (show && nameRef.current) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [show]);

  const generateAccessoryName = () => {
    const parts = [];
    if (brand) parts.push(brand);
    if (model) parts.push(model);
    if (type) parts.push(type);
    return parts.join(' ') || '';
  };

  // Auto-generate name when brand, model, or type changes
  useEffect(() => {
    if (!isEdit) { // Only auto-generate for new accessories
      const autoName = generateAccessoryName();
      if (autoName && !name) {
        setName(autoName);
      }
    }
  }, [brand, model, type, isEdit, name]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      onToast?.(t.pleaseEnterName || 'Please enter accessory name', 'error');
      nameRef.current?.focus();
      return;
    }

    if (!buyingPrice || isNaN(Number(buyingPrice)) || Number(buyingPrice) <= 0) {
      onToast?.(t.pleaseEnterValidPrice || 'Please enter a valid price', 'error');
      return;
    }

    if (!stock || isNaN(Number(stock)) || Number(stock) < 0) {
      onToast?.(t.pleaseEnterValidStock || 'Please enter valid stock', 'error');
      return;
    }

    const accessoryData = {
      ...(isEdit && { id: initialAccessory.id }),
      name: name.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      type: type.trim() || null,
      buying_price: Number(buyingPrice),
      currency: currency,
      stock: Number(stock),
      archived: initialAccessory?.archived || 0
    };

    if (isEdit) {
      // Show confirmation for edits
      setPendingAccessory(accessoryData);
      setShowConfirm(true);
    } else {
      onSubmit(accessoryData);
    }
  };

  const handleConfirmSubmit = () => {
    if (pendingAccessory) {
      onSubmit(pendingAccessory);
      setPendingAccessory(null);
    }
    setShowConfirm(false);
  };

  const handleClose = () => {
    setShowConfirm(false);
    setPendingAccessory(null);
    onClose();
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {isEdit ? (t.editAccessory || 'Edit Accessory') : (t.addAccessory || 'Add Accessory')}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
                disabled={loading}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t.name || 'Name'} *
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t.brand || 'Brand'}
                  </label>
                  <SearchableSelect
                    options={brandOptions}
                    value={brand}
                    onChange={setBrand}
                    placeholder={t.selectBrand || 'Select or type brand'}
                    disabled={loading}
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t.type || 'Type'}
                  </label>
                  <SearchableSelect
                    options={typeOptions}
                    value={type}
                    onChange={setType}
                    placeholder={t.selectType || 'Select or type type'}
                    disabled={loading}
                  />
                </div>

                {/* Model */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t.model || 'Model'}
                  </label>
                  <SearchableSelect
                    options={currentModelOptions}
                    value={model}
                    onChange={setModel}
                    placeholder={t.selectModel || 'Select or type model'}
                    disabled={loading}
                  />
                </div>

                {/* Price and Currency */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t.buyingPrice || 'Buying Price'} *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={buyingPrice}
                      onChange={(e) => setBuyingPrice(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                      required
                      disabled={loading}
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                      disabled={loading}
                    >
                      <option value="USD">USD</option>
                      <option value="IQD">IQD</option>
                    </select>
                  </div>
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t.stock || 'Stock'} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
                  disabled={loading}
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (t.processing || 'Processing...') : (isEdit ? (t.update || 'Update') : (t.add || 'Add'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        message={t.confirmEditMessage || 'Are you sure you want to update this accessory?'}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirm(false)}
        t={t}
      />
    </>
  );
}

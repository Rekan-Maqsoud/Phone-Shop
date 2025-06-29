import React, { useRef, useEffect } from 'react';

export default function AccessoryModal({
  show,
  accessory,
  onSave,
  onUpdate,
  onClose,
  t
}) {
  const isEdit = !!accessory;
  const nameRef = useRef();
  
  useEffect(() => {
    if (show && nameRef.current) nameRef.current.focus();
  }, [show]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const accessoryData = {
      name: formData.get('name'),
      buying_price: parseFloat(formData.get('buying_price')) || 0,
      price: parseFloat(formData.get('price')) || 0,
      stock: parseInt(formData.get('stock')) || 0,
      brand: formData.get('brand') || null,
      model: formData.get('model') || null,
      type: formData.get('type') || null,
    };

    if (isEdit) {
      accessoryData.id = accessory.id;
      accessoryData.archived = accessory.archived || 0;
      await onUpdate(accessoryData);
    } else {
      await onSave(accessoryData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          {isEdit ? `${t.edit || 'Edit'} ${t.accessory || 'Accessory'}` : `${t.add || 'Add'} ${t.accessory || 'Accessory'}`}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              {t.name || 'Name'} *
            </label>
            <input
              ref={nameRef}
              name="name"
              type="text"
              defaultValue={accessory?.name || ''}
              className="w-full border rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                {t.buyingPrice || 'Cost Price'} *
              </label>
              <input
                name="buying_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={accessory?.buying_price || accessory?.price || ''}
                className="w-full border rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                {t.sellingPrice || 'Selling Price'} *
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={accessory?.price || ''}
                className="w-full border rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              {t.stock || 'Stock'} *
            </label>
            <input
              name="stock"
              type="number"
              min="0"
              defaultValue={accessory?.stock || ''}
              className="w-full border rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                {t.brand || 'Brand'}
              </label>
              <input
                name="brand"
                type="text"
                defaultValue={accessory?.brand || ''}
                className="w-full border rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                {t.type || 'Type'}
              </label>
              <select
                name="type"
                defaultValue={accessory?.type || ''}
                className="w-full border rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              >
                <option value="">Select Type</option>
                <option value="headphones">Headphones</option>
                <option value="earbuds">Earbuds</option>
                <option value="charger">Charger</option>
                <option value="cable">Cable</option>
                <option value="case">Case</option>
                <option value="screen-protector">Screen Protector</option>
                <option value="power-bank">Power Bank</option>
                <option value="wireless-charger">Wireless Charger</option>
                <option value="speaker">Speaker</option>
                <option value="smartwatch">Smart Watch</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              {t.model || 'Model'}
            </label>
            <input
              name="model"
              type="text"
              defaultValue={accessory?.model || ''}
              className="w-full border rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            />
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-4 py-3 rounded-xl font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition"
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg"
            >
              {isEdit ? (t.update || 'Update') : (t.add || 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

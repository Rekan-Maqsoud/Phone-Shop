import React, { useRef, useEffect, useState } from 'react';

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
  const nameRef = useRef();
  useEffect(() => {
    if (show && nameRef.current) nameRef.current.focus();
  }, [show]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-opacity duration-200 animate-modal-in" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-sm transform transition-all duration-200 scale-95 opacity-0 animate-modal-in" tabIndex="-1">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          {isEdit ? `${t.edit} ${t.products}` : t.addProductTitle}
        </h2>
        <form onSubmit={async e => {
          e.preventDefault();
          const form = e.target;
          const product = {
            name: form.name.value,
            buying_price: parseFloat(form.buying_price.value),
            price: parseFloat(form.price.value),
            stock: parseInt(form.stock.value, 10),
            ram: form.ram.value || undefined,
            storage: form.storage.value || undefined,
            ...(isEdit ? { id: initialProduct.id, archived: initialProduct.archived ?? 0 } : {})
          };
          await onSubmit(product);
        }} className="flex flex-col gap-2">
          <input name="name" type="text" placeholder={t.name} defaultValue={initialProduct?.name || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" required ref={nameRef} />
          <input name="buying_price" type="number" step="0.01" placeholder={t.buyingPrice || 'Buying Price'} defaultValue={initialProduct?.buying_price || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          <input name="price" type="number" step="0.01" placeholder={t.price} defaultValue={initialProduct?.price || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          <input name="stock" type="number" placeholder={t.stock} defaultValue={initialProduct?.stock || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          <div className="flex gap-2">
            <input name="ram" type="text" placeholder="RAM (optional)" defaultValue={initialProduct?.ram || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1" />
            <input name="storage" type="text" placeholder="Storage (optional)" defaultValue={initialProduct?.storage || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <input type="file" accept="image/*" onChange={e => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = ev => setImage(ev.target.result);
                reader.readAsDataURL(file);
              }
            }} className="block" />
            {image && <img src={image} alt="Preview" className="w-10 h-10 rounded object-cover" />}
          </div>
          <button type="submit" className={`relative bg-${isEdit ? 'green' : 'blue'}-600 text-white px-3 py-1 rounded hover:bg-${isEdit ? 'green' : 'blue'}-700 focus:outline-none focus:ring-2 focus:ring-${isEdit ? 'green' : 'blue'}-400 transition`} disabled={loading}>
            {loading && <span className="absolute left-2 top-1/2 -translate-y-1/2"><svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg></span>}
            {isEdit ? t.save : t.addProduct}
          </button>
        </form>
        <button onClick={onClose} className="mt-4 w-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded-lg font-semibold shadow hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition">{t.close}</button>
      </div>
    </div>
  );
}

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
            price: parseFloat(form.price.value),
            stock: parseInt(form.stock.value, 10),
            ram: form.ram.value || undefined,
            storage: form.storage.value || undefined,
            ...(isEdit ? { id: initialProduct.id, archived: initialProduct.archived ?? 0 } : {})
          };
          await onSubmit(product);
        }} className="flex flex-col gap-2">
          <input name="name" type="text" placeholder={t.name} defaultValue={initialProduct?.name || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" required ref={nameRef} />
          <input name="price" type="number" step="0.01" placeholder={t.price} defaultValue={initialProduct?.price || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          <input name="stock" type="number" step="1" placeholder={t.stock} defaultValue={initialProduct?.stock || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          <input name="ram" type="text" placeholder={t.ram || 'RAM'} defaultValue={initialProduct?.ram || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input name="storage" type="text" placeholder={t.storage || 'Storage'} defaultValue={initialProduct?.storage || ''} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition">{t.cancel}</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" disabled={loading}>{loading ? t.loading : t.save}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

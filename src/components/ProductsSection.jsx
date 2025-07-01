import React from 'react';
import ProductTable from './ProductTable';
import QuickAddProduct from './QuickAddProduct';

export default function ProductsSection({ t, admin, handleEditProduct, handleArchiveToggle, loading }) {
  return (
    <div className="space-y-6">
      <QuickAddProduct t={t} onAdd={admin.handleAddProduct} loading={loading} />
      <ProductTable
        title={t.products}
        products={admin.products.filter(p => p && ((typeof p.archived === 'undefined' ? 0 : p.archived) === 0))}
        t={t}
        lowStockThreshold={admin.lowStockThreshold}
        onEdit={handleEditProduct}
        onArchive={p => handleArchiveToggle(p, true)}
        isArchived={false}
      />
    </div>
  );
}

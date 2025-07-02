import React from 'react';
import ProductTable from './ProductTable';
import QuickAddProduct from './QuickAddProduct';
import { useData } from '../contexts/DataContext';

export default function ProductsSection({ t, admin, handleEditProduct, handleArchiveToggle, loading }) {
  const { products } = useData();
  
  return (
    <div className="space-y-6">
      <QuickAddProduct t={t} onAdd={admin.handleAddProduct} loading={loading} />
      <ProductTable
        title={t.products}
        products={products.filter(p => p && ((typeof p.archived === 'undefined' ? 0 : p.archived) === 0))}
        t={t}
        lowStockThreshold={admin.lowStockThreshold}
        onEdit={handleEditProduct}
        onArchive={p => handleArchiveToggle(p, true)}
        isArchived={false}
      />
    </div>
  );
}

import React from 'react';
import ProductTable from './ProductTable';

export default function ArchivedItemsSection({ t, admin, handleArchiveToggle }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.archivedItems || 'Archived Items'}</h2>
      </div>
      
      {/* Archived Products */}
      <div className="mb-8">
        <ProductTable
          title={t.archivedProducts || 'Archived Products'}
          products={admin.products.filter(p => p && ((typeof p.archived === 'undefined' ? 0 : p.archived) === 1))}
          t={t}
          lowStockThreshold={admin.lowStockThreshold}
          onUnarchive={p => handleArchiveToggle(p, false)}
          isArchived={true}
        />
      </div>
      
      {/* Archived Accessories */}
      <div>
        <ProductTable
          title={t.archivedAccessories || 'Archived Accessories'}
          products={admin.accessories.filter(a => a && ((typeof a.archived === 'undefined' ? 0 : a.archived) === 1))}
          t={t}
          lowStockThreshold={admin.lowStockThreshold}
          onUnarchive={a => handleArchiveToggle(a, false)}
          isArchived={true}
          isAccessory={true}
        />
      </div>
    </div>
  );
}

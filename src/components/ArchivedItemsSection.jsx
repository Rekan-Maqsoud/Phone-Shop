import React from 'react';
import ProductTable from './ProductTable';
import { useData } from '../contexts/DataContext';
import { Icon } from '../utils/icons.jsx';

export default function ArchivedItemsSection({ t, admin, handleArchiveToggle }) {
  const { products, accessories } = useData();
  
  return (
    <div className="w-full h-full p-8 space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <Icon name="archived" size={32} className="text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t.archivedItems || 'Archived Items'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {t.archivedItemsDescription || 'View and manage archived products and accessories'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Archived Products */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <ProductTable
          title={t.archivedProducts || 'Archived Products'}
          products={products.filter(p => p && ((typeof p.archived === 'undefined' ? 0 : p.archived) === 1))}
          t={t}
          lowStockThreshold={admin.lowStockThreshold}
          onUnarchive={p => handleArchiveToggle(p, false)}
          isArchived={true}
        />
      </div>
      
      {/* Archived Accessories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <ProductTable
          title={t.archivedAccessories || 'Archived Accessories'}
          products={accessories.filter(a => a && ((typeof a.archived === 'undefined' ? 0 : a.archived) === 1))}
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

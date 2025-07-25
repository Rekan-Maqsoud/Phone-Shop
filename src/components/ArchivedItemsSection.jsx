import React from 'react';
import ProductTable from './ProductTable';
import { useData } from '../contexts/DataContext';
import { Icon } from '../utils/icons.jsx';

export default function ArchivedItemsSection({ t, admin, handleArchiveToggle }) {
  const { products, accessories } = useData();
  
  // Enhanced archive toggle handler for archived items
  const handleUnarchive = async (item, isAccessory = false) => {
    try {
      // Determine which API to use based on item type
      const apiCall = isAccessory ? window.api?.editAccessory : window.api?.editProduct;
      
      if (!apiCall) {
        admin.setToast('API not available for this operation', 'error');
        return;
      }
      
      // Prepare the updated item with proper fields
      const updatedItem = {
        ...item,
        archived: 0, // Unarchive the item
        // Ensure all required fields are present
        name: item.name,
        buying_price: item.buying_price || 0,
        stock: item.stock || 0,
        category: item.category || (isAccessory ? 'accessories' : 'phones'),
        currency: item.currency || 'IQD'
      };
      
      // Add accessory-specific fields if needed
      if (isAccessory) {
        updatedItem.type = item.type || 'other';
      }
      
      const result = await apiCall(updatedItem);
      if (result && result.success) {
        admin.setToast(t.productUnarchived || 'Item unarchived successfully', 'success');
        // Refresh both products and accessories to ensure UI updates
        await admin.refreshProducts();
        await admin.refreshAccessories();
      } else {
        console.error('Unarchive failed:', result);
        admin.setToast(t.unarchiveFailed || 'Failed to unarchive item', 'error');
      }
    } catch (error) {
      console.error('Error unarchiving item:', error);
      admin.setToast(t.unarchiveFailed || 'Failed to unarchive item', 'error');
    }
  };
  
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
          onUnarchive={p => handleUnarchive(p, false)}
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
          onUnarchive={a => handleUnarchive(a, true)}
          isArchived={true}
          isAccessory={true}
        />
      </div>
    </div>
  );
}

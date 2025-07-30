import React, { useState, useEffect } from 'react';
import ProductTable from './ProductTable';
import { useData } from '../contexts/DataContext';
import { Icon } from '../utils/icons.jsx';

export default function ArchivedItemsSection({ t, admin, handleArchiveToggle }) {
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [archivedAccessories, setArchivedAccessories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch archived items separately from DataContext
  const fetchArchivedItems = async () => {
    if (!window.api) {
      console.log('❌ window.api not available');
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔍 Fetching archived items...');
      
      // First, let's check what API functions are available
      console.log('🔧 Available API functions:');
      console.log('  - getArchivedProducts:', typeof window.api.getArchivedProducts);
      console.log('  - getArchivedAccessories:', typeof window.api.getArchivedAccessories);
      console.log('  - getAllProducts:', typeof window.api.getAllProducts);
      console.log('  - getAllAccessories:', typeof window.api.getAllAccessories);
      
      // Let's also try to get all products to see the archive status
      let allProducts = [];
      let allAccessories = [];
      
      if (window.api.getAllProducts) {
        allProducts = await window.api.getAllProducts();
        console.log('📦 All products from getAllProducts:', allProducts.length);
        if (allProducts.length > 0) {
          console.log('📋 Products with their archive status:');
          allProducts.forEach(p => {
            console.log(`  - ${p.name}: archived=${p.archived} (type: ${typeof p.archived})`);
          });
        }
      }
      
      if (window.api.getAllAccessories) {
        allAccessories = await window.api.getAllAccessories();
        console.log('🔧 All accessories from getAllAccessories:', allAccessories.length);
        if (allAccessories.length > 0) {
          console.log('📋 Accessories with their archive status:');
          allAccessories.forEach(a => {
            console.log(`  - ${a.name}: archived=${a.archived} (type: ${typeof a.archived})`);
          });
        }
      }
      
      // Now get archived items using the specific API calls
      const [archivedProductsList, archivedAccessoriesList] = await Promise.all([
        window.api.getArchivedProducts?.() || [],
        window.api.getArchivedAccessories?.() || []
      ]);

      console.log('📦 Archived products fetched:', archivedProductsList?.length || 0);
      console.log('🔧 Archived accessories fetched:', archivedAccessoriesList?.length || 0);

      if (archivedProductsList.length > 0) {
        console.log('📁 Found archived products:', archivedProductsList.map(p => p.name));
      }
      
      if (archivedAccessoriesList.length > 0) {
        console.log('📁 Found archived accessories:', archivedAccessoriesList.map(a => a.name));
      }
      
      // If the specific archived API calls return empty but we have products with archived status,
      // let's filter manually
      if (archivedProductsList.length === 0 && allProducts.length > 0) {
        const manuallyFilteredProducts = allProducts.filter(p => p.archived === 1 || p.archived === '1' || p.archived === true);
        console.log('🔧 Manually filtered archived products:', manuallyFilteredProducts.length);
        if (manuallyFilteredProducts.length > 0) {
          console.log('📁 Manually found archived products:', manuallyFilteredProducts.map(p => p.name));
          setArchivedProducts(manuallyFilteredProducts);
        } else {
          setArchivedProducts(archivedProductsList);
        }
      } else {
        setArchivedProducts(archivedProductsList);
      }
      
      if (archivedAccessoriesList.length === 0 && allAccessories.length > 0) {
        const manuallyFilteredAccessories = allAccessories.filter(a => a.archived === 1 || a.archived === '1' || a.archived === true);
        console.log('🔧 Manually filtered archived accessories:', manuallyFilteredAccessories.length);
        if (manuallyFilteredAccessories.length > 0) {
          console.log('📁 Manually found archived accessories:', manuallyFilteredAccessories.map(a => a.name));
          setArchivedAccessories(manuallyFilteredAccessories);
        } else {
          setArchivedAccessories(archivedAccessoriesList);
        }
      } else {
        setArchivedAccessories(archivedAccessoriesList);
      }

    } catch (error) {
      console.error('❌ Error fetching archived items:', error);
      setArchivedProducts([]);
      setArchivedAccessories([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch archived items on component mount
  useEffect(() => {
    fetchArchivedItems();
  }, []); // Only run on mount

  // Enhanced archive toggle handler for archived items
  const handleUnarchive = async (item, isAccessory = false) => {
    try {
      // Determine which API to use based on item type
      const apiCall = isAccessory ? window.api?.editAccessory : window.api?.editProduct;
      
      if (!apiCall) {
        admin.setToast('API not available for this operation', 'error');
        return;
      }
      
      console.log('🔧 About to unarchive item:', { item, isAccessory });
      console.log('🔧 Item has ID?', item.id);
      
      // Prepare the updated item with proper fields
      const updatedItem = {
        ...item,
        archived: 0, // Unarchive the item
        // Ensure all required fields are present
        id: item.id, // Explicitly include the ID
        name: item.name,
        buying_price: item.buying_price || 0,
        stock: item.stock || 0,
        category: item.category || (isAccessory ? 'accessories' : 'phones'),
        currency: item.currency || 'IQD'
      };
      
      console.log('🔧 Prepared updatedItem:', updatedItem);
      
      // Validate that the item has an ID before attempting the update
      if (!updatedItem.id) {
        console.error('🚨 Cannot unarchive item without ID:', updatedItem);
        admin.setToast(t?.itemHasNoIdCannotUnarchive || 'Error: Item has no ID, cannot unarchive', 'error');
        return;
      }
      
      // Add accessory-specific fields if needed
      if (isAccessory) {
        updatedItem.type = item.type || 'other';
      }
      
      const result = await apiCall(updatedItem);
      if (result && result.success) {
        admin.setToast(t.productUnarchived || 'Item unarchived successfully', 'success');
        // Refresh both the main data context AND our archived items
        await admin.refreshProducts();
        await admin.refreshAccessories();
        await fetchArchivedItems(); // Refresh our local archived items list
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
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
          <button
            onClick={fetchArchivedItems}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Icon name="refresh" size={16} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {/* Archived Products */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <ProductTable
          title={t.archivedProducts || 'Archived Products'}
          products={archivedProducts}
          t={t}
          lowStockThreshold={admin.lowStockThreshold}
          onUnarchive={p => handleUnarchive(p, false)}
          isArchived={true}
          loading={loading}
        />
      </div>
      
      {/* Archived Accessories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <ProductTable
          title={t.archivedAccessories || 'Archived Accessories'}
          products={archivedAccessories}
          t={t}
          lowStockThreshold={admin.lowStockThreshold}
          onUnarchive={a => handleUnarchive(a, true)}
          isArchived={true}
          isAccessory={true}
          loading={loading}
        />
      </div>
    </div>
  );
}

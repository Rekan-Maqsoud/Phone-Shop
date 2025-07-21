import React, { useMemo } from 'react';
import BuyingHistoryTable from './BuyingHistoryTable';
import { useData } from '../contexts/DataContext';
import { Icon } from '../utils/icons.jsx';

export default function BuyingHistorySection({ t, admin, openAddPurchaseModal }) {
  const { refreshBuyingHistory } = useData();

  const handleAddPurchase = () => {
    openAddPurchaseModal();
  };

  // Extract brand from buying history entry
  const getBrandFromBuyingHistory = useMemo(() => (item) => {
    // Check items array first for multi-item purchases
    if (item.items && Array.isArray(item.items)) {
      const brands = item.items
        .map(historyItem => historyItem.brand)
        .filter(brand => brand && brand.trim());
      if (brands.length > 0) {
        return [...new Set(brands)].join(', '); // Remove duplicates and join
      }
    }
    
    // Fallback to direct brand property
    return item.brand || null;
  }, []);

  return (
    <div className="w-full h-full p-8 space-y-8">
      {/* Buying History Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <BuyingHistoryTable
          buyingHistory={admin.buyingHistory}
          t={t}
          onAddPurchase={handleAddPurchase}
          refreshBuyingHistory={refreshBuyingHistory}
          getBrandFromBuyingHistory={getBrandFromBuyingHistory}
          showBrandFilter={true}
        />
      </div>
    </div>
  );
}

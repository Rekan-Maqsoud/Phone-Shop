import React from 'react';
import BuyingHistoryTableSimplified from './BuyingHistoryTableSimplified';
import { useData } from '../contexts/DataContext';
import { Icon } from '../utils/icons.jsx';

export default function BuyingHistorySection({ t, admin, openAddPurchaseModal }) {
  const { refreshBuyingHistory } = useData();

  const handleAddPurchase = () => {
    openAddPurchaseModal();
  };

  return (
    <div className="w-full h-full p-8 space-y-8">
      {/* Buying History Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <BuyingHistoryTableSimplified
          buyingHistory={admin.buyingHistory}
          t={t}
          onAddPurchase={handleAddPurchase}
          refreshBuyingHistory={refreshBuyingHistory}
          admin={admin}
        />
      </div>
    </div>
  );
}

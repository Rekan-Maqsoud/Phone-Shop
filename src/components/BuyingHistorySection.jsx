import React from 'react';
import BuyingHistoryTable from './BuyingHistoryTable';

export default function BuyingHistorySection({ t, admin, setShowAddPurchase }) {
  const handleAddPurchase = () => {
    console.log('[BuyingHistorySection] Add Purchase clicked, calling setShowAddPurchase');
    setShowAddPurchase(true);
  };

  return (
    <BuyingHistoryTable
      buyingHistory={admin.buyingHistory}
      t={t}
      onAddPurchase={handleAddPurchase}
    />
  );
}

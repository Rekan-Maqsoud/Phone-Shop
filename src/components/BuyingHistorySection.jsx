import React from 'react';
import BuyingHistoryTable from './BuyingHistoryTable';
import { useData } from '../contexts/DataContext';

export default function BuyingHistorySection({ t, admin, setShowAddPurchase }) {
  const { refreshBuyingHistory } = useData();

  const handleAddPurchase = () => {
    console.log('[BuyingHistorySection] Add Purchase clicked, calling setShowAddPurchase');
    setShowAddPurchase(true);
  };

  return (
    <BuyingHistoryTable
      buyingHistory={admin.buyingHistory}
      t={t}
      onAddPurchase={handleAddPurchase}
      refreshBuyingHistory={refreshBuyingHistory}
    />
  );
}

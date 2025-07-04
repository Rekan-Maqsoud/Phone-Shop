import React from 'react';
import BuyingHistoryTable from './BuyingHistoryTable';
import { useData } from '../contexts/DataContext';

export default function BuyingHistorySection({ t, admin, openAddPurchaseModal }) {
  const { refreshBuyingHistory } = useData();

  const handleAddPurchase = () => {
    openAddPurchaseModal();
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

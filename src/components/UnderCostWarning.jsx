import React, { useEffect, useState } from 'react';
import { playWarningSound } from '../utils/sounds';

export default function UnderCostWarning({ items, allItems, t, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [belowCostItems, setBelowCostItems] = useState([]);

  useEffect(() => {
    if (!items || !allItems) return;

    const underCostItems = items.filter(item => {
      const product = allItems.find(p => p.uniqueId === item.uniqueId || p.id === item.product_id);
      if (!product) return false;
      const buyingPrice = product.buying_price || product.price;
      return item.selling_price < buyingPrice;
    });

    if (underCostItems.length > 0) {
      setBelowCostItems(underCostItems.map(item => {
        const product = allItems.find(p => p.uniqueId === item.uniqueId || p.id === item.product_id);
        return {
          name: product ? product.name : t.unknown,
          sellingPrice: item.selling_price,
          buyingPrice: product ? (product.buying_price || product.price) : 0,
          loss: (product ? (product.buying_price || product.price) : 0) - item.selling_price
        };
      }));
      setVisible(true);
      playWarningSound();
    } else {
      setVisible(false);
      setBelowCostItems([]);
    }
  }, [items, allItems, t]);

  const handleDismiss = () => {
    setVisible(false);
    setBelowCostItems([]);
    if (onDismiss) onDismiss();
  };

  if (!visible || belowCostItems.length === 0) return null;

  const totalLoss = belowCostItems.reduce((sum, item) => sum + (item.loss * 1), 0);

  return (
    <div className="fixed inset-0 bg-gray-900/30 dark:bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] animate-pulse">
      <div className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white rounded-3xl shadow-2xl p-8 max-w-lg mx-4 border-4 border-red-300 animate-shake animate-glow-red">
        <div className="text-center">
          {/* Warning Icon */}
          <div className="text-8xl mb-4 animate-bounce">⚠️</div>
          
          {/* Main Warning */}
          <h2 className="text-3xl font-black mb-4 tracking-wide animate-pulse">
            {t.warningSellingBelowCost || 'WARNING: SELLING BELOW COST!'}
          </h2>
          
          {/* Items List */}
          <div className="mb-6 text-left bg-red-800/50 rounded-xl p-4 animate-danger-pulse">
            <h3 className="text-xl font-bold mb-3 text-center">
              {t.affectedItems || 'Affected Items:'}
            </h3>
            {belowCostItems.map((item, index) => (
              <div key={index} className="mb-2 p-3 bg-red-900/50 rounded-lg border-2 border-red-400">
                <div className="font-bold text-lg">{item.name}</div>
                <div className="text-sm opacity-90">
                  {t.selling || 'Selling'}: ${item.sellingPrice.toFixed(2)} | 
                  {t.cost || 'Cost'}: ${item.buyingPrice.toFixed(2)} | 
                  <span className="font-bold text-yellow-300 animate-pulse">
                    {t.loss || 'Loss'}: ${item.loss.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Total Loss */}
            <div className="mt-4 pt-3 border-t-2 border-red-400">
              <div className="text-xl font-black text-center text-yellow-300 animate-pulse">
                {t.totalLoss || 'Total Loss'}: ${totalLoss.toFixed(2)}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleDismiss}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg animate-bounce"
            >
              {t.acknowledge || 'I UNDERSTAND'}
            </button>
          </div>
          
          {/* Blinking Text */}
          <div className="mt-4 text-lg font-bold animate-pulse">
            {t.reviewPricesBeforeProceeding || 'Please review prices before proceeding!'}
          </div>
        </div>
      </div>
    </div>
  );
}

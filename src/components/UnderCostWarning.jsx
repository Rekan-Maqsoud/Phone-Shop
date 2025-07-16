import React, { useEffect, useState } from 'react';
import { playWarningSound } from '../utils/sounds';
import { EXCHANGE_RATES } from '../utils/exchangeRates';

export default function UnderCostWarning({ items, allItems, t, onDismiss, discount = null, saleDiscount = null, onWarningChange, currency = 'USD' }) {
  const [visible, setVisible] = useState(false);
  const [belowCostItems, setBelowCostItems] = useState([]);

  useEffect(() => {
    if (!items || !Array.isArray(items) || !allItems || !Array.isArray(allItems)) {
      return;
    }

    const underCostItems = [];

    items.forEach(item => {
      const product = allItems.find(p => 
        p.uniqueId === item.uniqueId || 
        p.id === item.product_id || 
        p.id === item.id
      );
      
      if (!product) {
        return;
      }
      
      // Skip accessories - they use buying price as selling price by design
      if (product.itemType === 'accessory' || 
          product.category === 'accessories' || 
          item.itemType === 'accessory' ||
          product.type === 'accessory') {
        return;
      }
      
      const buyingPrice = Number(product.buying_price) || 0;
      let finalSellingPrice = Number(item.selling_price) || Number(item.price) || 0;
      
      // Apply per-item discount first if it exists
      if (item.discount_percent && item.discount_percent > 0) {
        finalSellingPrice = finalSellingPrice * (1 - item.discount_percent / 100);
      }
      
      // Apply global discount to selling price if discount exists
      const appliedDiscount = saleDiscount || discount;
      if (appliedDiscount) {
        const discountType = appliedDiscount.discount_type || appliedDiscount.type;
        const discountValue = Number(appliedDiscount.discount_value || appliedDiscount.value) || 0;
        
        if (discountValue > 0 && discountType) {
          if (discountType === 'percentage') {
            finalSellingPrice = finalSellingPrice * (1 - discountValue / 100);
          } else if (discountType === 'fixed') {
            // Simple fixed discount approach - divide discount equally among items
            const itemCount = items.length;
            const discountPerItem = discountValue / itemCount;
            finalSellingPrice = Math.max(0, finalSellingPrice - discountPerItem);
          }
        }
      }
      
      if (finalSellingPrice < buyingPrice) {
        underCostItems.push({
          name: product.name,
          sellingPrice: finalSellingPrice,
          originalPrice: Number(item.selling_price) || Number(item.price) || 0,
          buyingPrice: buyingPrice,
          loss: buyingPrice - finalSellingPrice,
          currency: product.currency || 'USD'
        });
      }
    });

    if (underCostItems.length > 0) {
      setBelowCostItems(underCostItems);
      setVisible(true);
      if (onWarningChange) onWarningChange(true);
      playWarningSound();
    } else {
      setVisible(false);
      setBelowCostItems([]);
      if (onWarningChange) onWarningChange(false);
    }
  }, [items, allItems, discount, saleDiscount, currency]);

  const handleDismiss = () => {
    setVisible(false);
    setBelowCostItems([]);
    if (onWarningChange) onWarningChange(false);
    if (onDismiss) onDismiss();
  };

  if (!visible || belowCostItems.length === 0) return null;

  // Calculate total loss in display currency
  const totalLoss = belowCostItems.reduce((sum, item) => {
    const lossInDisplayCurrency = currency === 'IQD' && item.currency === 'USD' 
      ? item.loss * EXCHANGE_RATES.USD_TO_IQD
      : currency === 'USD' && item.currency === 'IQD'
      ? item.loss * EXCHANGE_RATES.IQD_TO_USD
      : item.loss;
    return sum + lossInDisplayCurrency;
  }, 0);

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
                  {item.originalPrice !== item.sellingPrice && (
                    <div>{t.original || 'Original'}: {item.currency === 'IQD' ? `${Math.round(item.originalPrice).toLocaleString()}د.ع` : `$${item.originalPrice.toFixed(2)}`} → </div>
                  )}
                  {t.selling || 'Selling'}: {item.currency === 'IQD' ? `${Math.round(item.sellingPrice).toLocaleString()}د.ع` : `$${item.sellingPrice.toFixed(2)}`} | 
                  {t.cost || 'Cost'}: {item.currency === 'IQD' ? `${Math.round(item.buyingPrice).toLocaleString()}د.ع` : `$${item.buyingPrice.toFixed(2)}`} | 
                  <span className="font-bold text-yellow-300 animate-pulse">
                    {t.loss || 'Loss'}: {item.currency === 'IQD' ? `${Math.round(item.loss).toLocaleString()}د.ع` : `$${item.loss.toFixed(2)}`}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Total Loss */}
            <div className="mt-4 pt-3 border-t-2 border-red-400">
              <div className="text-xl font-black text-center text-yellow-300 animate-pulse">
                {t.totalLoss || 'Total Loss'}: {currency === 'IQD' ? `${Math.round(totalLoss).toLocaleString()}د.ع` : `$${totalLoss.toFixed(2)}`}
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

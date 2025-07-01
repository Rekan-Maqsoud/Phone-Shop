import React, { useState } from 'react';
import { playWarningSound } from '../utils/sounds';

export default function CashierSidebar({ 
  t, 
  clock, 
  total, 
  items, 
  loading, 
  isDebt, 
  handleCompleteSale,
  setItems,
  deleteItem,
  showToast
}) {
  return (
    <aside className="w-full md:w-[370px] h-full flex flex-col justify-between p-8 bg-white/30 dark:bg-gray-900/60 backdrop-blur-xl shadow-2xl border-r border-white/10 relative z-10">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
          <span className="font-extrabold text-3xl text-[#0e7490] dark:text-blue-200 tracking-tight drop-shadow">{t.cashier}</span>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{clock.toLocaleTimeString()} | {clock.toLocaleDateString()}</div>
        <div className="mb-6">
          <span className="block text-gray-700 dark:text-gray-200 font-semibold text-lg mb-1">{t.total}:</span>
          <span className={`text-4xl font-black drop-shadow ${total < 0 ? 'text-red-600 dark:text-red-400' : 'text-[#0e7490] dark:text-blue-300'}`}>
            ${total.toFixed(2)}
          </span>
        </div>
        <div className="mb-6 text-gray-600 dark:text-gray-300 text-base">{items.length} {t.items || 'items'}</div>
        <button
          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl font-extrabold text-xl shadow-xl hover:scale-105 hover:from-green-600 hover:to-emerald-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-60"
          disabled={items.length === 0 || loading.sale || total < 0}
          onClick={handleCompleteSale}
          title={total < 0 ? (t.cannotCompleteNegativeTotal || 'Cannot complete sale with negative total') : ''}
        >
          <span>{loading.sale ? (t.processing || 'Processing...') : (total < 0 ? (t.negativeTotal || 'Negative Total!') : t.completeSale || 'Complete Sale')}</span>
        </button>
      </div>
      {/* Enhanced Interactive Receipt */}
      <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl p-5 mt-8 shadow-xl border border-white/20 max-h-96 overflow-y-auto">
        <div className="font-bold mb-3 text-gray-800 dark:text-gray-100 text-lg flex items-center gap-2">
          <span>🧾</span>
          {t.receiptPreview || 'Receipt Preview'}
        </div>
        {items.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-4 italic">{t.noItems}</div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <ReceiptItem
                key={item.uniqueId || `${item.itemType || 'product'}_${item.id}_${idx}`}
                item={item}
                index={idx}
                t={t}
                items={items}
                setItems={setItems}
                deleteItem={deleteItem}
                showToast={showToast}
              />
            ))}
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-gray-300 dark:border-gray-600 flex justify-between font-bold text-lg text-gray-800 dark:text-gray-100">
          <span>{t.total}:</span>
          <span className="text-green-600">${total.toFixed(2)}</span>
        </div>
      </div>
    </aside>
  );
}

// Individual Receipt Item Component
function ReceiptItem({ item, index, t, items, setItems, deleteItem, showToast }) {
  const [isEditing, setIsEditing] = useState(false);
  
  const updateQuantity = (newQuantity) => {
    const val = Math.max(1, parseInt(newQuantity) || 1);
    const maxStock = item.stock || 999;
    
    if (val > maxStock) {
      showToast(t.cannotExceedStock ? `${t.cannotExceedStock} (${maxStock})` : `Cannot exceed available stock (${maxStock})`, 'error');
      return;
    }
    
    setItems(items => items.map((it, i) => (i === index ? { ...it, quantity: val } : it)));
  };
  
  const updatePrice = (newPrice) => {
    const val = parseFloat(newPrice) || 0;
    
    if (val < (item.buying_price || 0)) {
      showToast(t.belowBuyingPrice || 'Warning: Selling below buying price!', 'warning');
      playWarningSound();
    }
    
    setItems(items => items.map((it, i) => i === index ? { ...it, selling_price: val, price: val } : it));
  };

  const handleDelete = () => {
    deleteItem(item.uniqueId);
  };

  const currentPrice = item.selling_price || item.price;
  const lineTotal = currentPrice * item.quantity;
  const isBelowCost = currentPrice < (item.buying_price || 0);

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-md mb-2 flex flex-col gap-2">
      {/* Item Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base truncate leading-tight">
            {item.name}
          </h4>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            <span>{item.itemType === 'product' ? '📱' : '🎧'}</span>
            {item.ram && <span>{item.ram}</span>}
            {item.storage && <span>{item.storage}</span>}
            {item.type && <span>{item.type}</span>}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded transition-colors text-lg"
          title={t.removeItem || 'Remove item'}
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-1">
        {/* Quantity Control */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateQuantity(item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="w-7 h-7 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max={item.stock || 999}
            value={item.quantity || 1}
            onChange={(e) => updateQuantity(e.target.value)}
            className="w-14 h-7 text-center text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => updateQuantity(item.quantity + 1)}
            disabled={item.quantity >= (item.stock || 999)}
            className="w-7 h-7 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            +
          </button>
        </div>

        {/* Price Control */}
        <div className="flex-1 max-w-[70px]">
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold rounded-md text-base">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={currentPrice}
              onChange={(e) => updatePrice(e.target.value)}
              className={`w-20 h-7 text-base border rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold transition-all ${
                isBelowCost 
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            />
          </div>
          {isBelowCost && (
            <div className="text-red-500 text-xs mt-1 font-semibold">
              {t.belowCost || 'Below cost!'}
            </div>
          )}
        </div>
      </div>

      {/* Stock Info and Line Total */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {t.stock || 'Stock'}: {item.stock !== undefined ? item.stock : '?'}
        </span>
        <span className="font-extrabold text-green-700 dark:text-green-400 text-lg">
          ${lineTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

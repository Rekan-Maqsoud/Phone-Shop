import React, { useState, useEffect } from 'react';
import ModalBase from './ModalBase';

export default function EnhancedCompanyDebtModal({ show, onClose, debt, onMarkPaid, t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showItems, setShowItems] = useState(false);

  useEffect(() => {
    if (show && debt && debt.has_items) {
      fetchDebtItems();
    }
  }, [show, debt]);

  const fetchDebtItems = async () => {
    if (!debt.id) return;
    
    setLoading(true);
    try {
      const items = await window.api?.getCompanyDebtItems?.(debt.id);
      setItems(items || []);
    } catch (error) {
      console.error('Error fetching debt items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    await onMarkPaid(debt.id);
    onClose();
  };

  if (!show || !debt) return null;

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="4xl">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            💸 {t?.companyDebtDetails || 'Company Debt Details'}
          </h2>
          {!debt.paid_at && (
            <button
              onClick={handleMarkPaid}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              ✅ {t?.markAsPaid || 'Mark as Paid'}
            </button>
          )}
        </div>

        {/* Debt Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t?.companyName || 'Company Name'}
              </h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {debt.company_name}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t?.amount || 'Amount'}
              </h3>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                ${debt.amount?.toFixed(2)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t?.createdAt || 'Created At'}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {new Date(debt.created_at).toLocaleDateString()} {new Date(debt.created_at).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t?.status || 'Status'}
              </h3>
              {debt.paid_at ? (
                <div>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    ✅ {t?.paid || 'Paid'}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t?.paidOn || 'Paid on'} {new Date(debt.paid_at).toLocaleDateString()} {new Date(debt.paid_at).toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  ⏳ {t?.unpaid || 'Unpaid'}
                </span>
              )}
            </div>
          </div>

          {debt.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t?.description || 'Description'}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg p-3">
                {debt.description}
              </p>
            </div>
          )}
        </div>

        {/* Items Section */}
        {debt.has_items && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                📦 {t?.purchasedItems || 'Purchased Items'}
              </h3>
              <button
                onClick={() => setShowItems(!showItems)}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                {showItems ? '🔼' : '🔽'} {showItems ? (t?.hideItems || 'Hide Items') : (t?.showItems || 'Show Items')}
              </button>
            </div>

            {showItems && (
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    {t?.loading || 'Loading items...'}
                  </div>
                ) : items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-2 ${
                        item.item_type === 'product'
                          ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700'
                          : 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">{item.item_type === 'product' ? '📱' : '🎧'}</span>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {item.item_name}
                          </h4>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{t?.quantity || 'Quantity'}:</span>
                            <span className="font-semibold">{item.quantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{t?.unitPrice || 'Unit Price'}:</span>
                            <span className="text-blue-600 dark:text-blue-400">${item.unit_price}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">{t?.total || 'Total'}:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">${item.total_price}</span>
                          </div>
                          
                          {/* Product-specific details */}
                          {item.item_type === 'product' && (
                            <div className="space-y-1 border-t pt-2">
                              {item.ram && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-500">RAM:</span>
                                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{item.ram}</span>
                                </div>
                              )}
                              {item.storage && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-500">Storage:</span>
                                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{item.storage}</span>
                                </div>
                              )}
                              {item.model && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-500">Model:</span>
                                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{item.model}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Accessory-specific details */}
                          {item.item_type === 'accessory' && (
                            <div className="space-y-1 border-t pt-2">
                              {item.brand && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-500">Brand:</span>
                                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{item.brand}</span>
                                </div>
                              )}
                              {item.type && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-500">Type:</span>
                                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{item.type}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    {t?.noItemsFound || 'No items found'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500 transition"
          >
            {t?.close || 'Close'}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

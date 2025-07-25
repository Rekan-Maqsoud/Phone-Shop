import React, { useState } from 'react';
import { Icon } from '../utils/icons.jsx';
import ModalBase from './ModalBase';

const KeyboardShortcutsModal = ({ show, onClose, t, shortcuts = {} }) => {
  const defaultShortcuts = {
    admin: [
      { key: '↑/↓ or ←/→', description: t?.navigateSections || 'Navigate between sections' },
      { key: 'Ctrl+1-9', description: t?.directSectionAccess || 'Direct section access' },
      { key: 'Ctrl+0', description: t?.personalLoans || 'Personal Loans' },
      { key: 'Ctrl++', description: t?.monthlyReports || 'Monthly Reports' },
      { key: 'Ctrl+-', description: t?.backupSettings || 'Backup & Settings' },
      { key: 'Ctrl+Shift+C', description: t?.goToCashier || 'Go to Cashier' },
      { key: 'Ctrl+Shift+S', description: t?.settings || 'Settings' },
      { key: 'Ctrl+Shift+B', description: t?.backupManager || 'Backup Manager' }
    ],
    cashier: [
      { key: 'F2', description: t?.completeSale || 'Complete Sale' },
      { key: 'F3', description: t?.clearCart || 'Clear Cart' },
      { key: 'F4', description: t?.toggleDebtMode || 'Toggle Debt Mode' },
      { key: 'F5', description: t?.toggleMultiCurrency || 'Toggle Multi-Currency' },
      { key: 'Ctrl+1', description: t?.setCurrencyUSD || 'Set Currency to USD' },
      { key: 'Ctrl+2', description: t?.setCurrencyIQD || 'Set Currency to IQD' },
      { key: 'Ctrl+D', description: t?.toggleDiscount || 'Toggle Discount' },
      { key: 'Ctrl+Shift+C', description: t?.clearCustomerName || 'Clear Customer Name' },
      { key: 'Ctrl++', description: t?.increaseQuantity || 'Increase Quantity' },
      { key: 'Ctrl+-', description: t?.decreaseQuantity || 'Decrease Quantity' },
      { key: '↑/↓', description: t?.navigateSuggestions || 'Navigate Suggestions' },
      { key: 'Enter', description: t?.selectOrSearch || 'Select Item or Search' },
      { key: 'Escape', description: t?.clearSearch || 'Clear Search/Cancel' }
    ],
    modal: [
      { key: 'Escape', description: t?.closeModal || 'Close Modal' },
      { key: 'Ctrl+Enter', description: t?.confirmAction || 'Confirm Action' },
      { key: 'Tab', description: t?.navigateFields || 'Navigate Fields' },
      { key: 'Shift+Tab', description: t?.navigateFieldsReverse || 'Navigate Fields (Reverse)' }
    ],
    return: [
      { key: 'Escape', description: t?.closeModal || 'Close Modal' },
      { key: 'Ctrl+Enter', description: t?.processReturn || 'Process Return' },
      { key: 'Ctrl+1', description: t?.returnInUSD || 'Return in USD' },
      { key: 'Ctrl+2', description: t?.returnInIQD || 'Return in IQD' },
      { key: 'Ctrl+M', description: t?.toggleMultiCurrency || 'Toggle Multi-Currency' },
      { key: '↑/↓', description: t?.adjustQuantity || 'Adjust Quantity (when not in input)' }
    ]
  };

  const allShortcuts = { ...defaultShortcuts, ...shortcuts };

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Icon name="keyboard" size={24} />
                {t?.keyboardShortcuts || 'Keyboard Shortcuts'}
              </h2>
              <p className="text-blue-100 mt-2">
                {t?.keyboardShortcutsDescription || 'Master these shortcuts to navigate faster'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(allShortcuts).map(([section, shortcuts]) => (
              <div
                key={section}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2 capitalize">
                  <Icon 
                    name={
                      section === 'admin' ? 'settings' :
                      section === 'cashier' ? 'shopping-cart' :
                      section === 'modal' ? 'window' :
                      section === 'return' ? 'undo' : 'keyboard'
                    } 
                    size={18} 
                  />
                  {t?.[`${section}Section`] || `${section.charAt(0).toUpperCase() + section.slice(1)} Section`}
                </h3>
                <div className="space-y-3">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <div className="flex gap-1">
                        {shortcut.key.split(' or ').map((keyCombo, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && (
                              <span className="text-xs text-gray-400 mx-1">or</span>
                            )}
                            <div className="flex gap-1">
                              {keyCombo.split('+').map((key, partIndex) => (
                                <React.Fragment key={partIndex}>
                                  {partIndex > 0 && (
                                    <span className="text-xs text-gray-400 mx-0.5">+</span>
                                  )}
                                  <kbd className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-mono border border-gray-300 dark:border-gray-500 shadow-sm">
                                    {key.trim()}
                                  </kbd>
                                </React.Fragment>
                              ))}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Global Tips */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
              <Icon name="lightbulb" size={18} />
              {t?.tips || 'Tips'}
            </h3>
            <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <li className="flex items-start gap-2">
                <Icon name="check" size={14} className="mt-0.5 flex-shrink-0" />
                {t?.tip1 || 'Most shortcuts work globally across the application'}
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" size={14} className="mt-0.5 flex-shrink-0" />
                {t?.tip2 || 'Use Ctrl (or Cmd on Mac) + key combinations for actions'}
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" size={14} className="mt-0.5 flex-shrink-0" />
                {t?.tip3 || 'Arrow keys provide intuitive navigation in lists and sections'}
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" size={14} className="mt-0.5 flex-shrink-0" />
                {t?.tip4 || 'Function keys (F1-F12) are used for quick actions in Cashier'}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
          >
            <Icon name="check" size={16} />
            {t?.gotIt || 'Got it!'} <span className="text-xs opacity-75">(Esc)</span>
          </button>
        </div>
      </div>
    </ModalBase>
  );
};

// Quick shortcut display component for status bars
export const KeyboardShortcutHint = ({ shortcuts = [], className = "" }) => {
  const [showAll, setShowAll] = useState(false);
  
  if (!shortcuts.length) return null;

  const displayShortcuts = showAll ? shortcuts : shortcuts.slice(0, 3);

  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      <Icon name="keyboard" size={12} />
      <div className="flex items-center gap-1">
        {displayShortcuts.map((shortcut, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="mx-1">•</span>}
            <div className="flex items-center gap-1">
              <kbd className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">
                {shortcut.key}
              </kbd>
              <span>{shortcut.description}</span>
            </div>
          </React.Fragment>
        ))}
        {shortcuts.length > 3 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-blue-500 hover:text-blue-600 ml-1"
          >
            +{shortcuts.length - 3} more
          </button>
        )}
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;

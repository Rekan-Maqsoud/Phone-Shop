import { useEffect } from 'react';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

export default function useCashierKeyboard({
  showProductSelect,
  showSuggestions,
  suggestions,
  selectedSuggestionIndex,
  setSelectedSuggestionIndex,
  handleSuggestionClick,
  items,
  showToast,
  t,
  search,
  setSearch,
  setShowSuggestions,
  handleSearchSubmit,
  currency,
  setCurrency,
  clearCart,
  completeSale,
  quantity,
  setQuantity,
  discount,
  setDiscount,
  multiCurrency,
  setMultiCurrency,
  isDebt,
  setIsDebt,
  customerName,
  setCustomerName
}) {
  // Enhanced keyboard shortcuts for cashier
  const cashierShortcuts = {
    'f2': () => {
      if (items.length) {
        completeSale?.();
      } else {
        showToast(t.noItemsInCart || 'No items in cart', 'warning');
      }
    },
    'f3': () => {
      if (items.length) {
        clearCart?.();
        showToast(t.cartCleared || 'Cart cleared', 'info');
      }
    },
    'f4': () => {
      setIsDebt?.(!isDebt);
      showToast(isDebt ? (t.debtModeOff || 'Debt mode OFF') : (t.debtModeOn || 'Debt mode ON'), 'info');
    },
    'f5': () => {
      setMultiCurrency?.(prev => ({ ...prev, enabled: !prev.enabled }));
      showToast(multiCurrency?.enabled ? (t.singleCurrencyMode || 'Single currency mode') : (t.multiCurrencyMode || 'Multi-currency mode'), 'info');
    },
    'ctrl+1': () => {
      setCurrency?.('USD');
      showToast(t.currencySetToUSD || 'Currency set to USD', 'info');
    },
    'ctrl+2': () => {
      setCurrency?.('IQD');
      showToast(t.currencySetToIQD || 'Currency set to IQD', 'info');
    },
    'ctrl+d': () => {
      setDiscount?.(prev => prev ? null : { type: 'percentage', value: 5 });
      showToast(discount ? (t.discountRemoved || 'Discount removed') : (t.discountApplied || 'Discount applied'), 'info');
    },
    'ctrl+shift+c': () => {
      if (customerName) {
        setCustomerName?.('');
        showToast(t.customerNameCleared || 'Customer name cleared', 'info');
      }
    },
    'ctrl+equal': () => {
      // Increase quantity
      setQuantity?.(prev => Math.min(prev + 1, 999));
    },
    'ctrl+minus': () => {
      // Decrease quantity
      setQuantity?.(prev => Math.max(prev - 1, 1));
    }
  };

  // Suggestion navigation
  const handleArrowUp = () => {
    if (showSuggestions && suggestions.length > 0) {
      setSelectedSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    }
  };

  const handleArrowDown = () => {
    if (showSuggestions && suggestions.length > 0) {
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    }
  };

  const handleEnter = () => {
    if (showSuggestions && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      handleSuggestionClick(suggestions[selectedSuggestionIndex]);
    } else if (search && !showSuggestions) {
      handleSearchSubmit?.({ preventDefault: () => {} });
    }
  };

  const handleEscape = () => {
    if (showSuggestions) {
      setSearch('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Use enhanced keyboard navigation
  useKeyboardNavigation({
    enabled: !showProductSelect,
    onArrowUp: handleArrowUp,
    onArrowDown: handleArrowDown,
    onEnter: handleEnter,
    onEscape: handleEscape,
    shortcuts: cashierShortcuts,
    preventDefaultArrows: showSuggestions && suggestions.length > 0
  });

  // Legacy effect for compatibility - kept for any specific logic that might be needed
  useEffect(() => {
    // Any additional keyboard handling logic can go here
  }, [search, items, showSuggestions, suggestions, selectedSuggestionIndex, showProductSelect]);
}

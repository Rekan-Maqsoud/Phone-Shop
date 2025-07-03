import { useEffect } from 'react';

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
  handleSearchSubmit
}) {
  useEffect(() => {
    const handler = (e) => {
      if (showProductSelect) return;
      
      // Handle arrow navigation for suggestions
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          return;
        }
        if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
          e.preventDefault();
          const selectedProduct = suggestions[selectedSuggestionIndex];
          if (selectedProduct) {
            handleSuggestionClick(selectedProduct);
            return;
          }
        }
      }
      
      if (e.key === 'F2') {
        e.preventDefault();
        if (items.length) showToast(t.completeSaleNotImplemented, 'info');
      } else if (e.key === 'Escape') {
        setSearch('');
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      } else if (e.key === 'Enter' && search && !showSuggestions) {
        handleSearchSubmit(e);
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [search, items, showSuggestions, suggestions, selectedSuggestionIndex, showProductSelect, setSelectedSuggestionIndex, handleSuggestionClick, showToast, t, setSearch, setShowSuggestions, handleSearchSubmit]);
}

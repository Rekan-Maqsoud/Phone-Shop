import { useState } from 'react';
import { playActionSound, playDeleteSound, playErrorSound, playSuccessSound } from '../../utils/sounds';
import { EXCHANGE_RATES } from '../../utils/exchangeRates';

export default function useCart(showToast, showConfirm, t = {}) {
  const [items, setItems] = useState([]);

  // Add or update item in cart
  const addOrUpdateItem = (product, isReturn = false, quantity = 1) => {
    // Simple validation - just check if product exists
    if (!product) {
      console.error('Invalid product passed to addOrUpdateItem:', product);
      showToast(t.invalidProduct || 'Invalid product', 'error');
      return;
    }
    
    setItems(prevItems => {
      // Determine item type from product or uniqueId pattern FIRST
      let itemType = product.itemType;
      if (!itemType && product.uniqueId) {
        itemType = product.uniqueId.startsWith('accessory_') ? 'accessory' : 'product';
      }
      if (!itemType) {
        itemType = 'product'; // default fallback
      }

      // Create a more robust unique ID
      let uniqueId = product.uniqueId;
      if (!uniqueId) {
        // If no uniqueId provided, create one using available product info
        const id = product.id || product.name?.replace(/\s+/g, '_').toLowerCase() || Math.random().toString(36).substr(2, 9);
        uniqueId = `${itemType}_${id}`;
      }
      
      // Find existing item by product name and type, regardless of currency
      // This allows merging items with different currencies
      const existing = prevItems.find(item => 
        item.isReturn === isReturn && 
        item.name === product.name && 
        item.itemType === itemType
      );
      
      const availableStock = product.stock ?? 1;
      
      // For returns, we don't check stock availability
      if (!isReturn && availableStock === 0) {
        playErrorSound();
        showConfirm(t.stockEmptyIncrement || 'Stock is empty. Do you want to increment the stock by 1?', () => {
          if (itemType === 'accessory') {
            window.api?.editAccessory && window.api.editAccessory({ ...product, stock: 1 }).then(res => {
              if (res.success) {
                playSuccessSound();
                showToast(t.stockIncremented || 'Stock incremented by 1.');
              }
            });
          } else {
            window.api?.editProduct && window.api.editProduct({ ...product, stock: 1 }).then(res => {
              if (res.success) {
                playSuccessSound();
                showToast(t.stockIncremented || 'Stock incremented by 1.');
              }
            });
          }
        });
        return prevItems;
      }
      
      if (existing) {
        // Calculate new total if we add this quantity
        const newTotal = (existing.quantity || 1) + quantity;
        // For returns, we don't limit by stock
        if (!isReturn && newTotal > availableStock) {
          playErrorSound();
          showToast(t.cannotAddMoreStock || `Cannot add more than available stock! Available: ${availableStock}`, 'error');
          return prevItems;
        }
        playActionSound();
        
        // Handle currency conversion when merging items
        const existingCurrency = existing.currency || 'IQD';
        const newItemCurrency = product.currency || 'IQD';
        
        let finalCurrency = existingCurrency;
        let finalBuyingPrice = existing.buying_price || 0;
        let finalSellingPrice = existing.selling_price || 0;
        
        // If currencies are different, convert new item to existing item's currency
        if (existingCurrency !== newItemCurrency) {
          const newBuyingPrice = product.buying_price || 0;
          const newSellingPrice = itemType === 'accessory' 
            ? newBuyingPrice
            : Math.round(newBuyingPrice * 1.1 * 100) / 100;
          
          let convertedNewBuyingPrice = newBuyingPrice;
          let convertedNewSellingPrice = newSellingPrice;
          
          // Convert new item prices to existing item's currency
          if (existingCurrency === 'USD' && newItemCurrency === 'IQD') {
            convertedNewBuyingPrice = newBuyingPrice * EXCHANGE_RATES.IQD_TO_USD;
            convertedNewSellingPrice = newSellingPrice * EXCHANGE_RATES.IQD_TO_USD;
          } else if (existingCurrency === 'IQD' && newItemCurrency === 'USD') {
            convertedNewBuyingPrice = newBuyingPrice * EXCHANGE_RATES.USD_TO_IQD;
            convertedNewSellingPrice = newSellingPrice * EXCHANGE_RATES.USD_TO_IQD;
          }
          
          // Calculate weighted average prices
          const existingQty = existing.quantity || 1;
          const totalQty = existingQty + quantity;
          
          finalBuyingPrice = ((finalBuyingPrice * existingQty) + (convertedNewBuyingPrice * quantity)) / totalQty;
          finalSellingPrice = ((finalSellingPrice * existingQty) + (convertedNewSellingPrice * quantity)) / totalQty;
          
          // Round to appropriate precision
          if (finalCurrency === 'USD') {
            finalBuyingPrice = Math.round(finalBuyingPrice * 100) / 100;
            finalSellingPrice = Math.round(finalSellingPrice * 100) / 100;
          } else {
            finalBuyingPrice = Math.round(finalBuyingPrice);
            finalSellingPrice = Math.round(finalSellingPrice);
          }
        }
        
        // Update the existing item with new quantities and averaged prices
        const updatedItems = prevItems.map(item =>
          item.name === existing.name && item.itemType === existing.itemType && item.isReturn === isReturn
            ? { 
                ...item, 
                quantity: newTotal,
                buying_price: finalBuyingPrice,
                selling_price: finalSellingPrice,
                price: finalSellingPrice,
                currency: finalCurrency,
                uniqueId: existing.uniqueId // Keep the original uniqueId
              }
            : item
        );
        return updatedItems;
      } else {
        // For new items, check stock only for non-returns and only if quantity > available stock
        if (!isReturn && quantity > availableStock) {
          playErrorSound();
          showToast(t.cannotAddMoreStock || `Cannot add more than available stock! Available: ${availableStock}`, 'error');
          return prevItems;
        }
        playActionSound();
        // Add new item with specified quantity - ensure product_id is valid
        const newItem = {
          id: product.id,
          name: product.name || 'Unknown Product', // Fallback name
          uniqueId,
          product_id: product.id, // Keep original ID format
          itemType: itemType, // Ensure itemType is always set
          category: product.category,
          brand: product.brand,
          type: product.type,
          model: product.model,
          ram: product.ram,
          storage: product.storage,
          currency: product.currency,
          stock: product.stock,
          buying_price: product.buying_price,
          price: itemType === 'accessory' 
            ? (product.buying_price || 0) 
            : Math.round((product.buying_price || 0) * 1.1 * 100) / 100,
          selling_price: itemType === 'accessory' 
            ? (product.buying_price || 0) 
            : Math.round((product.buying_price || 0) * 1.1 * 100) / 100,
          isReturn,
          quantity: quantity,
        };
        const updatedItems = [
          ...prevItems,
          newItem,
        ];
        return updatedItems;
      }
    });
  };

  const deleteItem = (uniqueId) => {
    playDeleteSound();
    setItems(items => items.filter(item => item.uniqueId !== uniqueId));
  };

  const clearCart = () => {
    playDeleteSound();
    setItems([]);
  };

  const total = items.reduce((sum, item) => {
    const sellingPrice = item.selling_price || item.buying_price;
    const itemTotal = sellingPrice * (item.quantity || 1);
    return sum + (item.isReturn ? -itemTotal : itemTotal);
  }, 0);

  return { items, addOrUpdateItem, deleteItem, clearCart, total, setItems };
}

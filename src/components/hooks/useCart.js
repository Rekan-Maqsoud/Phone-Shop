import { useState } from 'react';
import { playActionSound, playDeleteSound, playErrorSound, playSuccessSound } from '../../utils/sounds';

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
      // Create a more robust unique ID
      let uniqueId = product.uniqueId;
      if (!uniqueId) {
        // If no uniqueId provided, create one using available product info
        const itemType = product.itemType || 'product';
        const id = product.id || product.name?.replace(/\s+/g, '_').toLowerCase() || Math.random().toString(36).substr(2, 9);
        uniqueId = `${itemType}_${id}`;
      }
      const existing = prevItems.find(item => item.uniqueId === uniqueId && item.isReturn === isReturn);
      const availableStock = product.stock ?? 1;
      // Determine item type from product or uniqueId pattern
      let itemType = product.itemType;
      if (!itemType && product.uniqueId) {
        itemType = product.uniqueId.startsWith('accessory_') ? 'accessory' : 'product';
      }
      if (!itemType) {
        itemType = 'product'; // default fallback
      }
      
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
        // Increase quantity by specified amount
        const updatedItems = prevItems.map(item =>
          item.uniqueId === uniqueId && item.isReturn === isReturn
            ? { 
                ...item, 
                quantity: newTotal,
                selling_price: itemType === 'accessory' 
                  ? (item.selling_price || product.buying_price || 0)
                  : (item.selling_price || Math.round((product.buying_price || 0) * 1.1 * 100) / 100),
                buying_price: item.buying_price || product.buying_price
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

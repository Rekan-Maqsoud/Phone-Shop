import { useState } from 'react';
import { playActionSound, playDeleteSound, playErrorSound, playSuccessSound } from '../../utils/sounds';

export default function useCart(showToast, showConfirm, t = {}) {
  const [items, setItems] = useState([]);

  // Add or update item in cart
  const addOrUpdateItem = (product, isReturn = false, quantity = 1) => {
    setItems(prevItems => {
      const uniqueId = product.uniqueId || `${product.itemType || 'product'}_${product.id}`;
      const existing = prevItems.find(item => item.uniqueId === uniqueId && item.isReturn === isReturn);
      const availableStock = product.stock ?? 1;
      
      // For returns, we don't check stock availability
      if (!isReturn && availableStock === 0) {
        playErrorSound();
        showConfirm(t.stockEmptyIncrement || 'Stock is empty. Do you want to increment the stock by 1?', () => {
          if (product.itemType === 'accessory') {
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
        return prevItems.map(item =>
          item.uniqueId === uniqueId && item.isReturn === isReturn
            ? { 
                ...item, 
                quantity: newTotal,
                selling_price: product.itemType === 'accessory' 
                  ? (item.selling_price || product.buying_price || product.price || 0)
                  : (item.selling_price || Math.round((product.buying_price || product.price || 0) * 1.1 * 100) / 100),
                buying_price: item.buying_price || product.buying_price || product.price
              }
            : item
        );
      } else {
        // For new items, check stock only for non-returns
        if (!isReturn) {
          const totalInCart = prevItems.filter(item => item.uniqueId === uniqueId && !item.isReturn).reduce((sum, item) => sum + (item.quantity || 1), 0);
          if ((totalInCart + quantity) > availableStock) {
            playErrorSound();
            showToast(t.cannotAddMoreStockInCart || `Cannot add more than available stock! Available: ${availableStock}, In cart: ${totalInCart}`, 'error');
            return prevItems;
          }
        }
        
        playActionSound();
        // Add new item with specified quantity
        return [
          ...prevItems,
          {
            id: product.id,
            name: product.name, // Explicitly set the name
            uniqueId,
            product_id: product.id,
            itemType: product.itemType || 'product',
            category: product.category,
            brand: product.brand,
            type: product.type,
            model: product.model,
            ram: product.ram,
            storage: product.storage,
            currency: product.currency,
            stock: product.stock,
            buying_price: product.buying_price || product.price,
            price: product.itemType === 'accessory' 
              ? (product.buying_price || product.price || 0) 
              : Math.round((product.buying_price || product.price || 0) * 1.1 * 100) / 100,
            selling_price: product.itemType === 'accessory' 
              ? (product.buying_price || product.price || 0) 
              : Math.round((product.buying_price || product.price || 0) * 1.1 * 100) / 100,
            isReturn,
            quantity: quantity,
          },
        ];
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
    const sellingPrice = item.selling_price || item.price;
    const itemTotal = sellingPrice * (item.quantity || 1);
    return sum + (item.isReturn ? -itemTotal : itemTotal);
  }, 0);

  return { items, addOrUpdateItem, deleteItem, clearCart, total, setItems };
}

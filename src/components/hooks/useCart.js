import { useState } from 'react';

export default function useCart(showToast, showConfirm) {
  const [items, setItems] = useState([]);

  // Add or update item in cart
  // Accepts quantity (default 1)
  const addOrUpdateItem = (product, isReturn = false, quantity = 1) => {
    setItems(prevItems => {
      const uniqueId = product.uniqueId || `${product.itemType || 'product'}_${product.id}`;
      const existing = prevItems.find(item => item.uniqueId === uniqueId && item.isReturn === isReturn);
      const availableStock = product.stock ?? 1;
      
      // For returns, we don't check stock availability
      if (!isReturn && availableStock === 0) {
        showConfirm('Stock is empty. Do you want to increment the stock by 1?', () => {
          if (product.itemType === 'accessory') {
            window.api?.editAccessory && window.api.editAccessory({ ...product, stock: 1 }).then(res => {
              if (res.success) showToast('Stock incremented by 1.');
            });
          } else {
            window.api?.editProduct && window.api.editProduct({ ...product, stock: 1 }).then(res => {
              if (res.success) showToast('Stock incremented by 1.');
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
          showToast(`Cannot add more than available stock! Available: ${availableStock}`, 'error');
          return prevItems;
        }
        
        // Increase quantity by specified amount
        return prevItems.map(item =>
          item.uniqueId === uniqueId && item.isReturn === isReturn
            ? { 
                ...item, 
                quantity: newTotal,
                // Ensure selling_price is set if not already
                selling_price: item.selling_price || Math.round((product.buying_price || product.price || 0) * 1.1 * 100) / 100, // Use 110% markup if no price set
                buying_price: item.buying_price || product.buying_price || (product.itemType === 'accessory' ? 0 : product.price)
              }
            : item
        );
      } else {
        // For new items, check stock only for non-returns
        if (!isReturn) {
          const totalInCart = prevItems.filter(item => item.uniqueId === uniqueId && !item.isReturn).reduce((sum, item) => sum + (item.quantity || 1), 0);
          if ((totalInCart + quantity) > availableStock) {
            showToast(`Cannot add more than available stock! Available: ${availableStock}, In cart: ${totalInCart}`, 'error');
            return prevItems;
          }
        }
        
        // Add new item with specified quantity
        return [
          ...prevItems,
          {
            ...product,
            id: product.id,
            uniqueId,
            product_id: product.id,
            itemType: product.itemType || 'product',
            buying_price: product.buying_price || (product.itemType === 'accessory' ? 0 : product.price), // Use actual buying price, for accessories fallback to 0, for products fallback to price
            price: Math.round((product.buying_price || product.price || 0) * 1.1 * 100) / 100, // Store 110% of buying price as default selling price
            selling_price: Math.round((product.buying_price || product.price || 0) * 1.1 * 100) / 100, // Default selling price at 110% markup
            isReturn,
            quantity: quantity,
          },
        ];
      }
    });
  };

  const deleteItem = (uniqueId) => {
    setItems(items => items.filter(item => item.uniqueId !== uniqueId));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => {
    const sellingPrice = item.selling_price || item.price;
    const itemTotal = sellingPrice * (item.quantity || 1);
    return sum + (item.isReturn ? -itemTotal : itemTotal);
  }, 0);

  return { items, addOrUpdateItem, deleteItem, clearCart, total, setItems };
}

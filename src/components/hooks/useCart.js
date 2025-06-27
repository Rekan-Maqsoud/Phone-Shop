import { useState } from 'react';

export default function useCart(showToast, showConfirm) {
  const [items, setItems] = useState([]);

  // Add or update item in cart
  // Accepts quantity (default 1)
  const addOrUpdateItem = (product, isReturn = false, quantity = 1) => {
    setItems(prevItems => {
      const existing = prevItems.find(item => item.id === product.id && item.isReturn === isReturn);
      const availableStock = product.stock ?? 1;
      if (!isReturn && availableStock === 0) {
        showConfirm('Stock is empty. Do you want to increment the stock by 1?', () => {
          window.api?.editProduct && window.api.editProduct({ ...product, stock: 1 }).then(res => {
            if (res.success) showToast('Stock incremented by 1.');
          });
        });
        return prevItems;
      }
      if (existing) {
        // Calculate new total if we add this quantity
        const newTotal = (existing.quantity || 1) + quantity;
        if (!isReturn && newTotal > availableStock) {
          showToast(`Cannot add more than available stock! Available: ${availableStock}`, 'error');
          return prevItems;
        }
        // Increase quantity by specified amount
        return prevItems.map(item =>
          item.id === product.id && item.isReturn === isReturn
            ? { 
                ...item, 
                quantity: newTotal,
                // Ensure selling_price is set if not already
                selling_price: item.selling_price || Math.round(product.price * 1.1),
                buying_price: item.buying_price || product.price
              }
            : item
        );
      } else {
        // Calculate total quantity in cart for this product (all non-return items)
        const totalInCart = prevItems.filter(item => item.id === product.id && !item.isReturn).reduce((sum, item) => sum + (item.quantity || 1), 0);
        if (!isReturn && (totalInCart + quantity) > availableStock) {
          showToast(`Cannot add more than available stock! Available: ${availableStock}, In cart: ${totalInCart}`, 'error');
          return prevItems;
        }
        // Add new item with specified quantity
        return [
          ...prevItems,
          {
            ...product,
            id: product.id,
            product_id: product.id,
            buying_price: product.price, // Store buying price
            price: Math.round(product.price * 1.1), // Default selling price = 110% of buying price
            selling_price: Math.round(product.price * 1.1), // Default selling price = 110% of buying price
            isReturn,
            quantity: quantity,
          },
        ];
      }
    });
  };

  const deleteItem = (id) => {
    setItems(items => items.filter(item => item.id !== id));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => {
    const sellingPrice = item.selling_price || item.price;
    const itemTotal = sellingPrice * (item.quantity || 1);
    return sum + (item.isReturn ? -itemTotal : itemTotal);
  }, 0);

  return { items, addOrUpdateItem, deleteItem, clearCart, total, setItems };
}

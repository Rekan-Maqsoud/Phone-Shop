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
          showToast('Cannot add more than available stock!', 'error');
          return prevItems;
        }
        // Increase quantity by specified amount
        return prevItems.map(item =>
          item.id === product.id && item.isReturn === isReturn
            ? { ...item, quantity: newTotal }
            : item
        );
      } else {
        // Calculate total quantity in cart for this product (all non-return items)
        const totalInCart = prevItems.filter(item => item.id === product.id && !item.isReturn).reduce((sum, item) => sum + (item.quantity || 1), 0);
        if (!isReturn && (totalInCart + quantity) > availableStock) {
          showToast('Cannot add more than available stock!', 'error');
          return prevItems;
        }
        // Add new item with specified quantity
        return [
          ...prevItems,
          {
            ...product,
            barcode: product.barcode,
            id: product.id,
            price: isReturn ? -Math.abs(product.price) : product.price,
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

  const total = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  return { items, addOrUpdateItem, deleteItem, clearCart, total, setItems };
}

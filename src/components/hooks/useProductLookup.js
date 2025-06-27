const mockProducts = {
  '123456': { id: 1, name: 'Samsung Galaxy S21', model: 'SM-G991B', ram: '8GB', storage: '128GB', price: 500, stock: 5 },
  '789012': { id: 2, name: 'iPhone 13', model: 'A2633', ram: '4GB', storage: '128GB', price: 700, stock: 8 },
  '345678': { id: 3, name: 'Xiaomi Redmi Note 10', model: 'M2101K7AG', ram: '6GB', storage: '128GB', price: 250, stock: 0 },
  '901234': { id: 4, name: 'Oppo Reno 8', model: 'CPH2356', ram: '8GB', storage: '256GB', price: 400, stock: 2 },
  '567890': { id: 5, name: 'Vivo Y21', model: 'V2111', ram: '4GB', storage: '64GB', price: 150, stock: 3 },
};

export default function useProductLookup() {
  // Remove barcode lookup, only use name-based lookup
  const fetchProductsByName = async (name) => {
    if (window.api?.getProductsByName) {
      // Filter out stock 0 products from real API results
      const products = await window.api.getProductsByName(name);
      return Array.isArray(products) ? products.filter(p => (typeof p.stock === 'undefined' || p.stock > 0)) : [];
    }
    // Fallback: filter mockProducts by name (case-insensitive, partial match) and stock > 0
    const lower = name.toLowerCase();
    return Object.values(mockProducts).filter(p => p.name.toLowerCase().includes(lower) && (typeof p.stock === 'undefined' || p.stock > 0));
  };

  return { fetchProductsByName };
}

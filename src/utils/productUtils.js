// Utility functions for product handling

/**
 * Generate a comprehensive display name for a product that includes specifications
 * @param {Object} product - The product object
 * @param {boolean} includeSpecs - Whether to include RAM/storage specs (default: true)
 * @returns {string} Formatted product display name
 */
export function formatProductDisplayName(product, includeSpecs = true) {
  if (!product) return 'Unknown Product';
  
  const parts = [];
  
  // Add base name
  if (product.name) {
    parts.push(product.name);
  }
  
  // Add model if different from name
  if (product.model && product.model !== product.name) {
    parts.push(product.model);
  }
  
  // Add specifications for phones if available and requested
  if (includeSpecs && product.category === 'phones') {
    const specs = [];
    if (product.ram) specs.push(product.ram);
    if (product.storage) specs.push(product.storage);
    
    if (specs.length > 0) {
      parts.push(`(${specs.join(' + ')})`);
    }
  }
  
  return parts.length > 0 ? parts.join(' ') : 'Unknown Product';
}

/**
 * Generate a search-friendly string for product matching
 * @param {Object} product - The product object
 * @returns {string} Searchable string with all relevant fields
 */
export function getProductSearchString(product) {
  if (!product) return '';
  
  const fields = [
    product.name,
    product.brand,
    product.model,
    product.ram,
    product.storage
  ].filter(Boolean);
  
  return fields.join(' ').toLowerCase();
}

/**
 * Check if two products have the same specifications (for identifying duplicates)
 * @param {Object} product1 - First product
 * @param {Object} product2 - Second product
 * @returns {boolean} True if products have same brand, model, RAM, and storage
 */
export function haveSameSpecifications(product1, product2) {
  if (!product1 || !product2) return false;
  
  const normalize = (value) => (value || '').toLowerCase().trim();
  
  return normalize(product1.brand) === normalize(product2.brand) &&
         normalize(product1.model) === normalize(product2.model) &&
         normalize(product1.ram) === normalize(product2.ram) &&
         normalize(product1.storage) === normalize(product2.storage);
}

/**
 * Generate a unique identifier for a product based on its specifications
 * @param {Object} product - The product object
 * @returns {string} Unique specification-based identifier
 */
export function getProductSpecKey(product) {
  if (!product) return 'unknown';
  
  const normalize = (value) => (value || '').toLowerCase().trim().replace(/\s+/g, '');
  
  return [
    normalize(product.brand),
    normalize(product.model),
    normalize(product.ram),
    normalize(product.storage)
  ].join('|');
}

/**
 * Enhanced product search function
 * @param {Array} products - Array of products to search
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered products matching the search term
 */
export function searchProducts(products, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return products;
  
  const searchLower = searchTerm.toLowerCase().trim();
  
  return products.filter(product => {
    if (!product || product.archived || product.stock <= 0) return false;
    
    const searchString = getProductSearchString(product);
    const displayName = formatProductDisplayName(product, true).toLowerCase();
    
    return searchString.includes(searchLower) || displayName.includes(searchLower);
  });
}

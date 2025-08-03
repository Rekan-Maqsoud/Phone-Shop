// Smart suggestion utilities for brands and models from existing data
import { useData } from '../contexts/DataContext';
import { useMemo } from 'react';

/**
 * Custom hook to get smart brand and model suggestions from existing data
 */
export function useSmartSuggestions() {
  const { products, accessories } = useData();

  // Get unique brands from products and accessories
  const productBrands = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    const brands = [...new Set(products
      .filter(p => p.brand && p.brand.trim() && !p.archived)
      .map(p => p.brand.trim())
    )];
    return brands.sort((a, b) => a.localeCompare(b));
  }, [products]);

  const accessoryBrands = useMemo(() => {
    if (!accessories || !Array.isArray(accessories)) return [];
    const brands = [...new Set(accessories
      .filter(a => a.brand && a.brand.trim() && !a.archived)
      .map(a => a.brand.trim())
    )];
    return brands.sort((a, b) => a.localeCompare(b));
  }, [accessories]);

  // Combined unique brands from both products and accessories
  const allBrands = useMemo(() => {
    const combined = [...new Set([...productBrands, ...accessoryBrands])];
    return combined.sort((a, b) => a.localeCompare(b));
  }, [productBrands, accessoryBrands]);

  // Get models for a specific brand from products
  const getProductModelsForBrand = useMemo(() => (brand) => {
    if (!products || !Array.isArray(products) || !brand) return [];
    const models = [...new Set(products
      .filter(p => p.brand === brand && p.model && p.model.trim() && !p.archived)
      .map(p => p.model.trim())
    )];
    return models.sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Get models for a specific brand from accessories
  const getAccessoryModelsForBrand = useMemo(() => (brand) => {
    if (!accessories || !Array.isArray(accessories) || !brand) return [];
    const models = [...new Set(accessories
      .filter(a => a.brand === brand && a.model && a.model.trim() && !a.archived)
      .map(a => a.model.trim())
    )];
    return models.sort((a, b) => a.localeCompare(b));
  }, [accessories]);

  // Get accessory types from existing data
  const accessoryTypes = useMemo(() => {
    if (!accessories || !Array.isArray(accessories)) return [];
    const types = [...new Set(accessories
      .filter(a => a.type && a.type.trim() && !a.archived)
      .map(a => a.type.trim())
    )];
    return types.sort((a, b) => a.localeCompare(b));
  }, [accessories]);

  // Get RAM options from existing products
  const existingRamOptions = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    const rams = [...new Set(products
      .filter(p => p.ram && p.ram.trim() && !p.archived)
      .map(p => p.ram.trim())
    )];
    return rams.sort((a, b) => {
      const aNum = parseInt(a.replace(/[^\d]/g, ''));
      const bNum = parseInt(b.replace(/[^\d]/g, ''));
      return aNum - bNum;
    });
  }, [products]);

  // Get Storage options from existing products
  const existingStorageOptions = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    const storages = [...new Set(products
      .filter(p => p.storage && p.storage.trim() && !p.archived)
      .map(p => p.storage.trim())
    )];
    return storages.sort((a, b) => {
      const aNum = parseInt(a.replace(/[^\d]/g, ''));
      const bNum = parseInt(b.replace(/[^\d]/g, ''));
      return aNum - bNum;
    });
  }, [products]);

  return {
    // Brand suggestions
    productBrands,
    accessoryBrands,
    allBrands,
    
    // Model suggestions
    getProductModelsForBrand,
    getAccessoryModelsForBrand,
    
    // Other suggestions
    accessoryTypes,
    existingRamOptions,
    existingStorageOptions
  };
}

/**
 * Utility function to check if two products should be merged
 * This includes debugging information for troubleshooting
 */
export function shouldMergeProducts(product1, product2) {
  if (!product1 || !product2) {
    return false;
  }

  const normalize = (str) => (str || '').toString().toLowerCase().trim();
  
  const p1Name = normalize(product1.name);
  const p1Brand = normalize(product1.brand);
  const p1Model = normalize(product1.model);
  const p1Ram = normalize(product1.ram);
  const p1Storage = normalize(product1.storage);
  const p1Currency = normalize(product1.currency);
  
  const p2Name = normalize(product2.name);
  const p2Brand = normalize(product2.brand);
  const p2Model = normalize(product2.model);
  const p2Ram = normalize(product2.ram);
  const p2Storage = normalize(product2.storage);
  const p2Currency = normalize(product2.currency);

  const nameMatch = p1Name === p2Name;
  const brandMatch = p1Brand === p2Brand;
  const modelMatch = p1Model === p2Model;
  const ramMatch = p1Ram === p2Ram;
  const storageMatch = p1Storage === p2Storage;
  const currencyMatch = p1Currency === p2Currency;

  // Products should merge if they have same name, brand, model, RAM, storage, and currency
  const shouldMerge = nameMatch && brandMatch && modelMatch && ramMatch && storageMatch && currencyMatch;
  
  return shouldMerge;
}

/**
 * Utility function to check if two accessories should be merged
 */
export function shouldMergeAccessories(accessory1, accessory2) {
  if (!accessory1 || !accessory2) {
    return false;
  }

  const normalize = (str) => (str || '').toString().toLowerCase().trim();
  
  const a1Name = normalize(accessory1.name);
  const a1Brand = normalize(accessory1.brand);
  const a1Model = normalize(accessory1.model);
  const a1Type = normalize(accessory1.type);
  const a1Currency = normalize(accessory1.currency);
  
  const a2Name = normalize(accessory2.name);
  const a2Brand = normalize(accessory2.brand);
  const a2Model = normalize(accessory2.model);
  const a2Type = normalize(accessory2.type);
  const a2Currency = normalize(accessory2.currency);

  const nameMatch = a1Name === a2Name;
  const brandMatch = a1Brand === a2Brand;
  const modelMatch = a1Model === a2Model;
  const typeMatch = a1Type === a2Type;
  const currencyMatch = a1Currency === a2Currency;

  // Accessories should merge if they have same name, brand, model, type, and currency
  const shouldMerge = nameMatch && brandMatch && modelMatch && typeMatch && currencyMatch;
  
  return shouldMerge;
}

/**
 * Calculate weighted average price for merging
 */
export function calculateWeightedAveragePrice(price1, stock1, price2, stock2, currency = 'IQD') {
  const totalStock = stock1 + stock2;
  if (totalStock === 0) return price2;
  
  const weightedAverage = ((price1 * stock1) + (price2 * stock2)) / totalStock;
  
  // Round appropriately based on currency with intelligent rounding
  if (currency === 'USD') {
    // If less than 0.1, round to nearest whole number
    if (Math.abs(weightedAverage) < 0.1) {
      return Math.round(weightedAverage);
    }
    // Otherwise, round to 2 decimal places max
    return Math.round(weightedAverage * 100) / 100;
  } else {
    return Math.round(weightedAverage); // Whole numbers for IQD
  }
}

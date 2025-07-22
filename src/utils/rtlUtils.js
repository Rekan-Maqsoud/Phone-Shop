/**
 * RTL (Right-to-Left) utilities for proper text direction handling
 */

/**
 * Get the appropriate separator for the current language direction
 * @param {boolean} isRTL - Whether the current language is RTL
 * @returns {string} - Appropriate separator
 */
export const getSeparator = (isRTL) => {
  // Use different separators based on text direction
  // For RTL: use a dash or vertical bar that works better visually
  return isRTL ? ' | ' : ' • ';
};

/**
 * Get the appropriate flexbox direction classes for content
 * @param {boolean} isRTL - Whether the current language is RTL
 * @returns {string} - Tailwind classes for proper direction
 */
export const getFlexDirection = (isRTL) => {
  return isRTL ? 'flex-row-reverse' : 'flex-row';
};

/**
 * Get the appropriate text alignment classes
 * @param {boolean} isRTL - Whether the current language is RTL
 * @param {string} defaultAlign - Default alignment ('left', 'right', 'center')
 * @returns {string} - Tailwind classes for proper alignment
 */
export const getTextAlign = (isRTL, defaultAlign = 'left') => {
  if (defaultAlign === 'center') return 'text-center';
  
  if (defaultAlign === 'right') {
    return isRTL ? 'text-left' : 'text-right';
  }
  
  // Default 'left'
  return isRTL ? 'text-right' : 'text-left';
};

/**
 * Get appropriate spacing classes for RTL
 * @param {boolean} isRTL - Whether the current language is RTL
 * @param {string} type - Type of spacing ('margin', 'padding')
 * @param {string} direction - Direction ('left', 'right')
 * @param {string} size - Size class (e.g., '4', '2', 'auto')
 * @returns {string} - Tailwind classes with proper direction
 */
export const getSpacing = (isRTL, type, direction, size) => {
  const prefix = type === 'margin' ? 'm' : 'p';
  
  if (direction === 'left') {
    const actualDirection = isRTL ? 'r' : 'l';
    return `${prefix}${actualDirection}-${size}`;
  }
  
  if (direction === 'right') {
    const actualDirection = isRTL ? 'l' : 'r';
    return `${prefix}${actualDirection}-${size}`;
  }
  
  return `${prefix}${direction}-${size}`;
};

/**
 * Format a compound text with proper RTL handling
 * @param {boolean} isRTL - Whether the current language is RTL
 * @param {Array} parts - Array of text parts to join
 * @returns {string} - Properly formatted text
 */
export const formatCompoundText = (isRTL, parts) => {
  const separator = getSeparator(isRTL);
  return parts.join(separator);
};

/**
 * Format debt count text with proper RTL logical ordering
 * @param {boolean} isRTL - Whether the current language is RTL
 * @param {number} unpaidCount - Number of unpaid debts
 * @param {string} unpaidText - Text for unpaid debts
 * @param {number} paidCount - Number of paid debts  
 * @param {string} paidText - Text for paid debts
 * @returns {Object} - Object with JSX structure for proper RTL layout
 */
export const formatDebtCounts = (isRTL, unpaidCount, unpaidText, paidCount, paidText) => {
  const unpaidPart = `${unpaidCount} ${unpaidText}`;
  const paidPart = `${paidCount} ${paidText}`;
  
  // Return JSX structure instead of string for better control
  return {
    unpaidPart,
    paidPart,
    separator: getSeparator(isRTL),
    isRTL
  };
};

/**
 * Get appropriate icon positioning classes for RTL
 * @param {boolean} isRTL - Whether the current language is RTL
 * @param {string} position - Desired logical position ('before', 'after')
 * @returns {string} - Tailwind classes for proper positioning
 */
export const getIconPosition = (isRTL, position) => {
  if (position === 'before') {
    return isRTL ? 'ml-2' : 'mr-2';
  }
  
  if (position === 'after') {
    return isRTL ? 'mr-2' : 'ml-2';
  }
  
  return '';
};

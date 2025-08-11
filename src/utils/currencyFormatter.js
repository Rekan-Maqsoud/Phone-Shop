// Deprecated: currencyFormatter utilities have been merged into exchangeRates.
// Keeping minimal re-exports for safety.
import { formatCurrency as _formatCurrency, formatCurrencyWithTranslation as _formatCurrencyWithTranslation } from './exchangeRates';
export { _formatCurrency as formatCurrency, _formatCurrencyWithTranslation as formatCurrencyWithTranslation };
export const roundCurrencyAmount = (amount, currency) => amount;
export const formatCurrencyForPlaceholder = (amount, currency) => String(amount ?? '');
export const formatCurrencyForChart = (amount) => Number(amount ?? 0);
export default {
  formatCurrency: _formatCurrency,
  formatCurrencyWithTranslation: _formatCurrencyWithTranslation,
  roundCurrencyAmount,
  formatCurrencyForPlaceholder,
  formatCurrencyForChart,
};

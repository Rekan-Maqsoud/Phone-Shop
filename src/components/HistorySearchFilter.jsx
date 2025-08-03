import React, { useState, useMemo } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { Icon } from '../utils/icons';

// Helper function to format totals with consistent rounding rules
const formatTotal = (amount, currency) => {
  const numAmount = Number(amount || 0);
  
  if (currency === 'IQD') {
    // IQD should never show decimals
    return `د.ع${Math.round(numAmount).toLocaleString()}`;
  }
  
  // For USD: apply intelligent rounding
  let finalAmount = numAmount;
  
  // If less than 0.1, round to nearest whole number
  if (Math.abs(numAmount) < 0.1) {
    finalAmount = Math.round(numAmount);
  } else {
    // Round to 2 decimal places max
    finalAmount = Math.round(numAmount * 100) / 100;
  }
  
  // Format with 1-2 decimals max, remove trailing zeros
  if (finalAmount % 1 === 0) {
    return `$${Math.floor(finalAmount).toLocaleString()}`;
  } else {
    const formatted = finalAmount.toFixed(2).replace(/\.?0+$/, '');
    return `$${formatted}`;
  }
};

export default function HistorySearchFilter({
  data = [],
  onFilteredDataChange,
  t,
  searchFields = ['customer_name'], // default search fields
  dateField = 'created_at', // default date field
  showNameSearch = true,
  showTotals = false,
  calculateTotals = null, // function to calculate totals from filtered data
  showBrandFilter = false, // new prop to show brand filter
  getBrandFromItem = null // function to extract brand from item
}) {
  const { getMonthName } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [searchType, setSearchType] = useState('preset'); // 'preset', 'single', 'week', 'range'
  const [presetPeriod, setPresetPeriod] = useState(''); // 'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'
  
  // Date dropdown states
  const [singleDay, setSingleDay] = useState('');
  const [singleMonth, setSingleMonth] = useState('');
  const [singleYear, setSingleYear] = useState('');
  
  const [startDay, setStartDay] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  
  const [endDay, setEndDay] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');

  // Generate dropdown options
  const getDaysInMonth = (month, year) => {
    if (!month || !year) return 31; // Default to 31 if month/year not selected
    return new Date(year, month, 0).getDate();
  };

  const dayOptions = (month, year) => {
    const days = getDaysInMonth(month, year);
    return Array.from({ length: days }, (_, i) => i + 1);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: getMonthName(i)
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i + 5); // 5 years future, 5 years past

  // Get unique brands for filter dropdown
  const availableBrands = useMemo(() => {
    if (!showBrandFilter || !getBrandFromItem) return [];
    
    const brands = new Set();
    data.forEach(item => {
      const brand = getBrandFromItem(item);
      if (brand) brands.add(brand);
    });
    
    return Array.from(brands).sort();
  }, [data, showBrandFilter, getBrandFromItem]);

  // Helper to format date for comparison
  const formatDateForComparison = (day, month, year) => {
    if (!day || !month || !year) return null;
    // Format as YYYY-MM-DD without timezone conversion
    const paddedMonth = String(month).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  };

  // Helper function to get date ranges for preset periods
  const getPresetDateRange = (period) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
        
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return { start: yesterday, end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1) };
        
      case 'thisWeek':
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        return { start: thisWeekStart, end: thisWeekEnd };
        
      case 'lastWeek':
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1); // End of last week
        const lastWeekStart = new Date(lastWeekEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
        lastWeekStart.setHours(0, 0, 0, 0);
        lastWeekEnd.setHours(23, 59, 59, 999);
        return { start: lastWeekStart, end: lastWeekEnd };
        
      case 'thisMonth':
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start: thisMonthStart, end: thisMonthEnd };
        
      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
        return { start: lastMonthStart, end: lastMonthEnd };
        
      case 'last7Days':
        const last7Start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        return { start: last7Start, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
        
      case 'last30Days':
        const last30Start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
        return { start: last30Start, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
        
      default:
        return null;
    }
  };

  // Filter data based on search criteria
  const filteredData = useMemo(() => {
    let filtered = data;

    // Name/text search
    if (showNameSearch && searchTerm) {
      filtered = filtered.filter(item => {
        return searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
    }

    // Brand filtering
    if (showBrandFilter && brandFilter && getBrandFromItem) {
      filtered = filtered.filter(item => {
        const brand = getBrandFromItem(item);
        return brand && brand.toLowerCase().includes(brandFilter.toLowerCase());
      });
    }

    // Date filtering
    if (searchType === 'preset' && presetPeriod) {
      const dateRange = getPresetDateRange(presetPeriod);
      if (dateRange) {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[dateField]);
          return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });
      }
    } else if (searchType === 'single' && singleDay && singleMonth && singleYear) {
      const singleDate = formatDateForComparison(singleDay, singleMonth, singleYear);
      if (singleDate) {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[dateField]).toISOString().split('T')[0];
          return itemDate === singleDate;
        });
      }
    } else if (searchType === 'week' && startDay && startMonth && startYear) {
      // Week filtering - from start of week to end of week
      const weekStart = formatDateForComparison(startDay, startMonth, startYear);
      if (weekStart) {
        const startDate = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(startYear, startMonth - 1, startDay + 6);
        const weekEnd = formatDateForComparison(endDate.getDate(), endDate.getMonth() + 1, endDate.getFullYear());
        
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[dateField]).toISOString().split('T')[0];
          return itemDate >= weekStart && itemDate <= weekEnd;
        });
      }
    } else if (searchType === 'range' && startDay && startMonth && startYear && endDay && endMonth && endYear) {
      // Range filtering
      const rangeStart = formatDateForComparison(startDay, startMonth, startYear);
      const rangeEnd = formatDateForComparison(endDay, endMonth, endYear);
      
      if (rangeStart && rangeEnd) {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[dateField]).toISOString().split('T')[0];
          return itemDate >= rangeStart && itemDate <= rangeEnd;
        });
      }
    }

    return filtered;
  }, [data, searchTerm, brandFilter, searchType, presetPeriod, singleDay, singleMonth, singleYear, startDay, startMonth, startYear, endDay, endMonth, endYear, searchFields, dateField, showNameSearch, showBrandFilter, getBrandFromItem]);

  // Calculate totals if function provided
  const totals = useMemo(() => {
    if (showTotals && calculateTotals) {
      return calculateTotals(filteredData);
    }
    return null;
  }, [filteredData, showTotals, calculateTotals]);

  // Notify parent of filtered data changes - memoize the effect to prevent infinite loops
  React.useEffect(() => {
    onFilteredDataChange?.(filteredData, totals);
  }, [filteredData, totals, onFilteredDataChange]);

  // Handle search type change
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    // Clear filters when changing type
    setPresetPeriod('');
    setSingleDay('');
    setSingleMonth('');
    setSingleYear('');
    setStartDay('');
    setStartMonth('');
    setStartYear('');
    setEndDay('');
    setEndMonth('');
    setEndYear('');
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setBrandFilter('');
    setPresetPeriod('');
    setSingleDay('');
    setSingleMonth('');
    setSingleYear('');
    setStartDay('');
    setStartMonth('');
    setStartYear('');
    setEndDay('');
    setEndMonth('');
    setEndYear('');
    setSearchType('preset');
  };

  return (
    <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
            <Icon name="search" size={20} />
            {t?.searchAndFilter || 'Search & Filter'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t?.searchFilterDesc || 'Filter your data by name, date, or range'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Name Search */}
        {showNameSearch && (
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t?.searchByName || 'Search by name...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded-xl px-4 py-2 pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 transition"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                <Icon name="search" size={16} />
              </span>
            </div>
          </div>
        )}

        {/* Brand Filter */}
        {showBrandFilter && availableBrands.length > 0 && (
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
              {t?.brand || 'Brand'}:
            </label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-40"
            >
              <option value="">{t?.allBrands || 'All Brands'}</option>
              {availableBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date Search Type Selection */}
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
            {t?.searchType || 'Search Type'}:
          </label>
          <select
            value={searchType}
            onChange={(e) => handleSearchTypeChange(e.target.value)}
            className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="preset">{t?.quickSelect || 'Quick Select'}</option>
            <option value="single">{t?.singleDate || 'Single Date'}</option>
            <option value="week">{t?.weekRange || 'Week Range'}</option>
            <option value="range">{t?.customRange || 'Custom Range'}</option>
          </select>
        </div>

        {/* Date Inputs */}
        <div className="flex gap-2 items-center flex-wrap">
          {searchType === 'preset' && (
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
                {t?.selectPeriod || 'Select Period'}:
              </label>
              <select
                value={presetPeriod}
                onChange={(e) => setPresetPeriod(e.target.value)}
                className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-40"
              >
                <option value="">{t?.selectPeriod || 'Select Period'}...</option>
                <option value="today">{t?.today || 'Today'}</option>
                <option value="yesterday">{t?.yesterday || 'Yesterday'}</option>
                <option value="last7Days">{t?.last7Days || 'Last 7 Days'}</option>
                <option value="thisWeek">{t?.thisWeek || 'This Week'}</option>
                <option value="lastWeek">{t?.lastWeek || 'Last Week'}</option>
                <option value="last30Days">{t?.last30Days || 'Last 30 Days'}</option>
                <option value="thisMonth">{t?.thisMonth || 'This Month'}</option>
                <option value="lastMonth">{t?.lastMonth || 'Last Month'}</option>
              </select>
            </div>
          )}
          {searchType === 'single' && (
            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
                {t?.selectDate || 'Select Date'}:
              </label>
              <div className="flex gap-2">
                <select
                  value={singleDay}
                  onChange={(e) => setSingleDay(e.target.value)}
                  className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-16"
                >
                  <option value="">{t?.day || 'Day'}</option>
                  {dayOptions(singleMonth, singleYear).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <select
                  value={singleMonth}
                  onChange={(e) => setSingleMonth(e.target.value)}
                  className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-32"
                >
                  <option value="">{t?.month || 'Month'}</option>
                  {monthOptions.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
                <select
                  value={singleYear}
                  onChange={(e) => setSingleYear(e.target.value)}
                  className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-20"
                >
                  <option value="">{t?.year || 'Year'}</option>
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {searchType === 'week' && (
            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
                {t?.weekStartDate || 'Week Start'}:
              </label>
              <div className="flex gap-2">
                <select
                  value={startDay}
                  onChange={(e) => setStartDay(e.target.value)}
                  className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-16"
                >
                  <option value="">{t?.day || 'Day'}</option>
                  {dayOptions(startMonth, startYear).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-32"
                >
                  <option value="">{t?.month || 'Month'}</option>
                  {monthOptions.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-20"
                >
                  <option value="">{t?.year || 'Year'}</option>
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              {startDay && startMonth && startYear && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t?.to || 'to'} {(() => {
                    const weekEnd = new Date(startYear, startMonth - 1, parseInt(startDay));
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    return weekEnd.toLocaleDateString();
                  })()}
                </span>
              )}
            </div>
          )}

          {searchType === 'range' && (
            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
                {t?.dateRange || 'Date Range'}:
              </label>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t?.from || 'From'}:</span>
                <div className="flex gap-2">
                  <select
                    value={startDay}
                    onChange={(e) => setStartDay(e.target.value)}
                    className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-16"
                  >
                    <option value="">{t?.day || 'Day'}</option>
                    {dayOptions(startMonth, startYear).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-32"
                  >
                    <option value="">{t?.month || 'Month'}</option>
                    {monthOptions.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  <select
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-20"
                  >
                    <option value="">{t?.year || 'Year'}</option>
                    {yearOptions.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t?.to || 'To'}:</span>
                <div className="flex gap-2">
                  <select
                    value={endDay}
                    onChange={(e) => setEndDay(e.target.value)}
                    className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-16"
                  >
                    <option value="">{t?.day || 'Day'}</option>
                    {dayOptions(endMonth, endYear).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-32"
                  >
                    <option value="">{t?.month || 'Month'}</option>
                    {monthOptions.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  <select
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-20"
                  >
                    <option value="">{t?.year || 'Year'}</option>
                    {yearOptions.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          {(searchTerm || presetPeriod || singleDay || singleMonth || singleYear || startDay || startMonth || startYear || endDay || endMonth || endYear) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition text-sm flex items-center gap-1"
            >
              <Icon name="trash2" size={14} />
              {t?.clearFilters || 'Clear'}
            </button>
          )}
        </div>

        {/* Results Summary */}
        {filteredData.length !== data.length && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {t?.showingResults || 'Showing'} {filteredData.length} {t?.of || 'of'} {data.length} {t?.entries || 'entries'}
          </div>
        )}

        {/* Totals Display */}
        {showTotals && totals && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            {totals.totalProfitUSD !== undefined && totals.totalProfitUSD > 0 && (
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t?.totalProfitUSD || 'Total Profit USD'}</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatTotal(totals.totalProfitUSD, 'USD')}
                </div>
              </div>
            )}
            {totals.totalProfitIQD !== undefined && totals.totalProfitIQD > 0 && (
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t?.totalProfitIQD || 'Total Profit IQD'}</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatTotal(totals.totalProfitIQD, 'IQD')}
                </div>
              </div>
            )}
            {totals.totalRevenueUSD !== undefined && totals.totalRevenueUSD > 0 && (
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t?.totalRevenueUSD || 'Total Revenue USD'}</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatTotal(totals.totalRevenueUSD, 'USD')}
                </div>
              </div>
            )}
            {totals.totalRevenueIQD !== undefined && totals.totalRevenueIQD > 0 && (
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t?.totalRevenueIQD || 'Total Revenue IQD'}</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatTotal(totals.totalRevenueIQD, 'IQD')}
                </div>
              </div>
            )}
            {totals.totalSales !== undefined && (
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t?.totalSales || 'Total Sales'}</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {totals.totalSales.toLocaleString()}
                </div>
              </div>
            )}
            {totals.totalProducts !== undefined && (
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t?.totalProducts || 'Total Products'}</div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {totals.totalProducts.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

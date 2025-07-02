import React, { useState, useMemo } from 'react';

export default function HistorySearchFilter({
  data = [],
  onFilteredDataChange,
  t,
  searchFields = ['customer_name'], // default search fields
  dateField = 'created_at', // default date field
  showNameSearch = true,
  showTotals = false,
  calculateTotals = null // function to calculate totals from filtered data
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('preset'); // 'preset', 'single', 'week', 'range'
  const [presetPeriod, setPresetPeriod] = useState(''); // 'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'
  const [singleDate, setSingleDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

    // Date filtering
    if (searchType === 'preset' && presetPeriod) {
      const dateRange = getPresetDateRange(presetPeriod);
      if (dateRange) {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[dateField]);
          return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });
      }
    } else if (searchType === 'single' && singleDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item[dateField]).toISOString().split('T')[0];
        return itemDate === singleDate;
      });
    } else if (searchType === 'week' && startDate) {
      // Week filtering - from start of week to end of week
      const weekStart = new Date(startDate);
      const weekEnd = new Date(startDate);
      weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days to get end of week
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= weekStart && itemDate <= weekEnd;
      });
    } else if (searchType === 'range' && startDate && endDate) {
      // Range filtering
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate + 'T23:59:59'); // Include end date
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= rangeStart && itemDate <= rangeEnd;
      });
    }

    return filtered;
  }, [data, searchTerm, searchType, presetPeriod, singleDate, startDate, endDate, searchFields, dateField, showNameSearch]);

  // Calculate totals if function provided
  const totals = useMemo(() => {
    if (showTotals && calculateTotals) {
      return calculateTotals(filteredData);
    }
    return null;
  }, [filteredData, showTotals, calculateTotals]);

  // Notify parent of filtered data changes
  React.useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData, totals);
    }
  }, [filteredData, totals, onFilteredDataChange]);

  // Handle search type change
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    // Clear filters when changing type
    setPresetPeriod('');
    setSingleDate('');
    setStartDate('');
    setEndDate('');
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setPresetPeriod('');
    setSingleDate('');
    setStartDate('');
    setEndDate('');
    setSearchType('preset');
  };

  // Set end date automatically when start date changes and search type is week
  React.useEffect(() => {
    if (searchType === 'week' && startDate) {
      const weekEnd = new Date(startDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      setEndDate(weekEnd.toISOString().split('T')[0]);
    }
  }, [searchType, startDate]);

  return (
    <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            🔍 {t?.searchAndFilter || 'Search & Filter'}
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
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
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
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
                {t?.selectDate || 'Select Date'}:
              </label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}

          {searchType === 'week' && (
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
                {t?.weekStartDate || 'Week Start'}:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {endDate && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t?.to || 'to'} {new Date(endDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {searchType === 'range' && (
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
                {t?.dateRange || 'Date Range'}:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Start date"
              />
              <span className="text-gray-500">{t?.to || 'to'}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="End date"
              />
            </div>
          )}

          {/* Clear Filters Button */}
          {(searchTerm || presetPeriod || singleDate || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition text-sm"
            >
              🗑️ {t?.clearFilters || 'Clear'}
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
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            {totals.totalProfit !== undefined && (
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t?.totalProfit || 'Total Profit'}</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  ${totals.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}
            {totals.totalRevenue !== undefined && (
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t?.totalRevenue || 'Total Revenue'}</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  ${totals.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

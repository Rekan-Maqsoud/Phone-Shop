import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  Interaction
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import { EXCHANGE_RATES } from './exchangeRates';

// Register Chart.js components and plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  zoomPlugin
);

/**
 * Format currency for chart display
 */
export const formatChartCurrency = (amount, currency = 'USD') => {
  if (currency === 'IQD') {
    return `${Math.round(amount).toLocaleString()} د.ع`;
  }
  const numAmount = Number(amount);
  if (numAmount === Math.floor(numAmount)) {
    return `${Math.floor(numAmount).toLocaleString()} USD`;
  }
  const formatted = numAmount.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted} USD`;
};

/**
 * Convert currency for consistent chart comparison
 */
export const convertCurrency = (amount, fromCurrency, toCurrency = 'USD') => {
  if (!amount) return 0;
  
  if (fromCurrency === toCurrency) return amount;
  
  if (fromCurrency === 'IQD' && toCurrency === 'USD') {
    return amount * EXCHANGE_RATES.IQD_TO_USD;
  }
  
  if (fromCurrency === 'USD' && toCurrency === 'IQD') {
    return amount * EXCHANGE_RATES.USD_TO_IQD;
  }
  
  return amount;
};

/**
 * Generate chart colors with transparency variants
 */
export const chartColors = {
  primary: {
    solid: 'rgba(59, 130, 246, 1)',
    light: 'rgba(59, 130, 246, 0.6)',
    lighter: 'rgba(59, 130, 246, 0.3)',
    lightest: 'rgba(59, 130, 246, 0.1)'
  },
  success: {
    solid: 'rgba(34, 197, 94, 1)',
    light: 'rgba(34, 197, 94, 0.6)',
    lighter: 'rgba(34, 197, 94, 0.3)',
    lightest: 'rgba(34, 197, 94, 0.1)'
  },
  warning: {
    solid: 'rgba(245, 158, 11, 1)',
    light: 'rgba(245, 158, 11, 0.6)',
    lighter: 'rgba(245, 158, 11, 0.3)',
    lightest: 'rgba(245, 158, 11, 0.1)'
  },
  danger: {
    solid: 'rgba(239, 68, 68, 1)',
    light: 'rgba(239, 68, 68, 0.6)',
    lighter: 'rgba(239, 68, 68, 0.3)',
    lightest: 'rgba(239, 68, 68, 0.1)'
  },
  purple: {
    solid: 'rgba(147, 51, 234, 1)',
    light: 'rgba(147, 51, 234, 0.6)',
    lighter: 'rgba(147, 51, 234, 0.3)',
    lightest: 'rgba(147, 51, 234, 0.1)'
  },
  cyan: {
    solid: 'rgba(6, 182, 212, 1)',
    light: 'rgba(6, 182, 212, 0.6)',
    lighter: 'rgba(6, 182, 212, 0.3)',
    lightest: 'rgba(6, 182, 212, 0.1)'
  }
};

/**
 * Base chart options with zoom and pan functionality
 */
export const getBaseChartOptions = (title, yAxisLabel, isDarkMode = false) => {
  const textColor = isDarkMode ? '#f9fafb' : '#374151';
  const gridColor = isDarkMode ? '#374151' : '#e5e7eb';
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      title: {
        display: !!title,
        text: title,
        color: textColor,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      legend: {
        position: 'top',
        labels: {
          color: textColor,
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#374151' : '#ffffff',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: gridColor,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const currency = context.dataset.currency || 'USD';
            return `${label}: ${formatChartCurrency(value, currency)}`;
          }
        }
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
          scaleMode: 'x'
        },
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: 'ctrl'
        },
        limits: {
          x: {
            minRange: 3 * 24 * 60 * 60 * 1000 // Minimum 3 days visible
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        grid: {
          color: gridColor,
          drawBorder: false
        },
        ticks: {
          color: textColor,
          maxTicksLimit: 10
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: gridColor,
          drawBorder: false
        },
        ticks: {
          color: textColor,
          callback: function(value) {
            return formatChartCurrency(value, this.chart.data.datasets[0]?.currency || 'USD');
          }
        },
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
          color: textColor
        }
      }
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2
      },
      line: {
        tension: 0.3,
        borderWidth: 3
      }
    }
  };
};

/**
 * Multi-line chart options for comparing multiple metrics
 */
export const getMultiLineChartOptions = (title, isDarkMode = false) => {
  const baseOptions = getBaseChartOptions(title, 'Amount', isDarkMode);
  
  return {
    ...baseOptions,
    scales: {
      ...baseOptions.scales,
      y: {
        ...baseOptions.scales.y,
        ticks: {
          ...baseOptions.scales.y.ticks,
          callback: function(value) {
            // Auto-detect currency based on magnitude
            const currency = value > 10000 ? 'IQD' : 'USD';
            return formatChartCurrency(value, currency);
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: baseOptions.scales.y.ticks.color,
          callback: function(value) {
            const currency = value > 10000 ? 'IQD' : 'USD';
            return formatChartCurrency(value, currency);
          }
        }
      }
    }
  };
};

/**
 * Bar chart options with enhanced styling
 */
export const getBarChartOptions = (title, isDarkMode = false) => {
  const baseOptions = getBaseChartOptions(title, 'Amount', isDarkMode);
  
  return {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      tooltip: {
        ...baseOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const currency = context.dataset.currency || 'USD';
            return `${label}: ${formatChartCurrency(value, currency)}`;
          },
          footer: function(tooltipItems) {
            if (tooltipItems.length > 1) {
              const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
              const currency = tooltipItems[0].dataset.currency || 'USD';
              return `Total: ${formatChartCurrency(total, currency)}`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      ...baseOptions.scales,
      x: {
        ...baseOptions.scales.x,
        stacked: false
      },
      y: {
        ...baseOptions.scales.y,
        stacked: false
      }
    },
    elements: {
      bar: {
        borderRadius: 4,
        borderSkipped: false
      }
    }
  };
};

/**
 * Process time series data for charts
 */
export const processTimeSeriesData = (data, dateField = 'created_at', valueField = 'amount', currency = 'USD') => {
  if (!data || !Array.isArray(data)) return [];
  
  const processedData = data
    .filter(item => item[dateField] && item[valueField] !== undefined)
    .map(item => ({
      x: new Date(item[dateField]),
      y: Number(item[valueField]) || 0,
      currency: item.currency || currency,
      ...item
    }))
    .sort((a, b) => a.x - b.x);
    
  return processedData;
};

/**
 * Aggregate data by time period (daily, weekly, monthly)
 */
export const aggregateByPeriod = (data, period = 'daily', valueField = 'y') => {
  if (!data || !Array.isArray(data)) return [];
  
  const aggregated = new Map();
  
  data.forEach(item => {
    let key;
    const date = new Date(item.x);
    
    switch (period) {
      case 'daily':
        key = date.toDateString();
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toDateString();
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${date.getMonth()}`;
        break;
      default:
        key = date.toDateString();
    }
    
    if (!aggregated.has(key)) {
      aggregated.set(key, {
        x: new Date(key),
        y: 0,
        count: 0,
        currency: item.currency
      });
    }
    
    const existing = aggregated.get(key);
    existing.y += Number(item[valueField]) || 0;
    existing.count += 1;
  });
  
  return Array.from(aggregated.values()).sort((a, b) => a.x - b.x);
};

/**
 * Calculate growth rates between periods
 */
export const calculateGrowthRate = (current, previous) => {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
};

/**
 * Generate trend line data
 */
export const generateTrendLine = (data, valueField = 'y') => {
  if (!data || data.length < 2) return [];
  
  const n = data.length;
  const sumX = data.reduce((sum, _, i) => sum + i, 0);
  const sumY = data.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0);
  const sumXY = data.reduce((sum, item, i) => sum + i * (Number(item[valueField]) || 0), 0);
  const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return data.map((item, i) => ({
    x: item.x,
    y: slope * i + intercept,
    currency: item.currency
  }));
};

/**
 * Reset chart zoom to show all data
 */
export const resetChartZoom = (chartRef) => {
  if (chartRef.current) {
    chartRef.current.resetZoom();
  }
};

/**
 * Export chart as image
 */
export const exportChartAsImage = (chartRef, filename = 'chart') => {
  if (chartRef.current) {
    const canvas = chartRef.current.canvas;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = url;
    link.click();
  }
};

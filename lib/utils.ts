import { Decimal } from 'decimal.js';

/**
 * Format currency with proper decimal handling
 */
export const formatCurrency = (amount: number, currencySymbol: string = 'Rp'): string => {
  const decimalAmount = new Decimal(amount);
  const formatted = decimalAmount.toFixed(2);
  return `${currencySymbol} ${formatted}`;
};

/**
 * Format number with proper decimal handling
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  const decimalValue = new Decimal(value);
  return decimalValue.toFixed(decimals);
};

/**
 * Parse string to number safely
 */
export const parseNumber = (value: string): number => {
  try {
    const decimal = new Decimal(value);
    return decimal.toNumber();
  } catch {
    return 0;
  }
};

/**
 * Validate if a string is a valid number
 */
export const isValidNumber = (value: string): boolean => {
  try {
    new Decimal(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Round number to specified decimal places using Decimal.js
 */
export const roundToDecimals = (value: number, decimals: number = 2): number => {
  const decimal = new Decimal(value);
  return decimal.toDecimalPlaces(decimals).toNumber();
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  const val = new Decimal(value);
  const tot = new Decimal(total);
  return val.div(tot).mul(100).toNumber();
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (oldValue: number, newValue: number): number => {
  if (oldValue === 0) return 0;
  const old = new Decimal(oldValue);
  const newV = new Decimal(newValue);
  return newV.minus(old).div(old).mul(100).toNumber();
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * Format date to local string
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date and time to local string
 */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(d);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if arrays are equal
 */
export const arraysEqual = <T>(a: T[], b: T[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
};

/**
 * Sort array by key
 */
export const sortByKey = <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return array.sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Group array by key
 */
export const groupByKey = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * Remove duplicates from array
 */
export const removeDuplicates = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

/**
 * Get unique values from array by key
 */
export const getUniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};
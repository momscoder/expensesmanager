import CryptoJS from 'crypto-js';

class UtilityService {
  // Date formatting utilities
  static formatDate(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
      return date;
    }
    
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    
    return '';
  }

  static formatDateForDisplay(date) {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  static getDateRange(days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate)
    };
  }

  // Currency formatting utilities
  static formatCurrency(amount, currency = 'BYN') {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return `0.00 ${currency}`;
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return `0.00 ${currency}`;
    }
    
    return `${numAmount.toFixed(2)} ${currency}`;
  }

  static parseCurrency(amountString) {
    if (!amountString || typeof amountString !== 'string') {
      return 0;
    }
    
    // Remove currency symbols and spaces
    const cleaned = amountString.replace(/[^\d.,]/g, '');
    
    // Handle different decimal separators
    const normalized = cleaned.replace(',', '.');
    
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Validation utilities
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  static validateUsername(username) {
    if (!username || typeof username !== 'string') return false;
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(username.trim());
  }

  static validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    return password.length >= 5;
  }

  static validateAmount(amount) {
    if (amount === null || amount === undefined || amount === '') return false;
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount >= 0;
  }

  static validateNumber(num) {
    if (num === null || num === undefined || num === '') return false;
    const parsed = parseFloat(num);
    return !isNaN(parsed);
  }

  static validateDate(date) {
    if (!date || typeof date !== 'string') return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  }

  // String utilities
  static truncateString(str, maxLength = 50) {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }

  static capitalizeFirst(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static cleanString(str) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().replace(/\s+/g, ' ');
  }

  // Array utilities
  static groupBy(array, key) {
    if (!Array.isArray(array)) return {};
    
    return array.reduce((groups, item) => {
      const group = item[key] || 'Unknown';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {});
  }

  static sortBy(array, key, direction = 'asc') {
    if (!Array.isArray(array)) return [];
    
    return [...array].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      // Handle numeric values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle string values
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
      
      if (direction === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  }

  static unique(array, key = null) {
    if (!Array.isArray(array)) return [];
    
    if (key) {
      const seen = new Set();
      return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      });
    }
    
    return [...new Set(array)];
  }

  // Number utilities
  static roundToDecimals(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  static formatNumber(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // Error handling utilities
  static getErrorMessage(error) {
    if (!error) return 'Unknown error occurred';
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.message) {
      return error.message;
    }
    
    if (error.error) {
      return error.error;
    }
    
    return 'An unexpected error occurred';
  }

  static isNetworkError(error) {
    if (!error) return false;
    
    const message = this.getErrorMessage(error).toLowerCase();
    return message.includes('network') || 
           message.includes('fetch') || 
           message.includes('connection') ||
           message.includes('timeout');
  }

  // Storage utilities
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Generate simple hash for data
  static generateHash(data) {
    let hash = 0;
    if (data.length === 0) return hash.toString();
    
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  // Генерация SHA-256 hash для чека (uid + date)
  static async generateReceiptHashSHA256(uid, date) {
    const str = `${uid}_${date}`;
    // Web Crypto API (браузер/React Native >=0.59)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback: crypto-js (гарантированно установлен)
    return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
  }

  // Декодирует JWT токен (без проверки подписи)
  static jwtDecode(token) {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const decoded = decodeURIComponent(
        atob(payload)
          .split('')
          .map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
      return JSON.parse(decoded);
    } catch (e) {
      console.error('Ошибка декодирования JWT:', e);
      return null;
    }
  }
}

export default UtilityService; 
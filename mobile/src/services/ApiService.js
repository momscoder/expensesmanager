import * as SecureStore from 'expo-secure-store';
import ConfigService from './ConfigService';

class ApiService {
  constructor() {
    this.baseURL = null;
    this.isInitialized = false;
    // Глобальный обработчик выхода
    this.onLogout = null;
  }

  // Позволяет подписаться на logout
  setLogoutHandler(handler) {
    this.onLogout = handler;
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      this.baseURL = await ConfigService.getApiBaseUrl();
      this.isInitialized = true;
    }
  }

  async getToken() {
    try {
      return await SecureStore.getItemAsync('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async setToken(token) {
    try {
      await SecureStore.setItemAsync('authToken', token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  async removeToken() {
    try {
      await SecureStore.deleteItemAsync('authToken');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  async request(endpoint, options = {}) {
    await this.ensureInitialized();
    const token = await this.getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Логируем параметры запроса
    console.log('[API REQUEST]', endpoint, config);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      // Логируем статус ответа
      console.log('[API RESPONSE]', endpoint, 'Status:', response.status, response.statusText);
      let responseBody = null;
      try {
        responseBody = await response.clone().json();
      } catch (e) {
        try {
          responseBody = await response.clone().text();
        } catch (e2) {
          responseBody = '[Не удалось прочитать тело ответа]';
        }
      }
      console.log('[API RESPONSE BODY]', endpoint, responseBody);

      if (response.status === 401 || response.status === 403) {
        await this.removeToken();
        if (this.onLogout) {
          this.onLogout();
        }
      }

      if (!response.ok) {
        const errorData = responseBody || {};
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('[API ERROR]', endpoint, error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server');
      }
      throw error;
    }
  }

  // Authentication
  async login(credentials) {
    const response = await this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    await this.setToken(data.token);
    return data;
  }

  async register(credentials) {
    const response = await this.request('/api/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    await this.setToken(data.token);
    return data;
  }

  async logout() {
    await this.removeToken();
    if (this.onLogout) {
      this.onLogout();
    }
  }

  // Receipt operations
  async addReceipt(receipt) {
    const response = await this.request('/api/data', {
      method: 'POST',
      body: JSON.stringify(receipt),
    });

    return await response.json();
  }

  async getReceiptByUid(uid) {
    const response = await this.request(`/api/receipt/${uid}`);
    return await response.json();
  }

  async getReceipts() {
    const response = await this.request('/api/stats');
    return await response.json();
  }

  async updateReceipt(id, updates) {
    const response = await this.request(`/api/update-category/${id}`, {
      method: 'POST',
      body: JSON.stringify(updates),
    });

    return await response.json();
  }

  async deleteReceipt(id) {
    const response = await this.request(`/api/receipts/${id}`, {
      method: 'DELETE',
    });

    return await response.json();
  }

  // Category operations
  async getCategories() {
    const response = await this.request('/api/categories');
    return await response.json();
  }

  async addCategory(category) {
    const response = await this.request('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });

    return await response.json();
  }

  async updateCategory(id, updates) {
    const response = await this.request(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    return await response.json();
  }

  async deleteCategory(id) {
    const response = await this.request(`/api/categories/${id}`, {
      method: 'DELETE',
    });

    return await response.json();
  }

  // Statistics
  async getStats(startDate, endDate) {
    const response = await this.request(`/api/stats?start=${startDate}&end=${endDate}`);
    return await response.json();
  }

  async getTotalExpenses(startDate, endDate) {
    const response = await this.request(`/api/total-expenses-range?start=${startDate}&end=${endDate}`);
    return await response.json();
  }

  async getExpensesByCategory(startDate, endDate) {
    const response = await this.request(`/api/expenses-by-category-range?start=${startDate}&end=${endDate}`);
    return await response.json();
  }

  // Sync operations
  async syncData(unsyncedRecords) {
    const response = await this.request('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ records: unsyncedRecords }),
    });

    return await response.json();
  }

  async pullData() {
    const response = await this.request('/api/pull');
    return await response.json();
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.request('/api/health');
      return await response.json();
    } catch (error) {
      throw new Error('Server is not available');
    }
  }

  // Update API base URL
  async updateApiBaseUrl(newUrl) {
    await ConfigService.setApiBaseUrl(newUrl);
    this.baseURL = newUrl;
    this.isInitialized = true;
  }
}

export default new ApiService(); 
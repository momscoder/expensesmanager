import * as SecureStore from 'expo-secure-store';

class AuthService {
  constructor() {
    this.tokenKey = 'authToken';
    this.guestModeKey = 'guestMode';
  }

  async isAuthenticated() {
    try {
      const token = await SecureStore.getItemAsync(this.tokenKey);
      return !!token;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  async getToken() {
    try {
      return await SecureStore.getItemAsync(this.tokenKey);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async setToken(token) {
    try {
      await SecureStore.setItemAsync(this.tokenKey, token);
    } catch (error) {
      console.error('Error setting auth token:', error);
      throw new Error('Ошибка сохранения токена');
    }
  }

  async removeToken() {
    try {
      await SecureStore.deleteItemAsync(this.tokenKey);
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }

  async isGuestMode() {
    try {
      const guestMode = await SecureStore.getItemAsync(this.guestModeKey);
      return guestMode === 'true';
    } catch (error) {
      console.error('Error checking guest mode:', error);
      return false;
    }
  }

  async setGuestMode(enabled) {
    try {
      if (enabled) {
        await SecureStore.setItemAsync(this.guestModeKey, 'true');
      } else {
        await SecureStore.deleteItemAsync(this.guestModeKey);
      }
    } catch (error) {
      console.error('Error setting guest mode:', error);
      throw new Error('Ошибка настройки гостевого режима');
    }
  }

  async logout() {
    try {
      await Promise.all([
        this.removeToken(),
        this.setGuestMode(false)
      ]);
    } catch (error) {
      console.error('Error during logout:', error);
      throw new Error('Ошибка выхода из аккаунта');
    }
  }

  async clearGuestMode() {
    try {
      await SecureStore.deleteItemAsync(this.guestModeKey);
    } catch (error) {
      console.error('Error clearing guest mode:', error);
    }
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService; 
import AsyncStorage from '@react-native-async-storage/async-storage';

class ConfigService {
  constructor() {
    this.configKey = 'app_config';
    this.defaultConfig = {
      apiBaseUrl: 'http://192.168.1.249:3000',
      autoSync: true,
      theme: 'dark',
      language: 'ru',
      currency: 'BYN',
      dateFormat: 'YYYY-MM-DD',
      maxReceiptsPerDay: 50,
      enableNotifications: true,
      dataRetentionDays: 365,
      debugMode: false
    };
  }

  // Get configuration
  async getConfig() {
    try {
      const storedConfig = await AsyncStorage.getItem(this.configKey);
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig);
        return { ...this.defaultConfig, ...parsed };
      }
      return this.defaultConfig;
    } catch (error) {
      console.error('Error getting config:', error);
      return this.defaultConfig;
    }
  }

  // Update configuration
  async updateConfig(updates) {
    try {
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...updates };
      await AsyncStorage.setItem(this.configKey, JSON.stringify(newConfig));
      return newConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }

  // Get specific config value
  async getConfigValue(key) {
    try {
      const config = await this.getConfig();
      return config[key];
    } catch (error) {
      console.error(`Error getting config value for ${key}:`, error);
      return this.defaultConfig[key];
    }
  }

  // Set specific config value
  async setConfigValue(key, value) {
    try {
      const config = await this.getConfig();
      config[key] = value;
      await AsyncStorage.setItem(this.configKey, JSON.stringify(config));
      return config;
    } catch (error) {
      console.error(`Error setting config value for ${key}:`, error);
      throw error;
    }
  }

  // Reset configuration to defaults
  async resetConfig() {
    try {
      await AsyncStorage.setItem(this.configKey, JSON.stringify(this.defaultConfig));
      return this.defaultConfig;
    } catch (error) {
      console.error('Error resetting config:', error);
      throw error;
    }
  }

  // Get API base URL
  async getApiBaseUrl() {
    return await this.getConfigValue('apiBaseUrl');
  }

  // Set API base URL
  async setApiBaseUrl(url) {
    return await this.setConfigValue('apiBaseUrl', url);
  }

  // Check if auto sync is enabled
  async isAutoSyncEnabled() {
    return await this.getConfigValue('autoSync');
  }

  // Set auto sync setting
  async setAutoSync(enabled) {
    return await this.setConfigValue('autoSync', enabled);
  }

  // Get theme setting
  async getTheme() {
    return await this.getConfigValue('theme');
  }

  // Set theme setting
  async setTheme(theme) {
    return await this.setConfigValue('theme', theme);
  }

  // Get currency setting
  async getCurrency() {
    return await this.getConfigValue('currency');
  }

  // Set currency setting
  async setCurrency(currency) {
    return await this.setConfigValue('currency', currency);
  }

  // Get debug mode setting
  async isDebugMode() {
    return await this.getConfigValue('debugMode');
  }

  // Set debug mode setting
  async setDebugMode(enabled) {
    return await this.setConfigValue('debugMode', enabled);
  }

  // Get all configuration as object
  async getAllConfig() {
    return await this.getConfig();
  }

  // Export configuration
  async exportConfig() {
    try {
      const config = await this.getConfig();
      return {
        config,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
    } catch (error) {
      console.error('Error exporting config:', error);
      throw error;
    }
  }

  // Import configuration
  async importConfig(data) {
    try {
      if (!data || !data.config) {
        throw new Error('Invalid config format');
      }

      await AsyncStorage.setItem(this.configKey, JSON.stringify(data.config));
      return { message: 'Configuration imported successfully' };
    } catch (error) {
      console.error('Error importing config:', error);
      throw error;
    }
  }
}

export default new ConfigService(); 
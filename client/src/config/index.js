// Environment configuration
const config = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  
  // App Configuration
  APP_NAME: import.meta.env.VITE_APP_NAME || 'CheckVite',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Development Configuration
  NODE_ENV: import.meta.env.MODE || 'development',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
  
  // Feature Flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true',
};

// Helper function to get full API URL
export const getApiUrl = (endpoint = '') => {
  const baseUrl = config.API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
  return `${baseUrl}/${cleanEndpoint}`;
};

// Helper function to get environment-specific configuration
export const getEnvConfig = () => {
  return {
    ...config,
    isDevelopment: config.NODE_ENV === 'development',
    isProduction: config.NODE_ENV === 'production',
  };
};

export default config; 
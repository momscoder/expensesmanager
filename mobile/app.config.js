export default {
  name: 'CheckVite Mobile',
  slug: 'checkvite-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#121212'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.checkvite.mobile'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#121212'
    },
    package: 'com.checkvite.mobile',
    permissions: [
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'CAMERA'
    ]
  },
  web: {
    favicon: './assets/favicon.png'
  },
  plugins: [
    'expo-sqlite',
    'expo-secure-store',
    'expo-camera'
  ],
  extra: {
    eas: {
      projectId: 'your-project-id'
    }
  }
}; 
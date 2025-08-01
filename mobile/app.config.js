export default {
  name: 'Менеджер расходов',
  slug: process.env.EAS_PROJECT_SLUG,
  version: '0.0.1',
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
    bundleIdentifier: process.env.EAS_PROJECT_BUNDLE_IDENTIFIER
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#121212'
    },
    package: process.env.EAS_PROJECT_PACKAGE,
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
      projectId: process.env.EAS_PROJECT_ID
    }
  }
}; 
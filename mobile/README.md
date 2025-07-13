# CheckVite Mobile App

A comprehensive React Native Expo mobile application for expense tracking with local storage and server synchronization capabilities.

## 🚀 Features

### Core Functionality
- **Receipt Processing**: Add receipts using UID and date
- **Local Storage**: Offline-first data storage using AsyncStorage
- **Server Sync**: Synchronization with backend server when online
- **Guest Mode**: Use app without registration (local-only)
- **Data Analytics**: Charts and statistics for expense tracking
- **Category Management**: Organize expenses by categories

### Technical Features
- **Offline-First**: Works completely offline with local data storage
- **Real-time Sync**: Automatic synchronization when online
- **Data Validation**: Comprehensive input validation and error handling
- **Responsive UI**: Dark theme with modern Material Design
- **Error Boundaries**: Graceful error handling throughout the app
- **Performance Optimized**: Efficient data handling and rendering

## 📱 Screens

### Authentication
- **AuthScreen**: Login/Register with guest mode option
- **ProfileScreen**: User settings, sync status, and logout

### Main Functionality
- **HomeScreen**: Add receipts and manage sync status
- **StatsScreen**: View all receipts with category management
- **DashboardScreen**: Analytics and charts for expense tracking

### Guest Mode
- **GuestHomeScreen**: Add receipts in offline mode
- **GuestStatsScreen**: View local data with manual entry
- **GuestDashboardScreen**: Local analytics and charts

## 🏗️ Architecture

### Services Layer

#### SimpleDataService
- **Purpose**: Local data management using AsyncStorage
- **Features**:
  - Comprehensive data validation
  - CRUD operations for receipts
  - Statistics and analytics
  - Data export/import functionality
  - Receipt deduplication

#### ConfigService
- **Purpose**: Centralized configuration management
- **Features**:
  - API URL configuration
  - App settings management
  - Theme and language settings
  - Debug mode controls

#### UtilityService
- **Purpose**: Common utility functions
- **Features**:
  - Date formatting and validation
  - Currency formatting and parsing
  - Input validation (email, username, password)
  - String manipulation and cleaning
  - Error message handling
  - Array utilities (grouping, sorting, deduplication)

#### ApiService
- **Purpose**: Server communication
- **Features**:
  - Authentication (login/register/logout)
  - Receipt operations (CRUD)
  - Category management
  - Statistics retrieval
  - Data synchronization

#### SyncService
- **Purpose**: Data synchronization between local and server
- **Features**:
  - Online/offline status detection
  - Bidirectional sync (push/pull)
  - Conflict resolution
  - Auto-sync capabilities
  - Sync status monitoring

#### DatabaseService (Legacy)
- **Purpose**: SQLite-based data storage (for authenticated users)
- **Features**:
  - SQLite database operations
  - Complex queries and joins
  - Sync tracking
  - Data migration support

### Components

#### ErrorBoundary
- **Purpose**: Global error handling
- **Features**:
  - Catches JavaScript errors
- **Features**:
  - Graceful error display
  - Retry functionality
  - Error reporting

## 🔧 Technical Stack

### Core Dependencies
- **React Native**: 0.79.5
- **Expo**: ~53.0.17
- **React Navigation**: 7.x
- **React Native Paper**: 5.14.5
- **AsyncStorage**: 2.2.0

### Charts and Visualization
- **react-native-chart-kit**: 6.12.0
- **react-native-svg**: 15.11.2

### Data Processing
- **checkchecker**: Receipt processing library
- **expo-secure-store**: Secure token storage

### UI/UX
- **expo-linear-gradient**: Background gradients
- **@expo/vector-icons**: Icon library
- **react-native-gesture-handler**: Touch handling

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- Expo CLI
- Android Studio / Xcode (for native development)

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Configuration
1. Update API base URL in `ConfigService.js`
2. Configure server endpoints in `ApiService.js`
3. Set up environment variables if needed

## 📊 Data Flow

### Guest Mode Flow
1. User enters guest mode
2. Data stored locally using `SimpleDataService`
3. No server communication
4. Data persists between app sessions

### Authenticated Mode Flow
1. User logs in/registers
2. Data stored in SQLite using `DatabaseService`
3. Automatic sync with server when online
4. Conflict resolution for data consistency

### Sync Process
1. Check online status
2. Pull latest data from server
3. Merge with local changes
4. Push local changes to server
5. Update sync status

## 🔒 Security Features

- **Secure Token Storage**: Using expo-secure-store
- **Input Validation**: Comprehensive validation for all inputs
- **Error Handling**: Secure error messages without data leakage
- **Offline Security**: Local data encryption (AsyncStorage)

## 🎨 UI/UX Features

### Theme
- **Dark Theme**: Consistent dark color scheme
- **Material Design**: Following Material Design principles
- **Responsive**: Adapts to different screen sizes
- **Accessibility**: Proper contrast and touch targets

### Navigation
- **Tab Navigation**: Easy access to main features
- **Stack Navigation**: Proper screen hierarchy
- **Gesture Support**: Swipe gestures for common actions

## 🐛 Error Handling

### Validation Errors
- **Input Validation**: Real-time validation feedback
- **Form Validation**: Comprehensive form checking
- **Data Validation**: Server-side validation handling

### Network Errors
- **Offline Detection**: Automatic offline mode
- **Retry Logic**: Automatic retry for failed requests
- **Graceful Degradation**: App works without internet

### Data Errors
- **Corruption Detection**: Data integrity checks
- **Recovery**: Automatic data recovery
- **Backup**: Data export/import functionality

## 📈 Performance Optimizations

### Data Management
- **Lazy Loading**: Load data on demand
- **Caching**: Efficient data caching strategies
- **Pagination**: Large dataset handling
- **Memory Management**: Proper cleanup and garbage collection

### UI Performance
- **FlatList**: Efficient list rendering
- **Memoization**: React.memo for expensive components
- **Image Optimization**: Optimized image loading
- **Bundle Optimization**: Reduced bundle size

## 🔄 Sync Strategy

### Conflict Resolution
- **Last Write Wins**: Server takes precedence for synced data
- **Local Priority**: Local changes preserved when offline
- **Merge Strategy**: Intelligent data merging
- **Conflict Detection**: Automatic conflict identification

### Sync Triggers
- **App Foreground**: Sync when app becomes active
- **Manual Sync**: User-initiated synchronization
- **Background Sync**: Automatic background synchronization
- **Network Change**: Sync when network becomes available

## 📱 Platform Support

### Android
- **Minimum SDK**: API 21 (Android 5.0)
- **Target SDK**: API 34 (Android 14)
- **Permissions**: Internet, Storage, Camera

### iOS
- **Minimum Version**: iOS 12.0
- **Target Version**: iOS 17.0
- **Permissions**: Camera, Photo Library

## 🧪 Testing

### Unit Tests
- Service layer testing
- Utility function testing
- Component testing

### Integration Tests
- API integration testing
- Database operations testing
- Sync functionality testing

### E2E Tests
- User flow testing
- Cross-platform testing
- Performance testing

## 🚀 Deployment

### Development
```bash
npm start
```

### Production Build
```bash
# Android
expo build:android

# iOS
expo build:ios
```

### App Store Deployment
1. Configure app.json/app.config.js
2. Build production version
3. Submit to app stores

## 📝 Changelog

### Version 1.0.0 (Current)
- **Major Refactoring**: Complete codebase refactoring
- **Bug Fixes**: Fixed amount.toFixed errors and data validation issues
- **New Services**: Added ConfigService and UtilityService
- **Improved Validation**: Comprehensive input validation
- **Better Error Handling**: Enhanced error messages and recovery
- **Performance Improvements**: Optimized data handling and UI rendering
- **Code Quality**: Improved code organization and maintainability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the changelog

## 🔮 Future Enhancements

- **Push Notifications**: Real-time notifications
- **Advanced Analytics**: More detailed reporting
- **Export Features**: PDF/Excel export
- **Cloud Backup**: Automatic cloud backup
- **Multi-language**: Internationalization support
- **Advanced Charts**: More chart types and customization
- **Receipt Scanning**: OCR for receipt processing
- **Budget Tracking**: Budget management features 
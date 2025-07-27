import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { AppState as RNAppState } from 'react-native';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Services
import DatabaseService from './src/services/DatabaseService';
import SimpleDataService from './src/services/SimpleDataService';
import SyncService from './src/services/SyncService';
import ErrorBoundary from './src/components/ErrorBoundary';
import ApiService from './src/services/ApiService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#03DAC6',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    placeholder: '#B0B0B0',
    onSurface: '#FFFFFF',
    onBackground: '#FFFFFF',
  },
};

function MainTabs({ onGoToAuth }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Stats') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Dashboard') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#B0B0B0',
        tabBarStyle: {
          backgroundColor: '#1E1E1E',
          borderTopColor: '#333333',
        },
        headerStyle: {
          backgroundColor: '#1E1E1E',
        },
        headerTintColor: '#FFFFFF',
      })}
    >
      <Tab.Screen 
        name="Home" 
        options={{ title: '', headerShown: false }}
      >
        {(props) => <HomeScreen {...props} onGoToAuth={onGoToAuth} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Stats" 
        options={{ title: '', headerShown: false }}
      >
        {(props) => <StatsScreen {...props} onGoToAuth={onGoToAuth} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Dashboard" 
        options={{ title: '', headerShown: false }}
      >
        {(props) => <DashboardScreen {...props} onGoToAuth={onGoToAuth} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Profile" 
        options={{ title: '', headerShown: false }}
      >
        {(props) => <ProfileScreen {...props} onGoToAuth={onGoToAuth} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState(RNAppState.currentState);

  useEffect(() => {
    initializeServices();
    checkAuthStatus();
    
    const subscription = RNAppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    // Подписка на глобальный logout
    ApiService.setLogoutHandler(handleLogout);
  }, []);

  const initializeServices = async () => {
    try {
      console.log('Initializing SimpleDataService...');
      await SimpleDataService.initialize();
      console.log('SimpleDataService initialized successfully');
    } catch (error) {
      console.error('Error initializing SimpleDataService:', error);
    }
    
    try {
      console.log('Initializing DatabaseService...');
      await DatabaseService.initialize();
      console.log('DatabaseService initialized successfully');
    } catch (error) {
      console.error('Error initializing DatabaseService:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      setIsAuthenticated(!!token);
      
      if (!token) {
        // Check if user wants to use guest mode
        const guestMode = await SecureStore.getItemAsync('guestMode');
        setIsGuestMode(guestMode === 'true');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppStateChange = async (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      await checkAuthStatus();
    } else if (appState === 'active' && nextAppState.match(/inactive|background/)) {
      // App going to background - auto sync
      if (isAuthenticated) {
        try {
          await SyncService.autoSync();
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }
    }
    setAppState(nextAppState);
  };

  const handleAuthSuccess = async () => {
    setIsAuthenticated(true);
    setIsGuestMode(false);
    try {
      // Сначала подтянуть данные с сервера
      await SyncService.pullFromServer();
      // Затем отправить локальные несинхронизированные данные на сервер
      await SyncService.syncToServer();
      console.log('Синхронизация после аутентификации завершена');
    } catch (error) {
      console.error('Ошибка синхронизации после аутентификации:', error);
      // Можно добавить Alert или Snackbar для пользователя
      // Alert.alert('Ошибка синхронизации', error.message || 'Не удалось синхронизировать данные');
    }
  };

  const handleGuestMode = async () => {
    await SecureStore.setItemAsync('guestMode', 'true');
    setIsGuestMode(true);
    setIsAuthenticated(false);
  };

  // Функция выхода из аккаунта
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('guestMode');
      setIsAuthenticated(false);
      setIsGuestMode(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGoToAuth = () => {
    // Clear guest mode and go to auth
    SecureStore.deleteItemAsync('guestMode');
    setIsGuestMode(false);
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated && !isGuestMode ? (
              <Stack.Screen name="Auth">
                {(props) => (
                  <AuthScreen 
                    {...props} 
                    onAuthSuccess={handleAuthSuccess}
                    onGuestMode={handleGuestMode}
                  />
                )}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="MainTabs">
                {(props) => (
                  <MainTabs 
                    {...props}
                    onGoToAuth={handleGoToAuth}
                  />
                )}
              </Stack.Screen>
            )}
            <Stack.Screen name="Profile">
              {props => <ProfileScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});

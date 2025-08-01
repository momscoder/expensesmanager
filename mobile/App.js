import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import DashboardScreen from './src/screens/DashboardScreen';

// Services
import DatabaseService from './src/services/DatabaseService';
import DataService from './src/services/DatabaseService';
import ErrorBoundary from './src/components/ErrorBoundary';

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

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'create' : 'create-outline';
              break;
            case 'Stats':
              iconName = focused ? 'pricetags' : 'pricetags-outline';
              break;
            case 'Dashboard':
              iconName = focused ? 'pie-chart' : 'pie-chart-outline';
              break;
            default:
              iconName = 'ellipse-outline';
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
        options={{ title: 'Чек', headerShown: false }}
      >
        {(props) => <HomeScreen {...props} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Stats" 
        options={{ title: 'Покупки', headerShown: false }}
      >
        {(props) => <StatsScreen {...props} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Dashboard" 
        options={{ title: 'Статистика', headerShown: false }}
      >
        {(props) => <DashboardScreen {...props} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      console.log('Initializing DataService...');
      await DataService.initialize();
      console.log('DataService initialized successfully');
    } catch (error) {
      console.error('Error initializing DataService:', error);
    }
    
    try {
      console.log('Initializing DatabaseService...');
      await DatabaseService.initialize();
      console.log('DatabaseService initialized successfully');
    } catch (error) {
      console.error('Error initializing DatabaseService:', error);
    }
  };

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs">
                {(props) => (
                  <MainTabs 
                    {...props}
                  />
                )}
              </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </ErrorBoundary>
  );
}

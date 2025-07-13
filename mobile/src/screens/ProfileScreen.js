import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  Snackbar,
  Switch,
  Divider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import ApiService from '../services/ApiService';
import SyncService from '../services/SyncService';
import UtilityService from '../services/UtilityService';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState(null);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    loadUserData();
    checkSyncStatus();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        // In a real app, you would decode the JWT token to get user info
        // For now, we'll use a placeholder
        setUser({ username: 'Пользователь' });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const status = await SyncService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.logout();
              // The App component will handle the navigation
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSyncNow = async () => {
    setLoading(true);
    try {
      const result = await SyncService.fullSync();
      setSnackbarMessage(result.message);
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSnackbarMessage('Ошибка синхронизации: ' + UtilityService.getErrorMessage(error));
    } finally {
      setLoading(false);
      setSnackbarVisible(true);
      await checkSyncStatus();
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Очистка данных',
      'Это действие удалит все локальные данные. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all local data
              await SecureStore.deleteItemAsync('authToken');
              setSnackbarMessage('Данные очищены');
            } catch (error) {
              console.error('Error clearing data:', error);
              setSnackbarMessage('Ошибка очистки данных: ' + UtilityService.getErrorMessage(error));
            } finally {
              setSnackbarVisible(true);
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      // In a real app, you would implement data export functionality
      setSnackbarMessage('Экспорт данных (функция в разработке)');
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Error exporting data:', error);
      setSnackbarMessage('Ошибка экспорта данных: ' + UtilityService.getErrorMessage(error));
      setSnackbarVisible(true);
    }
  };

  return (
    <LinearGradient colors={['#1E1E1E', '#121212']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* User Info */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.userHeader}>
              <View style={styles.userInfo}>
                <Title style={styles.userName}>
                  {user?.username || 'Пользователь'}
                </Title>
                <Paragraph style={styles.userStatus}>
                  {syncStatus?.isAuthenticated ? 'Аутентифицирован' : 'Гость'}
                </Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Sync Status */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Статус синхронизации</Title>
            
            {syncStatus && (
              <View style={styles.syncInfo}>
                <View style={styles.syncRow}>
                  <Ionicons 
                    name={syncStatus.isOnline ? 'wifi' : 'wifi-outline'} 
                    size={20} 
                    color={syncStatus.isOnline ? '#4CAF50' : '#FF6B6B'} 
                  />
                  <Paragraph style={styles.syncText}>
                    {syncStatus.isOnline ? 'Онлайн' : 'Офлайн'}
                  </Paragraph>
                </View>

                <View style={styles.syncRow}>
                  <Ionicons 
                    name="cloud-upload-outline" 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Paragraph style={styles.syncText}>
                    Несинхронизировано: {syncStatus.unsyncedCount}
                  </Paragraph>
                </View>
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleSyncNow}
              loading={loading}
              disabled={loading || !syncStatus?.isOnline}
              style={styles.syncButton}
            >
              Синхронизировать сейчас
            </Button>
          </Card.Content>
        </Card>

        {/* Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Настройки</Title>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Paragraph style={styles.settingLabel}>Автосинхронизация</Paragraph>
                <Paragraph style={styles.settingDescription}>
                  Автоматически синхронизировать при закрытии приложения
                </Paragraph>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                color="#2196F3"
              />
            </View>

            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              onPress={handleExportData}
              style={styles.settingButton}
              icon="download"
            >
              Экспорт данных
            </Button>

            <Button
              mode="outlined"
              onPress={handleClearData}
              style={[styles.settingButton, styles.dangerButton]}
              icon="delete"
            >
              Очистить данные
            </Button>
          </Card.Content>
        </Card>

        {/* Logout */}
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          contentStyle={styles.logoutButtonContent}
          icon="logout"
        >
          Выйти
        </Button>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#2A2A2A',
    marginBottom: 20,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userStatus: {
    color: '#B0B0B0',
  },
  cardTitle: {
    color: '#FFFFFF',
    marginBottom: 15,
  },
  syncInfo: {
    marginBottom: 15,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncText: {
    color: '#B0B0B0',
    marginLeft: 10,
  },
  syncButton: {
    backgroundColor: '#2196F3',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  settingDescription: {
    color: '#B0B0B0',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    backgroundColor: '#444444',
    marginVertical: 15,
  },
  settingButton: {
    marginBottom: 10,
    borderColor: '#2196F3',
  },
  dangerButton: {
    borderColor: '#FF6B6B',
  },
  aboutText: {
    color: '#B0B0B0',
    marginBottom: 10,
  },
  versionText: {
    color: '#666666',
    fontSize: 12,
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    marginBottom: 50,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
  snackbar: {
    backgroundColor: '#2A2A2A',
  },
}); 
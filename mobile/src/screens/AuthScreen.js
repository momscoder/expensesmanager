import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Switch,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../services/ApiService';
import UtilityService from '../services/UtilityService';

export default function AuthScreen({ onAuthSuccess, onGuestMode }) {
  const [mode, setMode] = useState('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    if (!login.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    // Login validation using UtilityService
    if (!UtilityService.validateUsername(login.trim())) {
      setError('Логин должен содержать 3-20 символов (буквы, цифры, _ или -)');
      return;
    }

    // Password validation using UtilityService
    if (!UtilityService.validatePassword(password)) {
      setError('Пароль должен содержать минимум 5 символов');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credentials = { email: login, password };
      
      if (mode === 'login') {
        await ApiService.login(credentials);
      } else {
        await ApiService.register(credentials);
      }

      onAuthSuccess();
    } catch (err) {
      console.error('Auth error:', err);
      setError(UtilityService.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    Alert.alert(
      'Гостевой режим',
      'В гостевом режиме данные сохраняются только локально на устройстве. Вы уверены, что хотите продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Продолжить', onPress: onGuestMode }
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#1E1E1E', '#121212']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.title}>
                  {mode === 'login' ? 'Вход' : 'Регистрация'}
                </Title>

                {error ? (
                  <Paragraph style={styles.error}>{error}</Paragraph>
                ) : null}

                <TextInput
                  label="Логин"
                  value={login}
                  onChangeText={setLogin}
                  mode="outlined"
                  style={styles.input}
                  theme={{ 
                    colors: { 
                      primary: '#2196F3',
                      text: '#FFFFFF',
                      placeholder: '#B0B0B0',
                      background: '#1E1E1E'
                    } 
                  }}
                  disabled={loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Введите логин"
                />

                <TextInput
                  label="Пароль"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                  theme={{ 
                    colors: { 
                      primary: '#2196F3',
                      text: '#FFFFFF',
                      placeholder: '#B0B0B0',
                      background: '#1E1E1E'
                    } 
                  }}
                  disabled={loading}
                  placeholder="Введите пароль"
                />

                <Button
                  mode="contained"
                  onPress={handleAuth}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                >
                  {loading
                    ? mode === 'login'
                      ? 'Вход...'
                      : 'Регистрация...'
                    : mode === 'login'
                    ? 'Войти'
                    : 'Зарегистрироваться'}
                </Button>

                <View style={styles.toggleContainer}>
                  <Paragraph style={styles.toggleText}>
                    {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                  </Paragraph>
                  <Button
                    mode="text"
                    onPress={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                      setError('');
                    }}
                    disabled={loading}
                    style={styles.toggleButton}
                  >
                    {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                  </Button>
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.guestCard}>
              <Card.Content>
                <Title style={styles.guestTitle}>Гостевой режим</Title>
                <Paragraph style={styles.guestDescription}>
                  Используйте приложение без регистрации. Данные сохраняются только на вашем устройстве.
                </Paragraph>
                <Button
                  mode="outlined"
                  onPress={handleGuestMode}
                  style={styles.guestButton}
                  contentStyle={styles.buttonContent}
                >
                  Продолжить как гость
                </Button>
              </Card.Content>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#2A2A2A',
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  error: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#1E1E1E',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#2196F3',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  toggleContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: '#B0B0B0',
    textAlign: 'center',
  },
  toggleButton: {
    marginTop: 5,
  },
  guestCard: {
    backgroundColor: '#2A2A2A',
  },
  guestTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  guestDescription: {
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 15,
  },
  guestButton: {
    borderColor: '#2196F3',
  },
}); 
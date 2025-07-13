import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button, Card, Title, Paragraph } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <LinearGradient colors={['#1E1E1E', '#121212']} style={styles.container}>
          <Card style={styles.errorCard}>
            <Card.Content>
              <Title style={styles.errorTitle}>⚠️ Ошибка приложения</Title>
              <Paragraph style={styles.errorMessage}>
                Произошла неожиданная ошибка. Это может быть связано с проблемами базы данных или сети.
              </Paragraph>
              
              {this.state.error && (
                <Paragraph style={styles.errorDetails}>
                  {this.state.error.message}
                </Paragraph>
              )}
              
              <Button
                mode="contained"
                onPress={this.handleRetry}
                style={styles.retryButton}
              >
                Попробовать снова
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => this.setState({ hasError: false, error: null })}
                style={styles.continueButton}
              >
                Продолжить
              </Button>
            </Card.Content>
          </Card>
        </LinearGradient>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#2A2A2A',
    width: '100%',
    maxWidth: 400,
  },
  errorTitle: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 15,
  },
  errorMessage: {
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 15,
  },
  errorDetails: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    marginBottom: 10,
  },
  continueButton: {
    borderColor: '#2196F3',
  },
});

export default ErrorBoundary; 
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Button,
  Menu,
  Divider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import DatabaseService from '../services/DatabaseService';
import SimpleDataService from '../services/SimpleDataService';
import UtilityService from '../services/UtilityService';
import dataChangeService from '../services/DataChangeService';
import AuthService from '../services/AuthService';

const { width } = Dimensions.get('window');

const DATE_RANGES = [
  { label: '7 дней', value: 7 },
  { label: '30 дней', value: 30 },
  { label: '90 дней', value: 90 },
  { label: '180 дней', value: 180 },
  { label: '365 дней', value: 365 },
];

export default function DashboardScreen({ onGoToAuth }) {
  const [stats, setStats] = useState(null);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [totalExpensesRange, setTotalExpensesRange] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [dataChangeListener, setDataChangeListener] = useState(null);
  const [selectedRange, setSelectedRange] = useState(30); // Default 30 days
  const [rangeMenuVisible, setRangeMenuVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get the appropriate data service based on authentication
  const getDataService = () => {
    return isAuthenticated ? DatabaseService : SimpleDataService;
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated !== null) {
      loadDashboardData();
      
      // Set up data change listener
      const listenerId = dataChangeService.subscribe(() => {
        // Auto-refresh when data changes
        loadDashboardData(false);
      });
      setDataChangeListener(listenerId);
      
      // Set up interval to refresh data every 30 seconds
      const interval = setInterval(() => {
        loadDashboardData(false); // Silent refresh
      }, 30000);

      return () => {
        clearInterval(interval);
        if (dataChangeListener) {
          dataChangeService.unsubscribe(dataChangeListener);
        }
      };
    }
  }, [selectedRange, isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const authStatus = await AuthService.isAuthenticated();
      setIsAuthenticated(authStatus);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  };

  const loadDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const dataService = getDataService();
      const { startDate, endDate } = UtilityService.getDateRange(selectedRange);

      const [statsData, categoryData, rangeData] = await Promise.all([
        dataService.getStats(startDate, endDate),
        dataService.getExpensesByCategory(startDate, endDate),
        dataService.getTotalExpensesRange(startDate, endDate)
      ]);

      setStats(statsData);
      setExpensesByCategory(categoryData);
      setTotalExpensesRange(rangeData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(UtilityService.getErrorMessage(error));
      setStats(null);
      setExpensesByCategory([]);
      setTotalExpensesRange([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData(false);
  }, [selectedRange, isAuthenticated]);

  const handleRangeChange = (range) => {
    setSelectedRange(range);
    setRangeMenuVisible(false);
  };

  const getRangeLabel = () => {
    const range = DATE_RANGES.find(r => r.value === selectedRange);
    return range ? range.label : '30 дней';
  };

  const formatCurrency = (amount) => {
    return UtilityService.formatCurrency(amount);
  };

  const formatLastUpdate = (date) => {
    if (!date) return '';
    return `Обновлено: ${date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  };

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#2A2A2A',
    backgroundGradientFrom: '#2A2A2A',
    backgroundGradientTo: '#2A2A2A',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#2196F3',
    },
  };

  // Prepare data for charts
  const prepareBarChartData = () => {
    if (!expensesByCategory.length) return null;
    
    return {
      labels: expensesByCategory.map(item => UtilityService.truncateString(item.category, 8)),
      datasets: [{
        data: expensesByCategory.map(item => item.total),
      }],
    };
  };

  const prepareLineChartData = () => {
    if (!totalExpensesRange.length) return null;
    
    const last7Days = totalExpensesRange.slice(-7);
    return {
      labels: last7Days.map(item => item.date.substring(5)), // Show only MM-DD
      datasets: [{
        data: last7Days.map(item => item.total),
      }],
    };
  };

  const preparePieChartData = () => {
    if (!expensesByCategory.length) return [];
    
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    return expensesByCategory.map((item, index) => ({
      name: item.category,
      population: item.total,
      color: colors[index % colors.length],
      legendFontColor: '#FFFFFF',
      legendFontSize: 12,
    }));
  };

  if (loading && !refreshing) {
    return (
      <LinearGradient colors={['#1E1E1E', '#121212']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Paragraph style={styles.loadingText}>Загрузка статистики...</Paragraph>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1E1E1E', '#121212']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
      >
        {/* Header with Range Selector */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Title style={styles.headerTitle}>Дашборд</Title>
                <Paragraph style={styles.headerSubtitle}>
                  {isAuthenticated ? 'Авторизованный режим' : 'Гостевой режим'}
                </Paragraph>
              </View>
              
              <Menu
                visible={rangeMenuVisible}
                onDismiss={() => setRangeMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setRangeMenuVisible(true)}
                    style={styles.rangeButton}
                    contentStyle={styles.buttonContent}
                  >
                    {getRangeLabel()}
                  </Button>
                }
              >
                {DATE_RANGES.map((range) => (
                  <Menu.Item
                    key={range.value}
                    onPress={() => handleRangeChange(range.value)}
                    title={range.label}
                    titleStyle={styles.menuItemText}
                  />
                ))}
              </Menu>
            </View>
          </Card.Content>
        </Card>

        {/* Error Message */}
        {error && (
          <Card style={[styles.card, styles.errorCard]}>
            <Card.Content>
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={24} color="#FF6B6B" />
                <Paragraph style={styles.errorText}>{error}</Paragraph>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Last Update Info */}
        {lastUpdate && (
          <Card style={styles.updateCard}>
            <Card.Content>
              <View style={styles.updateInfo}>
                <Ionicons name="time-outline" size={16} color="#B0B0B0" />
                <Paragraph style={styles.updateText}>
                  {formatLastUpdate(lastUpdate)}
                </Paragraph>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Summary Stats */}
        {stats && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Общая статистика ({getRangeLabel()})</Title>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Ionicons name="receipt-outline" size={24} color="#2196F3" />
                  <Paragraph style={styles.statValue}>{stats?.total_receipts || 0}</Paragraph>
                  <Paragraph style={styles.statLabel}>Чеков</Paragraph>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="cash-outline" size={24} color="#4CAF50" />
                  <Paragraph style={styles.statValue}>
                    {formatCurrency(stats?.total_amount || 0)}
                  </Paragraph>
                  <Paragraph style={styles.statLabel}>Потрачено</Paragraph>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="calculator-outline" size={24} color="#FF9800" />
                  <Paragraph style={styles.statValue}>
                    {formatCurrency(stats?.avg_amount || 0)}
                  </Paragraph>
                  <Paragraph style={styles.statLabel}>Средний чек</Paragraph>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Bar Chart - Expenses by Category */}
        {expensesByCategory.length > 0 && prepareBarChartData() && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Расходы по категориям</Title>
              <View style={styles.chartContainer}>
                <BarChart
                  data={prepareBarChartData()}
                  width={width - 60}
                  height={220}
                  yAxisLabel=""
                  chartConfig={chartConfig}
                  verticalLabelRotation={30}
                  fromZero
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Pie Chart - Category Distribution */}
        {expensesByCategory.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Распределение по категориям</Title>
              <View style={styles.chartContainer}>
                <PieChart
                  data={preparePieChartData()}
                  width={width - 60}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Line Chart - Daily Expenses */}
        {totalExpensesRange.length > 0 && prepareLineChartData() && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Динамика расходов</Title>
              <View style={styles.chartContainer}>
                <LineChart
                  data={prepareLineChartData()}
                  width={width - 60}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* No Data Message */}
        {(!expensesByCategory.length && !totalExpensesRange.length && !loading) && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.emptyContainer}>
                <Ionicons name="analytics-outline" size={64} color="#666" />
                <Title style={styles.emptyTitle}>Нет данных для анализа</Title>
                <Paragraph style={styles.emptyText}>
                  Добавьте чеки или записи, чтобы увидеть статистику
                </Paragraph>
                <Paragraph style={styles.emptySubtext}>
                  Потяните вниз для обновления
                </Paragraph>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  scrollContent: {
    padding: 20,
  },
  errorScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 20,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#FF6B6B',
    marginTop: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#B0B0B0',
    textAlign: 'center',
    marginTop: 10,
  },
  errorSubtext: {
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
  },
  headerCard: {
    backgroundColor: '#2A2A2A',
    marginBottom: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  headerSubtitle: {
    color: '#B0B0B0',
    fontSize: 14,
  },
  rangeButton: {
    borderColor: '#2196F3',
    marginLeft: 10,
  },
  buttonContent: {
    height: 40,
  },
  menuItemText: {
    color: '#FFFFFF',
  },
  updateCard: {
    backgroundColor: '#2A2A2A',
    marginBottom: 15,
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateText: {
    color: '#B0B0B0',
    marginLeft: 8,
    fontSize: 12,
  },
  card: {
    backgroundColor: '#2A2A2A',
    marginBottom: 20,
  },
  errorCard: {
    backgroundColor: '#2A2A2A',
    marginBottom: 15,
  },
  cardTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  statLabel: {
    color: '#B0B0B0',
    fontSize: 12,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyText: {
    color: '#B0B0B0',
    textAlign: 'center',
    marginTop: 10,
  },
  emptySubtext: {
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
  },
}); 
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  FlatList,
  Modal,
  DateTimePicker,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Button,
  FAB,
  Dialog,
  Portal,
  TextInput,
  List,
  IconButton,
  Menu,
  Divider,
  Snackbar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DatabaseService from '../services/DatabaseService';
import SimpleDataService from '../services/SimpleDataService';
import UtilityService from '../services/UtilityService';
import dataChangeService from '../services/DataChangeService';
import AuthService from '../services/AuthService';

export default function StatsScreen({ navigation }) {
  const [receipts, setReceipts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dataChangeListener, setDataChangeListener] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Category management
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Purchase category editing
  const [purchaseDialogVisible, setPurchaseDialogVisible] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [newPurchaseCategory, setNewPurchaseCategory] = useState('');
  const [purchaseCategoryMenuVisible, setPurchaseCategoryMenuVisible] = useState(false);
  const purchaseCategoryMenuAnchorRef = useRef();

  // Manual receipt entry
  const [manualDialogVisible, setManualDialogVisible] = useState(false);
  const [manualReceiptName, setManualReceiptName] = useState('');
  const [manualReceiptDate, setManualReceiptDate] = useState(new Date());
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [newPurchaseName, setNewPurchaseName] = useState('');
  const [newPurchaseAmount, setNewPurchaseAmount] = useState('');
  const [newPurchaseCategoryManual, setNewPurchaseCategoryManual] = useState('');
  const [categoryMenuVisibleManual, setCategoryMenuVisibleManual] = useState(false);
  
  // Get the appropriate data service based on authentication
  const getDataService = () => {
    return isAuthenticated ? DatabaseService : SimpleDataService;
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated !== null) {
      loadData();
      
      // Set up data change listener
      const listenerId = dataChangeService.subscribe(() => {
        loadData(false);
      });
      setDataChangeListener(listenerId);

      return () => {
        if (dataChangeListener) {
          dataChangeService.unsubscribe(dataChangeListener);
        }
      };
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const authStatus = await AuthService.isAuthenticated();
      setIsAuthenticated(authStatus);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  };

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const dataService = getDataService();
      const [receiptsData, categoriesData] = await Promise.all([
        dataService.getAllReceipts(),
        dataService.getCategories()
      ]);

      console.log('Loaded receipts:', receiptsData.length);
      console.log('Sample receipt:', receiptsData[0]);
      console.log('Loaded categories:', categoriesData);
      console.log('Categories types:', categoriesData.map(cat => typeof cat));
      
      setReceipts(receiptsData);
      // Ensure all categories are strings and not null/undefined
      const validCategories = categoriesData
        .filter(cat => cat !== null && cat !== undefined)
        .filter(cat => typeof cat === 'string')
        .filter(cat => cat.trim() !== '');
      
      console.log('Valid categories:', validCategories);
      setCategories(validCategories);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(UtilityService.getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(false);
  }, [isAuthenticated]);

  const formatCurrency = (amount) => {
    return UtilityService.formatCurrency(amount);
  };

  const formatDate = (dateString) => {
    return UtilityService.formatDate(new Date(dateString));
  };

  // Category management functions
  const handleAddCategory = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setCategoryDialogVisible(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategoryName(category);
    setCategoryDialogVisible(true);
  };

  const handleDeleteCategory = (categoryName) => {
    Alert.alert(
      'Удаление категории',
      `Вы уверены, что хотите удалить категорию "${categoryName}"? Все покупки в этой категории будут перемещены в "Без категории".`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const dataService = getDataService();
              await dataService.deleteCategory(categoryName);
              await loadData(false);
            } catch (error) {
              console.error('Error deleting category:', error);
              setError(UtilityService.getErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) {
      return;
    }

    try {
      const dataService = getDataService();
      
      if (editingCategory) {
        await dataService.updateCategory(editingCategory, newCategoryName.trim());
      } else {
        await dataService.addCategory(newCategoryName.trim());
      }
      
      setCategoryDialogVisible(false);
      await loadData(false);
    } catch (error) {
      console.error('Error saving category:', error);
      setError(UtilityService.getErrorMessage(error));
    }
  };

  // Purchase category editing functions
  const handleEditPurchaseCategory = (purchase) => {
    setEditingPurchase(purchase);
    setNewPurchaseCategory(purchase.category || '');
    setPurchaseDialogVisible(true);
  };

  const handleSavePurchaseCategory = async () => {
    if (!editingPurchase) return;

    try {
      const dataService = getDataService();
      
      if (isAuthenticated) {
        // For DatabaseService, we need to update the receipt
        const receipt = receipts.find(r => 
          r.purchases.some(p => p.id === editingPurchase.id)
        );
        
        if (receipt) {
          const updatedPurchases = receipt.purchases.map(p => 
            p.id === editingPurchase.id 
              ? { ...p, category: newPurchaseCategory.trim() }
              : p
          );
          
          await dataService.updateReceipt(receipt.id, {
            purchases: updatedPurchases
          });
        }
      } else {
        // For SimpleDataService, use the dedicated method
        await dataService.updatePurchaseCategory(editingPurchase.id, newPurchaseCategory.trim());
      }
      
      setPurchaseDialogVisible(false);
      await loadData(false);
    } catch (error) {
      console.error('Error updating purchase category:', error);
      setError(UtilityService.getErrorMessage(error));
    }
  };

  const handleDeleteReceipt = (receiptId) => {
    Alert.alert(
      'Удаление чека',
      'Вы уверены, что хотите удалить этот чек?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const dataService = getDataService();
              await dataService.deleteReceipt(receiptId);
              await loadData(false);
            } catch (error) {
              console.error('Error deleting receipt:', error);
              setError(UtilityService.getErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  // Manual receipt functions
  const handleAddManualReceipt = () => {
    setManualReceiptName('');
    setManualReceiptDate(new Date());
    setPurchases([]);
    setNewPurchaseName('');
    setNewPurchaseAmount('');
    setNewPurchaseCategoryManual('');
    setManualDialogVisible(true);
  };

  const handleAddPurchase = () => {
    if (!newPurchaseName.trim() || !newPurchaseAmount.trim()) {
      return;
    }

    const amount = parseFloat(newPurchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }

    const purchase = {
      name: newPurchaseName.trim(),
      amount: amount,
      category: newPurchaseCategoryManual.trim() || null,
    };

    setPurchases([...purchases, purchase]);
    setNewPurchaseName('');
    setNewPurchaseAmount('');
    setNewPurchaseCategoryManual('');
  };

  const handleRemovePurchase = (index) => {
    setPurchases(purchases.filter((_, i) => i !== index));
  };

  const handleSaveManualReceipt = async () => {
    if (!manualReceiptName.trim()) {
      Alert.alert('Ошибка', 'Введите название чека');
      return;
    }

    if (purchases.length === 0) {
      Alert.alert('Ошибка', 'Добавьте хотя бы одну покупку');
      return;
    }

    try {
      const dataService = getDataService();
      const totalAmount = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount || 0), 0);

      const receiptData = {
        uid: manualReceiptName.trim(),
        date: UtilityService.formatDate(manualReceiptDate),
        purchases: purchases,
        total_amount: totalAmount,
      };

      await dataService.addReceipt(receiptData);
      
      setManualDialogVisible(false);
      setManualReceiptName('');
      setManualReceiptDate(new Date());
      setPurchases([]);
      setNewPurchaseName('');
      setNewPurchaseAmount('');
      setNewPurchaseCategoryManual('');
      
      await loadData(false);
    } catch (error) {
      console.error('Error saving manual receipt:', error);
      setError(UtilityService.getErrorMessage(error));
    }
  };

  if (loading && !refreshing) {
    return (
      <LinearGradient colors={['#1E1E1E', '#121212']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Paragraph style={styles.loadingText}>Загрузка данных...</Paragraph>
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
        {/* Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Title style={styles.headerTitle}>Все чеки</Title>
                <Paragraph style={styles.headerSubtitle}>
                  {isAuthenticated ? 'Авторизованный режим' : 'Гостевой режим'}
                </Paragraph>
              </View>
              <Button
                mode="outlined"
                onPress={handleAddCategory}
                style={styles.categoryButton}
                contentStyle={styles.buttonContent}
              >
                Категории
              </Button>
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

        {/* Receipts List */}
        {receipts.length > 0 ? (
          receipts.map((receipt) => (
            <Card key={receipt.id} style={styles.card}>
              <Card.Content>
                <View style={styles.receiptHeader}>
                  <View style={styles.receiptInfo}>
                    <Title style={styles.receiptTitle}>
                      {receipt.uid ? 
                        (receipt.uid.length > 20 ? `Чек ${receipt.uid}` : receipt.uid) : 
                        'Ручной чек'
                      }
                    </Title>
                    <Paragraph style={styles.receiptDate}>
                      {formatDate(receipt.date)}
                    </Paragraph>
                    <Paragraph style={styles.receiptTotal}>
                      Итого: {formatCurrency(receipt.total_amount)}
                    </Paragraph>
                  </View>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteReceipt(receipt.id)}
                    iconColor="#FF6B6B"
                  />
                </View>

                <Divider style={styles.divider} />

                {/* Purchases List */}
                {receipt.purchases && receipt.purchases.length > 0 ? (
                  <View style={styles.purchasesContainer}>
                    <Title style={styles.purchasesTitle}>Покупки:</Title>
                    {receipt.purchases.map((purchase, index) => (
                      <View key={purchase.id || index} style={styles.purchaseItem}>
                        <View style={styles.purchaseInfo}>
                          <Paragraph style={styles.purchaseName}>
                            {purchase.name}
                          </Paragraph>
                          <Paragraph style={styles.purchaseAmount}>
                            {formatCurrency(purchase.amount)}
                          </Paragraph>
                        </View>
                        <View style={styles.purchaseCategory}>
                          <Button
                            mode="text"
                            onPress={() => handleEditPurchaseCategory(purchase)}
                            style={styles.categoryButton}
                            labelStyle={styles.categoryLabel}
                          >
                            {purchase.category || 'Без категории'}
                          </Button>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.purchasesContainer}>
                    <Paragraph style={styles.noPurchasesText}>
                      Нет покупок в этом чеке
                    </Paragraph>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color="#666" />
                <Title style={styles.emptyTitle}>Нет чеков</Title>
                <Paragraph style={styles.emptyText}>
                  Добавьте чеки, чтобы увидеть их здесь
                </Paragraph>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Category Management Dialog */}
      <Portal>
        <Dialog
          visible={categoryDialogVisible}
          onDismiss={() => setCategoryDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Название категории"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              mode="outlined"
              style={styles.dialogInput}
              theme={{
                colors: {
                  primary: '#2196F3',
                  text: '#FFFFFF',
                  placeholder: '#B0B0B0',
                  background: '#1E1E1E'
                }
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCategoryDialogVisible(false)}>Отмена</Button>
            <Button onPress={handleSaveCategory}>Сохранить</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Purchase Category Dialog */}
      <Portal>
        <Dialog
          visible={purchaseDialogVisible}
          onDismiss={() => setPurchaseDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            Изменить категорию покупки
          </Dialog.Title>
          <Dialog.Content>
            <View style={{ marginBottom: 15 }}>
              <Button
                mode="outlined"
                onPress={() => setPurchaseCategoryMenuVisible(true)}
                style={styles.dialogInput}
                contentStyle={{ justifyContent: 'flex-start' }}
                icon="chevron-down"
                labelStyle={{ color: '#B0B0B0', textAlign: 'left', flex: 1 }}
              >
                {newPurchaseCategory || 'Выберите категорию'}
              </Button>
            </View>
            <Paragraph style={styles.dialogSubtext}>
              Доступные категории: {(() => {
                const validCategories = categories
                  .filter(cat => cat && typeof cat === 'string' && cat.trim() !== '')
                  .map(cat => String(cat));
                return validCategories.length > 0 ? validCategories.join(', ') : 'Нет доступных категорий';
              })()}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPurchaseDialogVisible(false)}>Отмена</Button>
            <Button onPress={handleSavePurchaseCategory}>Сохранить</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Модальное окно выбора категорий */}
      <Portal>
        <Modal
          visible={purchaseCategoryMenuVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setPurchaseCategoryMenuVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Title style={styles.modalTitle}>Выберите категорию</Title>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setPurchaseCategoryMenuVisible(false)}
                  iconColor="#FFFFFF"
                />
              </View>
              <FlatList
                data={categories.filter(cat => {
                  // Extra safety check to ensure we only render valid string categories
                  return cat && 
                         typeof cat === 'string' && 
                         cat.trim() !== '' && 
                         !cat.includes('undefined') && 
                         !cat.includes('null');
                })}
                renderItem={({ item }) => {
                  // Additional safety check in renderItem
                  const safeItem = String(item || '').trim();
                  if (!safeItem) return null;
                  
                  return (
                    <List.Item
                      title={safeItem}
                      onPress={() => {
                        setNewPurchaseCategory(safeItem);
                        setPurchaseCategoryMenuVisible(false);
                      }}
                      titleStyle={{ color: '#FFFFFF' }}
                      style={{ backgroundColor: '#1E1E1E' }}
                    />
                  );
                }}
                keyExtractor={(item) => String(item || '')}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#333' }} />}
              />
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Manual Receipt Dialog */}
      <Portal>
        <Dialog
          visible={manualDialogVisible}
          onDismiss={() => setManualDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Ручной чек</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Название чека"
              value={manualReceiptName}
              onChangeText={setManualReceiptName}
              mode="outlined"
              style={styles.dialogInput}
              theme={{
                colors: {
                  primary: '#2196F3',
                  text: '#FFFFFF',
                  placeholder: '#B0B0B0',
                  background: '#1E1E1E'
                }
              }}
            />
            <Button
              mode="outlined"
              onPress={() => setShowManualDatePicker(true)}
              style={styles.dateButton}
              contentStyle={styles.buttonContent}
            >
              Дата: {UtilityService.formatDate(manualReceiptDate)}
            </Button>

            {showManualDatePicker && (
              <DateTimePicker
                value={manualReceiptDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowManualDatePicker(false);
                  if (selectedDate) {
                    setManualReceiptDate(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            <TextInput
              label="Название покупки"
              value={newPurchaseName}
              onChangeText={setNewPurchaseName}
              mode="outlined"
              style={styles.dialogInput}
              theme={{
                colors: {
                  primary: '#2196F3',
                  text: '#FFFFFF',
                  placeholder: '#B0B0B0',
                  background: '#1E1E1E'
                }
              }}
            />
            <TextInput
              label="Сумма"
              value={newPurchaseAmount}
              onChangeText={setNewPurchaseAmount}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numeric"
              theme={{
                colors: {
                  primary: '#2196F3',
                  text: '#FFFFFF',
                  placeholder: '#B0B0B0',
                  background: '#1E1E1E'
                }
              }}
            />
            <View style={{ marginBottom: 15 }}>
              <Button
                mode="outlined"
                onPress={() => setCategoryMenuVisibleManual(true)}
                style={styles.dialogInput}
                contentStyle={{ justifyContent: 'flex-start' }}
                icon="chevron-down"
                labelStyle={{ color: '#B0B0B0', textAlign: 'left', flex: 1 }}
              >
                {newPurchaseCategoryManual || 'Выберите категорию'}
              </Button>
            </View>

            <Button
              mode="outlined"
              onPress={handleAddPurchase}
              style={styles.addPurchaseButton}
              contentStyle={styles.buttonContent}
            >
              Добавить покупку
            </Button>

            {purchases.length > 0 && (
              <View style={styles.purchasesList}>
                <Title style={styles.purchasesTitle}>Покупки:</Title>
                {purchases.map((purchase, index) => (
                  <View key={index} style={styles.purchaseItem}>
                    <View style={styles.purchaseInfo}>
                      <Paragraph style={styles.purchaseName}>{purchase.name}</Paragraph>
                      <Paragraph style={styles.purchaseAmount}>
                        {UtilityService.formatCurrency(purchase.amount)}
                      </Paragraph>
                    </View>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleRemovePurchase(index)}
                      iconColor="#FF6B6B"
                    />
                  </View>
                ))}
                <Paragraph style={styles.totalAmount}>
                  Итого: {UtilityService.formatCurrency(purchases.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0))}
                </Paragraph>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setManualDialogVisible(false)}>Отмена</Button>
            <Button onPress={handleSaveManualReceipt}>Сохранить</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Category Menu for Manual Receipt */}
      <Portal>
        <Modal
          visible={categoryMenuVisibleManual}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setCategoryMenuVisibleManual(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Title style={styles.modalTitle}>Выберите категорию</Title>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setCategoryMenuVisibleManual(false)}
                  iconColor="#FFFFFF"
                />
              </View>
              <FlatList
                data={categories.filter(cat => {
                  return cat && 
                         typeof cat === 'string' && 
                         cat.trim() !== '' && 
                         !cat.includes('undefined') && 
                         !cat.includes('null');
                })}
                renderItem={({ item }) => {
                  const safeItem = String(item || '').trim();
                  if (!safeItem) return null;
                  
                  return (
                    <List.Item
                      title={safeItem}
                      onPress={() => {
                        setNewPurchaseCategoryManual(safeItem);
                        setCategoryMenuVisibleManual(false);
                      }}
                      titleStyle={{ color: '#FFFFFF' }}
                      style={{ backgroundColor: '#1E1E1E' }}
                    />
                  );
                }}
                keyExtractor={(item) => String(item || '')}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#333' }} />}
              />
            </View>
          </View>
        </Modal>
      </Portal>

      {/* FAB for manual receipt */}
      <FAB
        icon={() => <Ionicons name="add" size={24} color="#FFFFFF" />}
        style={styles.fab}
        onPress={handleAddManualReceipt}
        label=""
        labelStyle={{ color: '#FFFFFF' }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
  },
  headerCard: {
    backgroundColor: '#2A2A2A',
    marginBottom: 15,
    borderRadius: 10,
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
    textAlign: 'left',
    marginBottom: 5,
  },
  headerSubtitle: {
    color: '#B0B0B0',
    textAlign: 'left',
  },
  categoryButton: {
    marginLeft: 10,
  },
  buttonContent: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: '#2A2A2A',
    marginBottom: 15,
    borderRadius: 10,
  },
  errorCard: {
    backgroundColor: '#2A2A2A',
    marginBottom: 15,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  errorText: {
    color: '#FF6B6B',
    marginLeft: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 5,
  },
  emptyText: {
    color: '#B0B0B0',
    textAlign: 'center',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  receiptDate: {
    color: '#B0B0B0',
    fontSize: 12,
    marginBottom: 5,
  },
  receiptTotal: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    backgroundColor: '#444',
    marginVertical: 10,
  },
  purchasesContainer: {
    marginTop: 10,
  },
  purchasesTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  purchaseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseName: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 2,
  },
  purchaseAmount: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: 'bold',
  },
  purchaseCategory: {
    marginLeft: 10,
  },
  categoryLabel: {
    color: '#B0B0B0',
    fontSize: 12,
  },
  dialog: {
    backgroundColor: '#2A2A2A',
  },
  dialogTitle: {
    color: '#FFFFFF',
  },
  dialogInput: {
    marginBottom: 15,
    backgroundColor: '#1E1E1E',
  },
  dialogSubtext: {
    color: '#B0B0B0',
    fontSize: 12,
    marginTop: 5,
  },
  noPurchasesText: {
    color: '#B0B0B0',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  dateButton: {
    marginBottom: 15,
    borderColor: '#2196F3',
  },
  addPurchaseButton: {
    marginBottom: 15,
    borderColor: '#2196F3',
  },
  purchasesList: {
    marginTop: 10,
  },
  purchasesTitle: {
    color: '#FFFFFF',
    marginBottom: 10,
  },
  totalAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 10,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
    borderRadius: 28,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    padding: 10,
    borderRadius: 8,
    maxHeight: 300,
    width: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#FFFFFF',
    flex: 1,
  },
}); 
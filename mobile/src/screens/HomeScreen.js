import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Snackbar,
  ActivityIndicator,
  FAB,
  Dialog,
  Portal,
  List,
  IconButton,
  Menu,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DatabaseService from '../services/DatabaseService';
import ReceiptProcessorService from '../services/ReceiptProcessorService';
import UtilityService from '../services/UtilityService';
import dataChangeService from '../services/DataChangeService';
import { Camera, CameraView } from 'expo-camera';

export default function HomeScreen() {
  const [uid, setUid] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Manual receipt entry
  const [manualDialogVisible, setManualDialogVisible] = useState(false);
  const [manualReceiptName, setManualReceiptName] = useState('');
  const [manualReceiptDate, setManualReceiptDate] = useState(new Date());
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [newPurchaseName, setNewPurchaseName] = useState('');
  const [newPurchaseAmount, setNewPurchaseAmount] = useState('');
  const [newPurchaseCategory, setNewPurchaseCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const categoryMenuAnchorRef = useRef();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  // Get the appropriate data service based on authentication
  const getDataService = () => {
    return DatabaseService;
  };

  useEffect(() => {
      checkSyncStatus();
      loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const dataService = getDataService();
      const categoriesData = await dataService.getCategories();
      console.log('Loaded categories:', categoriesData);
      console.log('Categories types:', categoriesData.map(cat => typeof cat));
      
      // Ensure all categories are strings and not null/undefined
      const validCategories = categoriesData
        .filter(cat => cat !== null && cat !== undefined)
        .filter(cat => typeof cat === 'string')
        .filter(cat => cat.trim() !== '');
      
      console.log('Valid categories:', validCategories);
      setCategories(validCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatDate = (date) => {
    return UtilityService.formatDate(date);
  };

  const handleSubmit = async () => {
    if (!uid.trim()) {
      setSnackbarMessage('Пожалуйста, введите УИ');
      setSnackbarVisible(true);
      return;
    }

    setLoading(true);

    try {
      const cleanUid = UtilityService.cleanString(uid);
      const formattedDate = formatDate(date);
      
      console.log('Processing receipt with UID:', cleanUid, 'Date:', formattedDate);

      // Use ReceiptProcessorService to process the receipt
      const result = await ReceiptProcessorService.processReceipt(cleanUid, formattedDate);
      
      console.log('Receipt processing result:', result);

      if (result.success) {
        setSnackbarMessage(result.message);
        
        // Clear form
        setUid('');
        setDate(new Date());
      } else {
        // Handle different error codes
        if (result.code === 409) {
          setSnackbarMessage('Этот чек уже был обработан');
        } else if (result.code === 400) {
          setSnackbarMessage('Не удалось получить данные чека');
        } else {
          setSnackbarMessage(result.message || 'Ошибка при обработке чека');
        }
      }

    } catch (error) {
      console.error('Error processing receipt:', error);
      setSnackbarMessage('Ошибка при обработке чека: ' + UtilityService.getErrorMessage(error));
    } finally {
      setLoading(false);
      setSnackbarVisible(true);
    }
  };

  // Manual receipt functions
  const handleAddManualReceipt = () => {
    setManualReceiptName('');
    setManualReceiptDate(new Date());
    setPurchases([]);
    setNewPurchaseName('');
    setNewPurchaseAmount('');
    setNewPurchaseCategory('');
    setManualDialogVisible(true);
  };

  const handleAddPurchase = () => {
    if (!newPurchaseName.trim() || !newPurchaseAmount.trim()) {
      return;
    }

    const amount = parseFloat(newPurchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      setSnackbarMessage('Введите корректную сумму');
      setSnackbarVisible(true);
      return;
    }

    const purchase = {
      name: newPurchaseName.trim(),
      amount: amount,
      category: newPurchaseCategory.trim() || null,
    };

    setPurchases([...purchases, purchase]);
    setNewPurchaseName('');
    setNewPurchaseAmount('');
    setNewPurchaseCategory('');
  };

  const handleRemovePurchase = (index) => {
    setPurchases(purchases.filter((_, i) => i !== index));
  };

  const handleSaveManualReceipt = async () => {
    if (!manualReceiptName.trim()) {
      setSnackbarMessage('Введите название чека');
      setSnackbarVisible(true);
      return;
    }

    if (purchases.length === 0) {
      setSnackbarMessage('Добавьте хотя бы одну покупку');
      setSnackbarVisible(true);
      return;
    }

    setLoading(true);

    try {
      const dataService = getDataService();
      const totalAmount = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount || 0), 0);

      const receiptData = {
        uid: manualReceiptName.trim(), // Используем название как УИ для ручных чеков
        date: formatDate(manualReceiptDate),
        purchases: purchases,
        total_amount: totalAmount,
      };

      await dataService.addReceipt(receiptData);
      
      setSnackbarMessage('Ручной чек успешно добавлен');
      setManualDialogVisible(false);
      setManualReceiptName('');
      setManualReceiptDate(new Date());
      setPurchases([]);
    } catch (error) {
      console.error('Error adding manual receipt:', error);
      setSnackbarMessage('Ошибка при добавлении чека: ' + UtilityService.getErrorMessage(error));
    } finally {
      setLoading(false);
      setSnackbarVisible(true);
    }
  };

  // Запросить разрешение на камеру при первом открытии сканера
  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  // Открыть сканер
  const openScanner = async () => {
    try {
      await requestCameraPermission();
      setScannerVisible(true);
    } catch (error) {
      console.error('Error opening scanner:', error);
      setSnackbarMessage('Ошибка при открытии сканера');
      setSnackbarVisible(true);
    }
  };

  // Обработка результата сканирования
  const handleBarCodeScanned = (result) => {
    try {
      const data = result?.data;
      if (data && typeof data === 'string' && data.length === 24) {
        setUid(data);
        setScannerVisible(false);
        setSnackbarMessage('УИ успешно считан');
        setSnackbarVisible(true);
      } else {
        setSnackbarMessage('QR-код не содержит корректный УИ');
        setSnackbarVisible(true);
      }
    } catch (error) {
      console.error('Error handling barcode scan:', error);
      setSnackbarMessage('Ошибка при обработке QR-кода');
      setSnackbarVisible(true);
    }
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
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Менеджер расходов</Title>
              <Paragraph style={styles.subtitle}>
                {'Текст'}
              </Paragraph>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <TextInput
                  label="УИ"
                  value={uid}
                  onChangeText={setUid}
                  mode="outlined"
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
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
                  placeholder="Введите УИ чека"
                  right={
                    <TextInput.Icon
                      icon={() => (
                        <TouchableOpacity onPress={openScanner}>
                          <Ionicons
                            name="qr-code-outline"
                            size={24}
                            color="#666666"
                            accessibilityLabel="Сканировать QR-код"
                          />
                        </TouchableOpacity>
                      )}
                    />
                  }
                />
              </View>

              <Button
                mode="outlined"
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
                contentStyle={styles.buttonContent}
              >
                {formatDate(date)}
              </Button>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
                contentStyle={styles.buttonContent}
              >
                {loading ? 'Добавление...' : 'Добавить чек'}
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FAB для ручного чека */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddManualReceipt}
        color="#fff"
      />

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
                  primary: '#7BA7D9',
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
              Дата: {formatDate(manualReceiptDate)}
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
                  primary: '#7BA7D9',
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
                  primary: '#7BA7D9',
                  text: '#FFFFFF',
                  placeholder: '#B0B0B0',
                  background: '#1E1E1E'
                }
              }}
            />
            <View style={{ marginBottom: 15 }}>
              <Button
                mode="outlined"
                onPress={() => setCategoryMenuVisible(true)}
                style={styles.dialogInput}
                contentStyle={{ justifyContent: 'flex-start' }}
                icon="chevron-down"
                labelStyle={{ color: '#B0B0B0', textAlign: 'left', flex: 1 }}
              >
                {newPurchaseCategory || 'Выберите категорию'}
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
            <Button onPress={handleSaveManualReceipt} loading={loading}>Сохранить</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Модальное окно со сканером QR-кода */}
      <Portal>
        <Dialog visible={scannerVisible} onDismiss={() => setScannerVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Сканировать QR-код</Dialog.Title>
          <Dialog.Content style={{ alignItems: 'center', justifyContent: 'center', height: 300 }}>
            {hasPermission === null ? (
              <ActivityIndicator size="large" color="#2196F3" />
            ) : hasPermission === false ? (
              <Paragraph>Нет доступа к камере</Paragraph>
            ) : (
              <CameraView 
                style={{ width: 250, height: 250 }} 
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setScannerVisible(false)}>Отмена</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Модальное окно выбора категорий */}
      <Portal>
        <Modal
          visible={categoryMenuVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setCategoryMenuVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Title style={styles.modalTitle}>Выберите категорию</Title>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setCategoryMenuVisible(false)}
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
                        setCategoryMenuVisible(false);
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
    paddingTop: 120,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
  subtitle: {
    textAlign: 'center',
    color: '#B0B0B0',
    marginBottom: 15,
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#1E1E1E',
  },
  dateButton: {
    marginBottom: 15,
    borderColor: '#2196F3',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  syncCard: {
    backgroundColor: '#2A2A2A',
  },
  syncTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
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
  syncButtons: {
    gap: 10,
  },
  syncButton: {
    marginBottom: 5,
  },
  snackbar: {
    backgroundColor: '#2A2A2A',
  },
  guestTitle: {
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  guestText: {
    textAlign: 'center',
    color: '#B0B0B0',
    marginBottom: 20,
  },
  authButton: {
    backgroundColor: '#2196F3',
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
    fontSize: 16,
    marginBottom: 2,
  },
  purchaseAmount: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 
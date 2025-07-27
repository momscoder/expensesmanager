// Тестовый файл для проверки обработки чеков
// Запустите этот файл с помощью: node test-receipt-processing.js

import ReceiptProcessorService from './src/services/ReceiptProcessorService.js';
import SimpleDataService from './src/services/SimpleDataService.js';
import DatabaseService from './src/services/DatabaseService.js';

async function testReceiptProcessing() {
  console.log('=== Тестирование обработки чеков ===');
  
  try {
    // Инициализируем сервисы
    console.log('1. Инициализация сервисов...');
    await SimpleDataService.initialize();
    await DatabaseService.initialize();
    console.log('✅ Сервисы инициализированы');
    
    // Тестируем получение данных чека
    console.log('\n2. Тестирование получения данных чека...');
    const testUid = '123456789012345678901234';
    const testDate = '2024-01-15';
    
    console.log('UID:', testUid);
    console.log('Дата:', testDate);
    
    // Тестируем обработку чека
    console.log('\n3. Тестирование обработки чека...');
    const result = await ReceiptProcessorService.processReceipt(testUid, testDate);
    
    console.log('Результат обработки:', result);
    
    if (result.success) {
      console.log('✅ Чек успешно обработан');
      
      // Проверяем, что данные сохранились
      console.log('\n4. Проверка сохраненных данных...');
      const receipts = await ReceiptProcessorService.getAllReceipts();
      console.log('Всего чеков:', receipts.length);
      
      if (receipts.length > 0) {
        const lastReceipt = receipts[receipts.length - 1];
        console.log('Последний чек:', {
          id: lastReceipt.id,
          uid: lastReceipt.uid,
          date: lastReceipt.date,
          total_amount: lastReceipt.total_amount,
          purchases_count: lastReceipt.purchases?.length || 0
        });
      }
    } else {
      console.log('❌ Ошибка обработки чека:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testReceiptProcessing(); 
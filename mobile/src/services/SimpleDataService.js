import AsyncStorage from '@react-native-async-storage/async-storage';
import dataChangeService from './DataChangeService';
import UtilityService from './UtilityService';

class SimpleDataService {
  constructor() {
    this.receiptsKey = 'receipts_data';
    this.categoriesKey = 'categories_data';
    this.nextReceiptId = 1;
    this.nextPurchaseId = 1;
  }

  // Initialize service and load existing data
  async initialize() {
    try {
      const [receiptsData, categoriesData] = await Promise.all([
        AsyncStorage.getItem(this.receiptsKey),
        AsyncStorage.getItem(this.categoriesKey)
      ]);

      if (receiptsData) {
        const data = JSON.parse(receiptsData);
        this.nextReceiptId = data.nextReceiptId || 1;
        this.nextPurchaseId = data.nextPurchaseId || 1;
      }

      // Initialize default categories if none exist
      if (!categoriesData) {
        await this.initializeDefaultCategories();
      }
    } catch (error) {
      console.error('Error initializing SimpleDataService:', error);
    }
  }

  // Initialize default categories
  async initializeDefaultCategories() {
    const defaultCategories = [
      'Продукты',
      'Одежда',
      'Транспорт',
      'Развлечения',
      'Здоровье',
      'Образование',
      'Коммунальные услуги',
      'Рестораны',
      'Техника',
      'Другое'
    ];

    // Ensure all categories are strings
    const validCategories = defaultCategories.filter(cat => 
      cat !== null && cat !== undefined && typeof cat === 'string' && cat.trim() !== ''
    );

    await this.saveCategories(validCategories);
  }

  // ===== RECEIPTS MANAGEMENT =====

  // Get all receipts
  async getAllReceipts() {
    try {
      const data = await AsyncStorage.getItem(this.receiptsKey);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.receipts || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting receipts:', error);
      throw new Error('Ошибка загрузки чеков');
    }
  }

  // Check if receipt exists
  async checkReceiptExists(uid, date) {
    try {
      const receipts = await this.getAllReceipts();
      return receipts.some(receipt => receipt.uid === uid && receipt.date === date);
    } catch (error) {
      console.error('Error checking receipt existence:', error);
      return false;
    }
  }

  // Mark receipt as used
  async markReceiptAsUsed(uid, date) {
    try {
      // This method is used to track processed receipts
      // In the new structure, we use the hash for duplicate detection
      // So this method is mainly for compatibility
      console.log('Receipt marked as used:', uid, date);
    } catch (error) {
      console.error('Error marking receipt as used:', error);
    }
  }

  // Add a new receipt
  async addReceipt(receiptData) {
    try {
      const receipts = await this.getAllReceipts();
      
      // Generate hash for duplicate detection
      const hash = this.generateReceiptHash(receiptData);
      
      // Check for duplicates
      const isDuplicate = receipts.some(receipt => receipt.hash === hash);
      if (isDuplicate) {
        throw new Error('Этот чек уже существует');
      }

      const newReceipt = {
        id: this.nextReceiptId++,
        uid: receiptData.uid || null, // null for manual receipts
        date: receiptData.date,
        hash: hash,
        purchases: receiptData.purchases || [],
        total_amount: receiptData.total_amount || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Assign IDs to purchases
      newReceipt.purchases = newReceipt.purchases.map(purchase => ({
        ...purchase,
        id: this.nextPurchaseId++,
        receipt_id: newReceipt.id
      }));

      receipts.push(newReceipt);
      await this.saveReceipts(receipts);
      
      dataChangeService.notifyReceiptAdded(newReceipt);
      return newReceipt;
    } catch (error) {
      console.error('Error adding receipt:', error);
      throw error;
    }
  }

  // Add manual receipt with purchases
  async addManualReceipt(date, purchases, totalAmount) {
    try {
      const receiptData = {
        date: date,
        purchases: purchases,
        total_amount: totalAmount
      };

      return await this.addReceipt(receiptData);
    } catch (error) {
      console.error('Error adding manual receipt:', error);
      throw error;
    }
  }

  // Update a receipt
  async updateReceipt(id, updates) {
    try {
      const receipts = await this.getAllReceipts();
      const index = receipts.findIndex(r => r.id === id);
      
      if (index === -1) {
        throw new Error('Чек не найден');
      }

      receipts[index] = {
        ...receipts[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await this.saveReceipts(receipts);
      dataChangeService.notifyReceiptUpdated(receipts[index]);
      return receipts[index];
    } catch (error) {
      console.error('Error updating receipt:', error);
      throw error;
    }
  }

  // Delete a receipt
  async deleteReceipt(id) {
    try {
      const receipts = await this.getAllReceipts();
      const filteredReceipts = receipts.filter(r => r.id !== id);
      
      if (filteredReceipts.length === receipts.length) {
        throw new Error('Чек не найден');
      }

      await this.saveReceipts(filteredReceipts);
      dataChangeService.notifyReceiptDeleted(id);
      return true;
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  }

  // Update purchase category
  async updatePurchaseCategory(purchaseId, newCategory) {
    try {
      const receipts = await this.getAllReceipts();
      let updated = false;

      receipts.forEach(receipt => {
        receipt.purchases.forEach(purchase => {
          if (purchase.id === purchaseId) {
            purchase.category = newCategory;
            updated = true;
          }
        });
      });

      if (!updated) {
        throw new Error('Покупка не найдена');
      }

      await this.saveReceipts(receipts);
      dataChangeService.notifyCategoryChanged(newCategory);
      return true;
    } catch (error) {
      console.error('Error updating purchase category:', error);
      throw error;
    }
  }

  // ===== CATEGORIES MANAGEMENT =====

  // Get all categories
  async getCategories() {
    try {
      const data = await AsyncStorage.getItem(this.categoriesKey);
      if (data) {
        const parsed = JSON.parse(data);
        // Ensure we return an array of strings
        if (Array.isArray(parsed)) {
          return parsed.filter(cat => cat !== null && cat !== undefined && typeof cat === 'string');
        }
        return [];
      }
      return [];
    } catch (error) {
      console.error('Error getting categories:', error);
      throw new Error('Ошибка загрузки категорий');
    }
  }

  // Add new category
  async addCategory(categoryName) {
    try {
      const categories = await this.getCategories();
      
      if (categories.includes(categoryName)) {
        throw new Error('Категория уже существует');
      }

      categories.push(categoryName);
      await this.saveCategories(categories);
      
      dataChangeService.notifyCategoriesUpdated();
      return categoryName;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  // Update category
  async updateCategory(oldName, newName) {
    try {
      const categories = await this.getCategories();
      const index = categories.indexOf(oldName);
      
      if (index === -1) {
        throw new Error('Категория не найдена');
      }

      if (categories.includes(newName)) {
        throw new Error('Категория с таким названием уже существует');
      }

      categories[index] = newName;
      await this.saveCategories(categories);

      // Update all purchases with this category
      await this.updatePurchasesCategory(oldName, newName);
      
      dataChangeService.notifyCategoriesUpdated();
      return newName;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete category
  async deleteCategory(categoryName) {
    try {
      const categories = await this.getCategories();
      const filteredCategories = categories.filter(cat => cat !== categoryName);
      
      if (filteredCategories.length === categories.length) {
        throw new Error('Категория не найдена');
      }

      await this.saveCategories(filteredCategories);

      // Remove category from all purchases
      await this.updatePurchasesCategory(categoryName, 'Без категории');
      
      dataChangeService.notifyCategoriesUpdated();
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Update purchases category
  async updatePurchasesCategory(oldCategory, newCategory) {
    try {
      const receipts = await this.getAllReceipts();
      let updated = false;

      receipts.forEach(receipt => {
        receipt.purchases.forEach(purchase => {
          if (purchase.category === oldCategory) {
            purchase.category = newCategory;
            updated = true;
          }
        });
      });

      if (updated) {
        await this.saveReceipts(receipts);
        dataChangeService.notifyCategoryChanged(newCategory);
      }
    } catch (error) {
      console.error('Error updating purchases category:', error);
    }
  }

  // ===== STATISTICS =====

  // Get receipts by date range
  async getReceiptsByDateRange(startDate, endDate) {
    try {
      const receipts = await this.getAllReceipts();
      return receipts.filter(receipt => {
        const receiptDate = new Date(receipt.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return receiptDate >= start && receiptDate <= end;
      });
    } catch (error) {
      console.error('Error getting receipts by date range:', error);
      throw new Error('Ошибка загрузки чеков по диапазону дат');
    }
  }

  // Get all purchases from receipts
  async getAllPurchases() {
    try {
      const receipts = await this.getAllReceipts();
      return receipts.flatMap(receipt => receipt.purchases);
    } catch (error) {
      console.error('Error getting all purchases:', error);
      throw new Error('Ошибка загрузки покупок');
    }
  }

  // Get purchases by date range
  async getPurchasesByDateRange(startDate, endDate) {
    try {
      const receipts = await this.getReceiptsByDateRange(startDate, endDate);
      return receipts.flatMap(receipt => receipt.purchases);
    } catch (error) {
      console.error('Error getting purchases by date range:', error);
      throw new Error('Ошибка загрузки покупок по диапазону дат');
    }
  }

  // Get statistics
  async getStats(startDate, endDate) {
    try {
      const receipts = await this.getReceiptsByDateRange(startDate, endDate);
      const purchases = await this.getPurchasesByDateRange(startDate, endDate);
      
      if (purchases.length === 0) {
        return {
          total_receipts: 0,
          total_purchases: 0,
          total_amount: 0,
          avg_amount: 0,
        };
      }

      const totalAmount = receipts.reduce((sum, receipt) => {
        const amount = UtilityService.validateNumber(receipt.total_amount) ? parseFloat(receipt.total_amount) : 0;
        return sum + amount;
      }, 0);

      return {
        total_receipts: receipts.length,
        total_purchases: purchases.length,
        total_amount: totalAmount,
        avg_amount: receipts.length > 0 ? totalAmount / receipts.length : 0,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw new Error('Ошибка расчета статистики');
    }
  }

  // Get expenses by category
  async getExpensesByCategory(startDate, endDate) {
    try {
      const purchases = await this.getPurchasesByDateRange(startDate, endDate);
      const categoryMap = new Map();

      purchases.forEach(purchase => {
        const category = purchase.category || 'Без категории';
        const amount = UtilityService.validateNumber(purchase.amount) ? parseFloat(purchase.amount) : 0;
        
        if (categoryMap.has(category)) {
          categoryMap.set(category, categoryMap.get(category) + amount);
        } else {
          categoryMap.set(category, amount);
        }
      });

      return Array.from(categoryMap.entries()).map(([category, total]) => ({
        category,
        total,
      })).sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error('Error getting expenses by category:', error);
      throw new Error('Ошибка расчета расходов по категориям');
    }
  }

  // Get total expenses range
  async getTotalExpensesRange(startDate, endDate) {
    try {
      const receipts = await this.getReceiptsByDateRange(startDate, endDate);
      const dateMap = new Map();

      receipts.forEach(receipt => {
        const date = receipt.date;
        const amount = UtilityService.validateNumber(receipt.total_amount) ? parseFloat(receipt.total_amount) : 0;
        
        if (dateMap.has(date)) {
          dateMap.set(date, dateMap.get(date) + amount);
        } else {
          dateMap.set(date, amount);
        }
      });

      return Array.from(dateMap.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Error getting total expenses range:', error);
      throw new Error('Ошибка расчета динамики расходов');
    }
  }

  // ===== UTILITY METHODS =====

  // Generate receipt hash
  generateReceiptHash(receiptData) {
    const data = {
      date: receiptData.date,
      total_amount: receiptData.total_amount,
      purchases_count: receiptData.purchases?.length || 0
    };
    return UtilityService.generateHash(JSON.stringify(data));
  }

  // Save receipts to storage
  async saveReceipts(receipts) {
    try {
      const data = {
        receipts,
        nextReceiptId: this.nextReceiptId,
        nextPurchaseId: this.nextPurchaseId,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(this.receiptsKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving receipts:', error);
      throw new Error('Ошибка сохранения чеков');
    }
  }

  // Save categories to storage
  async saveCategories(categories) {
    try {
      // Ensure all categories are valid strings
      const validCategories = categories
        .filter(cat => cat !== null && cat !== undefined && typeof cat === 'string')
        .map(cat => String(cat).trim())
        .filter(cat => cat !== '');
      
      await AsyncStorage.setItem(this.categoriesKey, JSON.stringify(validCategories));
    } catch (error) {
      console.error('Error saving categories:', error);
      throw new Error('Ошибка сохранения категорий');
    }
  }

  // Clear all data
  async clearAllData() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.receiptsKey),
        AsyncStorage.removeItem(this.categoriesKey)
      ]);
      this.nextReceiptId = 1;
      this.nextPurchaseId = 1;
      
      dataChangeService.notifyDataChange('data_cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Ошибка очистки данных');
    }
  }

  // Export data
  async exportData() {
    try {
      const [receipts, categories] = await Promise.all([
        this.getAllReceipts(),
        this.getCategories()
      ]);
      
      return {
        receipts,
        categories,
        exportDate: new Date().toISOString(),
        version: '2.0',
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Ошибка экспорта данных');
    }
  }

  // Import data
  async importData(data) {
    try {
      if (!data || !Array.isArray(data.receipts)) {
        throw new Error('Неверный формат данных');
      }

      // Import categories if provided
      if (data.categories && Array.isArray(data.categories)) {
        await this.saveCategories(data.categories);
      }

      // Validate and clean imported receipts
      const validReceipts = data.receipts.filter(receipt => {
        return receipt.date && Array.isArray(receipt.purchases);
      });

      // Set next IDs based on imported data
      if (validReceipts.length > 0) {
        const maxReceiptId = Math.max(...validReceipts.map(r => r.id || 0));
        const maxPurchaseId = Math.max(...validReceipts.flatMap(r => r.purchases?.map(p => p.id || 0) || [0]));
        this.nextReceiptId = maxReceiptId + 1;
        this.nextPurchaseId = maxPurchaseId + 1;
      }

      await this.saveReceipts(validReceipts);
      
      dataChangeService.notifyDataChange('data_imported');
      
      return validReceipts.length;
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Ошибка импорта данных');
    }
  }
}

// Create singleton instance
const simpleDataService = new SimpleDataService();

export default simpleDataService; 
import * as SQLite from 'expo-sqlite';
import dataChangeService from './DataChangeService';
import UtilityService from './UtilityService';

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync('receipts.db');
      await this.createTables();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw new Error('Ошибка инициализации базы данных');
    }
  }

  async createTables() {
    try {
      // Create receipts table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT,
          date TEXT NOT NULL,
          hash TEXT NOT NULL,
          total_amount REAL NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Create purchases table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS purchases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receipt_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          amount REAL NOT NULL,
          FOREIGN KEY (receipt_id) REFERENCES receipts (id) ON DELETE CASCADE
        )
      `);

      // Create categories table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL
        )
      `);

      // Insert default categories if table is empty
      const categoriesResult = await this.db.getAllAsync('SELECT * FROM categories');
      if (categoriesResult.length === 0) {
        const defaultCategories = [
          'Продукты', 'Одежда', 'Транспорт', 'Развлечения', 'Здоровье',
          'Образование', 'Коммунальные услуги', 'Рестораны', 'Техника', 'Другое'
        ];
        
        for (const category of defaultCategories) {
          await this.db.runAsync('INSERT INTO categories (name) VALUES (?)', [category]);
        }
      }
    } catch (error) {
      console.error('Error creating tables:', error);
      throw new Error('Ошибка создания таблиц');
    }
  }

  // ===== RECEIPTS MANAGEMENT =====

  async getAllReceipts() {
    await this.initialize();
    
    try {
      const receipts = await this.db.getAllAsync(`
        SELECT * FROM receipts ORDER BY date DESC
      `);

      const receiptsWithPurchases = await Promise.all(
        receipts.map(async (receipt) => {
          const purchases = await this.db.getAllAsync(
            'SELECT * FROM purchases WHERE receipt_id = ?',
            [receipt.id]
          );
          return { ...receipt, purchases };
        })
      );

      return receiptsWithPurchases;
    } catch (error) {
      console.error('Error getting receipts:', error);
      throw new Error('Ошибка загрузки чеков');
    }
  }

  async addReceipt(receiptData) {
    await this.initialize();
    
    try {
      // Generate hash for duplicate detection
      const hash = this.generateReceiptHash(receiptData);
      
      // Check for duplicates
      const existingReceipt = await this.db.getFirstAsync(
        'SELECT * FROM receipts WHERE hash = ?',
        [hash]
      );
      
      if (existingReceipt) {
        throw new Error('Этот чек уже существует');
      }

      // Insert receipt
      const result = await this.db.runAsync(`
        INSERT INTO receipts (uid, date, hash, total_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        receiptData.uid || null,
        receiptData.date,
        hash,
        receiptData.total_amount || 0,
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      const receiptId = result.lastInsertRowId;

      // Insert purchases
      if (receiptData.purchases && Array.isArray(receiptData.purchases)) {
        for (const purchase of receiptData.purchases) {
          await this.db.runAsync(`
            INSERT INTO purchases (receipt_id, name, category, amount)
            VALUES (?, ?, ?, ?)
          `, [
            receiptId,
            purchase.name,
            purchase.category || null,
            purchase.amount
          ]);
        }
      }

      // Get the complete receipt with purchases
      const newReceipt = await this.getReceiptById(receiptId);
      
      dataChangeService.notifyReceiptAdded(newReceipt);
      return newReceipt;
    } catch (error) {
      console.error('Error adding receipt:', error);
      throw error;
    }
  }

  async getReceiptById(id) {
    await this.initialize();
    
    try {
      const receipt = await this.db.getFirstAsync(
        'SELECT * FROM receipts WHERE id = ?',
        [id]
      );

      if (!receipt) {
        throw new Error('Чек не найден');
      }

      const purchases = await this.db.getAllAsync(
        'SELECT * FROM purchases WHERE receipt_id = ?',
        [id]
      );

      return { ...receipt, purchases };
    } catch (error) {
      console.error('Error getting receipt by ID:', error);
      throw error;
    }
  }

  async updateReceipt(id, updates) {
    await this.initialize();
    
    try {
      const receipt = await this.getReceiptById(id);
      if (!receipt) {
        throw new Error('Чек не найден');
      }

      // Update receipt fields
      const updateFields = [];
      const updateValues = [];
      
      if (updates.date !== undefined) {
        updateFields.push('date = ?');
        updateValues.push(updates.date);
      }
      
      if (updates.total_amount !== undefined) {
        updateFields.push('total_amount = ?');
        updateValues.push(updates.total_amount);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = ?');
        updateValues.push(new Date().toISOString());
        updateValues.push(id);

        await this.db.runAsync(`
          UPDATE receipts SET ${updateFields.join(', ')} WHERE id = ?
        `, updateValues);
      }

      // Update purchases if provided
      if (updates.purchases && Array.isArray(updates.purchases)) {
        // Delete existing purchases
        await this.db.runAsync('DELETE FROM purchases WHERE receipt_id = ?', [id]);
        
        // Insert new purchases
        for (const purchase of updates.purchases) {
          await this.db.runAsync(`
            INSERT INTO purchases (receipt_id, name, category, amount)
            VALUES (?, ?, ?, ?)
          `, [
            id,
            purchase.name,
            purchase.category || null,
            purchase.amount
          ]);
        }
      }

      const updatedReceipt = await this.getReceiptById(id);
      dataChangeService.notifyReceiptUpdated(updatedReceipt);
      return updatedReceipt;
    } catch (error) {
      console.error('Error updating receipt:', error);
      throw error;
    }
  }

  async deleteReceipt(id) {
    await this.initialize();
    
    try {
      const result = await this.db.runAsync('DELETE FROM receipts WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        throw new Error('Чек не найден');
      }

      dataChangeService.notifyReceiptDeleted(id);
      return true;
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  }

  // ===== CATEGORIES MANAGEMENT =====

  async getCategories() {
    await this.initialize();
    
    try {
      const categories = await this.db.getAllAsync('SELECT name FROM categories ORDER BY name');
      // Ensure we return an array of strings
      return categories
        .filter(cat => cat && cat.name !== null && cat.name !== undefined)
        .map(cat => String(cat.name));
    } catch (error) {
      console.error('Error getting categories:', error);
      throw new Error('Ошибка загрузки категорий');
    }
  }

  async addCategory(categoryName) {
    await this.initialize();
    
    try {
      await this.db.runAsync('INSERT INTO categories (name) VALUES (?)', [categoryName]);
      dataChangeService.notifyCategoriesUpdated();
      return categoryName;
    } catch (error) {
      console.error('Error adding category:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Категория уже существует');
      }
      throw new Error('Ошибка добавления категории');
    }
  }

  async updateCategory(oldName, newName) {
    await this.initialize();
    
    try {
      // Update category name
      const result = await this.db.runAsync(
        'UPDATE categories SET name = ? WHERE name = ?',
        [newName, oldName]
      );

      if (result.changes === 0) {
        throw new Error('Категория не найдена');
      }

      // Update all purchases with this category
      await this.db.runAsync(
        'UPDATE purchases SET category = ? WHERE category = ?',
        [newName, oldName]
      );

      dataChangeService.notifyCategoriesUpdated();
      return newName;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(categoryName) {
    await this.initialize();
    
    try {
      const result = await this.db.runAsync(
        'DELETE FROM categories WHERE name = ?',
        [categoryName]
      );

      if (result.changes === 0) {
        throw new Error('Категория не найдена');
      }

      // Set category to null for all purchases with this category
      await this.db.runAsync(
        'UPDATE purchases SET category = NULL WHERE category = ?',
        [categoryName]
      );

      dataChangeService.notifyCategoriesUpdated();
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // ===== STATISTICS =====

  async getReceiptsByDateRange(startDate, endDate) {
    await this.initialize();
    
    try {
      const receipts = await this.db.getAllAsync(`
        SELECT * FROM receipts 
        WHERE date >= ? AND date <= ?
        ORDER BY date DESC
      `, [startDate, endDate]);

      const receiptsWithPurchases = await Promise.all(
        receipts.map(async (receipt) => {
          const purchases = await this.db.getAllAsync(
            'SELECT * FROM purchases WHERE receipt_id = ?',
            [receipt.id]
          );
          return { ...receipt, purchases };
        })
      );

      return receiptsWithPurchases;
    } catch (error) {
      console.error('Error getting receipts by date range:', error);
      throw new Error('Ошибка загрузки чеков по диапазону дат');
    }
  }

  async getPurchasesByDateRange(startDate, endDate) {
    await this.initialize();
    
    try {
      const purchases = await this.db.getAllAsync(`
        SELECT p.* FROM purchases p
        JOIN receipts r ON p.receipt_id = r.id
        WHERE r.date >= ? AND r.date <= ?
        ORDER BY r.date DESC
      `, [startDate, endDate]);

      return purchases;
    } catch (error) {
      console.error('Error getting purchases by date range:', error);
      throw new Error('Ошибка загрузки покупок по диапазону дат');
    }
  }

  async getStats(startDate, endDate) {
    await this.initialize();
    
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

  async getExpensesByCategory(startDate, endDate) {
    await this.initialize();
    
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

  async getTotalExpensesRange(startDate, endDate) {
    await this.initialize();
    
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

  generateReceiptHash(receiptData) {
    const data = {
      date: receiptData.date,
      total_amount: receiptData.total_amount,
      purchases_count: receiptData.purchases?.length || 0
    };
    return UtilityService.generateHash(JSON.stringify(data));
  }

  async clearAllData() {
    await this.initialize();
    
    try {
      await this.db.execAsync(`
        DELETE FROM purchases;
        DELETE FROM receipts;
        DELETE FROM categories;
      `);
      
      // Reinitialize default categories
      await this.createTables();
      
      dataChangeService.notifyDataChange('data_cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Ошибка очистки данных');
    }
  }

  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
  }

  // ===== SYNC METHODS =====

  async getUnsyncedRecords() {
    await this.initialize();
    
    try {
      const receipts = await this.db.getAllAsync(`
        SELECT * FROM receipts 
        WHERE uid IS NOT NULL 
        ORDER BY created_at DESC
      `);

      const receiptsWithPurchases = await Promise.all(
        receipts.map(async (receipt) => {
          const purchases = await this.db.getAllAsync(
            'SELECT * FROM purchases WHERE receipt_id = ?',
            [receipt.id]
          );
          return { ...receipt, purchases };
        })
      );

      return receiptsWithPurchases;
    } catch (error) {
      console.error('Error getting unsynced records:', error);
      throw new Error('Ошибка загрузки несинхронизированных записей');
    }
  }

  async markAsSynced(receiptId) {
    await this.initialize();
    
    try {
      await this.db.runAsync(`
        UPDATE receipts SET updated_at = ? WHERE id = ?
      `, [new Date().toISOString(), receiptId]);
    } catch (error) {
      console.error('Error marking receipt as synced:', error);
      throw new Error('Ошибка отметки чека как синхронизированного');
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService; 
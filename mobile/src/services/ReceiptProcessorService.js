import { getReceipt } from 'checkchecker';
import SimpleDataService from './SimpleDataService';

class ReceiptProcessorService {
  // Generate receipt hash (same as server)
  generateReceiptHash(uid, date) {
    const hashString = `${uid}_${date}`;
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Check if receipt already exists
  async receiptExists(uid, date) {
    return await SimpleDataService.checkReceiptExists(uid, date);
  }

  // Clean product name (same as server)
  cleanProductName(productName) {
    if (!productName) return '';
    return productName
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  // Process receipt data (same as server logic)
  async processReceipt(uid, date) {
    try {
      // Check if receipt already exists
      if (await this.receiptExists(uid, date)) {
        return { success: false, code: 409, message: 'Чек уже обработан' };
      }

      // Get receipt data from checkchecker
      const data = await getReceipt(uid, date);
      
      if (!data?.message?.positions) {
        return { success: false, code: 400, message: 'Не удалось получить чек' };
      }

      // Parse positions
      const positions = JSON.parse(data.message.positions);
      
      // Convert positions to purchases array
      const purchases = [];
      let totalAmount = 0;
      
      for (const { product_name, amount } of positions) {
        if (product_name && amount) {
          const numAmount = parseFloat(amount);
          if (!isNaN(numAmount)) {
            purchases.push({
              name: this.cleanProductName(product_name),
              amount: numAmount.toString(),
              category: null,
            });
            totalAmount += numAmount;
          }
        }
      }

      // Create receipt with purchases array
      const receiptData = {
        uid: uid,
        date: date,
        purchases: purchases,
        total_amount: totalAmount,
      };

      // Save receipt with purchases
      await SimpleDataService.addReceipt(receiptData);

      // Mark receipt as used
      await SimpleDataService.markReceiptAsUsed(uid, date);

      return { success: true, code: 200, message: 'Данные успешно сохранены' };

    } catch (error) {
      console.error('Error processing receipt:', error);
      return { success: false, code: 404, message: 'Ошибка при загрузке чека' };
    }
  }

  // Get all receipts with full data
  async getAllReceipts() {
    return await SimpleDataService.getAllReceipts();
  }

  // Add manual receipt
  async addManualReceipt(receiptData) {
    // Validate data
    if (!receiptData.product || !receiptData.amount || !receiptData.date) {
      throw new Error('Missing required fields');
    }

    if (receiptData.amount <= 0 || receiptData.amount > 999999.99) {
      throw new Error('Invalid amount');
    }

    if (receiptData.product.length > 200) {
      throw new Error('Product name too long');
    }

    return await SimpleDataService.addReceipt({
      date: receiptData.date,
      product: receiptData.product.trim(),
      amount: receiptData.amount,
      category: receiptData.category || '',
      uid: receiptData.uid || '',
    });
  }

  // Update receipt category
  async updateReceiptCategory(id, category) {
    if (category && category.length > 50) {
      throw new Error('Category name too long');
    }

    return await SimpleDataService.updateReceipt(id, { 
      category: category ? category.trim() : null 
    });
  }

  // Delete receipt
  async deleteReceipt(id) {
    return await SimpleDataService.deleteReceipt(id);
  }

  // Get statistics
  async getStats(startDate, endDate) {
    return await SimpleDataService.getStats(startDate, endDate);
  }

  // Get expenses by category
  async getExpensesByCategory(startDate, endDate) {
    return await SimpleDataService.getExpensesByCategory(startDate, endDate);
  }

  // Get total expenses for date range
  async getTotalExpensesRange(startDate, endDate) {
    return await SimpleDataService.getTotalExpensesRange(startDate, endDate);
  }
}

export default new ReceiptProcessorService(); 
import { getReceipt } from 'checkchecker';
import DatabaseService from './DatabaseService';

class ReceiptProcessorService {
  // Get the appropriate data service based on authentication status
  async getDataService() {
      return DatabaseService;
  }

  // Check if receipt already exists
  async receiptExists(uid, date) {
    const dataService = await this.getDataService();
    return await dataService.checkReceiptExists(uid, date);
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
      console.log('ReceiptProcessorService: Starting to process receipt', { uid, date });
      
      const dataService = await this.getDataService();
      console.log('ReceiptProcessorService: Got data service');
      
      // Check if receipt already exists
      console.log('ReceiptProcessorService: Checking if receipt exists...');
      if (await this.receiptExists(uid, date)) {
        console.log('ReceiptProcessorService: Receipt already exists');
        return { success: false, code: 409, message: 'Чек уже обработан' };
      }
      console.log('ReceiptProcessorService: Receipt does not exist, proceeding...');

      // Get receipt data from checkchecker
      console.log('ReceiptProcessorService: Getting receipt data from checkchecker...');
      const data = await getReceipt(uid, date);
      console.log('ReceiptProcessorService: Got data from checkchecker:', data);
      
      if (!data?.message?.positions) {
        console.log('ReceiptProcessorService: No positions in data');
        return { success: false, code: 400, message: 'Не удалось получить чек' };
      }

      // Parse positions
      console.log('ReceiptProcessorService: Parsing positions...');
      const positions = JSON.parse(data.message.positions);
      console.log('ReceiptProcessorService: Parsed positions:', positions);
      
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

      console.log('ReceiptProcessorService: Processed purchases:', purchases);
      console.log('ReceiptProcessorService: Total amount:', totalAmount);

      // Create receipt with purchases array
      const receiptData = {
        uid: uid,
        date: date,
        purchases: purchases,
        total_amount: totalAmount,
      };

      console.log('ReceiptProcessorService: Saving receipt data:', receiptData);

      // Save receipt with purchases
      await dataService.addReceipt(receiptData);
      console.log('ReceiptProcessorService: Receipt saved successfully');

      // Mark receipt as used
      await dataService.markReceiptAsUsed(uid, date);
      console.log('ReceiptProcessorService: Receipt marked as used');

      return { success: true, code: 200, message: 'Данные успешно сохранены' };

    } catch (error) {
      console.error('ReceiptProcessorService: Error processing receipt:', error);
      return { success: false, code: 404, message: 'Ошибка при загрузке чека' };
    }
  }

  // Get all receipts with full data
  async getAllReceipts() {
    const dataService = await this.getDataService();
    return await dataService.getAllReceipts();
  }

  // Add manual receipt
  async addManualReceipt(receiptData) {
    const dataService = await this.getDataService();
    
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

    return await dataService.addReceipt({
      date: receiptData.date,
      product: receiptData.product.trim(),
      amount: receiptData.amount,
      category: receiptData.category || '',
      uid: receiptData.uid || '',
    });
  }

  // Update receipt category
  async updateReceiptCategory(id, category) {
    const dataService = await this.getDataService();
    
    if (category && category.length > 50) {
      throw new Error('Category name too long');
    }

    return await dataService.updateReceipt(id, { 
      category: category ? category.trim() : null 
    });
  }

  // Delete receipt
  async deleteReceipt(id) {
    const dataService = await this.getDataService();
    return await dataService.deleteReceipt(id);
  }

  // Get statistics
  async getStats(startDate, endDate) {
    const dataService = await this.getDataService();
    return await dataService.getStats(startDate, endDate);
  }

  // Get expenses by category
  async getExpensesByCategory(startDate, endDate) {
    const dataService = await this.getDataService();
    return await dataService.getExpensesByCategory(startDate, endDate);
  }

  // Get total expenses for date range
  async getTotalExpensesRange(startDate, endDate) {
    const dataService = await this.getDataService();
    return await dataService.getTotalExpensesRange(startDate, endDate);
  }
}

export default new ReceiptProcessorService(); 
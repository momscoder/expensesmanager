class DataChangeService {
  constructor() {
    this.listeners = new Map();
    this.nextId = 1;
  }

  // Generate unique listener ID
  generateId() {
    return `listener_${this.nextId++}_${Date.now()}`;
  }

  // Subscribe to data changes
  subscribe(callback, id = null) {
    const listenerId = id || this.generateId();
    this.listeners.set(listenerId, callback);
    return listenerId;
  }

  // Unsubscribe from data changes
  unsubscribe(listenerId) {
    this.listeners.delete(listenerId);
  }

  // Unsubscribe all listeners
  unsubscribeAll() {
    this.listeners.clear();
  }

  // Notify all listeners
  notifyDataChange(type = 'general', data = {}) {
    const event = { type, timestamp: new Date(), ...data };
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in data change listener:', error);
      }
    });
  }

  // Notify specific data changes
  notifyReceiptAdded(receipt = null) {
    this.notifyDataChange('receipt_added', { receipt });
  }

  notifyReceiptUpdated(receipt = null) {
    this.notifyDataChange('receipt_updated', { receipt });
  }

  notifyReceiptDeleted(receiptId = null) {
    this.notifyDataChange('receipt_deleted', { receiptId });
  }

  notifyCategoryChanged(category = null) {
    this.notifyDataChange('category_changed', { category });
  }

  notifyStatsUpdated() {
    this.notifyDataChange('stats_updated');
  }

  notifyCategoriesUpdated() {
    this.notifyDataChange('categories_updated');
  }
}

// Create singleton instance
const dataChangeService = new DataChangeService();

export default dataChangeService; 
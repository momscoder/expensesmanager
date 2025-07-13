import DatabaseService from './DatabaseService';
import ApiService from './ApiService';
import * as SecureStore from 'expo-secure-store';

class SyncService {
  constructor() {
    this.isOnline = false;
    this.syncInProgress = false;
  }

  async checkOnlineStatus() {
    try {
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        timeout: 5000 
      });
      this.isOnline = response.ok;
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      return false;
    }
  }

  async syncToServer() {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      // Check if user is authenticated
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('User not authenticated');
      }

      // Check online status
      const isOnline = await this.checkOnlineStatus();
      if (!isOnline) {
        throw new Error('No internet connection');
      }

      // Get unsynced records
      const unsyncedRecords = await DatabaseService.getUnsyncedRecords();
      
      if (unsyncedRecords.length === 0) {
        return { message: 'No data to sync', syncedCount: 0 };
      }

      // Sync data to server
      const syncResults = await ApiService.syncData(unsyncedRecords);
      
      // Mark records as synced
      for (const record of unsyncedRecords) {
        if (syncResults[record.table_name] && syncResults[record.table_name][record.id]) {
          const serverId = syncResults[record.table_name][record.id];
          await DatabaseService.markAsSynced(record.table_name, record.id, serverId);
        }
      }

      // Clear sync log
      await DatabaseService.clearSyncLog();

      return {
        message: `Successfully synced ${unsyncedRecords.length} records`,
        syncedCount: unsyncedRecords.length
      };

    } catch (error) {
      console.error('Sync to server failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async pullFromServer() {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      // Check if user is authenticated
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('User not authenticated');
      }

      // Check online status
      const isOnline = await this.checkOnlineStatus();
      if (!isOnline) {
        throw new Error('No internet connection');
      }

      // Pull data from server
      const serverData = await ApiService.pullData();
      
      // Merge server data with local data
      await this.mergeServerData(serverData);

      return {
        message: 'Successfully pulled data from server',
        pulledCount: (serverData.receipts?.length || 0) + (serverData.categories?.length || 0)
      };

    } catch (error) {
      console.error('Pull from server failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async mergeServerData(serverData) {
    // Merge receipts
    if (serverData.receipts) {
      for (const serverReceipt of serverData.receipts) {
        // Check if receipt already exists locally
        const localReceipts = await DatabaseService.getReceipts();
        const existingReceipt = localReceipts.find(r => r.server_id === serverReceipt.id);
        
        if (!existingReceipt) {
          // Add new receipt from server
          await DatabaseService.addReceipt({
            date: serverReceipt.date,
            product: serverReceipt.product,
            amount: serverReceipt.amount,
            category: serverReceipt.category,
            uid: serverReceipt.uid
          });
        } else if (existingReceipt.sync_status === 'synced') {
          // Update existing receipt if it's synced (server is authoritative)
          await DatabaseService.updateReceipt(existingReceipt.id, {
            date: serverReceipt.date,
            product: serverReceipt.product,
            amount: serverReceipt.amount,
            category: serverReceipt.category,
            uid: serverReceipt.uid
          });
        }
        // If local receipt is modified, keep local changes
      }
    }

    // Merge categories
    if (serverData.categories) {
      for (const serverCategory of serverData.categories) {
        const localCategories = await DatabaseService.getCategories();
        const existingCategory = localCategories.find(c => c.server_id === serverCategory.id);
        
        if (!existingCategory) {
          // Add new category from server
          await DatabaseService.addCategory({
            name: serverCategory.name
          });
        } else if (existingCategory.sync_status === 'synced') {
          // Update existing category if it's synced
          await DatabaseService.updateCategory(existingCategory.id, {
            name: serverCategory.name
          });
        }
      }
    }
  }

  async fullSync() {
    try {
      // First pull from server
      await this.pullFromServer();
      
      // Then sync local changes to server
      await this.syncToServer();
      
      return {
        message: 'Full sync completed successfully'
      };
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  async getSyncStatus() {
    try {
      const unsyncedRecords = await DatabaseService.getUnsyncedRecords();
      const isOnline = await this.checkOnlineStatus();
      const token = await SecureStore.getItemAsync('authToken');
      
      return {
        isOnline,
        isAuthenticated: !!token,
        unsyncedCount: unsyncedRecords.length,
        syncInProgress: this.syncInProgress
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        isOnline: false,
        isAuthenticated: false,
        unsyncedCount: 0,
        syncInProgress: false
      };
    }
  }

  // Auto-sync when app goes to background
  async autoSync() {
    try {
      const status = await this.getSyncStatus();
      
      if (status.isOnline && status.isAuthenticated && status.unsyncedCount > 0) {
        await this.syncToServer();
        console.log('Auto-sync completed');
      }
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }
}

export default new SyncService(); 
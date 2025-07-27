import DatabaseService from './DatabaseService';
import ApiService from './ApiService';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import NetInfo from '@react-native-community/netinfo';

class SyncService {
  constructor() {
    this.isOnline = false;
    this.syncInProgress = false;
  }

  async checkOnlineStatus() {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = !!state.isConnected && !!state.isInternetReachable;
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
      console.log('[SYNC] Starting sync to server...');
      
      // Check if user is authenticated
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('User not authenticated');
      }
      console.log('[SYNC] User is authenticated');

      // Check online status
      const isOnline = await this.checkOnlineStatus();
      if (!isOnline) {
        throw new Error('No internet connection');
      }
      console.log('[SYNC] Internet connection available');

      // Get unsynced records
      console.log('[SYNC] Getting unsynced records...');
      let unsyncedReceipts = await DatabaseService.getUnsyncedRecords();
      console.log('[SYNC] Found unsynced receipts:', unsyncedReceipts.length);
      
      // Для новых чеков: убрать id, добавить localId и hash
      unsyncedReceipts = unsyncedReceipts.map(r => {
        if (!r.id) {
          return { ...r, localId: r.localId || uuidv4(), hash: r.hash };
        }
        return r;
      });
      
      // Извлечь все покупки из чеков
      let unsyncedPurchases = [];
      for (const r of unsyncedReceipts) {
        if (Array.isArray(r.purchases)) {
          for (const p of r.purchases) {
            if (!p.id) {
              unsyncedPurchases.push({ ...p, localId: p.localId || uuidv4(), receipt_id: r.id || null });
            } else {
              unsyncedPurchases.push(p);
            }
          }
        }
      }
      console.log('[SYNC] Found unsynced purchases:', unsyncedPurchases.length);
      
      // Формируем payload
      const payload = {
        receipts: unsyncedReceipts.map(({ purchases, ...rest }) => rest),
        purchases: unsyncedPurchases,
        categories: [] // TODO: добавить категории, если нужно
      };
      console.log('[SYNC] Payload для отправки на сервер:', payload);
      
      const response = await ApiService.request('/api/sync', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      console.log('[SYNC] Ответ сервера на sync:', data);
      
      // Обработка ответа: обновить локальные id по localIdToServerId/hashToServerId
      if (data && (data.localIdToServerId || data.hashToServerId)) {
        await DatabaseService.updateLocalIdsAfterSync(data.localIdToServerId, data.hashToServerId);
      }
      
      console.log('[SYNC] Sync to server completed successfully');
      return data;
    } catch (error) {
      console.error('[SYNC] Ошибка syncToServer:', error);
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
    // Импортируем все данные с сервера в локальную базу
    console.log('[Sync] Импорт данных с сервера в локальную базу...');
    await DatabaseService.importFromServerData(serverData);
    console.log('[Sync] Импорт завершён.');
  }

  async fullSync() {
    try {
      // Сначала отправляем все локальные изменения на сервер
      console.log('[Sync] Сначала отправляем локальные изменения на сервер...');
      await this.syncToServer();
      // Затем получаем все данные с сервера и импортируем их
      console.log('[Sync] Затем получаем все данные с сервера...');
      await this.pullFromServer();
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
/**
 * Sync Service
 * Handles data synchronization operations
 */

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./config";

interface SyncData {
  timelogs?: any[];
  screenshots?: any[];
  tasks?: any[];
}

interface SyncResponse {
  success: boolean;
  synced_count: number;
  failed_count: number;
  errors?: any[];
}

export const syncService = {
  /**
   * Batch sync data to server
   */
  batchSync: (data: SyncData) =>
    apiClient.post<SyncResponse>(API_ENDPOINTS.SYNC.BATCH, data),
};

export default syncService;

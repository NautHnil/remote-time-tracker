/**
 * Time Log Service
 * Handles time tracking operations
 */

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./config";

interface StartTimeLogRequest {
  task_id?: number;
  notes?: string;
}

interface TimeLogResponse {
  id: number;
  user_id: number;
  task_id?: number;
  start_time: string;
  end_time?: string;
  status: string;
  total_time: number;
  notes?: string;
}

interface TimeLogStatsResponse {
  total_time_seconds: number;
  total_time_hours: number;
  session_count: number;
  start_date: string;
  end_date: string;
}

export const timeLogService = {
  /**
   * Start time tracking
   */
  start: (data: StartTimeLogRequest) =>
    apiClient.post<TimeLogResponse>(API_ENDPOINTS.TIMELOGS.START, data),

  /**
   * Stop time tracking
   */
  stop: (localId?: string) =>
    apiClient.post<TimeLogResponse>(API_ENDPOINTS.TIMELOGS.STOP, {
      local_id: localId,
    }),

  /**
   * Pause time tracking
   */
  pause: (localId?: string) =>
    apiClient.post<TimeLogResponse>(API_ENDPOINTS.TIMELOGS.PAUSE, {
      local_id: localId,
    }),

  /**
   * Resume time tracking
   */
  resume: (localId?: string) =>
    apiClient.post<TimeLogResponse>(API_ENDPOINTS.TIMELOGS.RESUME, {
      local_id: localId,
    }),

  /**
   * Get active time tracking session
   */
  getActive: () =>
    apiClient.get<TimeLogResponse | null>(API_ENDPOINTS.TIMELOGS.ACTIVE),

  /**
   * List time logs with pagination
   */
  list: (page = 1, perPage = 20) =>
    apiClient.get<TimeLogResponse[]>(API_ENDPOINTS.TIMELOGS.LIST, {
      page,
      per_page: perPage,
    }),

  /**
   * Get time log by ID
   */
  getById: (id: number) =>
    apiClient.get<TimeLogResponse>(API_ENDPOINTS.TIMELOGS.BY_ID(id)),

  /**
   * Get time tracking statistics
   */
  getStats: (startDate: string, endDate: string) =>
    apiClient.get<TimeLogStatsResponse>(API_ENDPOINTS.TIMELOGS.STATS, {
      start_date: startDate,
      end_date: endDate,
    }),
};

export default timeLogService;

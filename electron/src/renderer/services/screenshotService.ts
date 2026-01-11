/**
 * Screenshot Service
 * Handles screenshot operations
 */

import { screenshotQueue } from "../utils/requestQueue";
import { apiClient } from "./apiClient";
import { API_BASE_URL, API_ENDPOINTS } from "./config";

interface ScreenshotResponse {
  id: number;
  user_id: number;
  timelog_id?: number;
  task_id?: number;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  captured_at: string;
}

interface ScreenshotStatsResponse {
  total_count: number;
  total_size: number;
  avg_per_session: number;
  session_count: number;
  screenshots_by_date: Record<string, number>;
  screenshots_by_task: Record<number, number>;
  start_date: string;
  end_date: string;
}

export const screenshotService = {
  /**
   * List screenshots with pagination
   */
  list: (page = 1, perPage = 20) =>
    apiClient.get<ScreenshotResponse[]>(API_ENDPOINTS.SCREENSHOTS.LIST, {
      page,
      per_page: perPage,
    }),

  /**
   * Get screenshot by ID
   */
  getById: (id: number) =>
    apiClient.get<ScreenshotResponse>(API_ENDPOINTS.SCREENSHOTS.BY_ID(id)),

  /**
   * Get screenshots by timelog ID
   */
  getByTimeLog: (timeLogId: number) =>
    apiClient.get<ScreenshotResponse[]>(
      API_ENDPOINTS.SCREENSHOTS.BY_TIMELOG(timeLogId)
    ),

  /**
   * Get screenshots by task ID
   */
  getByTask: (taskId: number) =>
    apiClient.get<ScreenshotResponse[]>(
      API_ENDPOINTS.SCREENSHOTS.BY_TASK(taskId)
    ),

  /**
   * Get screenshots by date range
   */
  getByDateRange: (startDate: string, endDate: string) =>
    apiClient.get<ScreenshotResponse[]>(API_ENDPOINTS.SCREENSHOTS.RANGE, {
      start_date: startDate,
      end_date: endDate,
    }),

  /**
   * Get screenshot statistics
   */
  getStats: (startDate: string, endDate: string) =>
    apiClient.get<ScreenshotStatsResponse>(API_ENDPOINTS.SCREENSHOTS.STATS, {
      start_date: startDate,
      end_date: endDate,
    }),

  /**
   * Get today's screenshot count from server
   */
  getTodayCount: () =>
    apiClient.get<{ count: number }>(API_ENDPOINTS.SCREENSHOTS.TODAY_COUNT),

  /**
   * Delete screenshot
   */
  delete: (id: number) =>
    apiClient.delete<void>(API_ENDPOINTS.SCREENSHOTS.DELETE(id)),

  /**
   * Get screenshot view URL (with authentication)
   * Fetches the image as blob and returns an object URL
   * Uses request queue to prevent 429 errors
   */
  getViewUrl: async (id: number, priority = 0): Promise<string> => {
    return screenshotQueue.enqueue(
      `screenshot-${id}`,
      async () => {
        const credentials = await window.electronAPI.auth.getCredentials();
        const token = credentials?.accessToken;

        if (!token) {
          throw new Error("No authentication token");
        }

        const url = `${API_BASE_URL}${API_ENDPOINTS.SCREENSHOTS.VIEW(id)}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch screenshot: ${response.status}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
      },
      priority
    );
  },

  /**
   * Get screenshot download URL
   */
  getDownloadUrl: (id: number) =>
    `${API_BASE_URL}${API_ENDPOINTS.SCREENSHOTS.DOWNLOAD(id)}`,

  /**
   * Clear screenshot cache
   */
  clearCache: () => {
    screenshotQueue.clearCache();
  },

  /**
   * Get queue statistics
   */
  getQueueStats: () => ({
    cacheSize: screenshotQueue.getCacheSize(),
    queueSize: screenshotQueue.getQueueSize(),
    activeRequests: screenshotQueue.getActiveCount(),
  }),
};

export default screenshotService;

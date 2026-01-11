/**
 * Common Service
 * Handles common API operations like health check
 */

import { API_BASE_URL } from "./config";

// Get base server URL (without /api/v1)
const getServerBaseUrl = () => {
  // Remove /api/v1 from the base URL to get the server root
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "");
};

export interface HealthCheckResponse {
  status: string;
  message: string;
  time: string;
  ip: string;
}

export const commonService = {
  /**
   * Check server health status - calls /health directly on server root (not /api/v1/health)
   */
  healthCheck: async (): Promise<{
    success: boolean;
    message: string;
    data: HealthCheckResponse;
  }> => {
    try {
      const serverUrl = getServerBaseUrl();
      const response = await fetch(`${serverUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Health check failed: ${response.status}`,
          data: {} as HealthCheckResponse,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: "OK",
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to connect to server",
        data: {} as HealthCheckResponse,
      };
    }
  },
};

export default commonService;

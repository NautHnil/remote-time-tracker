/**
 * Common services
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
   * Health check - calls /health directly on server root (not /api/v1/health)
   */
  healthCheck: async (): Promise<{ data: HealthCheckResponse }> => {
    const serverUrl = getServerBaseUrl();
    const response = await fetch(`${serverUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const data = await response.json();
    return { data };
  },
};

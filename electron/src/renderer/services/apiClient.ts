/**
 * Base API Client
 * Handles HTTP requests with automatic authentication
 */

import { API_BASE_URL, DEFAULT_HEADERS } from "./config";

export interface ApiResponse<T = any> {
  code: number;
  error: string | null;
  success: boolean;
  message: string | null;
  data: T;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
}

/**
 * Normalize API response to handle both wrapped and unwrapped responses.
 * Backend may return either:
 * 1. Wrapped: { success: true, message: "...", data: {...} }
 * 2. Unwrapped: { id: 1, name: "..." } (direct object/array)
 */
function normalizeResponse<T>(data: any): ApiResponse<T> {
  // Check if it's already a wrapped response
  if (
    data !== null &&
    typeof data === "object" &&
    "success" in data &&
    "data" in data
  ) {
    return {
      code: data.code || 200,
      error: data.error || null,
      success: data.success ?? true,
      message: data.message || null,
      data: data.data as T,
    };
  }

  // It's an unwrapped response - wrap it
  return {
    code: 200,
    error: null,
    success: true,
    message: null,
    data: data as T,
  };
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication token from Electron store
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const credentials = await window.electronAPI.auth.getCredentials();
      return credentials?.accessToken || null;
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(
    endpoint: string,
    params?: Record<string, string | number>
  ): string {
    const url = new URL(`${this.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  /**
   * Generic request method
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, headers = {}, ...fetchOptions } = options;

    // Get auth token
    const token = await this.getAuthToken();
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    // Merge with default headers
    Object.assign(headers, DEFAULT_HEADERS);

    const url = this.buildURL(endpoint, params);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: headers as HeadersInit,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText,
        }));
        throw new Error(
          errorData.message || errorData.error || `HTTP ${response.status}`
        );
      }

      const data = await response.json();
      console.log(`[apiClient] Raw response for ${endpoint}:`, data);

      // Normalize response to handle both wrapped and unwrapped formats
      const normalized = normalizeResponse<T>(data);
      console.log(
        `[apiClient] Normalized response for ${endpoint}:`,
        normalized
      );
      return normalized;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      params,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      params,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE", params });
  }

  /**
   * Get base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export class for testing or custom instances
export default ApiClient;

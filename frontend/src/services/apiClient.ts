/**
 * Base API Client
 * Handles HTTP requests with automatic authentication
 */

import { API_BASE_URL, DEFAULT_HEADERS } from "./config";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
  _retry?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    try {
      return localStorage.getItem("access_token");
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
    params?: Record<string, string | number>,
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
   * Handle token refresh
   */
  private async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) return null;

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const { access_token, refresh_token } = data.data;
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        return access_token;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
    return null;
  }

  /**
   * Generic request method
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const { params, headers = {}, ...fetchOptions } = options;

    // Get auth token
    const token = this.getAuthToken();
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

      // Handle 401 Unauthorized
      if (response.status === 401 && !fetchOptions._retry) {
        // Don't try to refresh token for auth endpoints (login/register)
        const isAuthEndpoint =
          endpoint.includes("/auth/login") ||
          endpoint.includes("/auth/register");

        if (!isAuthEndpoint) {
          const newToken = await this.refreshToken();
          if (newToken) {
            // Retry with new token
            (headers as Record<string, string>)["Authorization"] =
              `Bearer ${newToken}`;
            return this.request<T>(endpoint, {
              ...options,
              headers,
              _retry: true,
            } as any);
          } else {
            // Redirect to login only if not already on login page
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            if (!window.location.pathname.includes("/login")) {
              window.location.href = "/login";
            }
            throw new Error("Authentication failed");
          }
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText,
        }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      if (response.status === 204) {
        return {
          success: true,
          message: "No Content",
          data: null as T,
        } as ApiResponse<T>;
      }

      const text = await response.text();
      if (!text) {
        return {
          success: true,
          message: "OK",
          data: null as T,
        } as ApiResponse<T>;
      }

      const data = JSON.parse(text);
      if (
        data &&
        typeof data === "object" &&
        "success" in data &&
        "data" in data
      ) {
        return data as ApiResponse<T>;
      }
      return {
        success: true,
        message: "OK",
        data: data as T,
      } as ApiResponse<T>;
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
    params?: Record<string, string | number>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    params?: Record<string, string | number>,
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
    params?: Record<string, string | number>,
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
    params?: Record<string, string | number>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE", params });
  }

  /**
   * Public GET request (no authentication required)
   */
  async publicGet<T = any>(
    endpoint: string,
    params?: Record<string, string | number>,
  ): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint, params);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: DEFAULT_HEADERS,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText,
        }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Public API Error [${endpoint}]:`, error);
      throw error;
    }
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

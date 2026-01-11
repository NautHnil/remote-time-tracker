/**
 * Auth Service
 * Handles authentication operations for admin panel
 */

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./config";

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface UserResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
}

export const authService = {
  /**
   * Admin login
   */
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, { email, password }),

  /**
   * Get current user
   */
  me: () => apiClient.get<UserResponse>(API_ENDPOINTS.AUTH.ME),

  /**
   * Logout user (clear credentials)
   */
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

export default authService;

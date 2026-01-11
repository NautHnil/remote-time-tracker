/**
 * Auth Service
 * Handles authentication operations
 */

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./config";

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  // Organization options
  create_organization?: boolean;
  organization_name?: string;
  organization_slug?: string;
  invite_code?: string;
  invitation_token?: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_at?: string;
  user: UserResponse;
}

export interface UserResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export const authService = {
  /**
   * User login
   */
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, { email, password }),

  /**
   * User registration
   */
  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data),

  /**
   * Get current user with full info
   */
  me: () => apiClient.get<UserResponse>(API_ENDPOINTS.AUTH.ME),

  /**
   * Logout user (clear credentials)
   */
  logout: async () => {
    await window.electronAPI.auth.clear();
  },
};

export default authService;

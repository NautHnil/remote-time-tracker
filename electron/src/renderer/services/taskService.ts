/**
 * Task Service
 * Handles task management operations
 */

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./config";

interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: number;
  color?: string;
}

interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: number;
  color?: string;
}

interface TaskResponse {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  status: string;
  priority: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

export const taskService = {
  /**
   * List tasks with pagination
   */
  list: (page = 1, perPage = 50) =>
    apiClient.get<TaskResponse[]>(API_ENDPOINTS.TASKS.LIST, {
      page,
      per_page: perPage,
    }),

  /**
   * Create new task
   */
  create: (data: CreateTaskRequest) =>
    apiClient.post<TaskResponse>(API_ENDPOINTS.TASKS.CREATE, data),

  /**
   * Update task
   */
  update: (id: number, data: UpdateTaskRequest) =>
    apiClient.put<TaskResponse>(API_ENDPOINTS.TASKS.UPDATE(id), data),

  /**
   * Delete task
   */
  delete: (id: number) =>
    apiClient.delete<void>(API_ENDPOINTS.TASKS.DELETE(id)),

  /**
   * Get task by ID
   */
  getById: (id: number) =>
    apiClient.get<TaskResponse>(API_ENDPOINTS.TASKS.BY_ID(id)),
};

export default taskService;

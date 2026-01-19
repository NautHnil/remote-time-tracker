/**
 * Admin Service
 * API service for system administration functions
 * Only accessible by system admin users
 */

import type {
  AdminActivityStats,
  AdminOrganization,
  AdminOrgDetail,
  AdminOrgFilterParams,
  AdminOrgStats,
  AdminOverviewStats,
  AdminPagination,
  AdminScreenshot,
  AdminScreenshotFilterParams,
  AdminTask,
  AdminTaskDetail,
  AdminTaskFilterParams,
  AdminTimeLog,
  AdminTimeLogDetail,
  AdminTimeLogFilterParams,
  AdminTrendFilterParams,
  AdminTrendStats,
  AdminUser,
  AdminUserDetail,
  AdminUserFilterParams,
  AdminUserPerformance,
  AdminWorkspace,
  AdminWorkspaceDetail,
  AdminWorkspaceFilterParams,
} from "../types/admin";
import { apiClient, ApiResponse } from "./apiClient";

// Re-export types for convenience
export type {
  AdminActivityStats,
  AdminOrganization,
  AdminOrgDetail,
  AdminOrgFilterParams,
  AdminOrgStats,
  AdminOverviewStats,
  AdminPagination,
  AdminScreenshot,
  AdminScreenshotFilterParams,
  AdminTask,
  AdminTaskDetail,
  AdminTaskFilterParams,
  AdminTimeLog,
  AdminTimeLogDetail,
  AdminTimeLogFilterParams,
  AdminTrendFilterParams,
  AdminTrendStats,
  AdminUser,
  AdminUserDetail,
  AdminUserFilterParams,
  AdminUserPerformance,
  AdminWorkspace,
  AdminWorkspaceDetail,
  AdminWorkspaceFilterParams,
};

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

export interface AdminUserListResponse {
  users: AdminUser[];
  pagination: AdminPagination;
}

export interface AdminOrgListResponse {
  organizations: AdminOrganization[];
  pagination: AdminPagination;
}

export interface AdminWorkspaceListResponse {
  workspaces: AdminWorkspace[];
  pagination: AdminPagination;
}

export interface AdminTaskListResponse {
  tasks: AdminTask[];
  pagination: AdminPagination;
}

export interface AdminTimeLogListResponse {
  timelogs: AdminTimeLog[];
  pagination: AdminPagination;
}

export interface AdminScreenshotListResponse {
  screenshots: AdminScreenshot[];
  pagination: AdminPagination;
}

// ============================================================================
// REQUEST INTERFACES
// ============================================================================

export interface AdminUpdateUserRequest {
  first_name?: string;
  last_name?: string;
  role?: string;
  system_role?: string;
  is_active?: boolean;
}

export interface AdminCreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: string;
  system_role?: string;
}

// ============================================================================
// ADMIN SERVICE CLASS
// ============================================================================

class AdminService {
  // ==========================================================================
  // USER MANAGEMENT
  // ==========================================================================

  /**
   * Get paginated list of all users
   */
  async getUsers(
    params: AdminUserFilterParams = {},
  ): Promise<ApiResponse<AdminUserListResponse>> {
    const queryParams: Record<string, string | number> = {};
    if (params.page) queryParams.page = params.page;
    if (params.page_size) queryParams.page_size = params.page_size;
    if (params.search) queryParams.search = params.search;
    if (params.role) queryParams.role = params.role;
    if (params.system_role) queryParams.system_role = params.system_role;
    if (params.is_active !== undefined)
      queryParams.is_active = params.is_active ? "true" : "false";
    if (params.org_id) queryParams.org_id = params.org_id;

    return apiClient.get<AdminUserListResponse>("/admin/users", queryParams);
  }

  /**
   * Get user by ID
   */
  async getUser(userId: number): Promise<ApiResponse<AdminUserDetail>> {
    return apiClient.get<AdminUserDetail>(`/admin/users/${userId}`);
  }

  /**
   * Update user
   */
  async updateUser(
    userId: number,
    data: AdminUpdateUserRequest,
  ): Promise<ApiResponse<AdminUser>> {
    return apiClient.put<AdminUser>(`/admin/users/${userId}`, data);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/admin/users/${userId}`);
  }

  /**
   * Create user (admin only)
   */
  async createUser(
    data: AdminCreateUserRequest,
  ): Promise<ApiResponse<AdminUser>> {
    return apiClient.post<AdminUser>("/admin/users", data);
  }

  /**
   * Activate/Deactivate user
   */
  async activateUser(
    userId: number,
    isActive: boolean,
  ): Promise<ApiResponse<AdminUser>> {
    return apiClient.put<AdminUser>(`/admin/users/${userId}/activate`, {
      is_active: isActive,
    });
  }

  /**
   * Change user role
   */
  async changeUserRole(
    userId: number,
    role: string,
  ): Promise<ApiResponse<AdminUser>> {
    return apiClient.put<AdminUser>(`/admin/users/${userId}/role`, { role });
  }

  /**
   * Change user system role
   */
  async changeUserSystemRole(
    userId: number,
    systemRole: string,
  ): Promise<ApiResponse<AdminUser>> {
    return apiClient.put<AdminUser>(`/admin/users/${userId}/system-role`, {
      system_role: systemRole,
    });
  }

  // ==========================================================================
  // ORGANIZATION MANAGEMENT
  // ==========================================================================

  /**
   * Get paginated list of all organizations
   */
  async getOrganizations(
    params: AdminOrgFilterParams = {},
  ): Promise<ApiResponse<AdminOrgListResponse>> {
    const queryParams: Record<string, string | number> = {};
    if (params.page) queryParams.page = params.page;
    if (params.page_size) queryParams.page_size = params.page_size;
    if (params.search) queryParams.search = params.search;
    if (params.is_active !== undefined)
      queryParams.is_active = params.is_active ? "true" : "false";
    if (params.is_verified !== undefined)
      queryParams.is_verified = params.is_verified ? "true" : "false";

    return apiClient.get<AdminOrgListResponse>(
      "/admin/organizations",
      queryParams,
    );
  }

  /**
   * Get organization by ID
   */
  async getOrganization(orgId: number): Promise<ApiResponse<AdminOrgDetail>> {
    return apiClient.get<AdminOrgDetail>(`/admin/organizations/${orgId}`);
  }

  /**
   * Update organization
   */
  async updateOrganization(
    orgId: number,
    data: Partial<AdminOrganization>,
  ): Promise<ApiResponse<AdminOrganization>> {
    return apiClient.put<AdminOrganization>(
      `/admin/organizations/${orgId}`,
      data,
    );
  }

  /**
   * Delete organization
   */
  async deleteOrganization(orgId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/admin/organizations/${orgId}`);
  }

  /**
   * Verify/Unverify organization
   */
  async verifyOrganization(
    orgId: number,
    verified: boolean,
  ): Promise<ApiResponse<AdminOrganization>> {
    return apiClient.put<AdminOrganization>(
      `/admin/organizations/${orgId}/verify`,
      { is_verified: verified },
    );
  }

  // ==========================================================================
  // WORKSPACE MANAGEMENT
  // ==========================================================================

  /**
   * Get paginated list of all workspaces
   */
  async getWorkspaces(
    params: AdminWorkspaceFilterParams = {},
  ): Promise<ApiResponse<AdminWorkspaceListResponse>> {
    const queryParams: Record<string, string | number> = {};
    if (params.page) queryParams.page = params.page;
    if (params.page_size) queryParams.page_size = params.page_size;
    if (params.org_id) queryParams.org_id = params.org_id;
    if (params.search) queryParams.search = params.search;
    if (params.is_active !== undefined)
      queryParams.is_active = params.is_active ? "true" : "false";
    if (params.is_archived !== undefined)
      queryParams.is_archived = params.is_archived ? "true" : "false";

    return apiClient.get<AdminWorkspaceListResponse>(
      "/admin/workspaces",
      queryParams,
    );
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(
    workspaceId: number,
  ): Promise<ApiResponse<AdminWorkspaceDetail>> {
    return apiClient.get<AdminWorkspaceDetail>(
      `/admin/workspaces/${workspaceId}`,
    );
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: number,
    data: Partial<AdminWorkspace>,
  ): Promise<ApiResponse<AdminWorkspace>> {
    return apiClient.put<AdminWorkspace>(
      `/admin/workspaces/${workspaceId}`,
      data,
    );
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/admin/workspaces/${workspaceId}`);
  }

  /**
   * Archive/Unarchive workspace
   */
  async archiveWorkspace(
    workspaceId: number,
    archived: boolean,
  ): Promise<ApiResponse<AdminWorkspace>> {
    return apiClient.put<AdminWorkspace>(
      `/admin/workspaces/${workspaceId}/archive`,
      { is_archived: archived },
    );
  }

  // ==========================================================================
  // TASK MANAGEMENT
  // ==========================================================================

  /**
   * Get paginated list of all tasks
   */
  async getTasks(
    params: AdminTaskFilterParams = {},
  ): Promise<ApiResponse<AdminTaskListResponse>> {
    const queryParams: Record<string, string | number> = {};
    if (params.page) queryParams.page = params.page;
    if (params.page_size) queryParams.page_size = params.page_size;
    if (params.user_id) queryParams.user_id = params.user_id;
    if (params.org_id) queryParams.org_id = params.org_id;
    if (params.workspace_id) queryParams.workspace_id = params.workspace_id;
    if (params.status) queryParams.status = params.status;
    if (params.is_manual !== undefined)
      queryParams.is_manual = params.is_manual ? "true" : "false";
    if (params.search) queryParams.search = params.search;

    return apiClient.get<AdminTaskListResponse>("/admin/tasks", queryParams);
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: number): Promise<ApiResponse<AdminTaskDetail>> {
    return apiClient.get<AdminTaskDetail>(`/admin/tasks/${taskId}`);
  }

  /**
   * Update task
   */
  async updateTask(
    taskId: number,
    data: Partial<AdminTask>,
  ): Promise<ApiResponse<AdminTask>> {
    return apiClient.put<AdminTask>(`/admin/tasks/${taskId}`, data);
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/admin/tasks/${taskId}`);
  }

  // ==========================================================================
  // TIME LOG MANAGEMENT
  // ==========================================================================

  /**
   * Get paginated list of all time logs
   */
  async getTimeLogs(
    params: AdminTimeLogFilterParams = {},
  ): Promise<ApiResponse<AdminTimeLogListResponse>> {
    const queryParams: Record<string, string | number> = {};
    if (params.page) queryParams.page = params.page;
    if (params.page_size) queryParams.page_size = params.page_size;
    if (params.user_id) queryParams.user_id = params.user_id;
    if (params.org_id) queryParams.org_id = params.org_id;
    if (params.workspace_id) queryParams.workspace_id = params.workspace_id;
    if (params.task_id) queryParams.task_id = params.task_id;
    if (params.status) queryParams.status = params.status;
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;
    if (params.is_approved !== undefined)
      queryParams.is_approved = params.is_approved ? "true" : "false";

    return apiClient.get<AdminTimeLogListResponse>(
      "/admin/timelogs",
      queryParams,
    );
  }

  /**
   * Get time log by ID
   */
  async getTimeLog(
    timeLogId: number,
  ): Promise<ApiResponse<AdminTimeLogDetail>> {
    return apiClient.get<AdminTimeLogDetail>(`/admin/timelogs/${timeLogId}`);
  }

  /**
   * Update time log
   */
  async updateTimeLog(
    timeLogId: number,
    data: Partial<AdminTimeLog>,
  ): Promise<ApiResponse<AdminTimeLog>> {
    return apiClient.put<AdminTimeLog>(`/admin/timelogs/${timeLogId}`, data);
  }

  /**
   * Delete time log
   */
  async deleteTimeLog(timeLogId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/admin/timelogs/${timeLogId}`);
  }

  /**
   * Approve/Reject time logs in bulk
   */
  async approveTimeLogs(
    ids: number[],
    approved: boolean,
  ): Promise<ApiResponse<{ approved_count: number }>> {
    return apiClient.post<{ approved_count: number }>(
      "/admin/timelogs/approve",
      { ids, is_approved: approved },
    );
  }

  // ==========================================================================
  // SCREENSHOT MANAGEMENT
  // ==========================================================================

  /**
   * Get paginated list of all screenshots
   */
  async getScreenshots(
    params: AdminScreenshotFilterParams = {},
  ): Promise<ApiResponse<AdminScreenshotListResponse>> {
    const queryParams: Record<string, string | number> = {};
    if (params.page) queryParams.page = params.page;
    if (params.page_size) queryParams.page_size = params.page_size;
    if (params.user_id) queryParams.user_id = params.user_id;
    if (params.org_id) queryParams.org_id = params.org_id;
    if (params.workspace_id) queryParams.workspace_id = params.workspace_id;
    if (params.task_id) queryParams.task_id = params.task_id;
    if (params.timelog_id) queryParams.timelog_id = params.timelog_id;
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;

    return apiClient.get<AdminScreenshotListResponse>(
      "/admin/screenshots",
      queryParams,
    );
  }

  /**
   * Get screenshot by ID
   */
  async getScreenshot(
    screenshotId: number,
  ): Promise<ApiResponse<AdminScreenshot>> {
    return apiClient.get<AdminScreenshot>(`/admin/screenshots/${screenshotId}`);
  }

  /**
   * Delete screenshot
   */
  async deleteScreenshot(screenshotId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/admin/screenshots/${screenshotId}`);
  }

  /**
   * Bulk delete screenshots
   */
  async bulkDeleteScreenshots(
    ids: number[],
  ): Promise<ApiResponse<{ deleted_count: number }>> {
    return apiClient.post<{ deleted_count: number }>(
      "/admin/screenshots/bulk-delete",
      { ids },
    );
  }

  // ==========================================================================
  // STATISTICS & REPORTS
  // ==========================================================================

  /**
   * Get system-wide overview statistics
   */
  async getOverviewStats(): Promise<ApiResponse<AdminOverviewStats>> {
    return apiClient.get<AdminOverviewStats>("/admin/stats/overview");
  }

  /**
   * Alias for getOverviewStats (backward compatibility)
   */
  async getSystemStats(): Promise<ApiResponse<AdminOverviewStats>> {
    return this.getOverviewStats();
  }

  /**
   * Get trend statistics over time
   */
  async getTrendStats(
    params: AdminTrendFilterParams = {},
  ): Promise<ApiResponse<AdminTrendStats>> {
    const queryParams: Record<string, string | number> = {};
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;
    if (params.period) queryParams.period = params.period;

    return apiClient.get<AdminTrendStats>("/admin/stats/trends", queryParams);
  }

  /**
   * Get user performance statistics
   */
  async getUserPerformance(
    limit = 10,
  ): Promise<ApiResponse<AdminUserPerformance[]>> {
    return apiClient.get<AdminUserPerformance[]>(
      "/admin/stats/user-performance",
      { limit },
    );
  }

  /**
   * Get user activities (alias for getUserPerformance with extended params)
   */
  async getUserActivities(
    params: {
      page?: number;
      page_size?: number;
      user_id?: number;
      start_date?: string;
      end_date?: string;
    } = {},
  ): Promise<
    ApiResponse<{ users: AdminUserPerformance[]; pagination: AdminPagination }>
  > {
    const queryParams: Record<string, string | number> = {};
    if (params.page) queryParams.page = params.page;
    if (params.page_size) queryParams.page_size = params.page_size;
    if (params.user_id) queryParams.user_id = params.user_id;
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;

    return apiClient.get<{
      users: AdminUserPerformance[];
      pagination: AdminPagination;
    }>("/admin/stats/user-activities", queryParams);
  }

  /**
   * Get organization distribution statistics
   */
  async getOrgDistribution(): Promise<ApiResponse<AdminOrgStats>> {
    return apiClient.get<AdminOrgStats>("/admin/stats/org-distribution");
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(): Promise<ApiResponse<AdminActivityStats>> {
    return apiClient.get<AdminActivityStats>("/admin/stats/activity");
  }

  /**
   * Export report data
   */
  async exportReport(params: {
    type: "users" | "tasks" | "timelogs" | "screenshots" | "organizations";
    format: "csv" | "json";
    start_date?: string;
    end_date?: string;
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.append("type", params.type);
    queryParams.append("format", params.format);
    if (params.start_date) queryParams.append("start_date", params.start_date);
    if (params.end_date) queryParams.append("end_date", params.end_date);

    const response = await fetch(
      `/api/v1/admin/export?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Export failed");
    }

    return response.blob();
  }

  // ==========================================================================
  // AUDIT LOGS
  // ==========================================================================

  /**
   * Get audit logs
   */
  async getAuditLogs(
    params: {
      page?: number;
      limit?: number;
      user_id?: number;
      action?: string;
      entity_type?: string;
      start_date?: string;
      end_date?: string;
    } = {},
  ): Promise<
    ApiResponse<{
      logs: Array<{
        id: number;
        user_id: number;
        action: string;
        entity_type: string;
        entity_id: number;
        ip_address: string;
        user_agent: string;
        details: string;
        status: string;
        created_at: string;
        user?: {
          id: number;
          email: string;
          first_name: string;
          last_name: string;
        };
      }>;
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>
  > {
    const queryParams: Record<string, string | number> = {};
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.user_id) queryParams.user_id = params.user_id;
    if (params.action) queryParams.action = params.action;
    if (params.entity_type) queryParams.entity_type = params.entity_type;
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;

    return apiClient.get("/admin/audit-logs", queryParams);
  }
}

// Export singleton instance
export const adminService = new AdminService();

// Export class for testing
export { AdminService };

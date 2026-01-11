/**
 * Workspace Service
 * Handles workspace-related API calls
 */

import { apiClient } from "./apiClient";
import type {
  AddWorkspaceMemberRequest,
  UpdateWorkspaceMemberRequest,
  UpdateWorkspaceRequest,
  Workspace,
  WorkspaceMember,
} from "./organizationService";

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface WorkspaceListItem {
  id: number;
  organization_id: number;
  organization_name: string;
  name: string;
  slug: string;
  description: string;
  role_id: number;
  role_name: string;
  is_admin: boolean;
  member_count: number;
  task_count: number;
  created_at: string;
}

export interface WorkspaceDetails extends Workspace {
  members?: WorkspaceMember[];
  organization_name?: string;
}

// ============================================================================
// WORKSPACE SERVICE
// ============================================================================

class WorkspaceService {
  // ===========================================================================
  // WORKSPACE CRUD
  // ===========================================================================

  /**
   * Get all workspaces for the current user
   */
  async getMyWorkspaces(): Promise<WorkspaceListItem[]> {
    const response = await apiClient.get<WorkspaceListItem[]>("/workspaces");
    return response.data || [];
  }

  /**
   * Get workspace by ID
   */
  async getById(workspaceId: number): Promise<WorkspaceDetails> {
    const response = await apiClient.get<WorkspaceDetails>(
      `/workspaces/${workspaceId}`
    );
    return response.data;
  }

  /**
   * Update workspace
   */
  async update(
    workspaceId: number,
    data: UpdateWorkspaceRequest
  ): Promise<Workspace> {
    const response = await apiClient.put<Workspace>(
      `/workspaces/${workspaceId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete workspace
   */
  async delete(workspaceId: number): Promise<void> {
    await apiClient.delete(`/workspaces/${workspaceId}`);
  }

  // ===========================================================================
  // WORKSPACE MEMBERS
  // ===========================================================================

  /**
   * Get workspace members
   */
  async getMembers(workspaceId: number): Promise<WorkspaceMember[]> {
    const response = await apiClient.get<WorkspaceMember[]>(
      `/workspaces/${workspaceId}/members`
    );
    return response.data || [];
  }

  /**
   * Add member to workspace
   */
  async addMember(
    workspaceId: number,
    data: AddWorkspaceMemberRequest
  ): Promise<WorkspaceMember> {
    const response = await apiClient.post<WorkspaceMember>(
      `/workspaces/${workspaceId}/members`,
      data
    );
    return response.data;
  }

  /**
   * Update workspace member
   */
  async updateMember(
    workspaceId: number,
    userId: number,
    data: UpdateWorkspaceMemberRequest
  ): Promise<WorkspaceMember> {
    const response = await apiClient.put<WorkspaceMember>(
      `/workspaces/${workspaceId}/members/${userId}`,
      data
    );
    return response.data;
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId: number, userId: number): Promise<void> {
    await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
  }
}

// Export singleton instance
export const workspaceService = new WorkspaceService();

// Export class for testing
export { WorkspaceService };

// Backward compatible alias
export const workspaceAPI = workspaceService;

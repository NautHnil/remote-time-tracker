/**
 * Organization Service for Electron
 * Handles organization-related API calls
 */

import { apiClient } from "./apiClient";

// ============================================================================
// TYPES
// ============================================================================

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  owner_id: number;
  owner?: User;
  invite_code: string;
  allow_invite_link: boolean;
  share_invite_code: boolean;
  max_members: number;
  is_active: boolean;
  member_count?: number;
  workspace_count?: number;
  members?: OrganizationMember[];
  workspaces?: Workspace[];
  created_at: string;
  updated_at: string;
}

export interface OrganizationListItem {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
  role: string;
  member_count: number;
  workspace_count: number;
  is_active: boolean;
  joined_at: string;
}

export interface OrganizationMember {
  id: number;
  user_id: number;
  organization_id: number;
  role: string;
  is_active: boolean;
  user?: User;
  joined_at: string;
  invited_by?: number;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

export interface Workspace {
  id: number;
  organization_id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  admin_id: number;
  admin?: User;
  is_active: boolean;
  is_billable: boolean;
  hourly_rate: number;
  start_date?: string;
  end_date?: string;
  member_count?: number;
  task_count?: number;
  members?: WorkspaceMember[];
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  workspace_role_id: number | null;
  workspace_role?: WorkspaceRole;
  role_name?: string;
  is_admin?: boolean;
  can_view_reports?: boolean;
  can_manage_tasks?: boolean;
  user?: User;
  is_active: boolean;
  joined_at: string;
  added_by?: number;
}

export interface WorkspaceRole {
  id: number;
  organization_id: number;
  name: string;
  display_name: string;
  description: string;
  color: string;
  permissions: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface WorkspaceListItem {
  id: number;
  organization_id: number;
  organization_name: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  workspace_role_id?: number;
  role_name: string;
  is_admin: boolean;
  member_count: number;
  task_count: number;
  is_active: boolean;
  joined_at: string;
}

export interface Invitation {
  id: number;
  organization_id: number;
  email: string;
  role: string;
  workspace_id?: number;
  workspace_role_id?: number;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
  invited_by?: User;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  logo_url?: string;
  allow_invite_link?: boolean;
  share_invite_code?: boolean;
  max_members?: number;
  is_active?: boolean;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  admin_id?: number;
  is_billable?: boolean;
  hourly_rate?: number;
  start_date?: string;
  end_date?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  admin_id?: number;
  is_active?: boolean;
  is_billable?: boolean;
  hourly_rate?: number;
  start_date?: string;
  end_date?: string;
}

export interface CreateWorkspaceRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  permissions?: string;
  is_default?: boolean;
  sort_order?: number;
}

export interface UpdateWorkspaceRoleRequest {
  display_name?: string;
  description?: string;
  color?: string;
  permissions?: string;
  is_default?: boolean;
  sort_order?: number;
}

export interface AddMemberRequest {
  user_id: number;
  role: string;
}

export interface UpdateMemberRequest {
  role: string;
  is_active?: boolean;
}

export interface AddWorkspaceMemberRequest {
  user_id: number;
  workspace_role_id?: number;
  role_name?: string;
  is_admin?: boolean;
  can_view_reports?: boolean;
  can_manage_tasks?: boolean;
}

export interface UpdateWorkspaceMemberRequest {
  workspace_role_id?: number;
  role_name?: string;
  is_admin?: boolean;
  can_view_reports?: boolean;
  can_manage_tasks?: boolean;
  is_active?: boolean;
}

export interface CreateInvitationRequest {
  email: string;
  role: string;
  workspace_id?: number;
  workspace_role_id?: number;
}

// ============================================================================
// ORGANIZATION SERVICE
// ============================================================================

class OrganizationService {
  /**
   * Get all organizations for the current user
   */
  async getMyOrganizations(): Promise<OrganizationListItem[]> {
    const response = await apiClient.get<OrganizationListItem[]>(
      "/organizations"
    );
    return response.data || [];
  }

  /**
   * Get organization by ID
   */
  async getById(orgId: number, withDetails?: boolean): Promise<Organization> {
    const url = withDetails
      ? `/organizations/${orgId}?details=true`
      : `/organizations/${orgId}`;
    console.log("[organizationService.getById] Calling:", url);
    const response = await apiClient.get<Organization>(url);
    console.log("[organizationService.getById] Response:", response);
    return response.data;
  }

  /**
   * Create a new organization
   */
  async create(data: CreateOrganizationRequest): Promise<Organization> {
    const response = await apiClient.post<Organization>("/organizations", data);
    return response.data;
  }

  /**
   * Update an organization
   */
  async update(
    orgId: number,
    data: UpdateOrganizationRequest
  ): Promise<Organization> {
    const response = await apiClient.put<Organization>(
      `/organizations/${orgId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete an organization
   */
  async delete(orgId: number): Promise<void> {
    await apiClient.delete(`/organizations/${orgId}`);
  }

  /**
   * Get organization members
   */
  async getMembers(orgId: number): Promise<OrganizationMember[]> {
    const response = await apiClient.get<OrganizationMember[]>(
      `/organizations/${orgId}/members`
    );
    return response.data || [];
  }

  /**
   * Add member to organization
   */
  async addMember(
    orgId: number,
    data: AddMemberRequest
  ): Promise<OrganizationMember> {
    const response = await apiClient.post<OrganizationMember>(
      `/organizations/${orgId}/members`,
      data
    );
    return response.data;
  }

  /**
   * Update organization member
   */
  async updateMember(
    orgId: number,
    userId: number,
    data: UpdateMemberRequest
  ): Promise<OrganizationMember> {
    const response = await apiClient.put<OrganizationMember>(
      `/organizations/${orgId}/members/${userId}`,
      data
    );
    return response.data;
  }

  /**
   * Remove member from organization
   */
  async removeMember(orgId: number, userId: number): Promise<void> {
    await apiClient.delete(`/organizations/${orgId}/members/${userId}`);
  }

  /**
   * Get organization workspaces
   */
  async getWorkspaces(orgId: number): Promise<Workspace[]> {
    const response = await apiClient.get<Workspace[]>(
      `/organizations/${orgId}/workspaces`
    );
    return response.data || [];
  }

  /**
   * Create workspace in organization
   */
  async createWorkspace(
    orgId: number,
    data: CreateWorkspaceRequest
  ): Promise<Workspace> {
    const response = await apiClient.post<Workspace>(
      `/organizations/${orgId}/workspaces`,
      data
    );
    return response.data;
  }

  /**
   * Get organization roles (workspace roles)
   */
  async getRoles(orgId: number): Promise<WorkspaceRole[]> {
    const response = await apiClient.get<WorkspaceRole[]>(
      `/organizations/${orgId}/roles`
    );
    return response.data || [];
  }

  /**
   * Create workspace role
   */
  async createRole(
    orgId: number,
    data: CreateWorkspaceRoleRequest
  ): Promise<WorkspaceRole> {
    const response = await apiClient.post<WorkspaceRole>(
      `/organizations/${orgId}/roles`,
      data
    );
    return response.data;
  }

  /**
   * Update workspace role
   */
  async updateRole(
    orgId: number,
    roleId: number,
    data: UpdateWorkspaceRoleRequest
  ): Promise<WorkspaceRole> {
    const response = await apiClient.put<WorkspaceRole>(
      `/organizations/${orgId}/roles/${roleId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete workspace role
   */
  async deleteRole(orgId: number, roleId: number): Promise<void> {
    await apiClient.delete(`/organizations/${orgId}/roles/${roleId}`);
  }

  /**
   * Get organization invitations
   */
  async getInvitations(orgId: number): Promise<Invitation[]> {
    const response = await apiClient.get<Invitation[]>(
      `/organizations/${orgId}/invitations`
    );
    return response.data || [];
  }

  /**
   * Create invitation
   */
  async createInvitation(
    orgId: number,
    data: CreateInvitationRequest
  ): Promise<Invitation> {
    const response = await apiClient.post<Invitation>(
      `/organizations/${orgId}/invitations`,
      data
    );
    return response.data;
  }

  /**
   * Revoke invitation
   */
  async revokeInvitation(orgId: number, invitationId: number): Promise<void> {
    await apiClient.delete(
      `/organizations/${orgId}/invitations/${invitationId}`
    );
  }

  /**
   * Regenerate invite code
   */
  async regenerateInviteCode(orgId: number): Promise<{ invite_code: string }> {
    const response = await apiClient.post<{ invite_code: string }>(
      `/organizations/${orgId}/regenerate-invite-code`
    );
    return response.data;
  }

  /**
   * Get organization by invite code
   */
  async getByInviteCode(inviteCode: string): Promise<Organization> {
    const response = await apiClient.get<Organization>(
      `/organizations/join/${inviteCode}`
    );
    return response.data;
  }

  /**
   * Join organization by invite code
   */
  async joinByInviteCode(inviteCode: string): Promise<OrganizationMember> {
    const response = await apiClient.post<OrganizationMember>(
      `/organizations/join/${inviteCode}`
    );
    return response.data;
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(
    orgId: number,
    newOwnerId: number
  ): Promise<Organization> {
    const response = await apiClient.post<Organization>(
      `/organizations/${orgId}/transfer-ownership`,
      { new_owner_id: newOwnerId }
    );
    return response.data;
  }
}

// ============================================================================
// WORKSPACE SERVICE
// ============================================================================

class WorkspaceService {
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
  async getById(
    workspaceId: number,
    withMembers?: boolean
  ): Promise<Workspace> {
    const url = withMembers
      ? `/workspaces/${workspaceId}?members=true`
      : `/workspaces/${workspaceId}`;
    const response = await apiClient.get<Workspace>(url);
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

// Export singleton instances
export const organizationService = new OrganizationService();
export const workspaceService = new WorkspaceService();

// Export classes for testing
export { OrganizationService, WorkspaceService };

// Backward compatible aliases
export const organizationAPI = organizationService;
export const workspaceAPI = workspaceService;

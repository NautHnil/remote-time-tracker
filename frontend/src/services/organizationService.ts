/**
 * Organization Service
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
  is_active: boolean;
  member_count?: number;
  workspace_count?: number;
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
  is_owner: boolean;
  created_at: string;
}

export interface OrganizationMember {
  id: number;
  user_id: number;
  organization_id: number;
  role: string;
  is_active: boolean;
  user?: User;
  joined_at: string;
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
  admin_id: number;
  admin?: User;
  is_active: boolean;
  member_count?: number;
  task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  role_id: number;
  role?: WorkspaceRole;
  user?: User;
  is_active: boolean;
  joined_at: string;
}

export interface WorkspaceRole {
  id: number;
  organization_id: number;
  name: string;
  description: string;
}

export interface Invitation {
  id: number;
  organization_id: number;
  workspace_id?: number;
  email: string;
  role_id?: number;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  invited_by: number;
  inviter?: User;
  expires_at: string;
  created_at: string;
  organization?: Organization;
  workspace?: Workspace;
  workspace_role?: WorkspaceRole;
}

export interface OrganizationPublicInfo {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
  member_count: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  logo_url?: string;
  allow_invite_link?: boolean;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  logo_url?: string;
  allow_invite_link?: boolean;
}

export interface AddOrganizationMemberRequest {
  user_id: number;
  role: "admin" | "member";
}

export interface UpdateOrganizationMemberRequest {
  role: "admin" | "member";
  is_active?: boolean;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  admin_id?: number;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  admin_id?: number;
  is_active?: boolean;
}

export interface AddWorkspaceMemberRequest {
  user_id: number;
  role_id: number;
}

export interface UpdateWorkspaceMemberRequest {
  role_id?: number;
  is_active?: boolean;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

export interface CreateInvitationRequest {
  email: string;
  workspace_id?: number;
  role_id?: number;
}

export interface TransferOwnershipRequest {
  new_owner_id: number;
}

// ============================================================================
// ORGANIZATION SERVICE
// ============================================================================

class OrganizationService {
  // ===========================================================================
  // ORGANIZATION CRUD
  // ===========================================================================

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
   * Create a new organization
   */
  async create(data: CreateOrganizationRequest): Promise<Organization> {
    const response = await apiClient.post<Organization>("/organizations", data);
    return response.data;
  }

  /**
   * Get organization by ID
   */
  async getById(orgId: number): Promise<Organization> {
    const response = await apiClient.get<Organization>(
      `/organizations/${orgId}`
    );
    return response.data;
  }

  /**
   * Update organization
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
   * Delete organization
   */
  async delete(orgId: number): Promise<void> {
    await apiClient.delete(`/organizations/${orgId}`);
  }

  // ===========================================================================
  // ORGANIZATION MEMBERS
  // ===========================================================================

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
    data: AddOrganizationMemberRequest
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
    data: UpdateOrganizationMemberRequest
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

  // ===========================================================================
  // ORGANIZATION ROLES
  // ===========================================================================

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
   * Create a new role
   */
  async createRole(
    orgId: number,
    data: CreateRoleRequest
  ): Promise<WorkspaceRole> {
    const response = await apiClient.post<WorkspaceRole>(
      `/organizations/${orgId}/roles`,
      data
    );
    return response.data;
  }

  /**
   * Update role
   */
  async updateRole(
    orgId: number,
    roleId: number,
    data: UpdateRoleRequest
  ): Promise<WorkspaceRole> {
    const response = await apiClient.put<WorkspaceRole>(
      `/organizations/${orgId}/roles/${roleId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete role
   */
  async deleteRole(orgId: number, roleId: number): Promise<void> {
    await apiClient.delete(`/organizations/${orgId}/roles/${roleId}`);
  }

  // ===========================================================================
  // ORGANIZATION WORKSPACES
  // ===========================================================================

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

  // ===========================================================================
  // ORGANIZATION INVITATIONS
  // ===========================================================================

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

  // ===========================================================================
  // INVITE CODE / JOIN
  // ===========================================================================

  /**
   * Get organization by invite code (public info)
   */
  async getByInviteCode(inviteCode: string): Promise<OrganizationPublicInfo> {
    const response = await apiClient.get<OrganizationPublicInfo>(
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
   * Regenerate invite code
   */
  async regenerateInviteCode(orgId: number): Promise<string> {
    const response = await apiClient.post<{ invite_code: string }>(
      `/organizations/${orgId}/regenerate-invite-code`
    );
    return response.data.invite_code;
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(
    orgId: number,
    data: TransferOwnershipRequest
  ): Promise<void> {
    await apiClient.post(`/organizations/${orgId}/transfer-ownership`, data);
  }
}

// Export singleton instance
export const organizationService = new OrganizationService();

// Export class for testing
export { OrganizationService };

// Backward compatible alias
export const organizationAPI = organizationService;

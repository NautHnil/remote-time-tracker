/**
 * Services Index
 * Central export point for all API services
 */

// Export API client
export { apiClient } from "./apiClient";
export type { ApiResponse } from "./apiClient";

// Export configuration
export { API_BASE_URL, API_ENDPOINTS } from "./config";

// Export services
export { authService } from "./authService";
export { commonService } from "./commonService";
export { invitationService } from "./invitationService";
export { organizationService } from "./organizationService";
export { screenshotService } from "./screenshotService";
export { syncService } from "./syncService";
export { taskService } from "./taskService";
export { timeLogService } from "./timeLogService";
export { workspaceService } from "./workspaceService";

// Export types from organization service
export type {
  AddOrganizationMemberRequest,
  AddWorkspaceMemberRequest,
  CreateInvitationRequest,
  CreateOrganizationRequest,
  CreateRoleRequest,
  CreateWorkspaceRequest,
  Invitation,
  Organization,
  OrganizationListItem,
  OrganizationMember,
  OrganizationPublicInfo,
  UpdateOrganizationMemberRequest,
  UpdateOrganizationRequest,
  UpdateRoleRequest,
  UpdateWorkspaceMemberRequest,
  UpdateWorkspaceRequest,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from "./organizationService";

export type { WorkspaceDetails, WorkspaceListItem } from "./workspaceService";

export type {
  AcceptInvitationRequest,
  InvitationDetails,
} from "./invitationService";

// Backward compatibility aliases
export { authService as authAPI } from "./authService";
export { commonService as commonAPI } from "./commonService";
export { invitationService as invitationAPI } from "./invitationService";
export { organizationService as organizationAPI } from "./organizationService";
export { screenshotService as screenshotAPI } from "./screenshotService";
export { syncService as syncAPI } from "./syncService";
export { taskService as taskAPI } from "./taskService";
export { timeLogService as timeLogAPI } from "./timeLogService";
export { workspaceService as workspaceAPI } from "./workspaceService";

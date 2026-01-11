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
export { organizationService, workspaceService } from "./organizationService";
export { screenshotService } from "./screenshotService";
export { syncService } from "./syncService";
export { taskService } from "./taskService";
export { timeLogService } from "./timeLogService";

// Export types from organization service
export type {
  AddMemberRequest,
  AddWorkspaceMemberRequest,
  CreateInvitationRequest,
  CreateOrganizationRequest,
  CreateWorkspaceRequest,
  CreateWorkspaceRoleRequest,
  Invitation,
  Organization,
  OrganizationListItem,
  OrganizationMember,
  UpdateMemberRequest,
  UpdateOrganizationRequest,
  UpdateWorkspaceMemberRequest,
  UpdateWorkspaceRequest,
  UpdateWorkspaceRoleRequest,
  Workspace,
  WorkspaceListItem,
  WorkspaceMember,
  WorkspaceRole,
} from "./organizationService";

// Backward compatibility aliases
export { authService as authAPI } from "./authService";
export { commonService as commonAPI } from "./commonService";
export {
  organizationService as organizationAPI,
  workspaceService as workspaceAPI,
} from "./organizationService";
export { screenshotService as screenshotAPI } from "./screenshotService";
export { syncService as syncAPI } from "./syncService";
export { taskService as taskAPI } from "./taskService";
export { timeLogService as timeLogAPI } from "./timeLogService";

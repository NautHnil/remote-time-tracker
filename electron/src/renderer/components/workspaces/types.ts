/**
 * Workspace Component Types
 */

export type WorkspaceTabView = "overview" | "members" | "settings";

export interface WorkspaceTabDefinition {
  id: WorkspaceTabView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: boolean;
}

export interface WorkspacePermissions {
  isAdmin: boolean;
  isMember: boolean;
}

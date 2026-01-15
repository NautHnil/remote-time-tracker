/**
 * Organizations Component Types
 */

export type OrgTabView =
  | "overview"
  | "members"
  | "workspaces"
  | "roles"
  | "invitations"
  | "settings";

export interface OrgTabDefinition {
  id: OrgTabView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: boolean;
}

export interface OrgPermissions {
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
}

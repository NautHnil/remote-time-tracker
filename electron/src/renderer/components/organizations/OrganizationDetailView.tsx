import {
  Invitation,
  Organization,
  OrganizationMember,
  Workspace,
  WorkspaceRole,
} from "../../services";
import { Icons } from "../Icons";
import RoleBadge from "./RoleBadge";
import {
  InvitationsTab,
  MembersTab,
  OverviewTab,
  RolesTab,
  SettingsTab,
  WorkspacesTab,
} from "./tabs";
import { OrgTabView } from "./types";

interface OrgPermissions {
  canViewWorkspaces: boolean;
  canCreateWorkspace: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canManageInvitations: boolean;
  canManageSettings: boolean;
  canDeleteOrg: boolean;
}

interface OrganizationDetailViewProps {
  org: Organization;
  members: OrganizationMember[];
  workspaces: Workspace[];
  roles: WorkspaceRole[];
  invitations: Invitation[];
  activeTab: OrgTabView;
  currentUserId: number | undefined;
  permissions: OrgPermissions;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onSetActiveTab: (tab: OrgTabView) => void;
  onRefresh: () => void;
  onCopyInviteCode: () => void;
  onRegenerateInviteCode: () => void;
}

export function OrganizationDetailView({
  org,
  members,
  workspaces,
  roles,
  invitations,
  activeTab,
  currentUserId,
  permissions,
  loading,
  error,
  onBack,
  onSetActiveTab,
  onRefresh,
  onCopyInviteCode,
  onRegenerateInviteCode,
}: OrganizationDetailViewProps) {
  const {
    canViewWorkspaces,
    canCreateWorkspace,
    canManageMembers,
    canManageRoles,
    canManageInvitations,
    canManageSettings,
    canDeleteOrg,
  } = permissions;

  // Define tabs with permission requirements
  const allTabs = [
    { id: "overview" as const, label: "Overview", icon: Icons.Info },
    { id: "members" as const, label: "Members", icon: Icons.Users },
    {
      id: "workspaces" as const,
      label: "Workspaces",
      icon: Icons.Folder,
      requiredPermission: canViewWorkspaces,
    },
    {
      id: "roles" as const,
      label: "Roles",
      icon: Icons.Badge,
      requiredPermission: canManageRoles,
    },
    {
      id: "invitations" as const,
      label: "Invitations",
      icon: Icons.Mail,
      requiredPermission: canManageInvitations,
    },
    {
      id: "settings" as const,
      label: "Settings",
      icon: Icons.Settings,
      requiredPermission: canManageSettings,
    },
  ];

  // Filter tabs based on permissions
  const tabs = allTabs.filter(
    (tab) => tab.requiredPermission === undefined || tab.requiredPermission
  );

  // Get current user's role in this organization
  const currentUserRole =
    members.find((m) => m.user_id === currentUserId)?.role || "member";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn btn-ghost p-2">
          <Icons.ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
          {org.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-50">
            {org.name}
          </h2>
          <p className="text-gray-500 dark:text-dark-400">@{org.slug}</p>
        </div>
        <RoleBadge role={currentUserRole} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-dark-800 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSetActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary-500/20 text-primary-400"
                : "text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-800/50"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error in Detail View */}
      {error && (
        <div className="glass-error p-4 rounded-xl flex items-center gap-3">
          <Icons.Warning className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Loading in Detail View */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Tab Content */}
      {!loading && (
        <div className="animate-fade-in">
          {activeTab === "overview" && (
            <OverviewTab
              org={org}
              members={members}
              workspaces={workspaces}
              onCopyInviteCode={onCopyInviteCode}
            />
          )}
          {activeTab === "members" && (
            <MembersTab
              orgId={org.id}
              members={members}
              onRefresh={onRefresh}
              canManage={canManageMembers}
            />
          )}
          {activeTab === "workspaces" && canViewWorkspaces && (
            <WorkspacesTab
              orgId={org.id}
              workspaces={workspaces}
              roles={roles}
              onRefresh={onRefresh}
              canCreate={canCreateWorkspace}
            />
          )}
          {activeTab === "roles" && canManageRoles && (
            <RolesTab
              orgId={org.id}
              roles={roles}
              onRefresh={onRefresh}
              canManage={canManageRoles}
            />
          )}
          {activeTab === "invitations" && canManageInvitations && (
            <InvitationsTab
              orgId={org.id}
              invitations={invitations}
              onRefresh={onRefresh}
              canManage={canManageInvitations}
            />
          )}
          {activeTab === "settings" && canManageSettings && (
            <SettingsTab
              org={org}
              onUpdate={onRefresh}
              onRegenerateInviteCode={onRegenerateInviteCode}
              canDelete={canDeleteOrg}
            />
          )}
        </div>
      )}
    </div>
  );
}

import { Workspace, WorkspaceMember, WorkspaceRole } from "../../services";
import { Icons } from "../Icons";
import { MembersTab, OverviewTab, SettingsTab } from "./tabs";
import { WorkspaceTabView } from "./types";

interface WorkspacePermissions {
  canManageSettings: boolean;
  canManageMembers: boolean;
}

interface WorkspaceDetailViewProps {
  workspace: Workspace;
  members: WorkspaceMember[];
  roles: WorkspaceRole[];
  activeTab: WorkspaceTabView;
  permissions: WorkspacePermissions;
  onBack: () => void;
  onSetActiveTab: (tab: WorkspaceTabView) => void;
  onRefresh: () => void;
}

export function WorkspaceDetailView({
  workspace,
  members,
  roles,
  activeTab,
  permissions,
  onBack,
  onSetActiveTab,
  onRefresh,
}: WorkspaceDetailViewProps) {
  const { canManageSettings, canManageMembers } = permissions;

  // Define tabs with permission requirements
  const allTabs = [
    { id: "overview" as const, label: "Overview", icon: Icons.Info },
    { id: "members" as const, label: "Members", icon: Icons.Users },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn btn-ghost p-2">
          <Icons.ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl"
          style={{ backgroundColor: workspace.color || "#6366f1" }}
        >
          {workspace.icon || <Icons.Folder className="w-7 h-7" />}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-50">
            {workspace.name}
          </h2>
          <p className="text-gray-500 dark:text-dark-400">@{workspace.slug}</p>
        </div>
        <span
          className={`px-3 py-1 text-sm rounded-full ${
            workspace.is_active
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {workspace.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-dark-800 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSetActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
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

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "overview" && (
          <OverviewTab workspace={workspace} members={members} />
        )}
        {activeTab === "members" && (
          <MembersTab
            workspaceId={workspace.id}
            organizationId={workspace.organization_id}
            members={members}
            roles={roles}
            canManage={canManageMembers}
            onRefresh={onRefresh}
          />
        )}
        {activeTab === "settings" && canManageSettings && (
          <SettingsTab workspace={workspace} onUpdate={onRefresh} />
        )}
      </div>
    </div>
  );
}

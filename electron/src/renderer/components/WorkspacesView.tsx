/**
 * Workspaces View Component
 * Full UI for managing workspaces - list, detail, members, settings
 */

import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  organizationService,
  workspaceService,
  type OrganizationListItem,
  type UpdateWorkspaceRequest,
  type Workspace,
  type WorkspaceListItem,
  type WorkspaceMember,
  type WorkspaceRole,
} from "../services";
import { Icons } from "./Icons";

// ============================================================================
// TYPES
// ============================================================================

type TabView = "overview" | "members" | "settings";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorkspacesView() {
  const { user, permissions, isWorkspaceAdmin, refreshUserContext } = useAuth();

  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    []
  );
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("overview");
  const [filterOrgId, setFilterOrgId] = useState<number | null>(null);

  // Sub-data for selected workspace
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);

  // Calculate permissions for selected workspace
  const selectedWsPermissions = selectedWorkspace
    ? {
        isAdmin:
          isWorkspaceAdmin(selectedWorkspace.id) ||
          selectedWorkspace.admin_id === user?.id,
        isMember:
          selectedWorkspace.members?.some((m) => m.user_id === user?.id) ||
          false,
      }
    : { isAdmin: false, isMember: false };

  // Derived permissions
  const canManageSettings =
    permissions.isSystemAdmin || selectedWsPermissions.isAdmin;
  const canManageMembers =
    permissions.isSystemAdmin || selectedWsPermissions.isAdmin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [wsData, orgsData] = await Promise.all([
        workspaceService.getMyWorkspaces(),
        organizationService.getMyOrganizations(),
      ]);
      setWorkspaces(wsData);
      setOrganizations(orgsData);
    } catch (err: any) {
      console.error("Failed to load workspaces:", err);
      setError(err.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectWorkspace = useCallback(async (workspaceId: number) => {
    try {
      setLoading(true);
      const ws = await workspaceService.getById(workspaceId, true);
      setSelectedWorkspace(ws);
      setActiveTab("overview");

      // Load members and roles
      const [membersData, rolesData] = await Promise.all([
        workspaceService.getMembers(workspaceId),
        organizationService.getRoles(ws.organization_id),
      ]);
      setMembers(membersData);
      setRoles(rolesData);
    } catch (err: any) {
      console.error("Failed to load workspace:", err);
      setError(err.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedWorkspace(null);
    setActiveTab("overview");
    loadData();
    refreshUserContext(); // Refresh user context
  }, [loadData, refreshUserContext]);

  // Filter workspaces by organization
  const filteredWorkspaces = filterOrgId
    ? workspaces.filter((ws) => ws.organization_id === filterOrgId)
    : workspaces;

  // Group workspaces by organization for display
  const groupedWorkspaces = filteredWorkspaces.reduce((acc, ws) => {
    const orgName = ws.organization_name || "Unknown";
    if (!acc[orgName]) {
      acc[orgName] = [];
    }
    acc[orgName].push(ws);
    return acc;
  }, {} as Record<string, WorkspaceListItem[]>);

  // ============================================================================
  // WORKSPACE LIST VIEW
  // ============================================================================

  if (!selectedWorkspace) {
    // Calculate stats
    const totalWorkspaces = filteredWorkspaces.length;
    const activeWorkspaces = filteredWorkspaces.filter(
      (ws) => ws.is_active !== false
    ).length;
    const adminWorkspaces = filteredWorkspaces.filter(
      (ws) => ws.is_admin
    ).length;
    const totalTasks = filteredWorkspaces.reduce(
      (sum, ws) => sum + (ws.task_count || 0),
      0
    );

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-dark-50">My Workspaces</h2>
            <p className="text-sm text-dark-400">
              View and manage your project workspaces
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterOrgId || ""}
              onChange={(e) =>
                setFilterOrgId(e.target.value ? parseInt(e.target.value) : null)
              }
              className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-200"
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <button
              onClick={loadData}
              className="btn btn-ghost p-2"
              title="Refresh"
            >
              <Icons.Refresh className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && workspaces.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <Icons.Workspace className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-dark-50">
                    {totalWorkspaces}
                  </div>
                  <div className="text-xs text-dark-400">Total Workspaces</div>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Icons.Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-dark-50">
                    {activeWorkspaces}
                  </div>
                  <div className="text-xs text-dark-400">Active</div>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Icons.Badge className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-dark-50">
                    {adminWorkspaces}
                  </div>
                  <div className="text-xs text-dark-400">Admin Role</div>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center">
                  <Icons.Task className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-dark-50">
                    {totalTasks}
                  </div>
                  <div className="text-xs text-dark-400">Total Tasks</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-error p-4 rounded-xl flex items-center gap-3">
            <Icons.Warning className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && workspaces.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <Icons.Workspace className="w-16 h-16 text-dark-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-200 mb-2">
              No Workspaces
            </h3>
            <p className="text-dark-400">
              You are not a member of any workspaces yet.
            </p>
            <p className="text-dark-500 text-sm mt-2">
              Ask your organization admin to add you to a workspace.
            </p>
          </div>
        )}

        {/* Workspace List - Grouped by Organization */}
        {!loading && Object.keys(groupedWorkspaces).length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedWorkspaces).map(
              ([orgName, orgWorkspaces]) => (
                <div key={orgName}>
                  <div className="flex items-center gap-2 mb-4">
                    <Icons.Organization className="w-4 h-4 text-dark-400" />
                    <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wide">
                      {orgName}
                    </h3>
                    <span className="text-xs text-dark-500">
                      ({orgWorkspaces.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orgWorkspaces.map((ws) => (
                      <WorkspaceCard
                        key={ws.id}
                        workspace={ws}
                        onClick={() => handleSelectWorkspace(ws.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // WORKSPACE DETAIL VIEW
  // ============================================================================

  // Define tabs with permission requirements
  const allTabs: {
    id: TabView;
    label: string;
    icon: any;
    requiredPermission?: boolean;
  }[] = [
    { id: "overview", label: "Overview", icon: Icons.Info },
    { id: "members", label: "Members", icon: Icons.Users },
    {
      id: "settings",
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
        <button onClick={handleBack} className="btn btn-ghost p-2">
          <Icons.ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl"
          style={{ backgroundColor: selectedWorkspace.color || "#6366f1" }}
        >
          {selectedWorkspace.icon || <Icons.Folder className="w-7 h-7" />}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-dark-50">
            {selectedWorkspace.name}
          </h2>
          <p className="text-dark-400">@{selectedWorkspace.slug}</p>
        </div>
        <span
          className={`px-3 py-1 text-sm rounded-full ${
            selectedWorkspace.is_active
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {selectedWorkspace.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-800 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-primary-500/20 text-primary-400"
                : "text-dark-400 hover:text-dark-200 hover:bg-dark-800/50"
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
          <WorkspaceOverviewTab
            workspace={selectedWorkspace}
            members={members}
          />
        )}
        {activeTab === "members" && (
          <WorkspaceMembersTab
            workspaceId={selectedWorkspace.id}
            organizationId={selectedWorkspace.organization_id}
            members={members}
            roles={roles}
            canManage={canManageMembers}
            onRefresh={() => handleSelectWorkspace(selectedWorkspace.id)}
          />
        )}
        {activeTab === "settings" && canManageSettings && (
          <WorkspaceSettingsTab
            workspace={selectedWorkspace}
            onUpdate={() => handleSelectWorkspace(selectedWorkspace.id)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB COMPONENTS
// ============================================================================

function WorkspaceCard({
  workspace,
  onClick,
}: {
  workspace: WorkspaceListItem;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="glass rounded-xl p-5 cursor-pointer hover:bg-dark-800/50 transition-colors group"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl"
          style={{ backgroundColor: workspace.color || "#6366f1" }}
        >
          {workspace.icon || <Icons.Folder className="w-6 h-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-dark-100 truncate group-hover:text-primary-400 transition-colors">
            {workspace.name}
          </h4>
          <p className="text-sm text-dark-400">@{workspace.slug}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-dark-500">
            <span className="flex items-center gap-1">
              <Icons.Users className="w-3 h-3" />
              {workspace.member_count} members
            </span>
            <span className="flex items-center gap-1">
              <Icons.Task className="w-3 h-3" />
              {workspace.task_count} tasks
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {workspace.is_admin && (
            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
              Admin
            </span>
          )}
          {(workspace.role_name || !workspace.is_admin) && (
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
              {workspace.role_name || "Member"}
            </span>
          )}
        </div>
      </div>
      {workspace.description && (
        <p className="mt-3 text-sm text-dark-400 line-clamp-2">
          {workspace.description}
        </p>
      )}
    </div>
  );
}

function WorkspaceOverviewTab({
  workspace,
  members,
}: {
  workspace: Workspace;
  members: WorkspaceMember[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {members.length}
            </div>
            <div className="text-sm text-dark-400">Members</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {workspace.task_count || 0}
            </div>
            <div className="text-sm text-dark-400">Tasks</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {workspace.is_billable ? `$${workspace.hourly_rate}/hr` : "N/A"}
            </div>
            <div className="text-sm text-dark-400">Rate</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <span
              className={`text-2xl ${
                workspace.is_active ? "text-green-400" : "text-red-400"
              }`}
            >
              {workspace.is_active ? "●" : "○"}
            </span>
            <div className="text-sm text-dark-400">Status</div>
          </div>
        </div>

        {/* Description */}
        {workspace.description && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-dark-200 mb-2">Description</h4>
            <p className="text-dark-400">{workspace.description}</p>
          </div>
        )}

        {/* Team Members */}
        <div className="glass rounded-xl p-5">
          <h4 className="font-medium text-dark-200 mb-3">Team Members</h4>
          <div className="space-y-2">
            {members.slice(0, 6).map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800/50"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {member.user?.email?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-dark-200 truncate">
                    {member.user?.first_name} {member.user?.last_name}
                  </div>
                  <div className="text-xs text-dark-500 truncate">
                    {member.user?.email}
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 text-xs rounded-full"
                  style={{
                    backgroundColor: `${
                      member.workspace_role?.color || "#6366f1"
                    }20`,
                    color: member.workspace_role?.color || "#6366f1",
                  }}
                >
                  {member.workspace_role?.display_name ||
                    member.workspace_role?.name ||
                    member.role_name ||
                    "Member"}
                </span>
              </div>
            ))}
            {members.length > 6 && (
              <div className="text-center text-sm text-dark-500 py-2">
                +{members.length - 6} more members
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Info */}
        <div className="glass rounded-xl p-5 space-y-3">
          <h4 className="font-medium text-dark-200 mb-3">Details</h4>

          <div className="flex items-center justify-between text-sm">
            <span className="text-dark-400">Billable</span>
            <span
              className={
                workspace.is_billable ? "text-green-400" : "text-dark-500"
              }
            >
              {workspace.is_billable ? "Yes" : "No"}
            </span>
          </div>

          {workspace.is_billable && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-400">Hourly Rate</span>
              <span className="text-dark-200">${workspace.hourly_rate}/hr</span>
            </div>
          )}

          {workspace.start_date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-400">Start Date</span>
              <span className="text-dark-200">
                {format(new Date(workspace.start_date), "MMM d, yyyy")}
              </span>
            </div>
          )}

          {workspace.end_date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-400">End Date</span>
              <span className="text-dark-200">
                {format(new Date(workspace.end_date), "MMM d, yyyy")}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-dark-400">Created</span>
            <span className="text-dark-200">
              {format(new Date(workspace.created_at), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {/* Admin */}
        {workspace.admin && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-dark-200 mb-3">Workspace Admin</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-medium">
                {workspace.admin.email?.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <div className="text-sm font-medium text-dark-200">
                  {workspace.admin.first_name} {workspace.admin.last_name}
                </div>
                <div className="text-xs text-dark-400">
                  {workspace.admin.email}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceMembersTab({
  workspaceId,
  organizationId,
  members,
  roles,
  canManage = false,
  onRefresh,
}: {
  workspaceId: number;
  organizationId: number;
  members: WorkspaceMember[];
  roles: WorkspaceRole[];
  canManage?: boolean;
  onRefresh: () => void;
}) {
  const [updating, setUpdating] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);

  const handleUpdateRole = async (userId: number, newRoleId: number) => {
    if (!canManage) return;
    console.log(
      "[WorkspaceMembersTab] Updating role for user:",
      userId,
      "to roleId:",
      newRoleId
    );
    try {
      setUpdating(userId);
      const result = await workspaceService.updateMember(workspaceId, userId, {
        workspace_role_id: newRoleId,
      });
      console.log("[WorkspaceMembersTab] Update result:", result);
      onRefresh();
    } catch (err: any) {
      console.error("[WorkspaceMembersTab] Update failed:", err);
      alert(err.message || "Failed to update member");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!canManage) return;
    if (!confirm("Remove this member from the workspace?")) return;
    try {
      setUpdating(userId);
      await workspaceService.removeMember(workspaceId, userId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    } finally {
      setUpdating(null);
    }
  };

  const handleLoadOrgMembers = async () => {
    try {
      const data = await organizationService.getMembers(organizationId);
      // Filter out members already in workspace
      const existingIds = new Set(members.map((m) => m.user_id));
      setOrgMembers(data.filter((m) => !existingIds.has(m.user_id)));
    } catch (err: any) {
      console.error("Failed to load org members:", err);
    }
  };

  const handleAddMember = async (userId: number, roleId: number) => {
    if (!canManage) return;
    try {
      await workspaceService.addMember(workspaceId, {
        user_id: userId,
        workspace_role_id: roleId,
      });
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to add member");
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              handleLoadOrgMembers();
              setShowAddModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Icons.UserPlus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-dark-800">
          <h3 className="font-medium text-dark-200">
            Members ({members.length})
          </h3>
        </div>
        <div className="divide-y divide-dark-800">
          {members.map((member) => (
            <div
              key={member.id}
              className="p-4 flex items-center gap-4 hover:bg-dark-800/30"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white font-medium">
                {member.user?.email?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-dark-100 truncate">
                  {member.user?.first_name} {member.user?.last_name}
                </div>
                <div className="text-sm text-dark-400 truncate">
                  {member.user?.email}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage ? (
                  <select
                    value={member.workspace_role_id || ""}
                    onChange={(e) =>
                      handleUpdateRole(member.user_id, parseInt(e.target.value))
                    }
                    disabled={updating === member.user_id}
                    className="bg-dark-800 border border-dark-700 rounded-lg px-2 py-1 text-sm text-dark-200"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name || role.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="px-2 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: `${
                        member.workspace_role?.color || "#6366f1"
                      }20`,
                      color: member.workspace_role?.color || "#6366f1",
                    }}
                  >
                    {member.workspace_role?.display_name ||
                      member.workspace_role?.name ||
                      member.role_name ||
                      "Member"}
                  </span>
                )}
                {canManage && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={updating === member.user_id}
                    className="btn btn-ghost p-2 text-red-400 hover:bg-red-500/20"
                  >
                    <Icons.UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <AddWorkspaceMemberModal
          orgMembers={orgMembers}
          roles={roles}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddMember}
        />
      )}
    </div>
  );
}

function WorkspaceSettingsTab({
  workspace,
  onUpdate,
}: {
  workspace: Workspace;
  onUpdate: () => void;
}) {
  const [form, setForm] = useState<UpdateWorkspaceRequest>({
    name: workspace.name,
    description: workspace.description || "",
    color: workspace.color || "#6366f1",
    icon: workspace.icon || "📁",
    is_billable: workspace.is_billable,
    hourly_rate: workspace.hourly_rate,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await workspaceService.update(workspace.id, form);
      onUpdate();
      alert("Settings saved successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-dark-200">General Settings</h3>

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">
            Workspace Name
          </label>
          <input
            type="text"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">
            Description
          </label>
          <textarea
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Color
            </label>
            <input
              type="color"
              value={form.color || "#6366f1"}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full h-10 bg-dark-800 border border-dark-700 rounded-lg cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Icon
            </label>
            <input
              type="text"
              value={form.icon || ""}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100 text-center text-xl"
              maxLength={2}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary w-full"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-dark-200">Billing Settings</h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-dark-200">Billable Project</div>
            <div className="text-sm text-dark-400">
              Track billable hours for this workspace
            </div>
          </div>
          <button
            onClick={() => setForm({ ...form, is_billable: !form.is_billable })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_billable ? "bg-primary-500" : "bg-dark-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.is_billable ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {form.is_billable && (
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Hourly Rate ($)
            </label>
            <input
              type="number"
              value={form.hourly_rate || 0}
              onChange={(e) =>
                setForm({
                  ...form,
                  hourly_rate: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
              min="0"
              step="0.01"
            />
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-6 border border-red-500/30">
        <h3 className="font-medium text-red-400">Danger Zone</h3>
        <p className="text-sm text-dark-400 mt-1 mb-4">
          Delete this workspace. This action cannot be undone.
        </p>
        <button
          onClick={async () => {
            if (
              !confirm(
                "Are you sure? This will delete all tasks and data in this workspace."
              )
            )
              return;
            try {
              await workspaceService.delete(workspace.id);
              window.location.reload();
            } catch (err: any) {
              alert(err.message || "Failed to delete workspace");
            }
          }}
          className="btn btn-ghost text-red-400 border border-red-500/50 hover:bg-red-500/20"
        >
          Delete Workspace
        </button>
      </div>
    </div>
  );
}

function AddWorkspaceMemberModal({
  orgMembers,
  roles,
  onClose,
  onAdd,
}: {
  orgMembers: any[];
  roles: WorkspaceRole[];
  onClose: () => void;
  onAdd: (userId: number, roleId: number) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(
    roles[0]?.id || 0
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="glass rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-dark-100 mb-4">
          Add Member to Workspace
        </h3>

        {orgMembers.length === 0 ? (
          <div className="text-center py-8">
            <Icons.Users className="w-12 h-12 text-dark-500 mx-auto mb-3" />
            <p className="text-dark-400">
              No available organization members to add
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Select Member
              </label>
              <select
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
              >
                <option value="">Choose a member...</option>
                {orgMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.first_name} {m.user?.last_name} ({m.user?.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Role
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.display_name || role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          {orgMembers.length > 0 && (
            <button
              onClick={() =>
                selectedUserId && onAdd(selectedUserId, selectedRoleId)
              }
              disabled={!selectedUserId}
              className="btn btn-primary"
            >
              Add Member
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

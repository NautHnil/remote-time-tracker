/**
 * Organizations View Component
 * Full UI for managing organizations - list, detail, members, settings
 */

import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  organizationService,
  type CreateOrganizationRequest,
  type CreateWorkspaceRequest,
  type Invitation,
  type Organization,
  type OrganizationListItem,
  type OrganizationMember,
  type Workspace,
  type WorkspaceRole,
} from "../services";
import { Icons } from "./Icons";

// ============================================================================
// TYPES
// ============================================================================

type TabView =
  | "overview"
  | "members"
  | "workspaces"
  | "roles"
  | "invitations"
  | "settings";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OrganizationsView() {
  const { user, permissions, isOrgOwner, refreshUserContext } = useAuth();

  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    []
  );
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>("overview");

  // Sub-data for selected org
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  // Calculate permissions for selected org
  const selectedOrgPermissions = selectedOrg
    ? {
        isOwner:
          isOrgOwner(selectedOrg.id) || selectedOrg.owner_id === user?.id,
        isAdmin:
          selectedOrg.members?.some(
            (m) =>
              m.user_id === user?.id &&
              (m.role === "owner" || m.role === "admin")
          ) || permissions.isSystemAdmin,
        isMember:
          selectedOrg.members?.some((m) => m.user_id === user?.id) || false,
      }
    : { isOwner: false, isAdmin: false, isMember: false };

  // Derived permissions
  const canManageSettings =
    permissions.isSystemAdmin || selectedOrgPermissions.isOwner;
  const canManageMembers =
    permissions.isSystemAdmin || selectedOrgPermissions.isAdmin;
  const canCreateWorkspace =
    permissions.isSystemAdmin || selectedOrgPermissions.isAdmin;
  const canViewWorkspaces =
    permissions.isSystemAdmin || selectedOrgPermissions.isAdmin;
  const canManageRoles =
    permissions.isSystemAdmin || selectedOrgPermissions.isAdmin;
  const canManageInvitations =
    permissions.isSystemAdmin || selectedOrgPermissions.isAdmin;
  const canDeleteOrg =
    permissions.isSystemAdmin || selectedOrgPermissions.isOwner;

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const orgs = await organizationService.getMyOrganizations();
      console.log("[OrganizationsView] Loaded organizations:", orgs);
      // Debug: log each org's id
      orgs.forEach((org, idx) => {
        console.log(
          `[OrganizationsView] Org ${idx}: id=${
            org.id
          }, type=${typeof org.id}, name=${org.name}`
        );
      });
      setOrganizations(orgs);
    } catch (err: any) {
      console.error("Failed to load organizations:", err);
      setError(err.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectOrg = useCallback(async (orgId: number) => {
    try {
      setLoading(true);
      setError(null); // Clear previous error
      console.log(
        "[OrganizationsView] Loading org - orgId:",
        orgId,
        "type:",
        typeof orgId
      );

      // Validate orgId
      if (!orgId || typeof orgId !== "number" || isNaN(orgId)) {
        throw new Error(`Invalid organization ID: ${orgId}`);
      }

      const org = await organizationService.getById(orgId, true);
      console.log("[OrganizationsView] Loaded org:", org);

      if (!org) {
        throw new Error("Organization data is empty");
      }

      setSelectedOrg(org);
      setActiveTab("overview");

      // Load sub-data
      const [membersData, workspacesData, rolesData, invitationsData] =
        await Promise.all([
          organizationService.getMembers(orgId),
          organizationService.getWorkspaces(orgId),
          organizationService.getRoles(orgId),
          organizationService.getInvitations(orgId).catch(() => []),
        ]);
      setMembers(membersData);
      setWorkspaces(workspacesData);
      setRoles(rolesData);
      setInvitations(invitationsData);
    } catch (err: any) {
      console.error("Failed to load organization:", err);
      setError(err.message || "Failed to load organization");
      setSelectedOrg(null); // Reset selection on error
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedOrg(null);
    setActiveTab("overview");
    loadOrganizations();
    refreshUserContext(); // Refresh user context to update orgs/workspaces in sidebar
  }, [loadOrganizations, refreshUserContext]);

  const handleCreateOrg = useCallback(
    async (data: CreateOrganizationRequest) => {
      try {
        await organizationService.create(data);
        setShowCreateModal(false);
        await loadOrganizations();
        await refreshUserContext(); // Refresh user context
      } catch (err: any) {
        alert(err.message || "Failed to create organization");
      }
    },
    [loadOrganizations, refreshUserContext]
  );

  const handleJoinOrg = useCallback(
    async (inviteCode: string) => {
      try {
        await organizationService.joinByInviteCode(inviteCode);
        setShowJoinModal(false);
        await loadOrganizations();
        await refreshUserContext(); // Refresh user context
      } catch (err: any) {
        alert(err.message || "Failed to join organization");
      }
    },
    [loadOrganizations, refreshUserContext]
  );

  const handleCopyInviteCode = useCallback(() => {
    if (selectedOrg?.invite_code) {
      navigator.clipboard.writeText(selectedOrg.invite_code);
      alert("Invite code copied to clipboard!");
    }
  }, [selectedOrg]);

  const handleRegenerateInviteCode = useCallback(async () => {
    if (!selectedOrg) return;
    if (!confirm("Regenerate invite code? Old code will stop working.")) return;

    try {
      const result = await organizationService.regenerateInviteCode(
        selectedOrg.id
      );
      setSelectedOrg((prev) =>
        prev ? { ...prev, invite_code: result.invite_code } : null
      );
    } catch (err: any) {
      alert(err.message || "Failed to regenerate invite code");
    }
  }, [selectedOrg]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      member: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return (
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
          colors[role] || colors.member
        }`}
      >
        {role}
      </span>
    );
  };

  // ============================================================================
  // ORGANIZATION LIST VIEW
  // ============================================================================

  if (!selectedOrg) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-dark-50">My Organizations</h2>
            <p className="text-sm text-dark-400">
              Manage your organizations and teams
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn btn-ghost flex items-center gap-2"
            >
              <Icons.Link className="w-4 h-4" />
              Join
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Icons.Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>

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
        {!loading && organizations.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <Icons.Organization className="w-16 h-16 text-dark-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-200 mb-2">
              No Organizations
            </h3>
            <p className="text-dark-400 mb-6">
              Create your first organization or join an existing one
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowJoinModal(true)}
                className="btn btn-ghost"
              >
                Join Organization
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Create Organization
              </button>
            </div>
          </div>
        )}

        {/* Organization List */}
        {!loading && organizations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map((org) => (
              <div
                key={org.id}
                onClick={() => handleSelectOrg(org.id)}
                className="glass rounded-xl p-5 cursor-pointer hover:bg-dark-800/50 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-dark-100 truncate group-hover:text-primary-400 transition-colors">
                      {org.name}
                    </h3>
                    <p className="text-sm text-dark-400">@{org.slug}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-dark-500">
                      <span className="flex items-center gap-1">
                        <Icons.Users className="w-3 h-3" />
                        {org.member_count} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Icons.Folder className="w-3 h-3" />
                        {org.workspace_count} workspaces
                      </span>
                    </div>
                  </div>
                  {renderRoleBadge(org.role)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateOrganizationModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateOrg}
          />
        )}

        {/* Join Modal */}
        {showJoinModal && (
          <JoinOrganizationModal
            onClose={() => setShowJoinModal(false)}
            onSubmit={handleJoinOrg}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // ORGANIZATION DETAIL VIEW
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
      id: "workspaces",
      label: "Workspaces",
      icon: Icons.Folder,
      requiredPermission: canViewWorkspaces,
    },
    {
      id: "roles",
      label: "Roles",
      icon: Icons.Badge,
      requiredPermission: canManageRoles,
    },
    {
      id: "invitations",
      label: "Invitations",
      icon: Icons.Mail,
      requiredPermission: canManageInvitations,
    },
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
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
          {selectedOrg.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-dark-50">
            {selectedOrg.name}
          </h2>
          <p className="text-dark-400">@{selectedOrg.slug}</p>
        </div>
        {renderRoleBadge(
          members.find((m) => m.user_id === user?.id)?.role || "member"
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-800 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
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
              org={selectedOrg}
              members={members}
              workspaces={workspaces}
              onCopyInviteCode={handleCopyInviteCode}
            />
          )}
          {activeTab === "members" && (
            <MembersTab
              orgId={selectedOrg.id}
              members={members}
              onRefresh={() => handleSelectOrg(selectedOrg.id)}
              canManage={canManageMembers}
            />
          )}
          {activeTab === "workspaces" && canViewWorkspaces && (
            <WorkspacesTab
              orgId={selectedOrg.id}
              workspaces={workspaces}
              roles={roles}
              onRefresh={() => handleSelectOrg(selectedOrg.id)}
              canCreate={canCreateWorkspace}
            />
          )}
          {activeTab === "roles" && canManageRoles && (
            <RolesTab
              orgId={selectedOrg.id}
              roles={roles}
              onRefresh={() => handleSelectOrg(selectedOrg.id)}
              canManage={canManageRoles}
            />
          )}
          {activeTab === "invitations" && canManageInvitations && (
            <InvitationsTab
              orgId={selectedOrg.id}
              invitations={invitations}
              onRefresh={() => handleSelectOrg(selectedOrg.id)}
              canManage={canManageInvitations}
            />
          )}
          {activeTab === "settings" && canManageSettings && (
            <SettingsTab
              org={selectedOrg}
              onUpdate={() => handleSelectOrg(selectedOrg.id)}
              onRegenerateInviteCode={handleRegenerateInviteCode}
              canDelete={canDeleteOrg}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB COMPONENTS - TABS
// ============================================================================

function OverviewTab({
  org,
  members,
  workspaces,
  onCopyInviteCode,
}: {
  org: Organization;
  members: OrganizationMember[];
  workspaces: Workspace[];
  onCopyInviteCode: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {members.length}
            </div>
            <div className="text-sm text-dark-400">Members</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {workspaces.length}
            </div>
            <div className="text-sm text-dark-400">Workspaces</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {org.max_members || "∞"}
            </div>
            <div className="text-sm text-dark-400">Max Members</div>
          </div>
        </div>

        {/* Description */}
        {org.description && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-dark-200 mb-2">Description</h4>
            <p className="text-dark-400">{org.description}</p>
          </div>
        )}

        {/* Recent Members */}
        <div className="glass rounded-xl p-5">
          <h4 className="font-medium text-dark-200 mb-3">Recent Members</h4>
          <div className="space-y-2">
            {members.slice(0, 5).map((member) => (
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
                {member.role === "owner" && (
                  <Icons.Crown className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Invite Code & Link - only show if invite_code is available */}
        {org.allow_invite_link && org.invite_code && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-dark-200 mb-3 flex items-center gap-2">
              <Icons.Link className="w-4 h-4" />
              Invite
            </h4>

            {/* Invite Code */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-dark-400 block mb-1">
                  Invite Code
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-dark-900 px-3 py-2 rounded-lg text-primary-400 text-sm font-mono truncate">
                    {org.invite_code}
                  </code>
                  <button
                    onClick={onCopyInviteCode}
                    className="btn btn-ghost p-2 flex-shrink-0"
                    title="Copy invite code"
                  >
                    <Icons.Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Invite Link */}
              <div>
                <label className="text-xs text-dark-400 block mb-1">
                  Invite Link
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-dark-900 px-3 py-2 rounded-lg text-primary-400 text-xs font-mono truncate">
                    {`${window.location.origin}/join/${org.invite_code}`}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/join/${org.invite_code}`
                      );
                      alert("Invite link copied to clipboard!");
                    }}
                    className="btn btn-ghost p-2 flex-shrink-0"
                    title="Copy invite link"
                  >
                    <Icons.Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-dark-500 mt-3">
              Share this code or link with others to invite them to your
              organization.
            </p>
          </div>
        )}

        {/* Invite enabled but not shared with members */}
        {org.allow_invite_link && !org.invite_code && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-dark-200 mb-2 flex items-center gap-2">
              <Icons.Link className="w-4 h-4 text-dark-500" />
              Invite
            </h4>
            <p className="text-sm text-dark-400">
              Invite sharing is restricted to admins only.
            </p>
            <p className="text-xs text-dark-500 mt-1">
              Contact your organization admin if you need to invite others.
            </p>
          </div>
        )}

        {/* Invite disabled */}
        {!org.allow_invite_link && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-dark-200 mb-2 flex items-center gap-2">
              <Icons.Link className="w-4 h-4 text-dark-500" />
              Invite
            </h4>
            <p className="text-sm text-dark-400">
              Invite links are disabled for this organization.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-dark-400">Status</span>
            <span className={org.is_active ? "text-green-400" : "text-red-400"}>
              {org.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-dark-400">Created</span>
            <span className="text-dark-200">
              {format(new Date(org.created_at), "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-dark-400">Allow Invite Link</span>
            <span
              className={
                org.allow_invite_link ? "text-green-400" : "text-dark-500"
              }
            >
              {org.allow_invite_link ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-dark-400">Share Invite Code</span>
            <span
              className={
                org.share_invite_code ? "text-green-400" : "text-dark-500"
              }
            >
              {org.share_invite_code ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MembersTab({
  orgId,
  members,
  onRefresh,
  canManage = false,
}: {
  orgId: number;
  members: OrganizationMember[];
  onRefresh: () => void;
  canManage?: boolean;
}) {
  const [updating, setUpdating] = useState<number | null>(null);

  const handleUpdateRole = async (userId: number, newRole: string) => {
    if (!canManage) return;
    if (!confirm(`Change role to ${newRole}?`)) return;
    try {
      setUpdating(userId);
      await organizationService.updateMember(orgId, userId, { role: newRole });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to update member");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!canManage) return;
    if (!confirm("Remove this member from the organization?")) return;
    try {
      setUpdating(userId);
      await organizationService.removeMember(orgId, userId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-dark-800 flex items-center justify-between">
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
                  value={member.role}
                  onChange={(e) =>
                    handleUpdateRole(member.user_id, e.target.value)
                  }
                  disabled={
                    updating === member.user_id || member.role === "owner"
                  }
                  className="bg-dark-800 border border-dark-700 rounded-lg px-2 py-1 text-sm text-dark-200 disabled:opacity-50"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              ) : (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    member.role === "owner"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : member.role === "admin"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {member.role}
                </span>
              )}
              {canManage && member.role !== "owner" && (
                <button
                  onClick={() => handleRemoveMember(member.user_id)}
                  disabled={updating === member.user_id}
                  className="btn btn-ghost p-2 text-red-400 hover:bg-red-500/20"
                  title="Remove member"
                >
                  <Icons.UserX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspacesTab({
  orgId,
  workspaces,
  roles: _roles,
  onRefresh,
  canCreate = false,
}: {
  orgId: number;
  workspaces: Workspace[];
  roles: WorkspaceRole[];
  onRefresh: () => void;
  canCreate?: boolean;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreate = async (data: CreateWorkspaceRequest) => {
    if (!canCreate) return;
    try {
      await organizationService.createWorkspace(orgId, data);
      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to create workspace");
    }
  };

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Icons.Plus className="w-4 h-4" />
            Create Workspace
          </button>
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Icons.Folder className="w-16 h-16 text-dark-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-200 mb-2">
            No Workspaces
          </h3>
          <p className="text-dark-400">
            Create your first workspace to organize projects
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="glass rounded-xl p-5 hover:bg-dark-800/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: ws.color || "#6366f1" }}
                >
                  {ws.icon ? (
                    <span className="text-xl">{ws.icon}</span>
                  ) : (
                    <Icons.Folder className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-dark-100 truncate">
                    {ws.name}
                  </h4>
                  <p className="text-sm text-dark-400">@{ws.slug}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-dark-500">
                    <span className="flex items-center gap-1">
                      <Icons.Users className="w-3 h-3" />
                      {ws.member_count || 0} members
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.Task className="w-3 h-3" />
                      {ws.task_count || 0} tasks
                    </span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    ws.is_active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {ws.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}

function RolesTab({
  orgId,
  roles,
  onRefresh,
  canManage = true,
}: {
  orgId: number;
  roles: WorkspaceRole[];
  onRefresh: () => void;
  canManage?: boolean;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    display_name: "",
    description: "",
    color: "#6366f1",
  });

  const handleCreateRole = async () => {
    if (!newRole.name.trim() || !newRole.display_name.trim()) {
      alert("Name and display name are required");
      return;
    }
    try {
      await organizationService.createRole(orgId, {
        name: newRole.name.toLowerCase().replace(/\s+/g, "_"),
        display_name: newRole.display_name,
        description: newRole.description,
        color: newRole.color,
      });
      setShowCreateModal(false);
      setNewRole({
        name: "",
        display_name: "",
        description: "",
        color: "#6366f1",
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to create role");
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!canManage) return;
    if (!confirm("Delete this role? This cannot be undone.")) return;
    try {
      await organizationService.deleteRole(orgId, roleId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete role");
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Icons.Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>
      )}

      {roles.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Icons.Badge className="w-16 h-16 text-dark-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-200 mb-2">No Roles</h3>
          <p className="text-dark-400">
            Create roles to assign to workspace members
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: role.color || "#6366f1" }}
                  />
                  <div>
                    <h4 className="font-medium text-dark-100">
                      {role.display_name}
                    </h4>
                    <p className="text-xs text-dark-500">@{role.name}</p>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="btn btn-ghost p-1 text-red-400 hover:bg-red-500/20"
                  >
                    <Icons.Trash className="w-4 h-4" />
                  </button>
                )}
              </div>
              {role.description && (
                <p className="mt-2 text-sm text-dark-400">{role.description}</p>
              )}
              {role.is_default && (
                <span className="mt-2 inline-block px-2 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded-full">
                  Default
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-dark-100 mb-4">
              Create Role
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newRole.display_name}
                  onChange={(e) =>
                    setNewRole({
                      ...newRole,
                      display_name: e.target.value,
                      name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    })
                  }
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
                  placeholder="Developer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) =>
                    setNewRole({ ...newRole, description: e.target.value })
                  }
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
                  placeholder="Role description..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={newRole.color}
                  onChange={(e) =>
                    setNewRole({ ...newRole, color: e.target.value })
                  }
                  className="w-full h-10 bg-dark-800 border border-dark-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button onClick={handleCreateRole} className="btn btn-primary">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvitationsTab({
  orgId,
  invitations,
  onRefresh,
  canManage = true,
}: {
  orgId: number;
  invitations: Invitation[];
  onRefresh: () => void;
  canManage?: boolean;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: "", role: "member" });

  const handleCreateInvitation = async () => {
    if (!newInvite.email.trim()) {
      alert("Email is required");
      return;
    }
    try {
      await organizationService.createInvitation(orgId, {
        email: newInvite.email,
        role: newInvite.role,
      });
      setShowCreateModal(false);
      setNewInvite({ email: "", role: "member" });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to send invitation");
    }
  };

  const handleRevokeInvitation = async (invitationId: number) => {
    if (!canManage) return;
    if (!confirm("Revoke this invitation?")) return;
    try {
      await organizationService.revokeInvitation(orgId, invitationId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to revoke invitation");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "accepted":
        return "bg-green-500/20 text-green-400";
      case "expired":
        return "bg-dark-500/20 text-dark-400";
      case "revoked":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-dark-500/20 text-dark-400";
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Icons.Mail className="w-4 h-4" />
            Send Invitation
          </button>
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Icons.Mail className="w-16 h-16 text-dark-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-200 mb-2">
            No Invitations
          </h3>
          <p className="text-dark-400">Send invitations to add new members</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="divide-y divide-dark-800">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex items-center gap-4 hover:bg-dark-800/30"
              >
                <Icons.Mail className="w-8 h-8 text-dark-500" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-dark-100 truncate">
                    {inv.email}
                  </div>
                  <div className="text-sm text-dark-400">Role: {inv.role}</div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(
                    inv.status
                  )}`}
                >
                  {inv.status}
                </span>
                {canManage && inv.status === "pending" && (
                  <button
                    onClick={() => handleRevokeInvitation(inv.id)}
                    className="btn btn-ghost p-2 text-red-400 hover:bg-red-500/20"
                  >
                    <Icons.X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Invitation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-dark-100 mb-4">
              Send Invitation
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newInvite.email}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, email: e.target.value })
                  }
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Role
                </label>
                <select
                  value={newInvite.role}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, role: e.target.value })
                  }
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvitation}
                className="btn btn-primary"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  org,
  onUpdate,
  onRegenerateInviteCode,
  canDelete = false,
}: {
  org: Organization;
  onUpdate: () => void;
  onRegenerateInviteCode: () => void;
  canDelete?: boolean;
}) {
  const [form, setForm] = useState({
    name: org.name,
    description: org.description || "",
    allow_invite_link: org.allow_invite_link,
    share_invite_code: org.share_invite_code || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await organizationService.update(org.id, form);
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
            Organization Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-dark-200">Allow Invite Link</div>
            <div className="text-sm text-dark-400">
              Let users join with invite code
            </div>
          </div>
          <button
            onClick={() =>
              setForm({ ...form, allow_invite_link: !form.allow_invite_link })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.allow_invite_link ? "bg-primary-500" : "bg-dark-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.allow_invite_link ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {form.allow_invite_link && (
          <div className="flex items-center justify-between ml-4 pl-4 border-l-2 border-dark-700">
            <div>
              <div className="font-medium text-dark-200">
                Share Invite Code with Members
              </div>
              <div className="text-sm text-dark-400">
                Allow all members to see and share the invite code
              </div>
            </div>
            <button
              onClick={() =>
                setForm({ ...form, share_invite_code: !form.share_invite_code })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.share_invite_code ? "bg-primary-500" : "bg-dark-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.share_invite_code ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary w-full"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-dark-200">Invite Code</h3>
        <p className="text-sm text-dark-400">
          Regenerating will invalidate the current invite code.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-dark-900 px-3 py-2 rounded-lg text-primary-400 font-mono">
            {org.invite_code}
          </code>
          <button
            onClick={onRegenerateInviteCode}
            className="btn btn-ghost flex items-center gap-2"
          >
            <Icons.Refresh className="w-4 h-4" />
            Regenerate
          </button>
        </div>
      </div>

      {canDelete && (
        <div className="glass rounded-xl p-6 border border-red-500/30">
          <h3 className="font-medium text-red-400">Danger Zone</h3>
          <p className="text-sm text-dark-400 mt-1 mb-4">
            Permanently delete this organization. This action cannot be undone.
          </p>
          <button
            onClick={async () => {
              if (
                !confirm(
                  "Are you absolutely sure? This will delete all workspaces and data."
                )
              )
                return;
              try {
                await organizationService.delete(org.id);
                window.location.reload();
              } catch (err: any) {
                alert(err.message || "Failed to delete organization");
              }
            }}
            className="btn btn-ghost text-red-400 border border-red-500/50 hover:bg-red-500/20"
          >
            Delete Organization
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

function CreateOrganizationModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: CreateOrganizationRequest) => void;
}) {
  const [form, setForm] = useState({ name: "", slug: "", description: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      alert("Name and slug are required");
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="glass rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-dark-100 mb-4">
          Create Organization
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, ""),
                })
              }
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
              placeholder="My Organization"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                })
              }
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
              placeholder="my-organization"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinOrganizationModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (inviteCode: string) => void;
}) {
  const [inviteCode, setInviteCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      alert("Invite code is required");
      return;
    }
    onSubmit(inviteCode.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="glass rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-dark-100 mb-4">
          Join Organization
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100 font-mono"
              placeholder="Enter invite code..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateWorkspaceModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: CreateWorkspaceRequest) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    color: "#6366f1",
    icon: "📁",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      alert("Name and slug are required");
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="glass rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-dark-100 mb-4">
          Create Workspace
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, ""),
                })
              }
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
              placeholder="My Workspace"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                })
              }
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
              placeholder="my-workspace"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Color
              </label>
              <input
                type="color"
                value={form.color}
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
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-100 text-center text-xl"
                maxLength={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

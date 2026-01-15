/**
 * Organizations View Component
 * Main container for managing organizations - list and detail views
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  organizationService,
  type CreateOrganizationRequest,
  type Invitation,
  type Organization,
  type OrganizationListItem,
  type OrganizationMember,
  type Workspace,
  type WorkspaceRole,
} from "../../services";
import { CreateOrganizationModal, JoinOrganizationModal } from "./modals";
import { OrganizationDetailView } from "./OrganizationDetailView";
import { OrganizationListView } from "./OrganizationListView";
import type { OrgTabView } from "./types";

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
  const [activeTab, setActiveTab] = useState<OrgTabView>("overview");

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
      setError(null);
      console.log("[OrganizationsView] Loading org - orgId:", orgId);

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
      setSelectedOrg(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedOrg(null);
    setActiveTab("overview");
    loadOrganizations();
    refreshUserContext();
  }, [loadOrganizations, refreshUserContext]);

  const handleCreateOrg = useCallback(
    async (data: CreateOrganizationRequest) => {
      try {
        await organizationService.create(data);
        setShowCreateModal(false);
        await loadOrganizations();
        await refreshUserContext();
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
        await refreshUserContext();
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

  const handleRefresh = useCallback(() => {
    if (selectedOrg) {
      handleSelectOrg(selectedOrg.id);
    }
  }, [selectedOrg, handleSelectOrg]);

  // Render List View or Detail View
  if (!selectedOrg) {
    return (
      <>
        <OrganizationListView
          organizations={organizations}
          loading={loading}
          error={error}
          onSelectOrg={handleSelectOrg}
          onShowCreateModal={() => setShowCreateModal(true)}
          onShowJoinModal={() => setShowJoinModal(true)}
        />

        {/* Modals */}
        {showCreateModal && (
          <CreateOrganizationModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateOrg}
          />
        )}

        {showJoinModal && (
          <JoinOrganizationModal
            onClose={() => setShowJoinModal(false)}
            onSubmit={handleJoinOrg}
          />
        )}
      </>
    );
  }

  // Detail View
  return (
    <OrganizationDetailView
      org={selectedOrg}
      members={members}
      workspaces={workspaces}
      roles={roles}
      invitations={invitations}
      activeTab={activeTab}
      currentUserId={user?.id}
      permissions={{
        canViewWorkspaces,
        canCreateWorkspace,
        canManageMembers,
        canManageRoles,
        canManageInvitations,
        canManageSettings,
        canDeleteOrg,
      }}
      loading={loading}
      error={error}
      onBack={handleBack}
      onSetActiveTab={setActiveTab}
      onRefresh={handleRefresh}
      onCopyInviteCode={handleCopyInviteCode}
      onRegenerateInviteCode={handleRegenerateInviteCode}
    />
  );
}

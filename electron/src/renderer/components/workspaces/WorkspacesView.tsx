/**
 * Workspaces View Component
 * Main container for managing workspaces - list and detail views
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  organizationService,
  workspaceService,
  type OrganizationListItem,
  type Workspace,
  type WorkspaceListItem,
  type WorkspaceMember,
  type WorkspaceRole,
} from "../../services";
import { WorkspaceDetailView } from "./WorkspaceDetailView";
import { WorkspaceListView } from "./WorkspaceListView";
import type { WorkspaceTabView } from "./types";

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
  const [activeTab, setActiveTab] = useState<WorkspaceTabView>("overview");
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
    refreshUserContext();
  }, [loadData, refreshUserContext]);

  const handleRefresh = useCallback(() => {
    if (selectedWorkspace) {
      handleSelectWorkspace(selectedWorkspace.id);
    }
  }, [selectedWorkspace, handleSelectWorkspace]);

  // Render List View or Detail View
  if (!selectedWorkspace) {
    return (
      <WorkspaceListView
        workspaces={workspaces}
        organizations={organizations}
        filterOrgId={filterOrgId}
        loading={loading}
        error={error}
        onSelectWorkspace={handleSelectWorkspace}
        onSetFilterOrgId={setFilterOrgId}
        onRefresh={loadData}
      />
    );
  }

  // Detail View
  return (
    <WorkspaceDetailView
      workspace={selectedWorkspace}
      members={members}
      roles={roles}
      activeTab={activeTab}
      permissions={{
        canManageSettings,
        canManageMembers,
      }}
      onBack={handleBack}
      onSetActiveTab={setActiveTab}
      onRefresh={handleRefresh}
    />
  );
}

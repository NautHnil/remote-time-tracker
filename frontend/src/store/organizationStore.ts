/**
 * Organization Store
 * Zustand store for managing organization state
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  organizationService,
  workspaceService,
  type AddOrganizationMemberRequest,
  type AddWorkspaceMemberRequest,
  type CreateInvitationRequest,
  type CreateOrganizationRequest,
  type CreateRoleRequest,
  type CreateWorkspaceRequest,
  type Invitation,
  type Organization,
  type OrganizationListItem,
  type OrganizationMember,
  type UpdateOrganizationRequest,
  type UpdateRoleRequest,
  type UpdateWorkspaceRequest,
  type Workspace,
  type WorkspaceListItem,
  type WorkspaceMember,
  type WorkspaceRole,
} from "../services";

// ============================================================================
// STATE TYPES
// ============================================================================

interface OrganizationState {
  // Organization list
  organizations: OrganizationListItem[];
  currentOrganization: Organization | null;
  currentOrgMembers: OrganizationMember[];
  currentOrgRoles: WorkspaceRole[];
  currentOrgWorkspaces: Workspace[];
  currentOrgInvitations: Invitation[];

  // Workspace list
  workspaces: WorkspaceListItem[];
  currentWorkspace: Workspace | null;
  currentWorkspaceMembers: WorkspaceMember[];

  // Loading states
  isLoading: boolean;
  isLoadingOrg: boolean;
  isLoadingWorkspace: boolean;
  isLoadingMembers: boolean;
  isLoadingRoles: boolean;
  isLoadingInvitations: boolean;

  // Errors
  error: string | null;

  // Actions - Organizations
  fetchOrganizations: () => Promise<void>;
  fetchOrganization: (orgId: number) => Promise<void>;
  createOrganization: (
    data: CreateOrganizationRequest
  ) => Promise<Organization>;
  updateOrganization: (
    orgId: number,
    data: UpdateOrganizationRequest
  ) => Promise<void>;
  deleteOrganization: (orgId: number) => Promise<void>;

  // Actions - Organization Members
  fetchOrgMembers: (orgId: number) => Promise<void>;
  addOrgMember: (
    orgId: number,
    data: AddOrganizationMemberRequest
  ) => Promise<void>;
  updateOrgMember: (
    orgId: number,
    userId: number,
    role: string
  ) => Promise<void>;
  removeOrgMember: (orgId: number, userId: number) => Promise<void>;

  // Actions - Organization Roles
  fetchOrgRoles: (orgId: number) => Promise<void>;
  createOrgRole: (
    orgId: number,
    data: CreateRoleRequest
  ) => Promise<WorkspaceRole>;
  updateOrgRole: (
    orgId: number,
    roleId: number,
    data: UpdateRoleRequest
  ) => Promise<void>;
  deleteOrgRole: (orgId: number, roleId: number) => Promise<void>;

  // Actions - Organization Workspaces
  fetchOrgWorkspaces: (orgId: number) => Promise<void>;
  createWorkspace: (
    orgId: number,
    data: CreateWorkspaceRequest
  ) => Promise<Workspace>;

  // Actions - Organization Invitations
  fetchOrgInvitations: (orgId: number) => Promise<void>;
  createInvitation: (
    orgId: number,
    data: CreateInvitationRequest
  ) => Promise<Invitation>;
  revokeInvitation: (orgId: number, invitationId: number) => Promise<void>;

  // Actions - Join Organization
  joinByInviteCode: (inviteCode: string) => Promise<void>;
  regenerateInviteCode: (orgId: number) => Promise<string>;

  // Actions - Workspaces
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspace: (workspaceId: number) => Promise<void>;
  updateWorkspace: (
    workspaceId: number,
    data: UpdateWorkspaceRequest
  ) => Promise<void>;
  deleteWorkspace: (workspaceId: number) => Promise<void>;

  // Actions - Workspace Members
  fetchWorkspaceMembers: (workspaceId: number) => Promise<void>;
  addWorkspaceMember: (
    workspaceId: number,
    data: AddWorkspaceMemberRequest
  ) => Promise<void>;
  updateWorkspaceMember: (
    workspaceId: number,
    userId: number,
    roleId: number
  ) => Promise<void>;
  removeWorkspaceMember: (workspaceId: number, userId: number) => Promise<void>;

  // Helpers
  setCurrentOrganization: (org: Organization | null) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  organizations: [],
  currentOrganization: null,
  currentOrgMembers: [],
  currentOrgRoles: [],
  currentOrgWorkspaces: [],
  currentOrgInvitations: [],
  workspaces: [],
  currentWorkspace: null,
  currentWorkspaceMembers: [],
  isLoading: false,
  isLoadingOrg: false,
  isLoadingWorkspace: false,
  isLoadingMembers: false,
  isLoadingRoles: false,
  isLoadingInvitations: false,
  error: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useOrganizationStore = create<OrganizationState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // =========================================================================
      // ORGANIZATION ACTIONS
      // =========================================================================

      fetchOrganizations: async () => {
        set({ isLoading: true, error: null });
        try {
          const organizations = await organizationService.getMyOrganizations();
          set({ organizations, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      fetchOrganization: async (orgId: number) => {
        set({ isLoadingOrg: true, error: null });
        try {
          const organization = await organizationService.getById(orgId);
          set({ currentOrganization: organization, isLoadingOrg: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingOrg: false });
          throw error;
        }
      },

      createOrganization: async (data: CreateOrganizationRequest) => {
        set({ isLoading: true, error: null });
        try {
          const organization = await organizationService.create(data);
          // Refresh organizations list
          await get().fetchOrganizations();
          set({ isLoading: false });
          return organization;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateOrganization: async (
        orgId: number,
        data: UpdateOrganizationRequest
      ) => {
        set({ isLoadingOrg: true, error: null });
        try {
          const updated = await organizationService.update(orgId, data);
          set({ currentOrganization: updated, isLoadingOrg: false });
          // Refresh organizations list
          await get().fetchOrganizations();
        } catch (error: any) {
          set({ error: error.message, isLoadingOrg: false });
          throw error;
        }
      },

      deleteOrganization: async (orgId: number) => {
        set({ isLoading: true, error: null });
        try {
          await organizationService.delete(orgId);
          set({
            currentOrganization: null,
            organizations: get().organizations.filter((o) => o.id !== orgId),
            isLoading: false,
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // =========================================================================
      // ORGANIZATION MEMBERS ACTIONS
      // =========================================================================

      fetchOrgMembers: async (orgId: number) => {
        set({ isLoadingMembers: true, error: null });
        try {
          const members = await organizationService.getMembers(orgId);
          set({ currentOrgMembers: members, isLoadingMembers: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingMembers: false });
          throw error;
        }
      },

      addOrgMember: async (
        orgId: number,
        data: AddOrganizationMemberRequest
      ) => {
        set({ isLoadingMembers: true, error: null });
        try {
          await organizationService.addMember(orgId, data);
          await get().fetchOrgMembers(orgId);
          set({ isLoadingMembers: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingMembers: false });
          throw error;
        }
      },

      updateOrgMember: async (orgId: number, userId: number, role: string) => {
        set({ isLoadingMembers: true, error: null });
        try {
          await organizationService.updateMember(orgId, userId, {
            role: role as "admin" | "member",
          });
          await get().fetchOrgMembers(orgId);
          set({ isLoadingMembers: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingMembers: false });
          throw error;
        }
      },

      removeOrgMember: async (orgId: number, userId: number) => {
        set({ isLoadingMembers: true, error: null });
        try {
          await organizationService.removeMember(orgId, userId);
          set({
            currentOrgMembers: get().currentOrgMembers.filter(
              (m) => m.user_id !== userId
            ),
            isLoadingMembers: false,
          });
        } catch (error: any) {
          set({ error: error.message, isLoadingMembers: false });
          throw error;
        }
      },

      // =========================================================================
      // ORGANIZATION ROLES ACTIONS
      // =========================================================================

      fetchOrgRoles: async (orgId: number) => {
        set({ isLoadingRoles: true, error: null });
        try {
          const roles = await organizationService.getRoles(orgId);
          set({ currentOrgRoles: roles, isLoadingRoles: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingRoles: false });
          throw error;
        }
      },

      createOrgRole: async (orgId: number, data: CreateRoleRequest) => {
        set({ isLoadingRoles: true, error: null });
        try {
          const role = await organizationService.createRole(orgId, data);
          await get().fetchOrgRoles(orgId);
          set({ isLoadingRoles: false });
          return role;
        } catch (error: any) {
          set({ error: error.message, isLoadingRoles: false });
          throw error;
        }
      },

      updateOrgRole: async (
        orgId: number,
        roleId: number,
        data: UpdateRoleRequest
      ) => {
        set({ isLoadingRoles: true, error: null });
        try {
          await organizationService.updateRole(orgId, roleId, data);
          await get().fetchOrgRoles(orgId);
          set({ isLoadingRoles: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingRoles: false });
          throw error;
        }
      },

      deleteOrgRole: async (orgId: number, roleId: number) => {
        set({ isLoadingRoles: true, error: null });
        try {
          await organizationService.deleteRole(orgId, roleId);
          set({
            currentOrgRoles: get().currentOrgRoles.filter(
              (r) => r.id !== roleId
            ),
            isLoadingRoles: false,
          });
        } catch (error: any) {
          set({ error: error.message, isLoadingRoles: false });
          throw error;
        }
      },

      // =========================================================================
      // ORGANIZATION WORKSPACES ACTIONS
      // =========================================================================

      fetchOrgWorkspaces: async (orgId: number) => {
        set({ isLoadingWorkspace: true, error: null });
        try {
          const workspaces = await organizationService.getWorkspaces(orgId);
          set({ currentOrgWorkspaces: workspaces, isLoadingWorkspace: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingWorkspace: false });
          throw error;
        }
      },

      createWorkspace: async (orgId: number, data: CreateWorkspaceRequest) => {
        set({ isLoadingWorkspace: true, error: null });
        try {
          const workspace = await organizationService.createWorkspace(
            orgId,
            data
          );
          await get().fetchOrgWorkspaces(orgId);
          set({ isLoadingWorkspace: false });
          return workspace;
        } catch (error: any) {
          set({ error: error.message, isLoadingWorkspace: false });
          throw error;
        }
      },

      // =========================================================================
      // ORGANIZATION INVITATIONS ACTIONS
      // =========================================================================

      fetchOrgInvitations: async (orgId: number) => {
        set({ isLoadingInvitations: true, error: null });
        try {
          const invitations = await organizationService.getInvitations(orgId);
          set({
            currentOrgInvitations: invitations,
            isLoadingInvitations: false,
          });
        } catch (error: any) {
          set({ error: error.message, isLoadingInvitations: false });
          throw error;
        }
      },

      createInvitation: async (
        orgId: number,
        data: CreateInvitationRequest
      ) => {
        set({ isLoadingInvitations: true, error: null });
        try {
          const invitation = await organizationService.createInvitation(
            orgId,
            data
          );
          await get().fetchOrgInvitations(orgId);
          set({ isLoadingInvitations: false });
          return invitation;
        } catch (error: any) {
          set({ error: error.message, isLoadingInvitations: false });
          throw error;
        }
      },

      revokeInvitation: async (orgId: number, invitationId: number) => {
        set({ isLoadingInvitations: true, error: null });
        try {
          await organizationService.revokeInvitation(orgId, invitationId);
          set({
            currentOrgInvitations: get().currentOrgInvitations.filter(
              (i) => i.id !== invitationId
            ),
            isLoadingInvitations: false,
          });
        } catch (error: any) {
          set({ error: error.message, isLoadingInvitations: false });
          throw error;
        }
      },

      // =========================================================================
      // JOIN ORGANIZATION ACTIONS
      // =========================================================================

      joinByInviteCode: async (inviteCode: string) => {
        set({ isLoading: true, error: null });
        try {
          await organizationService.joinByInviteCode(inviteCode);
          await get().fetchOrganizations();
          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      regenerateInviteCode: async (orgId: number) => {
        set({ isLoadingOrg: true, error: null });
        try {
          const newCode = await organizationService.regenerateInviteCode(orgId);
          if (get().currentOrganization?.id === orgId) {
            set({
              currentOrganization: {
                ...get().currentOrganization!,
                invite_code: newCode,
              },
            });
          }
          set({ isLoadingOrg: false });
          return newCode;
        } catch (error: any) {
          set({ error: error.message, isLoadingOrg: false });
          throw error;
        }
      },

      // =========================================================================
      // WORKSPACE ACTIONS
      // =========================================================================

      fetchWorkspaces: async () => {
        set({ isLoadingWorkspace: true, error: null });
        try {
          const workspaces = await workspaceService.getMyWorkspaces();
          set({ workspaces, isLoadingWorkspace: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingWorkspace: false });
          throw error;
        }
      },

      fetchWorkspace: async (workspaceId: number) => {
        set({ isLoadingWorkspace: true, error: null });
        try {
          const workspace = await workspaceService.getById(workspaceId);
          set({ currentWorkspace: workspace, isLoadingWorkspace: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingWorkspace: false });
          throw error;
        }
      },

      updateWorkspace: async (
        workspaceId: number,
        data: UpdateWorkspaceRequest
      ) => {
        set({ isLoadingWorkspace: true, error: null });
        try {
          const updated = await workspaceService.update(workspaceId, data);
          set({ currentWorkspace: updated, isLoadingWorkspace: false });
          await get().fetchWorkspaces();
        } catch (error: any) {
          set({ error: error.message, isLoadingWorkspace: false });
          throw error;
        }
      },

      deleteWorkspace: async (workspaceId: number) => {
        set({ isLoadingWorkspace: true, error: null });
        try {
          await workspaceService.delete(workspaceId);
          set({
            currentWorkspace: null,
            workspaces: get().workspaces.filter((w) => w.id !== workspaceId),
            isLoadingWorkspace: false,
          });
        } catch (error: any) {
          set({ error: error.message, isLoadingWorkspace: false });
          throw error;
        }
      },

      // =========================================================================
      // WORKSPACE MEMBERS ACTIONS
      // =========================================================================

      fetchWorkspaceMembers: async (workspaceId: number) => {
        set({ isLoadingMembers: true, error: null });
        try {
          const members = await workspaceService.getMembers(workspaceId);
          set({ currentWorkspaceMembers: members, isLoadingMembers: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingMembers: false });
          throw error;
        }
      },

      addWorkspaceMember: async (
        workspaceId: number,
        data: AddWorkspaceMemberRequest
      ) => {
        set({ isLoadingMembers: true, error: null });
        try {
          await workspaceService.addMember(workspaceId, data);
          await get().fetchWorkspaceMembers(workspaceId);
          set({ isLoadingMembers: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingMembers: false });
          throw error;
        }
      },

      updateWorkspaceMember: async (
        workspaceId: number,
        userId: number,
        roleId: number
      ) => {
        set({ isLoadingMembers: true, error: null });
        try {
          await workspaceService.updateMember(workspaceId, userId, {
            role_id: roleId,
          });
          await get().fetchWorkspaceMembers(workspaceId);
          set({ isLoadingMembers: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingMembers: false });
          throw error;
        }
      },

      removeWorkspaceMember: async (workspaceId: number, userId: number) => {
        set({ isLoadingMembers: true, error: null });
        try {
          await workspaceService.removeMember(workspaceId, userId);
          set({
            currentWorkspaceMembers: get().currentWorkspaceMembers.filter(
              (m) => m.user_id !== userId
            ),
            isLoadingMembers: false,
          });
        } catch (error: any) {
          set({ error: error.message, isLoadingMembers: false });
          throw error;
        }
      },

      // =========================================================================
      // HELPERS
      // =========================================================================

      setCurrentOrganization: (org: Organization | null) => {
        set({ currentOrganization: org });
      },

      setCurrentWorkspace: (workspace: Workspace | null) => {
        set({ currentWorkspace: workspace });
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set(initialState);
      },
    }),
    { name: "organization-store" }
  )
);

/**
 * Auth Context
 * Manages authentication state, user info, and permissions across the app
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  organizationService,
  workspaceService,
  type OrganizationListItem,
  type WorkspaceListItem,
} from "../services";

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string; // system role: "admin" | "member"
  is_active: boolean;
}

export interface UserOrganization extends OrganizationListItem {
  is_owner: boolean;
}

export interface UserWorkspace extends WorkspaceListItem {
  organization_name: string;
}

export interface UserPermissions {
  isSystemAdmin: boolean;
  // Organization permissions (for current selected org)
  isOrgOwner: boolean;
  isOrgAdmin: boolean;
  isOrgMember: boolean;
  // Workspace permissions (for current selected workspace)
  isWorkspaceAdmin: boolean;
  isWorkspaceMember: boolean;
  // Derived permissions
  canCreateOrganization: boolean;
  canManageOrgSettings: boolean;
  canManageOrgMembers: boolean;
  canCreateWorkspace: boolean;
  canManageWorkspaceSettings: boolean;
  canManageWorkspaceMembers: boolean;
  canViewAllTasks: boolean;
  canDeleteAnyTask: boolean;
}

export interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  loading: boolean; // Alias for isLoading for convenience

  // User info
  user: User | null;
  organizations: UserOrganization[];
  workspaces: UserWorkspace[];

  // Current selection
  currentOrgId: number | null;
  currentWorkspaceId: number | null;

  // Permissions
  permissions: UserPermissions;

  // Actions
  login: (
    accessToken: string,
    refreshToken: string,
    userId: number,
    email: string
  ) => Promise<void>;
  logout: () => void;
  refreshUserContext: () => Promise<void>;
  refreshUserData: () => Promise<void>; // Alias for refreshUserContext + fetch user
  setCurrentOrg: (orgId: number | null) => void;
  setCurrentWorkspace: (workspaceId: number | null) => void;

  // Helpers
  getOrgRole: (orgId: number) => string | null;
  getWorkspaceRole: (workspaceId: number) => string | null;
  isOrgOwner: (orgId: number) => boolean;
  isWorkspaceAdmin: (workspaceId: number) => boolean;
}

// Default permissions (no access)
const defaultPermissions: UserPermissions = {
  isSystemAdmin: false,
  isOrgOwner: false,
  isOrgAdmin: false,
  isOrgMember: false,
  isWorkspaceAdmin: false,
  isWorkspaceMember: false,
  canCreateOrganization: true, // All users can create orgs
  canManageOrgSettings: false,
  canManageOrgMembers: false,
  canCreateWorkspace: false,
  canManageWorkspaceSettings: false,
  canManageWorkspaceMembers: false,
  canViewAllTasks: false,
  canDeleteAnyTask: false,
};

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
  initialAuthenticated?: boolean;
}

export function AuthProvider({
  children,
  initialAuthenticated = false,
}: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [isLoading, setIsLoading] = useState(!initialAuthenticated); // Skip loading if already authenticated
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<number | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number | null>(
    null
  );

  // Calculate permissions based on current context
  const permissions = React.useMemo<UserPermissions>(() => {
    if (!user) return defaultPermissions;

    const isSystemAdmin = user.role === "admin";

    // Get current org info
    const currentOrg = currentOrgId
      ? organizations.find((o) => o.id === currentOrgId)
      : null;
    const orgRole = currentOrg?.role || null;
    const isOrgOwner = currentOrg?.is_owner || orgRole === "owner";
    const isOrgAdmin = isOrgOwner || orgRole === "admin";
    const isOrgMember = isOrgAdmin || orgRole === "member";

    // Get current workspace info
    const currentWs = currentWorkspaceId
      ? workspaces.find((w) => w.id === currentWorkspaceId)
      : null;
    const isWsAdmin = currentWs?.is_admin || false;
    const isWsMember = Boolean(currentWs);

    return {
      isSystemAdmin,
      isOrgOwner,
      isOrgAdmin,
      isOrgMember,
      isWorkspaceAdmin: isWsAdmin,
      isWorkspaceMember: isWsMember,
      canCreateOrganization: true,
      canManageOrgSettings: isSystemAdmin || isOrgOwner,
      canManageOrgMembers: isSystemAdmin || isOrgAdmin,
      canCreateWorkspace: isSystemAdmin || isOrgAdmin,
      canManageWorkspaceSettings: isSystemAdmin || isOrgOwner || isWsAdmin,
      canManageWorkspaceMembers: isSystemAdmin || isOrgAdmin || isWsAdmin,
      canViewAllTasks: isSystemAdmin,
      canDeleteAnyTask: isSystemAdmin,
    };
  }, [user, organizations, workspaces, currentOrgId, currentWorkspaceId]);

  // Load user context (orgs, workspaces)
  const loadUserContext = useCallback(async () => {
    try {
      const [orgsResult, wsResult] = await Promise.all([
        organizationService.getMyOrganizations().catch(() => []),
        workspaceService.getMyWorkspaces().catch(() => []),
      ]);

      // Map organizations with is_owner flag
      const orgsWithOwner: UserOrganization[] = orgsResult.map((org) => ({
        ...org,
        is_owner: org.role === "owner",
      }));
      setOrganizations(orgsWithOwner);

      // Map workspaces
      const wsWithOrg: UserWorkspace[] = wsResult.map((ws) => ({
        ...ws,
        organization_name: ws.organization_name || "",
      }));
      setWorkspaces(wsWithOrg);

      // Restore saved selections
      const savedOrgId = localStorage.getItem("current_org_id");
      const savedWsId = localStorage.getItem("current_workspace_id");

      // Set organization
      let selectedOrgId: number | null = null;
      if (
        savedOrgId &&
        orgsWithOwner.some((o) => o.id === parseInt(savedOrgId))
      ) {
        selectedOrgId = parseInt(savedOrgId);
        setCurrentOrgId(selectedOrgId);
      } else if (orgsWithOwner.length > 0) {
        selectedOrgId = orgsWithOwner[0].id;
        setCurrentOrgId(selectedOrgId);
      }

      // Set workspace - always select first available if none saved
      // Filter workspaces by selected org
      const orgWorkspaces = selectedOrgId
        ? wsWithOrg.filter((w) => w.organization_id === selectedOrgId)
        : wsWithOrg;

      let selectedWsId: number | null = null;
      if (
        savedWsId &&
        orgWorkspaces.some((w) => w.id === parseInt(savedWsId))
      ) {
        selectedWsId = parseInt(savedWsId);
        setCurrentWorkspaceId(selectedWsId);
      } else if (orgWorkspaces.length > 0) {
        // Auto-select first workspace if none saved
        selectedWsId = orgWorkspaces[0].id;
        setCurrentWorkspaceId(selectedWsId);
        localStorage.setItem("current_workspace_id", selectedWsId.toString());
      }

      // Update credentials in main process with org/ws context
      try {
        const existingCreds = await window.electronAPI.auth.getCredentials();
        if (existingCreds) {
          await window.electronAPI.auth.setCredentials({
            ...existingCreds,
            organizationId: selectedOrgId,
            workspaceId: selectedWsId,
          });
        }
      } catch (error) {
        console.error(
          "Failed to update credentials with org/ws context:",
          error
        );
      }
    } catch (error) {
      console.error("Failed to load user context:", error);
    }
  }, []);

  // Initial auth check
  useEffect(() => {
    const checkAuth = async () => {
      // If already authenticated (from parent), just load user data
      if (initialAuthenticated) {
        try {
          const { authService } = await import("../services/authService");
          const response = await authService.me();

          if (response.success && response.data) {
            setUser({
              id: response.data.id,
              email: response.data.email,
              first_name: response.data.first_name,
              last_name: response.data.last_name,
              role: response.data.role || "member",
              is_active: response.data.is_active ?? true,
            });
            setIsAuthenticated(true);
            await loadUserContext();
          }
        } catch (error) {
          console.error("Failed to load user data:", error);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Normal auth check flow
      try {
        const credentials = await window.electronAPI.auth.getCredentials();
        if (credentials?.accessToken) {
          const { authService } = await import("../services/authService");
          const response = await authService.me();

          if (response.success && response.data) {
            setUser({
              id: response.data.id,
              email: response.data.email,
              first_name: response.data.first_name,
              last_name: response.data.last_name,
              role: response.data.role || "member",
              is_active: response.data.is_active ?? true,
            });
            setIsAuthenticated(true);
            await loadUserContext();
          } else {
            await window.electronAPI.auth.clear();
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        await window.electronAPI.auth.clear();
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [loadUserContext, initialAuthenticated]);

  // Login handler
  const login = useCallback(
    async (
      accessToken: string,
      refreshToken: string,
      userId: number,
      email: string
    ) => {
      await window.electronAPI.auth.setCredentials({
        accessToken,
        refreshToken,
        userId,
        email,
      });

      // Fetch user info
      const { authService } = await import("../services/authService");
      const response = await authService.me();

      if (response.success && response.data) {
        setUser({
          id: response.data.id,
          email: response.data.email,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          role: response.data.role || "member",
          is_active: response.data.is_active ?? true,
        });
        setIsAuthenticated(true);
        await loadUserContext();
      }
    },
    [loadUserContext]
  );

  // Logout handler (synchronous to match interface)
  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setOrganizations([]);
    setWorkspaces([]);
    setCurrentOrgId(null);
    setCurrentWorkspaceId(null);
    localStorage.removeItem("current_org_id");
    localStorage.removeItem("current_workspace_id");
  }, []);

  // Refresh user context
  const refreshUserContext = useCallback(async () => {
    await loadUserContext();
  }, [loadUserContext]);

  // Refresh user data - fetch user info + orgs/workspaces
  const refreshUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { authService } = await import("../services/authService");
      const response = await authService.me();

      if (response.success && response.data) {
        setUser({
          id: response.data.id,
          email: response.data.email,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          role: response.data.role || "member",
          is_active: response.data.is_active ?? true,
        });
        setIsAuthenticated(true);
        await loadUserContext();
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadUserContext]);

  // Set current organization
  const setCurrentOrg = useCallback(
    async (orgId: number | null) => {
      setCurrentOrgId(orgId);
      let newWorkspaceId: number | null = null;

      if (orgId) {
        localStorage.setItem("current_org_id", orgId.toString());

        // Auto-select first workspace of the new org
        const orgWorkspaces = workspaces.filter(
          (w) => w.organization_id === orgId
        );
        if (orgWorkspaces.length > 0) {
          newWorkspaceId = orgWorkspaces[0].id;
          setCurrentWorkspaceId(newWorkspaceId);
          localStorage.setItem(
            "current_workspace_id",
            newWorkspaceId.toString()
          );
        } else {
          setCurrentWorkspaceId(null);
          localStorage.removeItem("current_workspace_id");
        }
      } else {
        localStorage.removeItem("current_org_id");
        // Reset workspace when org is deselected
        setCurrentWorkspaceId(null);
        localStorage.removeItem("current_workspace_id");
      }

      // Update credentials in main process to include org/ws context
      try {
        const existingCreds = await window.electronAPI.auth.getCredentials();
        if (existingCreds) {
          await window.electronAPI.auth.setCredentials({
            ...existingCreds,
            organizationId: orgId,
            workspaceId: newWorkspaceId,
          });
        }
      } catch (error) {
        console.error(
          "Failed to update credentials with org/ws context:",
          error
        );
      }
    },
    [workspaces]
  );

  // Set current workspace
  const setCurrentWorkspace = useCallback(
    async (workspaceId: number | null) => {
      setCurrentWorkspaceId(workspaceId);
      if (workspaceId) {
        localStorage.setItem("current_workspace_id", workspaceId.toString());
      } else {
        localStorage.removeItem("current_workspace_id");
      }

      // Update credentials in main process to include workspace context
      try {
        const existingCreds = await window.electronAPI.auth.getCredentials();
        if (existingCreds) {
          await window.electronAPI.auth.setCredentials({
            ...existingCreds,
            workspaceId: workspaceId,
          });
        }
      } catch (error) {
        console.error(
          "Failed to update credentials with workspace context:",
          error
        );
      }
    },
    []
  );

  // Helper: Get user's role in organization
  const getOrgRole = useCallback(
    (orgId: number): string | null => {
      const org = organizations.find((o) => o.id === orgId);
      return org?.role || null;
    },
    [organizations]
  );

  // Helper: Get user's role in workspace
  const getWorkspaceRole = useCallback(
    (workspaceId: number): string | null => {
      const ws = workspaces.find((w) => w.id === workspaceId);
      return ws?.role_name || null;
    },
    [workspaces]
  );

  // Helper: Check if user is org owner
  const isOrgOwnerFn = useCallback(
    (orgId: number): boolean => {
      const org = organizations.find((o) => o.id === orgId);
      return org?.is_owner || org?.role === "owner";
    },
    [organizations]
  );

  // Helper: Check if user is workspace admin
  const isWorkspaceAdminFn = useCallback(
    (workspaceId: number): boolean => {
      const ws = workspaces.find((w) => w.id === workspaceId);
      return ws?.is_admin || false;
    },
    [workspaces]
  );

  const value: AuthContextType = {
    isAuthenticated,
    loading: isLoading,
    user,
    organizations,
    workspaces,
    currentOrgId,
    currentWorkspaceId,
    permissions,
    login,
    logout,
    refreshUserContext,
    refreshUserData,
    setCurrentOrg,
    setCurrentWorkspace,
    getOrgRole,
    getWorkspaceRole,
    isOrgOwner: isOrgOwnerFn,
    isWorkspaceAdmin: isWorkspaceAdminFn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Export context for advanced usage
export { AuthContext };

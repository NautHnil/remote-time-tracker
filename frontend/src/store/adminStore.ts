/**
 * Admin Store
 * Zustand store for admin panel state management
 */

import { create } from "zustand";
import { adminService } from "../services/adminService";
import type {
  AdminActivityStats,
  AdminOrganization,
  AdminOrgDetail,
  AdminOrgFilterParams,
  AdminOrgStats,
  AdminOverviewStats,
  AdminPagination,
  AdminScreenshot,
  AdminScreenshotFilterParams,
  AdminTask,
  AdminTaskDetail,
  AdminTaskFilterParams,
  AdminTimeLog,
  AdminTimeLogDetail,
  AdminTimeLogFilterParams,
  AdminTrendFilterParams,
  AdminTrendStats,
  AdminUser,
  AdminUserDetail,
  AdminUserFilterParams,
  AdminUserPerformance,
  AdminWorkspace,
  AdminWorkspaceDetail,
  AdminWorkspaceFilterParams,
} from "../types/admin";

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface AdminState {
  // Users
  users: AdminUser[];
  usersPagination: AdminPagination | null;
  selectedUser: AdminUserDetail | null;
  usersLoading: boolean;
  usersError: string | null;

  // Organizations
  organizations: AdminOrganization[];
  orgsPagination: AdminPagination | null;
  selectedOrg: AdminOrgDetail | null;
  orgsLoading: boolean;
  orgsError: string | null;

  // Workspaces
  workspaces: AdminWorkspace[];
  workspacesPagination: AdminPagination | null;
  selectedWorkspace: AdminWorkspaceDetail | null;
  workspacesLoading: boolean;
  workspacesError: string | null;

  // Tasks
  tasks: AdminTask[];
  tasksPagination: AdminPagination | null;
  selectedTask: AdminTaskDetail | null;
  tasksLoading: boolean;
  tasksError: string | null;

  // Time Logs
  timeLogs: AdminTimeLog[];
  timeLogsPagination: AdminPagination | null;
  selectedTimeLog: AdminTimeLogDetail | null;
  timeLogsLoading: boolean;
  timeLogsError: string | null;

  // Screenshots
  screenshots: AdminScreenshot[];
  screenshotsPagination: AdminPagination | null;
  selectedScreenshot: AdminScreenshot | null;
  screenshotsLoading: boolean;
  screenshotsError: string | null;

  // Statistics
  overviewStats: AdminOverviewStats | null;
  trendStats: AdminTrendStats | null;
  userPerformance: AdminUserPerformance[];
  orgStats: AdminOrgStats | null;
  activityStats: AdminActivityStats | null;
  statsLoading: boolean;
  statsError: string | null;

  // Actions
  // Users
  fetchUsers: (params?: AdminUserFilterParams) => Promise<void>;
  fetchUser: (id: number) => Promise<void>;
  createUser: (data: any) => Promise<boolean>;
  updateUser: (id: number, data: any) => Promise<boolean>;
  deleteUser: (id: number) => Promise<boolean>;
  activateUser: (id: number, active: boolean) => Promise<boolean>;
  changeUserRole: (id: number, role: string) => Promise<boolean>;
  changeUserSystemRole: (id: number, systemRole: string) => Promise<boolean>;

  // Organizations
  fetchOrganizations: (params?: AdminOrgFilterParams) => Promise<void>;
  fetchOrganization: (id: number) => Promise<void>;
  updateOrganization: (id: number, data: any) => Promise<boolean>;
  deleteOrganization: (id: number) => Promise<boolean>;
  verifyOrganization: (id: number, verified: boolean) => Promise<boolean>;

  // Workspaces
  fetchWorkspaces: (params?: AdminWorkspaceFilterParams) => Promise<void>;
  fetchWorkspace: (id: number) => Promise<void>;
  updateWorkspace: (id: number, data: any) => Promise<boolean>;
  deleteWorkspace: (id: number) => Promise<boolean>;
  archiveWorkspace: (id: number, archived: boolean) => Promise<boolean>;

  // Tasks
  fetchTasks: (params?: AdminTaskFilterParams) => Promise<void>;
  fetchTask: (id: number) => Promise<void>;
  updateTask: (id: number, data: any) => Promise<boolean>;
  deleteTask: (id: number) => Promise<boolean>;

  // Time Logs
  fetchTimeLogs: (params?: AdminTimeLogFilterParams) => Promise<void>;
  fetchTimeLog: (id: number) => Promise<void>;
  updateTimeLog: (id: number, data: any) => Promise<boolean>;
  deleteTimeLog: (id: number) => Promise<boolean>;
  approveTimeLogs: (ids: number[], approved: boolean) => Promise<boolean>;

  // Screenshots
  fetchScreenshots: (params?: AdminScreenshotFilterParams) => Promise<void>;
  fetchScreenshot: (id: number) => Promise<void>;
  deleteScreenshot: (id: number) => Promise<boolean>;
  bulkDeleteScreenshots: (ids: number[]) => Promise<boolean>;

  // Statistics
  fetchOverviewStats: () => Promise<void>;
  fetchTrendStats: (params?: AdminTrendFilterParams) => Promise<void>;
  fetchUserPerformance: (limit?: number) => Promise<void>;
  fetchOrgStats: () => Promise<void>;
  fetchActivityStats: () => Promise<void>;

  // Reset
  resetState: () => void;
  clearSelectedUser: () => void;
  clearSelectedOrg: () => void;
  clearSelectedWorkspace: () => void;
  clearSelectedTask: () => void;
  clearSelectedTimeLog: () => void;
  clearSelectedScreenshot: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  users: [],
  usersPagination: null,
  selectedUser: null,
  usersLoading: false,
  usersError: null,

  organizations: [],
  orgsPagination: null,
  selectedOrg: null,
  orgsLoading: false,
  orgsError: null,

  workspaces: [],
  workspacesPagination: null,
  selectedWorkspace: null,
  workspacesLoading: false,
  workspacesError: null,

  tasks: [],
  tasksPagination: null,
  selectedTask: null,
  tasksLoading: false,
  tasksError: null,

  timeLogs: [],
  timeLogsPagination: null,
  selectedTimeLog: null,
  timeLogsLoading: false,
  timeLogsError: null,

  screenshots: [],
  screenshotsPagination: null,
  selectedScreenshot: null,
  screenshotsLoading: false,
  screenshotsError: null,

  overviewStats: null,
  trendStats: null,
  userPerformance: [],
  orgStats: null,
  activityStats: null,
  statsLoading: false,
  statsError: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useAdminStore = create<AdminState>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // USERS
  // ==========================================================================

  fetchUsers: async (params = {}) => {
    set({ usersLoading: true, usersError: null });
    try {
      const response = await adminService.getUsers(params);
      if (response.success && response.data) {
        set({
          users: response.data.users || [],
          usersPagination: response.data.pagination,
          usersLoading: false,
        });
      } else {
        set({
          usersError: response.message || "Failed to fetch users",
          usersLoading: false,
        });
      }
    } catch (error: any) {
      set({
        usersError: error.message || "Failed to fetch users",
        usersLoading: false,
      });
    }
  },

  fetchUser: async (id: number) => {
    set({ usersLoading: true, usersError: null });
    try {
      const response = await adminService.getUser(id);
      if (response.success && response.data) {
        set({
          selectedUser: response.data as AdminUserDetail,
          usersLoading: false,
        });
      } else {
        set({
          usersError: response.message || "Failed to fetch user",
          usersLoading: false,
        });
      }
    } catch (error: any) {
      set({
        usersError: error.message || "Failed to fetch user",
        usersLoading: false,
      });
    }
  },

  createUser: async (data: any) => {
    try {
      const response = await adminService.createUser(data);
      if (response.success) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  updateUser: async (id: number, data: any) => {
    try {
      const response = await adminService.updateUser(id, data);
      if (response.success) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteUser: async (id: number) => {
    try {
      const response = await adminService.deleteUser(id);
      if (response.success) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  activateUser: async (id: number, active: boolean) => {
    try {
      const response = await adminService.activateUser(id, active);
      if (response.success) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  changeUserRole: async (id: number, role: string) => {
    try {
      const response = await adminService.changeUserRole(id, role);
      if (response.success) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  changeUserSystemRole: async (id: number, systemRole: string) => {
    try {
      const response = await adminService.changeUserSystemRole(id, systemRole);
      if (response.success) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  fetchOrganizations: async (params = {}) => {
    set({ orgsLoading: true, orgsError: null });
    try {
      const response = await adminService.getOrganizations(params);
      if (response.success && response.data) {
        set({
          organizations: response.data.organizations || [],
          orgsPagination: response.data.pagination,
          orgsLoading: false,
        });
      } else {
        set({
          orgsError: response.message || "Failed to fetch organizations",
          orgsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        orgsError: error.message || "Failed to fetch organizations",
        orgsLoading: false,
      });
    }
  },

  fetchOrganization: async (id: number) => {
    set({ orgsLoading: true, orgsError: null });
    try {
      const response = await adminService.getOrganization(id);
      if (response.success && response.data) {
        set({
          selectedOrg: response.data as AdminOrgDetail,
          orgsLoading: false,
        });
      } else {
        set({
          orgsError: response.message || "Failed to fetch organization",
          orgsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        orgsError: error.message || "Failed to fetch organization",
        orgsLoading: false,
      });
    }
  },

  updateOrganization: async (id: number, data: any) => {
    try {
      const response = await adminService.updateOrganization(id, data);
      if (response.success) {
        await get().fetchOrganizations();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteOrganization: async (id: number) => {
    try {
      const response = await adminService.deleteOrganization(id);
      if (response.success) {
        await get().fetchOrganizations();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  verifyOrganization: async (id: number, verified: boolean) => {
    try {
      const response = await adminService.verifyOrganization(id, verified);
      if (response.success) {
        await get().fetchOrganizations();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // ==========================================================================
  // WORKSPACES
  // ==========================================================================

  fetchWorkspaces: async (params = {}) => {
    set({ workspacesLoading: true, workspacesError: null });
    try {
      const response = await adminService.getWorkspaces(params);
      if (response.success && response.data) {
        set({
          workspaces: response.data.workspaces || [],
          workspacesPagination: response.data.pagination,
          workspacesLoading: false,
        });
      } else {
        set({
          workspacesError: response.message || "Failed to fetch workspaces",
          workspacesLoading: false,
        });
      }
    } catch (error: any) {
      set({
        workspacesError: error.message || "Failed to fetch workspaces",
        workspacesLoading: false,
      });
    }
  },

  fetchWorkspace: async (id: number) => {
    set({ workspacesLoading: true, workspacesError: null });
    try {
      const response = await adminService.getWorkspace(id);
      if (response.success && response.data) {
        set({
          selectedWorkspace: response.data as AdminWorkspaceDetail,
          workspacesLoading: false,
        });
      } else {
        set({
          workspacesError: response.message || "Failed to fetch workspace",
          workspacesLoading: false,
        });
      }
    } catch (error: any) {
      set({
        workspacesError: error.message || "Failed to fetch workspace",
        workspacesLoading: false,
      });
    }
  },

  updateWorkspace: async (id: number, data: any) => {
    try {
      const response = await adminService.updateWorkspace(id, data);
      if (response.success) {
        await get().fetchWorkspaces();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteWorkspace: async (id: number) => {
    try {
      const response = await adminService.deleteWorkspace(id);
      if (response.success) {
        await get().fetchWorkspaces();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  archiveWorkspace: async (id: number, archived: boolean) => {
    try {
      const response = await adminService.archiveWorkspace(id, archived);
      if (response.success) {
        await get().fetchWorkspaces();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // ==========================================================================
  // TASKS
  // ==========================================================================

  fetchTasks: async (params = {}) => {
    set({ tasksLoading: true, tasksError: null });
    try {
      const response = await adminService.getTasks(params);
      if (response.success && response.data) {
        set({
          tasks: response.data.tasks || [],
          tasksPagination: response.data.pagination,
          tasksLoading: false,
        });
      } else {
        set({
          tasksError: response.message || "Failed to fetch tasks",
          tasksLoading: false,
        });
      }
    } catch (error: any) {
      set({
        tasksError: error.message || "Failed to fetch tasks",
        tasksLoading: false,
      });
    }
  },

  fetchTask: async (id: number) => {
    set({ tasksLoading: true, tasksError: null });
    try {
      const response = await adminService.getTask(id);
      if (response.success && response.data) {
        set({
          selectedTask: response.data as AdminTaskDetail,
          tasksLoading: false,
        });
      } else {
        set({
          tasksError: response.message || "Failed to fetch task",
          tasksLoading: false,
        });
      }
    } catch (error: any) {
      set({
        tasksError: error.message || "Failed to fetch task",
        tasksLoading: false,
      });
    }
  },

  updateTask: async (id: number, data: any) => {
    try {
      const response = await adminService.updateTask(id, data);
      if (response.success) {
        await get().fetchTasks();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteTask: async (id: number) => {
    try {
      const response = await adminService.deleteTask(id);
      if (response.success) {
        await get().fetchTasks();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // ==========================================================================
  // TIME LOGS
  // ==========================================================================

  fetchTimeLogs: async (params = {}) => {
    set({ timeLogsLoading: true, timeLogsError: null });
    try {
      const response = await adminService.getTimeLogs(params);
      if (response.success && response.data) {
        set({
          timeLogs: response.data.timelogs || [],
          timeLogsPagination: response.data.pagination,
          timeLogsLoading: false,
        });
      } else {
        set({
          timeLogsError: response.message || "Failed to fetch time logs",
          timeLogsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        timeLogsError: error.message || "Failed to fetch time logs",
        timeLogsLoading: false,
      });
    }
  },

  fetchTimeLog: async (id: number) => {
    set({ timeLogsLoading: true, timeLogsError: null });
    try {
      const response = await adminService.getTimeLog(id);
      if (response.success && response.data) {
        set({
          selectedTimeLog: response.data as AdminTimeLogDetail,
          timeLogsLoading: false,
        });
      } else {
        set({
          timeLogsError: response.message || "Failed to fetch time log",
          timeLogsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        timeLogsError: error.message || "Failed to fetch time log",
        timeLogsLoading: false,
      });
    }
  },

  updateTimeLog: async (id: number, data: any) => {
    try {
      const response = await adminService.updateTimeLog(id, data);
      if (response.success) {
        await get().fetchTimeLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteTimeLog: async (id: number) => {
    try {
      const response = await adminService.deleteTimeLog(id);
      if (response.success) {
        await get().fetchTimeLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  approveTimeLogs: async (ids: number[], approved: boolean) => {
    try {
      const response = await adminService.approveTimeLogs(ids, approved);
      if (response.success) {
        await get().fetchTimeLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // ==========================================================================
  // SCREENSHOTS
  // ==========================================================================

  fetchScreenshots: async (params = {}) => {
    set({ screenshotsLoading: true, screenshotsError: null });
    try {
      const response = await adminService.getScreenshots(params);
      if (response.success && response.data) {
        set({
          screenshots: response.data.screenshots || [],
          screenshotsPagination: response.data.pagination,
          screenshotsLoading: false,
        });
      } else {
        set({
          screenshotsError: response.message || "Failed to fetch screenshots",
          screenshotsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        screenshotsError: error.message || "Failed to fetch screenshots",
        screenshotsLoading: false,
      });
    }
  },

  fetchScreenshot: async (id: number) => {
    set({ screenshotsLoading: true, screenshotsError: null });
    try {
      const response = await adminService.getScreenshot(id);
      if (response.success && response.data) {
        set({ selectedScreenshot: response.data, screenshotsLoading: false });
      } else {
        set({
          screenshotsError: response.message || "Failed to fetch screenshot",
          screenshotsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        screenshotsError: error.message || "Failed to fetch screenshot",
        screenshotsLoading: false,
      });
    }
  },

  deleteScreenshot: async (id: number) => {
    try {
      const response = await adminService.deleteScreenshot(id);
      if (response.success) {
        await get().fetchScreenshots();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  bulkDeleteScreenshots: async (ids: number[]) => {
    try {
      const response = await adminService.bulkDeleteScreenshots(ids);
      if (response.success) {
        await get().fetchScreenshots();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  fetchOverviewStats: async () => {
    set({ statsLoading: true, statsError: null });
    try {
      const response = await adminService.getOverviewStats();
      const rawData: any = response?.data;
      const payload = rawData?.stats ?? rawData?.overview ?? rawData;
      const isSuccess = response?.success !== false;
      if (isSuccess && payload) {
        set({ overviewStats: payload, statsLoading: false });
      } else {
        set({
          statsError: response?.message || "Failed to fetch stats",
          statsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        statsError: error.message || "Failed to fetch stats",
        statsLoading: false,
      });
    }
  },

  fetchTrendStats: async (params = {}) => {
    set({ statsLoading: true, statsError: null });
    try {
      const response = await adminService.getTrendStats(params);
      if (response.success && response.data) {
        set({ trendStats: response.data, statsLoading: false });
      } else {
        set({
          statsError: response.message || "Failed to fetch trends",
          statsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        statsError: error.message || "Failed to fetch trends",
        statsLoading: false,
      });
    }
  },

  fetchUserPerformance: async (limit = 10) => {
    set({ statsLoading: true, statsError: null });
    try {
      const response = await adminService.getUserPerformance(limit);
      const rawData: any = response?.data;
      const payload = rawData?.items ?? rawData?.users ?? rawData ?? [];
      const isSuccess = response?.success !== false;
      if (isSuccess && Array.isArray(payload)) {
        set({ userPerformance: payload, statsLoading: false });
      } else {
        set({
          statsError: response?.message || "Failed to fetch performance",
          statsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        statsError: error.message || "Failed to fetch performance",
        statsLoading: false,
      });
    }
  },

  fetchOrgStats: async () => {
    set({ statsLoading: true, statsError: null });
    try {
      const response = await adminService.getOrgDistribution();
      if (response.success && response.data) {
        set({ orgStats: response.data, statsLoading: false });
      } else {
        set({
          statsError: response.message || "Failed to fetch org stats",
          statsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        statsError: error.message || "Failed to fetch org stats",
        statsLoading: false,
      });
    }
  },

  fetchActivityStats: async () => {
    set({ statsLoading: true, statsError: null });
    try {
      const response = await adminService.getActivityStats();
      if (response.success && response.data) {
        set({ activityStats: response.data, statsLoading: false });
      } else {
        set({
          statsError: response.message || "Failed to fetch activity stats",
          statsLoading: false,
        });
      }
    } catch (error: any) {
      set({
        statsError: error.message || "Failed to fetch activity stats",
        statsLoading: false,
      });
    }
  },

  // ==========================================================================
  // RESET
  // ==========================================================================

  resetState: () => set(initialState),

  clearSelectedUser: () => set({ selectedUser: null }),
  clearSelectedOrg: () => set({ selectedOrg: null }),
  clearSelectedWorkspace: () => set({ selectedWorkspace: null }),
  clearSelectedTask: () => set({ selectedTask: null }),
  clearSelectedTimeLog: () => set({ selectedTimeLog: null }),
  clearSelectedScreenshot: () => set({ selectedScreenshot: null }),
}));

export default useAdminStore;

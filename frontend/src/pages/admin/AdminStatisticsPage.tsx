/**
 * Admin Statistics Page
 * System-wide statistics and reports dashboard
 */

import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { useMemo, useState } from "react";
import { Icons } from "../../components/Icons";
import { Input, Select } from "../../components/ui";
import { adminService } from "../../services/adminService";
import { useAuthStore } from "../../store/authStore";
import type { AdminOrganization, AdminUser, AdminWorkspace } from "../../types/admin";

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  description?: string;
  color: "blue" | "green" | "purple" | "orange" | "red" | "cyan";
}

function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = "neutral",
  description,
  color,
}: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      icon: "bg-blue-100 text-blue-600",
      text: "text-blue-600",
    },
    green: {
      bg: "bg-green-50",
      icon: "bg-green-100 text-green-600",
      text: "text-green-600",
    },
    purple: {
      bg: "bg-purple-50",
      icon: "bg-purple-100 text-purple-600",
      text: "text-purple-600",
    },
    orange: {
      bg: "bg-orange-50",
      icon: "bg-orange-100 text-orange-600",
      text: "text-orange-600",
    },
    red: {
      bg: "bg-red-50",
      icon: "bg-red-100 text-red-600",
      text: "text-red-600",
    },
    cyan: {
      bg: "bg-cyan-50",
      icon: "bg-cyan-100 text-cyan-600",
      text: "text-cyan-600",
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} rounded-xl p-6 border border-gray-100`}>
      <div className="flex items-center justify-between">
        <div className={`${classes.icon} p-3 rounded-lg`}>
          <Icon className="h-6 w-6" />
        </div>
        {change && (
          <span
            className={`text-xs font-medium ${
              changeType === "increase"
                ? "text-green-600"
                : changeType === "decrease"
                  ? "text-red-600"
                  : "text-gray-600"
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">{title}</p>
        <p className={`text-3xl font-bold ${classes.text} mt-1`}>{value}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

interface ActivityChartProps {
  hourlyStats: Array<{ hour: number; count: number }>;
  peakHour: number;
  peakHourCount: number;
}

function ActivityChart({
  hourlyStats,
  peakHour,
  peakHourCount,
}: ActivityChartProps) {
  const maxCount = Math.max(...hourlyStats.map((item) => item.count), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Activity Overview
        </h3>
        <p className="text-sm text-gray-500">
          Peak hour: {peakHourCount > 0 ? `${peakHour}:00` : "N/A"}
        </p>
      </div>
      <div className="h-64 rounded-lg border border-gray-100 bg-gray-50/70 p-4">
        <div className="flex h-full items-end gap-2">
          {hourlyStats.map((item) => {
            const height = Math.max((item.count / maxCount) * 100, 4);
            const isPeak = item.hour === peakHour && item.count === peakHourCount;

            return (
              <div
                key={item.hour}
                className="flex flex-1 flex-col items-center justify-end gap-2"
                title={`${item.hour}:00 - ${item.count} events`}
              >
                <div className="w-full rounded-t-md bg-blue-100">
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isPeak ? "bg-blue-600" : "bg-blue-400"
                    }`}
                    style={{ height: `${height}%`, minHeight: item.count > 0 ? 10 : 4 }}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{item.hour}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Total peak events: {peakHourCount}
        </div>
      </div>
    </div>
  );
}

// Recent Activity List
interface RecentActivityProps {
  isLoading?: boolean;
  activities: Array<{
    id: number;
    type: string;
    user: string;
    action: string;
    time: string;
  }>;
}

function RecentActivity({ activities, isLoading = false }: RecentActivityProps) {
  const getTone = (type: string) => {
    switch (type) {
      case "error":
        return "bg-red-100 text-red-600";
      case "warn":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-blue-100 text-blue-600";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recent Activity
      </h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <Icons.Activity className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getTone(
                  activity.type,
                )}`}
              >
                <Icons.Activity className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user}</span>{" "}
                  {activity.action}
                </p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Top Users Table - matches AdminUserPerformance interface
interface TopUser {
  user_id: number;
  user_name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  total_duration: number;
  approved_duration?: number;
  total_hours?: number;
  task_count: number;
  session_count?: number;
  approved_sessions?: number;
  active_days?: number;
  avg_daily_duration?: number;
  avg_session_duration?: number;
  screenshot_count?: number;
  last_activity_at?: string | null;
  total_tasks?: number;
  rank: number;
}

interface TopUsersTableProps {
  users: TopUser[];
  isLoading: boolean;
  filters: React.ReactNode;
}

function TopUsersTable({ users, isLoading, filters }: TopUsersTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Top Users By Tracked Time
        </h3>
        {filters}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <Icons.Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No tracked time data</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours Tracked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Screenshots
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.slice(0, 10).map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-primary-700">
                          {user.rank}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.user_name ||
                            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                            "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {user.total_hours?.toFixed(1) ||
                        (user.total_duration / 3600).toFixed(1)}
                      h
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {user.total_tasks || user.task_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {user.screenshot_count ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_activity_at
                      ? format(new Date(user.last_activity_at), "MMM d, HH:mm")
                      : "No activity"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface TrackerOverviewProps {
  users: TopUser[];
  isLoading: boolean;
  filters: React.ReactNode;
}

function formatDurationHours(seconds: number | undefined): string {
  const safeSeconds = Number(seconds || 0);
  return `${(safeSeconds / 3600).toFixed(1)}h`;
}

function formatDurationCompact(seconds: number | undefined): string {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function TrackerOverview({
  users,
  isLoading,
  filters,
}: TrackerOverviewProps) {
  const summary = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        acc.totalDuration += Number(user.total_duration || 0);
        acc.approvedDuration += Number(user.approved_duration || 0);
        acc.totalSessions += Number(user.session_count || 0);
        acc.activeDays += Number(user.active_days || 0);
        return acc;
      },
      { totalDuration: 0, approvedDuration: 0, totalSessions: 0, activeDays: 0 },
    );
  }, [users]);

  const avgHoursPerUser =
    users.length > 0 ? summary.totalDuration / users.length / 3600 : 0;

  const approvalRate =
    summary.totalDuration > 0
      ? Math.round((summary.approvedDuration / summary.totalDuration) * 100)
      : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Tracker Overview For Selected Range
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Use these numbers to review tracked workload across the selected range.
            </p>
          </div>
          {filters}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Users in report</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Total tracked</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatDurationHours(summary.totalDuration)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Approved tracked</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatDurationHours(summary.approvedDuration)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Sessions logged</p>
            <p className="text-2xl font-semibold text-gray-900">
              {summary.totalSessions.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Avg tracked per user</p>
            <p className="text-2xl font-semibold text-gray-900">
              {avgHoursPerUser.toFixed(1)}h
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Approval rate {approvalRate}% • Active days {summary.activeDays}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatsFilterState {
  orgId: string;
  workspaceId: string;
  userId: string;
}

interface BoxFiltersProps {
  organizations: AdminOrganization[];
  workspaces: AdminWorkspace[];
  users: AdminUser[];
  value: StatsFilterState;
  onChange: (next: StatsFilterState) => void;
}

function BoxFilters({
  organizations,
  workspaces,
  users,
  value,
  onChange,
}: BoxFiltersProps) {
  const filteredWorkspaces = useMemo(() => {
    if (!value.orgId) return workspaces;
    return workspaces.filter((ws) => String(ws.organization_id) === value.orgId);
  }, [workspaces, value.orgId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Select
        value={value.orgId}
        onChange={(e) =>
          onChange({
            ...value,
            orgId: e.target.value,
            workspaceId: "",
          })
        }
      >
        <option value="">All Organizations</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </Select>
      <Select
        value={value.workspaceId}
        onChange={(e) =>
          onChange({
            ...value,
            workspaceId: e.target.value,
          })
        }
      >
        <option value="">All Workspaces</option>
        {filteredWorkspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </Select>
      <Select
        value={value.userId}
        onChange={(e) =>
          onChange({
            ...value,
            userId: e.target.value,
          })
        }
      >
        <option value="">All Users</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.full_name || `${user.first_name} ${user.last_name}`}
          </option>
        ))}
      </Select>
    </div>
  );
}

interface UserPerformanceTableProps {
  users: TopUser[];
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  filters: React.ReactNode;
}

function UserPerformanceTable({
  users,
  search,
  onSearchChange,
  isLoading,
  filters,
}: UserPerformanceTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            User Time Tracker Performance
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Detailed per-user breakdown for tracked work review.
          </p>
        </div>
        {filters}
        <div className="w-full lg:w-72">
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Icons.Search className="h-4 w-4" />}
            placeholder="Filter by user or email"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <Icons.Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No user matches the selected range</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg/Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg/Session
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Screenshots
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const approvalRate =
                  Number(user.total_duration || 0) > 0
                    ? Math.round(
                        (Number(user.approved_duration || 0) /
                          Number(user.total_duration || 0)) *
                          100,
                      )
                    : 0;

                return (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.user_name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDurationHours(user.total_duration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDurationHours(user.approved_duration)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {approvalRate}% approved
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.session_count ?? 0}
                      <div className="text-xs text-gray-500">
                        {user.approved_sessions ?? 0} approved
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.active_days ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDurationCompact(user.avg_daily_duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDurationCompact(user.avg_session_duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.task_count || user.total_tasks || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.screenshot_count ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_activity_at
                        ? format(new Date(user.last_activity_at), "MMM d, yyyy HH:mm")
                        : "No activity"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminStatisticsPage() {
  const user = useAuthStore((state) => state.user);
  const isSystemAdmin = user?.system_role === "admin" || user?.role === "admin";
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });
  const [userSearch, setUserSearch] = useState("");
  const [overviewFilters, setOverviewFilters] = useState<StatsFilterState>({
    orgId: "",
    workspaceId: "",
    userId: "",
  });
  const [topUsersFilters, setTopUsersFilters] = useState<StatsFilterState>({
    orgId: "",
    workspaceId: "",
    userId: "",
  });
  const [performanceFilters, setPerformanceFilters] = useState<StatsFilterState>({
    orgId: "",
    workspaceId: "",
    userId: "",
  });

  // Fetch system stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isSystemAdmin,
    queryFn: async () => {
      const response = await adminService.getSystemStats();
      return response.data;
    },
  });

  const { data: activityStats, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-activity-stats"],
    enabled: isSystemAdmin,
    queryFn: async () => {
      const response = await adminService.getActivityStats();
      return response.data;
    },
  });

  const { data: recentLogs, isLoading: recentLogsLoading } = useQuery({
    queryKey: ["admin-recent-system-activity"],
    enabled: isSystemAdmin,
    queryFn: async () => {
      const response = await adminService.getSystemLogs({
        page: 1,
        page_size: 8,
        sort_by: "created_at",
        sort_order: "desc",
      });
      return response.data?.system_logs || [];
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users-stats-options"],
    enabled: isSystemAdmin,
    queryFn: async () => {
      const response = await adminService.getUsers({ page: 1, page_size: 200 });
      return response.data?.users || [];
    },
  });

  const { data: orgsData } = useQuery({
    queryKey: ["admin-orgs-stats-options"],
    queryFn: async () => {
      const response = await adminService.getOrganizations({
        page: 1,
        page_size: 200,
      });
      return response.data?.organizations || [];
    },
  });

  const { data: workspacesData } = useQuery({
    queryKey: ["admin-workspaces-stats-options"],
    queryFn: async () => {
      const response = await adminService.getWorkspaces({
        page: 1,
        page_size: 200,
      });
      return response.data?.workspaces || [];
    },
  });

  const buildPerformanceFilters = (filters: StatsFilterState) => ({
    start_date: dateRange.start,
    end_date: dateRange.end,
    org_id: filters.orgId ? Number(filters.orgId) : undefined,
    workspace_id: filters.workspaceId ? Number(filters.workspaceId) : undefined,
    user_id: filters.userId ? Number(filters.userId) : undefined,
  });

  const { data: overviewActivities, isLoading: overviewLoading } = useQuery({
    queryKey: [
      "admin-overview-user-activities",
      dateRange,
      overviewFilters,
    ],
    queryFn: async () => {
      const response = await adminService.getUserPerformance(
        100,
        buildPerformanceFilters(overviewFilters),
      );
      return { users: response.data || [] };
    },
  });

  const { data: topUsersActivities, isLoading: topUsersLoading } = useQuery({
    queryKey: [
      "admin-top-users-activities",
      dateRange,
      topUsersFilters,
    ],
    queryFn: async () => {
      const response = await adminService.getUserPerformance(
        100,
        buildPerformanceFilters(topUsersFilters),
      );
      return { users: response.data || [] };
    },
  });

  const { data: performanceActivities, isLoading: performanceLoading } = useQuery({
    queryKey: [
      "admin-user-performance-activities",
      dateRange,
      performanceFilters,
    ],
    queryFn: async () => {
      const response = await adminService.getUserPerformance(
        100,
        buildPerformanceFilters(performanceFilters),
      );
      return { users: response.data || [] };
    },
  });

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatHours = (hours: number | undefined): string => {
    if (hours === undefined || hours === null) return "0h";
    if (hours >= 1000) return `${(hours / 1000).toFixed(1)}K h`;
    return `${hours.toFixed(1)}h`;
  };

  const recentActivities =
    recentLogs?.map((log) => ({
      id: log.id,
      type: log.level || "info",
      user: log.user_name || log.user_email || log.source || "System",
      action: `${log.component ? `[${log.component}] ` : ""}${log.message}`,
      time: format(new Date(log.occurred_at), "MMM d, yyyy HH:mm"),
    })) || [];

  const scopedUsers = useMemo(() => {
    const byID = new Map<number, AdminUser>();
    const sourceLists = [
      overviewActivities?.users || [],
      topUsersActivities?.users || [],
      performanceActivities?.users || [],
    ];

    sourceLists.flat().forEach((item) => {
      if (!byID.has(item.user_id)) {
        const [firstName = "", ...lastNameParts] = (item.user_name || "").split(" ");
        byID.set(item.user_id, {
          id: item.user_id,
          email: item.email,
          first_name: item.first_name || firstName,
          last_name: item.last_name || lastNameParts.join(" "),
          full_name: item.user_name,
          role: "user",
          system_role: "member",
          is_active: true,
          last_login_at: null,
          created_at: "",
          updated_at: "",
        });
      }
    });

    return Array.from(byID.values());
  }, [
    overviewActivities?.users,
    topUsersActivities?.users,
    performanceActivities?.users,
  ]);

  const users = isSystemAdmin
    ? ((usersData || []) as AdminUser[])
    : scopedUsers;
  const organizations = (orgsData || []) as AdminOrganization[];
  const workspaces = (workspacesData || []) as AdminWorkspace[];

  const filteredPerformanceUsers = useMemo(() => {
    const list = performanceActivities?.users || [];
    const search = userSearch.trim().toLowerCase();
    if (!search) return list;

    return list.filter((user) =>
      [user.user_name, user.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search)),
    );
  }, [performanceActivities?.users, userSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSystemAdmin ? "System Statistics" : "Team Statistics"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isSystemAdmin
              ? "Overview of system activity and performance"
              : "Tracked work statistics for members in organizations and workspaces you own"}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="w-36"
            />
            <span className="text-gray-400">to</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="w-36"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {isSystemAdmin && (
        statsLoading || activityLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={formatNumber(stats?.total_users)}
            icon={Icons.Users}
            change={
              stats?.new_users_this_week
                ? `+${stats.new_users_this_week} this week`
                : undefined
            }
            changeType="increase"
            color="blue"
          />
          <StatCard
            title="Enabled Accounts"
            value={formatNumber(stats?.active_users)}
            icon={Icons.UserCheck}
            description="Accounts currently enabled in the system"
            color="green"
          />
          <StatCard
            title="Users With Activity Today"
            value={formatNumber(activityStats?.users_with_activity_today)}
            icon={Icons.Activity}
            description="Users who logged work today"
            color="cyan"
          />
          <StatCard
            title="Working Right Now"
            value={formatNumber(activityStats?.working_users_realtime)}
            icon={Icons.Timer}
            description="Users with fresh working heartbeat"
            color="green"
          />
          <StatCard
            title="Organizations"
            value={formatNumber(stats?.total_organizations)}
            icon={Icons.Building2}
            change={
              stats?.orgs_growth !== undefined
                ? `${stats.orgs_growth >= 0 ? "+" : ""}${stats.orgs_growth}%`
                : undefined
            }
            changeType={
              stats?.orgs_growth !== undefined && stats.orgs_growth >= 0
                ? "increase"
                : "decrease"
            }
            color="purple"
          />
          <StatCard
            title="Workspaces"
            value={formatNumber(stats?.total_workspaces)}
            icon={Icons.FolderKanban}
            change={
              stats?.workspaces_growth !== undefined
                ? `${stats.workspaces_growth >= 0 ? "+" : ""}${stats.workspaces_growth}%`
                : undefined
            }
            changeType={
              stats?.workspaces_growth !== undefined &&
              stats.workspaces_growth >= 0
                ? "increase"
                : "decrease"
            }
            color="cyan"
          />
          <StatCard
            title="Total Tasks"
            value={formatNumber(stats?.total_tasks)}
            icon={Icons.ListTodo}
            change={
              stats?.tasks_growth !== undefined
                ? `${stats.tasks_growth >= 0 ? "+" : ""}${stats.tasks_growth}%`
                : undefined
            }
            changeType={
              stats?.tasks_growth !== undefined && stats.tasks_growth >= 0
                ? "increase"
                : "decrease"
            }
            color="orange"
          />
          <StatCard
            title="Time Logs"
            value={formatNumber(stats?.total_timelogs)}
            icon={Icons.Clock}
            change={
              stats?.timelogs_growth !== undefined
                ? `${stats.timelogs_growth >= 0 ? "+" : ""}${stats.timelogs_growth}%`
                : undefined
            }
            changeType={
              stats?.timelogs_growth !== undefined && stats.timelogs_growth >= 0
                ? "increase"
                : "decrease"
            }
            color="blue"
          />
          <StatCard
            title="Screenshots"
            value={formatNumber(stats?.total_screenshots)}
            icon={Icons.Camera}
            change={
              stats?.screenshots_growth !== undefined
                ? `${stats.screenshots_growth >= 0 ? "+" : ""}${stats.screenshots_growth}%`
                : undefined
            }
            changeType={
              stats?.screenshots_growth !== undefined &&
              stats.screenshots_growth >= 0
                ? "increase"
                : "decrease"
            }
            color="purple"
          />
          <StatCard
            title="Total Hours Tracked"
            value={formatHours(
              stats?.total_tracked_hours ||
                (stats?.total_duration ? stats.total_duration / 3600 : 0),
            )}
            icon={Icons.Timer}
            color="green"
          />
          </div>
        )
      )}

      {/* Charts and Activity */}
      {isSystemAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityChart
            hourlyStats={activityStats?.activity_by_hour || []}
            peakHour={activityStats?.peak_hour || 0}
            peakHourCount={activityStats?.peak_hour_count || 0}
          />
          <RecentActivity
            isLoading={recentLogsLoading}
            activities={recentActivities}
          />
        </div>
      )}

      <TrackerOverview
        users={overviewActivities?.users || []}
        isLoading={overviewLoading}
        filters={
          <BoxFilters
            organizations={organizations}
            workspaces={workspaces}
            users={users}
            value={overviewFilters}
            onChange={setOverviewFilters}
          />
        }
      />

      {/* Top Users */}
      <TopUsersTable
        users={(topUsersActivities?.users || []).slice(0, 10)}
        isLoading={topUsersLoading}
        filters={
          <BoxFilters
            organizations={organizations}
            workspaces={workspaces}
            users={users}
            value={topUsersFilters}
            onChange={setTopUsersFilters}
          />
        }
      />

      <UserPerformanceTable
        users={filteredPerformanceUsers}
        search={userSearch}
        onSearchChange={setUserSearch}
        isLoading={performanceLoading}
        filters={
          <BoxFilters
            organizations={organizations}
            workspaces={workspaces}
            users={users}
            value={performanceFilters}
            onChange={setPerformanceFilters}
          />
        }
      />
    </div>
  );
}

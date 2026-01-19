# TODO 12: Frontend Admin Dashboard

## Mục tiêu

Tạo dashboard tổng quan cho admin panel hiển thị các metrics quan trọng của hệ thống.

## Yêu cầu

### 1. Dashboard Widgets

- Summary Cards (Users, Orgs, Workspaces, Tasks)
- Time tracking overview
- Storage usage
- Active sessions
- Recent activity
- Trend charts (users, activity)

### 2. Features

- Real-time data refresh
- Period selector (Today, Week, Month)
- Quick actions
- System health status

## Files cần tạo

```
frontend/src/pages/admin/AdminDashboard.tsx
frontend/src/components/admin/dashboard/StatsCard.tsx
frontend/src/components/admin/dashboard/ActivityChart.tsx
frontend/src/components/admin/dashboard/RecentActivity.tsx
frontend/src/components/admin/dashboard/OnlineUsers.tsx
frontend/src/services/adminService.ts
frontend/src/hooks/useAdminStats.ts
```

## Tasks chi tiết

### Task 12.1: Tạo Admin Service

```tsx
// frontend/src/services/adminService.ts
import api from "./api";

export interface OverviewStats {
  total_users: number;
  active_users: number;
  new_users_today: number;
  new_users_this_week: number;
  total_organizations: number;
  active_organizations: number;
  verified_organizations: number;
  total_workspaces: number;
  active_workspaces: number;
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  total_timelogs: number;
  total_duration: number;
  total_duration_human: string;
  today_duration: number;
  week_duration: number;
  month_duration: number;
  total_screenshots: number;
  total_storage_size: number;
  total_storage_human: string;
  active_sessions_now: number;
  user_growth_rate: number;
  org_growth_rate: number;
  activity_growth_rate: number;
}

export interface ActivityStats {
  today_timelogs: number;
  today_duration: number;
  today_screenshots: number;
  today_active_users: number;
  week_timelogs: number;
  week_duration: number;
  week_screenshots: number;
  activity_by_hour: { hour: number; timelogs: number; duration: number }[];
  activity_by_day: {
    date: string;
    timelogs: number;
    duration: number;
    duration_human: string;
  }[];
  peak_hour: number;
  peak_hour_count: number;
  avg_session_duration: number;
}

export interface RealtimeStats {
  active_sessions: number;
  online_users: OnlineUser[];
  recent_activity: RecentActivityItem[];
  system_health: SystemHealth;
}

export interface OnlineUser {
  user_id: number;
  email: string;
  user_name: string;
  current_task: string;
  session_start: string;
  duration: number;
  device_name: string;
}

export interface RecentActivityItem {
  timestamp: string;
  user_email: string;
  action: string;
  description: string;
}

export interface SystemHealth {
  database_status: string;
  storage_used: number;
  storage_total: number;
  storage_percent: number;
  api_response_time: number;
  error_rate: number;
  uptime: number;
}

export const adminService = {
  // Statistics
  getOverviewStats: () =>
    api.get<{ data: OverviewStats }>("/api/v1/admin/statistics/overview"),

  getUserStats: () => api.get<{ data: any }>("/api/v1/admin/statistics/users"),

  getOrgStats: () =>
    api.get<{ data: any }>("/api/v1/admin/statistics/organizations"),

  getActivityStats: () =>
    api.get<{ data: ActivityStats }>("/api/v1/admin/statistics/activity"),

  getRealtimeStats: () =>
    api.get<{ data: RealtimeStats }>("/api/v1/admin/statistics/realtime"),

  getTrendStats: (params: {
    period: string;
    start_date: string;
    end_date: string;
  }) => api.get<{ data: any }>("/api/v1/admin/statistics/trends", { params }),

  // Users
  getUsers: (params: any) =>
    api.get<{ data: any }>("/api/v1/admin/users", { params }),

  getUser: (id: number) => api.get<{ data: any }>(`/api/v1/admin/users/${id}`),

  createUser: (data: any) =>
    api.post<{ data: any }>("/api/v1/admin/users", data),

  updateUser: (id: number, data: any) =>
    api.put<{ data: any }>(`/api/v1/admin/users/${id}`, data),

  deleteUser: (id: number) =>
    api.delete<{ data: any }>(`/api/v1/admin/users/${id}`),

  // Organizations
  getOrganizations: (params: any) =>
    api.get<{ data: any }>("/api/v1/admin/organizations", { params }),

  getOrganization: (id: number) =>
    api.get<{ data: any }>(`/api/v1/admin/organizations/${id}`),

  updateOrganization: (id: number, data: any) =>
    api.put<{ data: any }>(`/api/v1/admin/organizations/${id}`, data),

  deleteOrganization: (id: number) =>
    api.delete<{ data: any }>(`/api/v1/admin/organizations/${id}`),

  // Similar methods for workspaces, tasks, timelogs, screenshots...
};
```

### Task 12.2: Tạo Admin Dashboard Page

```tsx
// frontend/src/pages/admin/AdminDashboard.tsx
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import StatsCard from "../../components/admin/dashboard/StatsCard";
import ActivityChart from "../../components/admin/dashboard/ActivityChart";
import RecentActivity from "../../components/admin/dashboard/RecentActivity";
import OnlineUsers from "../../components/admin/dashboard/OnlineUsers";
import {
  UsersIcon,
  BuildingOfficeIcon,
  FolderIcon,
  ClockIcon,
  PhotoIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

const AdminDashboard: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  const { data: overviewStats, isLoading: overviewLoading } = useQuery({
    queryKey: ["admin", "overview-stats"],
    queryFn: async () => {
      const response = await adminService.getOverviewStats();
      return response.data.data;
    },
    refetchInterval: refreshInterval,
  });

  const { data: activityStats, isLoading: activityLoading } = useQuery({
    queryKey: ["admin", "activity-stats"],
    queryFn: async () => {
      const response = await adminService.getActivityStats();
      return response.data.data;
    },
    refetchInterval: refreshInterval,
  });

  const { data: realtimeStats } = useQuery({
    queryKey: ["admin", "realtime-stats"],
    queryFn: async () => {
      const response = await adminService.getRealtimeStats();
      return response.data.data;
    },
    refetchInterval: 10000, // 10 seconds for realtime
  });

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">System overview and statistics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value={10000}>Refresh: 10s</option>
            <option value={30000}>Refresh: 30s</option>
            <option value={60000}>Refresh: 1m</option>
            <option value={300000}>Refresh: 5m</option>
          </select>
          <div className="flex items-center text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            {realtimeStats?.active_sessions || 0} active sessions
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Users"
          value={formatNumber(overviewStats?.total_users || 0)}
          change={overviewStats?.user_growth_rate}
          icon={UsersIcon}
          color="blue"
          subtext={`${overviewStats?.active_users || 0} active`}
        />
        <StatsCard
          title="Organizations"
          value={formatNumber(overviewStats?.total_organizations || 0)}
          change={overviewStats?.org_growth_rate}
          icon={BuildingOfficeIcon}
          color="purple"
          subtext={`${overviewStats?.verified_organizations || 0} verified`}
        />
        <StatsCard
          title="Workspaces"
          value={formatNumber(overviewStats?.total_workspaces || 0)}
          icon={FolderIcon}
          color="green"
          subtext={`${overviewStats?.active_workspaces || 0} active`}
        />
        <StatsCard
          title="Tasks"
          value={formatNumber(overviewStats?.total_tasks || 0)}
          icon={ClockIcon}
          color="orange"
          subtext={`${overviewStats?.completed_tasks || 0} completed`}
        />
      </div>

      {/* Time Tracking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">
            Today's Activity
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Duration</span>
              <span className="text-xl font-bold text-gray-900">
                {formatDuration(activityStats?.today_duration || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Time Logs</span>
              <span className="text-lg font-semibold text-gray-900">
                {activityStats?.today_timelogs || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Users</span>
              <span className="text-lg font-semibold text-gray-900">
                {activityStats?.today_active_users || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Screenshots</span>
              <span className="text-lg font-semibold text-gray-900">
                {activityStats?.today_screenshots || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">This Week</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Duration</span>
              <span className="text-xl font-bold text-gray-900">
                {formatDuration(activityStats?.week_duration || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Time Logs</span>
              <span className="text-lg font-semibold text-gray-900">
                {activityStats?.week_timelogs || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Screenshots</span>
              <span className="text-lg font-semibold text-gray-900">
                {activityStats?.week_screenshots || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Peak Hour</span>
              <span className="text-lg font-semibold text-gray-900">
                {activityStats?.peak_hour || 0}:00
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Storage</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Size</span>
              <span className="text-xl font-bold text-gray-900">
                {overviewStats?.total_storage_human || "0 B"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Screenshots</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatNumber(overviewStats?.total_screenshots || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(realtimeStats?.system_health?.storage_percent || 0, 100)}%`,
                }}
              />
            </div>
            <div className="text-xs text-gray-500 text-right">
              {realtimeStats?.system_health?.storage_percent?.toFixed(1) || 0}%
              used
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart data={activityStats?.activity_by_day || []} />
        <OnlineUsers users={realtimeStats?.online_users || []} />
      </div>

      {/* Recent Activity */}
      <RecentActivity activities={realtimeStats?.recent_activity || []} />
    </div>
  );
};

export default AdminDashboard;
```

### Task 12.3: Tạo Stats Card Component

```tsx
// frontend/src/components/admin/dashboard/StatsCard.tsx
import React from "react";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<any>;
  color: "blue" | "purple" | "green" | "orange" | "red";
  subtext?: string;
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "bg-purple-100 text-purple-600",
  },
  green: {
    bg: "bg-green-50",
    icon: "bg-green-100 text-green-600",
  },
  orange: {
    bg: "bg-orange-50",
    icon: "bg-orange-100 text-orange-600",
  },
  red: {
    bg: "bg-red-50",
    icon: "bg-red-100 text-red-600",
  },
};

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  subtext,
}) => {
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {change >= 0 ? (
                <>
                  <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">
                    +{change.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">
                    {change.toFixed(1)}%
                  </span>
                </>
              )}
              <span className="text-sm text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
```

### Task 12.4: Tạo Activity Chart Component

```tsx
// frontend/src/components/admin/dashboard/ActivityChart.tsx
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
);

interface ActivityData {
  date: string;
  timelogs: number;
  duration: number;
  duration_human: string;
}

interface ActivityChartProps {
  data: ActivityData[];
}

const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  const chartData = {
    labels: data.slice(-14).map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }),
    datasets: [
      {
        label: "Duration (hours)",
        data: data
          .slice(-14)
          .map((d) => Math.round((d.duration / 3600) * 10) / 10),
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.raw} hours`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Activity Overview
      </h3>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ActivityChart;
```

### Task 12.5: Tạo Online Users Component

```tsx
// frontend/src/components/admin/dashboard/OnlineUsers.tsx
import React from "react";
import { ComputerDesktopIcon } from "@heroicons/react/24/outline";

interface OnlineUser {
  user_id: number;
  email: string;
  user_name: string;
  current_task: string;
  session_start: string;
  duration: number;
  device_name: string;
}

interface OnlineUsersProps {
  users: OnlineUser[];
}

const OnlineUsers: React.FC<OnlineUsersProps> = ({ users }) => {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Online Users</h3>
        <span className="text-sm text-gray-500">{users.length} online</span>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ComputerDesktopIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No users online</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.user_name}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-700">
                  {user.current_task || "No task"}
                </p>
                <p className="text-xs text-gray-500">
                  {user.device_name} • {formatDuration(user.duration)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnlineUsers;
```

## Acceptance Criteria

- [ ] Dashboard hiển thị đầy đủ stats cards
- [ ] Auto-refresh data theo interval đã chọn
- [ ] Activity chart hiển thị đúng dữ liệu
- [ ] Online users list cập nhật realtime
- [ ] Recent activity hiển thị đúng
- [ ] Growth rates hiển thị đúng với trending icons
- [ ] Storage progress bar hiển thị đúng
- [ ] Responsive trên mobile/tablet

## Dependencies

- TODO 11: Frontend Admin Layout

## Estimated Time

- 4-5 giờ

## Notes

- Cần cài đặt thêm chart.js và react-chartjs-2
- Cần cài đặt @tanstack/react-query cho data fetching

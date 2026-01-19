# TODO 19: Frontend Admin Statistics Dashboard

## Mục tiêu

Tạo trang thống kê toàn diện cho admin panel với charts và reports.

## Yêu cầu

### 1. Features

- Overview statistics cards
- User growth chart
- Activity trend chart
- Organization distribution
- Time tracking analytics
- Top performers
- Export reports

### 2. Report Types

- Daily/Weekly/Monthly activity
- User productivity
- Organization usage
- Workspace activity
- Time distribution

## Files cần tạo

```
frontend/src/pages/admin/AdminStatisticsPage.tsx
frontend/src/components/admin/statistics/UserGrowthChart.tsx
frontend/src/components/admin/statistics/ActivityTrendChart.tsx
frontend/src/components/admin/statistics/OrgDistributionChart.tsx
frontend/src/components/admin/statistics/TopPerformers.tsx
frontend/src/components/admin/statistics/TimeDistributionChart.tsx
frontend/src/components/admin/statistics/DateRangePicker.tsx
```

## Tasks chi tiết

### Task 19.1: Tạo Admin Statistics Page

```tsx
// frontend/src/pages/admin/AdminStatisticsPage.tsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import UserGrowthChart from "../../components/admin/statistics/UserGrowthChart";
import ActivityTrendChart from "../../components/admin/statistics/ActivityTrendChart";
import OrgDistributionChart from "../../components/admin/statistics/OrgDistributionChart";
import TopPerformers from "../../components/admin/statistics/TopPerformers";
import TimeDistributionChart from "../../components/admin/statistics/TimeDistributionChart";
import DateRangePicker from "../../components/admin/statistics/DateRangePicker";
import { toast } from "react-hot-toast";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

type DateRange = "today" | "week" | "month" | "quarter" | "year" | "custom";

const AdminStatisticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Get date range params
  const getDateParams = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "quarter":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "year":
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "custom":
        startDate = customStart ? new Date(customStart) : new Date();
        endDate = customEnd ? new Date(customEnd) : new Date();
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
    }

    return {
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    };
  };

  const dateParams = getDateParams();

  // Fetch overview stats
  const {
    data: overviewStats,
    isLoading: overviewLoading,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["admin", "statistics", "overview"],
    queryFn: async () => {
      const response = await adminService.getOverviewStats();
      return response.data.data;
    },
  });

  // Fetch trends
  const { data: trendStats, isLoading: trendLoading } = useQuery({
    queryKey: ["admin", "statistics", "trends", dateRange, dateParams],
    queryFn: async () => {
      const response = await adminService.getTrendStats({
        period: dateRange,
        ...dateParams,
      });
      return response.data.data;
    },
  });

  // Fetch user stats
  const { data: userStats, isLoading: userLoading } = useQuery({
    queryKey: ["admin", "statistics", "users", dateRange, dateParams],
    queryFn: async () => {
      const response = await adminService.getUserStats();
      return response.data.data;
    },
  });

  // Fetch org stats
  const { data: orgStats, isLoading: orgLoading } = useQuery({
    queryKey: ["admin", "statistics", "organizations"],
    queryFn: async () => {
      const response = await adminService.getOrgStats();
      return response.data.data;
    },
  });

  // Fetch activity stats
  const { data: activityStats, isLoading: activityLoading } = useQuery({
    queryKey: ["admin", "statistics", "activity"],
    queryFn: async () => {
      const response = await adminService.getActivityStats();
      return response.data.data;
    },
  });

  const handleExportReport = async (type: string) => {
    try {
      toast.loading("Generating report...");
      const response = await adminService.exportReport({
        type,
        ...dateParams,
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-report-${dateParams.start_date}-${dateParams.end_date}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Report exported successfully");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export report");
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Statistics & Reports
          </h1>
          <p className="text-gray-500">
            System analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Date Range Selector */}
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />

          <button
            onClick={() => refetchOverview()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>

          <div className="relative">
            <button className="flex items-center px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export
            </button>
            {/* Dropdown for export options */}
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatNumber(overviewStats?.total_users || 0)}
          </p>
          <p className="text-sm text-green-600 mt-1">
            +{overviewStats?.new_users_this_week || 0} this week
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500">Organizations</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatNumber(overviewStats?.total_organizations || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {overviewStats?.verified_organizations || 0} verified
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500">
            Total Time Tracked
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatDuration(overviewStats?.total_duration || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {formatDuration(overviewStats?.week_duration || 0)} this week
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500">Screenshots</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatNumber(overviewStats?.total_screenshots || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {overviewStats?.total_storage_human || "0 B"} storage
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserGrowthChart
          data={trendStats?.user_growth || []}
          isLoading={trendLoading}
        />
        <ActivityTrendChart
          data={trendStats?.activity_trend || []}
          isLoading={trendLoading}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OrgDistributionChart
          data={orgStats?.size_distribution || []}
          isLoading={orgLoading}
        />
        <TimeDistributionChart
          data={activityStats?.activity_by_hour || []}
          isLoading={activityLoading}
        />
        <TopPerformers
          users={userStats?.top_performers || []}
          isLoading={userLoading}
        />
      </div>

      {/* Detailed Stats Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Workspaces */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Most Active Workspaces
          </h3>
          {orgStats?.top_workspaces && (
            <div className="space-y-3">
              {orgStats.top_workspaces.map((ws: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{ws.name}</p>
                    <p className="text-sm text-gray-500">
                      {ws.organization_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatDuration(ws.total_duration)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {ws.member_count} members
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Activity Summary
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-700">Today's Duration</span>
              <span className="font-bold text-blue-900">
                {formatDuration(activityStats?.today_duration || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-700">Active Users Today</span>
              <span className="font-bold text-green-900">
                {activityStats?.today_active_users || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-purple-700">Screenshots Today</span>
              <span className="font-bold text-purple-900">
                {activityStats?.today_screenshots || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-orange-700">Peak Hour</span>
              <span className="font-bold text-orange-900">
                {activityStats?.peak_hour || 0}:00 (
                {activityStats?.peak_hour_count || 0} logs)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Export Reports
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleExportReport("users")}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <p className="font-medium text-gray-900">Users Report</p>
            <p className="text-sm text-gray-500">
              User activity and statistics
            </p>
          </button>
          <button
            onClick={() => handleExportReport("organizations")}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <p className="font-medium text-gray-900">Organizations Report</p>
            <p className="text-sm text-gray-500">Org usage and metrics</p>
          </button>
          <button
            onClick={() => handleExportReport("timelogs")}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <p className="font-medium text-gray-900">Time Logs Report</p>
            <p className="text-sm text-gray-500">Detailed time tracking data</p>
          </button>
          <button
            onClick={() => handleExportReport("activity")}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <p className="font-medium text-gray-900">Activity Report</p>
            <p className="text-sm text-gray-500">Overall system activity</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminStatisticsPage;
```

### Task 19.2: Tạo User Growth Chart

```tsx
// frontend/src/components/admin/statistics/UserGrowthChart.tsx
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface UserGrowthChartProps {
  data: { date: string; total_users: number; new_users: number }[];
  isLoading: boolean;
}

const UserGrowthChart: React.FC<UserGrowthChartProps> = ({
  data,
  isLoading,
}) => {
  const chartData = {
    labels: data.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }),
    datasets: [
      {
        label: "Total Users",
        data: data.map((d) => d.total_users),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "New Users",
        data: data.map((d) => d.new_users),
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "transparent",
        borderDash: [5, 5],
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default UserGrowthChart;
```

### Task 19.3: Tạo Activity Trend Chart

```tsx
// frontend/src/components/admin/statistics/ActivityTrendChart.tsx
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface ActivityTrendChartProps {
  data: {
    date: string;
    duration: number;
    timelogs: number;
    screenshots: number;
  }[];
  isLoading: boolean;
}

const ActivityTrendChart: React.FC<ActivityTrendChartProps> = ({
  data,
  isLoading,
}) => {
  const chartData = {
    labels: data.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }),
    datasets: [
      {
        label: "Hours",
        data: data.map((d) => Math.round((d.duration / 3600) * 10) / 10),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderRadius: 4,
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
        title: {
          display: true,
          text: "Hours",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Activity Trend
      </h3>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ActivityTrendChart;
```

### Task 19.4: Tạo Top Performers

```tsx
// frontend/src/components/admin/statistics/TopPerformers.tsx
import React from "react";
import { TrophyIcon } from "@heroicons/react/24/outline";

interface TopPerformer {
  user_id: number;
  user_name: string;
  email: string;
  total_duration: number;
  task_count: number;
  rank: number;
}

interface TopPerformersProps {
  users: TopPerformer[];
  isLoading: boolean;
}

const TopPerformers: React.FC<TopPerformersProps> = ({ users, isLoading }) => {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getRankBadge = (rank: number) => {
    const colors = {
      1: "bg-yellow-100 text-yellow-800",
      2: "bg-gray-100 text-gray-800",
      3: "bg-orange-100 text-orange-800",
    };
    return colors[rank as keyof typeof colors] || "bg-blue-100 text-blue-800";
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
        <TrophyIcon className="h-5 w-5 text-yellow-500" />
      </div>

      {users.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No data available</p>
      ) : (
        <div className="space-y-3">
          {users.slice(0, 5).map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <span
                  className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full ${getRankBadge(user.rank)}`}
                >
                  {user.rank}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{user.user_name}</p>
                  <p className="text-xs text-gray-500">
                    {user.task_count} tasks
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">
                  {formatDuration(user.total_duration)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopPerformers;
```

### Task 19.5: Tạo Date Range Picker

```tsx
// frontend/src/components/admin/statistics/DateRangePicker.tsx
import React, { useState } from "react";
import { CalendarIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

type DateRange = "today" | "week" | "month" | "quarter" | "year" | "custom";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const options: { value: DateRange; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "Last 7 days" },
    { value: "month", label: "Last 30 days" },
    { value: "quarter", label: "Last 3 months" },
    { value: "year", label: "Last year" },
    { value: "custom", label: "Custom range" },
  ];

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
      >
        <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
        <span className="text-gray-700">{selectedOption?.label}</span>
        <ChevronDownIcon className="h-4 w-4 ml-2 text-gray-400" />
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-20">
            <div className="p-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    if (option.value !== "custom") {
                      setDropdownOpen(false);
                    }
                  }}
                  className={`
                    w-full text-left px-3 py-2 rounded
                    ${
                      value === option.value
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50 text-gray-700"
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {value === "custom" && (
              <div className="border-t p-3 space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => onCustomStartChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => onCustomEndChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangePicker;
```

## Acceptance Criteria

- [ ] Overview stats cards hiển thị đúng
- [ ] User growth chart hiển thị đúng
- [ ] Activity trend chart hiển thị đúng
- [ ] Organization distribution chart hoạt động
- [ ] Top performers list hiển thị đúng
- [ ] Date range picker hoạt động
- [ ] Export reports hoạt động
- [ ] Custom date range selection
- [ ] Charts responsive

## Dependencies

- TODO 11: Frontend Admin Layout
- TODO 10: Backend Admin Statistics API

## Estimated Time

- 5-6 giờ

## Notes

- Cần cài đặt chart.js và react-chartjs-2
- Có thể thêm thư viện date-fns cho date manipulation

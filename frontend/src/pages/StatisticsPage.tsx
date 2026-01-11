import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfDay, subDays } from "date-fns";
import {
  Activity,
  BarChart3,
  Calendar,
  Camera,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { screenshotService, timeLogService } from "../services";

interface TimeStats {
  total_time_seconds: number;
  total_time_hours: number;
  session_count: number;
  start_date: string;
  end_date: string;
}

interface ScreenshotStats {
  total_count: number;
  total_size: number;
  total_size_bytes: number;
  total_size_mb: number;
  avg_per_session: number;
  session_count: number;
}

type TimeRange = "today" | "week" | "month" | "custom";

export default function StatisticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (timeRange) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "week":
        startDate = subDays(now, 7);
        break;
      case "month":
        startDate = subDays(now, 30);
        break;
      case "custom":
        if (!customStartDate || !customEndDate) {
          startDate = subDays(now, 7);
        } else {
          startDate = parseISO(customStartDate);
          endDate = parseISO(customEndDate);
        }
        break;
      default:
        startDate = subDays(now, 7);
    }

    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
    };
  };

  const dateRange = getDateRange();

  const { data: timeStats, isLoading: timeStatsLoading } = useQuery({
    queryKey: ["timeStats", dateRange.start, dateRange.end],
    queryFn: async () => {
      const response = await timeLogService.getStats(
        dateRange.start,
        dateRange.end
      );
      return response.data as TimeStats;
    },
  });

  const { data: screenshotStats, isLoading: screenshotStatsLoading } = useQuery(
    {
      queryKey: ["screenshotStats", dateRange.start, dateRange.end],
      queryFn: async () => {
        const response = await screenshotService.getStats(
          dateRange.start,
          dateRange.end
        );
        return response.data as ScreenshotStats;
      },
    }
  );

  const formatTimeHMS = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatHoursDisplay = (seconds: number) => {
    return (seconds / 3600).toFixed(2);
  };

  const calculateDailyAverage = () => {
    if (!timeStats) return "N/A";

    const totalTime = timeStats.total_time_seconds;

    if (timeRange === "week") {
      return formatDuration(Math.floor(totalTime / 7));
    } else if (timeRange === "month") {
      return formatDuration(Math.floor(totalTime / 30));
    } else if (timeRange === "today") {
      return formatDuration(totalTime);
    }
    return "N/A";
  };

  const calculateScreenshotRate = () => {
    const totalTime = timeStats?.total_time_seconds || 0;
    if (!totalTime || totalTime === 0) {
      return "0";
    }
    const hoursTracked = totalTime / 3600;
    const screenshotCount = screenshotStats?.total_count || 0;
    return (screenshotCount / hoursTracked).toFixed(1);
  };

  const loading = timeStatsLoading || screenshotStatsLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Statistics</h1>
        <p className="text-gray-600 mt-2">
          Analyze your productivity and time tracking data
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => setTimeRange("today")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === "today"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeRange("week")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === "week"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange("month")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === "month"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange("custom")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === "custom"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Custom Range
          </button>
        </div>

        {timeRange === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading statistics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Hours Tracker Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <Clock className="w-6 h-6 mr-2 text-primary-600" />
              Hours Tracker
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Time Card */}
              <div className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm font-medium">
                    Total Time
                  </span>
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-primary-600 mb-1">
                  {formatTimeHMS(timeStats?.total_time_seconds || 0)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatHoursDisplay(timeStats?.total_time_seconds || 0)} hours
                </div>
              </div>

              {/* Sessions Count Card */}
              <div className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm font-medium">
                    Sessions
                  </span>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {timeStats?.session_count || 0}
                </div>
                <div className="text-sm text-gray-500">tracking sessions</div>
              </div>

              {/* Average Session Card */}
              <div className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm font-medium">
                    Avg. Session
                  </span>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {timeStats?.session_count
                    ? formatDuration(
                        Math.floor(
                          (timeStats.total_time_seconds || 0) /
                            timeStats.session_count
                        )
                      )
                    : "0m"}
                </div>
                <div className="text-sm text-gray-500">per session</div>
              </div>
            </div>
          </div>

          {/* Screenshot Statistics Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <Camera className="w-6 h-6 mr-2 text-primary-600" />
              Screenshot Statistics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Screenshots Card */}
              <div className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm font-medium">
                    Total Screenshots
                  </span>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Camera className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {screenshotStats?.total_count || 0}
                </div>
                <div className="text-sm text-gray-500">captured images</div>
              </div>

              {/* Storage Used Card */}
              <div className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm font-medium">
                    Storage Used
                  </span>
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {formatBytes(screenshotStats?.total_size || 0)}
                </div>
                <div className="text-sm text-gray-500">disk space</div>
              </div>

              {/* Avg per Session Card */}
              <div className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm font-medium">
                    Avg. per Session
                  </span>
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-pink-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-pink-600 mb-1">
                  {(screenshotStats?.avg_per_session || 0).toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">screenshots</div>
              </div>
            </div>
          </div>

          {/* Productivity Insights */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
              Productivity Insights
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-gray-800 font-medium">Daily Average</div>
                  <div className="text-sm text-gray-500">
                    Time tracked per day
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary-600">
                    {calculateDailyAverage()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-gray-800 font-medium">
                    Screenshot Rate
                  </div>
                  <div className="text-sm text-gray-500">Images per hour</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-600">
                    {calculateScreenshotRate()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-gray-800 font-medium">
                    Most Productive Day
                  </div>
                  <div className="text-sm text-gray-500">
                    Based on tracked time
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-600">
                    Coming Soon
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Date Range Info */}
          <div className="card bg-primary-50 border border-primary-200 text-center">
            <div className="flex items-center justify-center gap-2 text-primary-700">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">
                Showing statistics from{" "}
                <span className="font-semibold">{dateRange.start}</span> to{" "}
                <span className="font-semibold">{dateRange.end}</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

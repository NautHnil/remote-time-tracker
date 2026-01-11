import {
  differenceInDays,
  format,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { useEffect, useState } from "react";
import { screenshotService, timeLogService } from "../services";
import { formatDuration } from "../utils/timeFormat";
import { Icons } from "./Icons";

interface TimeStats {
  totalTimeSeconds: number;
  totalTimeHours: number;
  sessionCount: number;
  startDate: string;
  endDate: string;
  dailyBreakdown?: DailyStats[];
}

interface DailyStats {
  date: string;
  totalSeconds: number;
  sessionCount: number;
}

interface ScreenshotStats {
  total_count?: number;
  totalCount?: number;
  total_size?: number;
  totalSize?: number;
  avg_per_session?: number;
  avgPerSession?: number;
  session_count?: number;
  screenshots_by_date?: Record<string, number>;
  screenshots_by_task?: Record<number, number>;
  start_date?: string;
  end_date?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

type TimeRange = "today" | "week" | "month" | "custom";

export default function StatisticsView() {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null);
  const [screenshotStats, setScreenshotStats] =
    useState<ScreenshotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    loadStats();
  }, [timeRange, customStartDate, customEndDate]);

  const getDateRange = () => {
    const nowMs = Date.now();
    let startDate: Date;
    let endDate = new Date(nowMs);

    switch (timeRange) {
      case "today":
        startDate = startOfDay(nowMs);
        break;
      case "week":
        startDate = subDays(nowMs, 7);
        break;
      case "month":
        startDate = subDays(nowMs, 30);
        break;
      case "custom":
        if (!customStartDate || !customEndDate) return null;
        startDate = parseISO(customStartDate);
        endDate = parseISO(customEndDate);
        break;
      default:
        startDate = subDays(nowMs, 7);
    }

    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
    };
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();
      if (!dateRange) return;

      // Fetch time statistics
      const timeStatsResponse = await timeLogService.getStats(
        dateRange.start,
        dateRange.end
      );

      if (timeStatsResponse.success) {
        setTimeStats({
          totalTimeSeconds: timeStatsResponse.data.total_time_seconds || 0,
          totalTimeHours: timeStatsResponse.data.total_time_hours || 0,
          sessionCount: timeStatsResponse.data.session_count || 0,
          startDate: dateRange.start,
          endDate: dateRange.end,
        });
      }

      // Fetch screenshot statistics
      const screenshotStatsResponse = await screenshotService.getStats(
        dateRange.start,
        dateRange.end
      );

      if (screenshotStatsResponse.success) {
        setScreenshotStats(screenshotStatsResponse.data);
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatTotalTimeHMS = () => {
    const totalSeconds = timeStats?.totalTimeSeconds || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  const formatHoursDisplay = () => {
    const totalSeconds = timeStats?.totalTimeSeconds || 0;
    return (totalSeconds / 3600).toFixed(2);
  };

  const calculateAverageSession = () => {
    if (!timeStats?.sessionCount) {
      return "0 min";
    }
    const totalTime = timeStats.totalTimeSeconds || 0;
    const avgSeconds = totalTime / timeStats.sessionCount;
    return formatDuration(avgSeconds * 1000, { format: "short", maxUnits: 2 });
  };

  const calculateDailyAverage = () => {
    if (!timeStats) return "N/A";

    const totalTime = timeStats.totalTimeSeconds || 0;
    let avgSeconds = 0;
    if (timeRange === "week") {
      avgSeconds = totalTime / 7;
    } else if (timeRange === "month") {
      avgSeconds = totalTime / 30;
    } else if (timeRange === "today") {
      avgSeconds = totalTime;
    } else if (
      timeRange === "custom" &&
      timeStats.startDate &&
      timeStats.endDate
    ) {
      const days =
        differenceInDays(
          parseISO(timeStats.endDate),
          parseISO(timeStats.startDate)
        ) + 1; // +1 để bao gồm cả ngày cuối
      avgSeconds = totalTime / days;
    } else {
      return "N/A";
    }

    return formatDuration(avgSeconds * 1000, { format: "short", maxUnits: 2 });
  };

  const calculateScreenshotRate = () => {
    const totalTime = timeStats?.totalTimeSeconds || 0;
    const totalHours = totalTime / 3600;
    if (!totalHours || totalHours === 0) {
      return "0";
    }
    const screenshotCount =
      screenshotStats?.total_count || screenshotStats?.totalCount || 0;
    return (screenshotCount / totalHours).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-500/20 rounded-xl mb-3 animate-pulse">
            <Icons.Chart className="w-6 h-6 text-primary-400" />
          </div>
          <div className="text-dark-300">Loading statistics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="glass-dark rounded-xl p-4 border border-dark-800/50">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setTimeRange("today")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              timeRange === "today"
                ? "bg-primary-500 text-white shadow-lg"
                : "bg-dark-800/50 text-dark-300 hover:bg-dark-800 hover:text-dark-100"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeRange("week")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              timeRange === "week"
                ? "bg-primary-500 text-white shadow-lg"
                : "bg-dark-800/50 text-dark-300 hover:bg-dark-800 hover:text-dark-100"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange("month")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              timeRange === "month"
                ? "bg-primary-500 text-white shadow-lg"
                : "bg-dark-800/50 text-dark-300 hover:bg-dark-800 hover:text-dark-100"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange("custom")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              timeRange === "custom"
                ? "bg-primary-500 text-white shadow-lg"
                : "bg-dark-800/50 text-dark-300 hover:bg-dark-800 hover:text-dark-100"
            }`}
          >
            Custom Range
          </button>
        </div>

        {timeRange === "custom" && (
          <div className="flex gap-3 mt-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Hours Tracker Stats */}
      <div>
        <h2 className="text-xl font-bold text-dark-100 mb-4 flex items-center gap-2">
          <Icons.Clock className="w-5 h-5 text-primary-400" />
          Hours Tracker
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Time Card */}
          <div className="glass rounded-xl p-6 border border-dark-800/50 hover:border-primary-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400 text-sm font-medium">
                Total Time
              </span>
              <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Icons.Clock className="w-4 h-4 text-primary-400" />
              </div>
            </div>
            <div className="text-3xl font-bold gradient-text mb-1">
              {formatTotalTimeHMS()}
            </div>
            <div className="text-sm text-dark-400">
              {formatHoursDisplay()} hours
            </div>
          </div>

          {/* Sessions Count Card */}
          <div className="glass rounded-xl p-6 border border-dark-800/50 hover:border-accent-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400 text-sm font-medium">
                Sessions
              </span>
              <div className="w-8 h-8 bg-accent-500/20 rounded-lg flex items-center justify-center">
                <Icons.Task className="w-4 h-4 text-accent-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-accent-400 mb-1">
              {timeStats?.sessionCount || 0}
            </div>
            <div className="text-sm text-dark-400">tracking sessions</div>
          </div>

          {/* Average Session Card */}
          <div className="glass rounded-xl p-6 border border-dark-800/50 hover:border-success-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400 text-sm font-medium">
                Avg. Session
              </span>
              <div className="w-8 h-8 bg-success-500/20 rounded-lg flex items-center justify-center">
                <Icons.Chart className="w-4 h-4 text-success-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-success-400 mb-1">
              {calculateAverageSession()}
            </div>
            <div className="text-sm text-dark-400">per session</div>
          </div>
        </div>
      </div>

      {/* Screenshot Stats */}
      <div>
        <h2 className="text-xl font-bold text-dark-100 mb-4 flex items-center gap-2">
          <Icons.Camera className="w-5 h-5 text-accent-400" />
          Screenshot Statistics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Screenshots Card */}
          <div className="glass rounded-xl p-6 border border-dark-800/50 hover:border-accent-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400 text-sm font-medium">
                Total Screenshots
              </span>
              <div className="w-8 h-8 bg-accent-500/20 rounded-lg flex items-center justify-center">
                <Icons.Camera className="w-4 h-4 text-accent-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-accent-400 mb-1">
              {screenshotStats?.total_count || screenshotStats?.totalCount || 0}
            </div>
            <div className="text-sm text-dark-400">captured images</div>
          </div>

          {/* Storage Used Card */}
          <div className="glass rounded-xl p-6 border border-dark-800/50 hover:border-primary-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400 text-sm font-medium">
                Storage Used
              </span>
              <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Icons.Task className="w-4 h-4 text-primary-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-primary-400 mb-1">
              {formatBytes(
                screenshotStats?.total_size || screenshotStats?.totalSize || 0
              )}
            </div>
            <div className="text-sm text-dark-400">disk space</div>
          </div>

          {/* Avg per Session Card */}
          <div className="glass rounded-xl p-6 border border-dark-800/50 hover:border-success-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400 text-sm font-medium">
                Avg. per Session
              </span>
              <div className="w-8 h-8 bg-success-500/20 rounded-lg flex items-center justify-center">
                <Icons.Chart className="w-4 h-4 text-success-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-success-400 mb-1">
              {(
                screenshotStats?.avg_per_session ||
                screenshotStats?.avgPerSession ||
                0
              ).toFixed(1)}
            </div>
            <div className="text-sm text-dark-400">screenshots</div>
          </div>
        </div>
      </div>

      {/* Productivity Insights */}
      <div className="glass rounded-xl p-6 border border-dark-800/50">
        <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
          <Icons.Chart className="w-5 h-5 text-primary-400" />
          Productivity Insights
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-dark-800/30 rounded-lg">
            <div>
              <div className="text-dark-200 font-medium">Daily Average</div>
              <div className="text-sm text-dark-400">Time tracked per day</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold gradient-text">
                {calculateDailyAverage()}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-800/30 rounded-lg">
            <div>
              <div className="text-dark-200 font-medium">Screenshot Rate</div>
              <div className="text-sm text-dark-400">Images per hour</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-accent-400">
                {calculateScreenshotRate()}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-800/30 rounded-lg">
            <div>
              <div className="text-dark-200 font-medium">
                Most Productive Day
              </div>
              <div className="text-sm text-dark-400">Based on tracked time</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-success-400">
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Info */}
      <div className="glass-dark rounded-xl p-4 border border-dark-800/50 text-center">
        <div className="text-sm text-dark-400">
          Showing statistics from{" "}
          <span className="text-primary-400 font-medium">
            {timeStats?.startDate}
          </span>{" "}
          to{" "}
          <span className="text-primary-400 font-medium">
            {timeStats?.endDate}
          </span>
        </div>
      </div>
    </div>
  );
}

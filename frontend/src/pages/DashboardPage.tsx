import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Pause, Play, Square } from "lucide-react";
import { useState } from "react";
import { timeLogService } from "../services";

export default function DashboardPage() {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const { data: activeSession, refetch } = useQuery({
    queryKey: ["activeSession"],
    queryFn: async () => {
      const response = await timeLogService.getActive();
      return response.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const now = new Date();
      const endDate = format(now, "yyyy-MM-dd");
      const startDate = format(subDays(now, 7), "yyyy-MM-dd");
      const response = await timeLogService.getStats(startDate, endDate);
      return response.data;
    },
  });

  const handleStart = async () => {
    try {
      await timeLogService.start({});
      setIsTracking(true);
      refetch();
    } catch (error) {
      console.error("Failed to start tracking:", error);
    }
  };

  const handlePause = async () => {
    try {
      await timeLogService.pause();
      setIsPaused(true);
      refetch();
    } catch (error) {
      console.error("Failed to pause tracking:", error);
    }
  };

  const handleResume = async () => {
    try {
      await timeLogService.resume();
      setIsPaused(false);
      refetch();
    } catch (error) {
      console.error("Failed to resume tracking:", error);
    }
  };

  const handleStop = async () => {
    try {
      await timeLogService.stop();
      setIsTracking(false);
      setIsPaused(false);
      refetch();
    } catch (error) {
      console.error("Failed to stop tracking:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Track your time and monitor productivity
        </p>
      </div>

      {/* Time Tracker Widget */}
      <div className="card max-w-2xl mx-auto">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-semibold">Time Tracker</h2>

          <div className="text-6xl font-mono text-primary-600">00:00:00</div>

          <div className="flex justify-center space-x-4">
            {!isTracking ? (
              <button
                onClick={handleStart}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Play className="h-5 w-5" />
                <span>Start</span>
              </button>
            ) : (
              <>
                {!isPaused ? (
                  <button
                    onClick={handlePause}
                    className="btn btn-secondary flex items-center space-x-2"
                  >
                    <Pause className="h-5 w-5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <Play className="h-5 w-5" />
                    <span>Resume</span>
                  </button>
                )}
                <button
                  onClick={handleStop}
                  className="btn bg-red-600 text-white hover:bg-red-700 flex items-center space-x-2"
                >
                  <Square className="h-5 w-5" />
                  <span>Stop</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Total Time (7 Days)
          </h3>
          <p className="text-3xl font-bold text-primary-600">
            {stats?.total_time_hours?.toFixed(1) || 0}h
          </p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sessions</h3>
          <p className="text-3xl font-bold text-primary-600">
            {stats?.session_count || 0}
          </p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Status</h3>
          <p className="text-3xl font-bold text-green-600">
            {activeSession ? "Active" : "Idle"}
          </p>
        </div>
      </div>
    </div>
  );
}

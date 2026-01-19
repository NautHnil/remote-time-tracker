/**
 * Admin Time Logs Page
 * View and manage all system time logs
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { useState } from "react";
import { Icons } from "../../components/Icons";
import Pagination from "../../components/Pagination";
import { adminService, AdminTimeLog } from "../../services/adminService";

// Time Log Detail Modal
interface TimeLogDetailModalProps {
  timeLog: AdminTimeLog;
  onClose: () => void;
}

function TimeLogDetailModal({ timeLog, onClose }: TimeLogDetailModalProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy HH:mm:ss");
  };

  const formatDurationFromSeconds = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0s";
    const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
    return formatDuration(duration, {
      format: ["hours", "minutes", "seconds"],
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Time Log Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icons.Close className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {timeLog.task_title && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Task Title
                </label>
                <p className="text-gray-900 font-medium">
                  {timeLog.task_title}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <p className="text-gray-900 capitalize">{timeLog.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Approved
                </label>
                <p className="text-gray-900">
                  {timeLog.is_approved ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Duration
                </label>
                <p className="text-gray-900 font-medium">
                  {formatDurationFromSeconds(timeLog.duration)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Task ID
                </label>
                <p className="text-gray-900">{timeLog.task_id || "N/A"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Start Time
                </label>
                <p className="text-gray-700 text-sm">
                  {formatDate(timeLog.start_time)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  End Time
                </label>
                <p className="text-gray-700 text-sm">
                  {formatDate(timeLog.end_time)}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">User</label>
              <p className="text-gray-900">
                {timeLog.user_name
                  ? `${timeLog.user_name} (${timeLog.user_email})`
                  : "Unknown"}
              </p>
            </div>

            {timeLog.org_name && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Organization
                </label>
                <p className="text-gray-900">{timeLog.org_name}</p>
              </div>
            )}

            {timeLog.workspace_name && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Workspace
                </label>
                <p className="text-gray-900">{timeLog.workspace_name}</p>
              </div>
            )}

            {timeLog.task_title && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Linked Task
                </label>
                <p className="text-gray-900">{timeLog.task_title}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Created At
                </label>
                <p className="text-gray-600 text-sm">
                  {formatDate(timeLog.created_at)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Approved At
                </label>
                <p className="text-gray-600 text-sm">
                  {formatDate(timeLog.approved_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 mt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function DeleteConfirmModal({
  title,
  message,
  onClose,
  onConfirm,
  isLoading,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 z-10">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <Icons.Trash className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-6">{message}</p>
          </div>

          <div className="flex justify-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTimeLogsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [viewingTimeLog, setViewingTimeLog] = useState<AdminTimeLog | null>(
    null,
  );
  const [deletingTimeLog, setDeletingTimeLog] = useState<AdminTimeLog | null>(
    null,
  );

  // Fetch time logs
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-timelogs", page, limit, statusFilter, startDate, endDate],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await adminService.getTimeLogs(params);
      return response.data;
    },
  });

  // Delete time log mutation
  const deleteTimeLogMutation = useMutation({
    mutationFn: async (id: number) => {
      return adminService.deleteTimeLog(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-timelogs"] });
      setDeletingTimeLog(null);
    },
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy HH:mm");
  };

  const formatDurationFromSeconds = (seconds: number) => {
    if (!seconds || seconds <= 0) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "stopped":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading time logs</p>
          <p className="text-sm">
            {String((error as Error).message || "Unknown error")}
          </p>
        </div>
      </div>
    );
  }

  // Handle undefined data
  const timeLogs = data?.timelogs || [];
  const pagination = data?.pagination || {
    total_items: 0,
    total_pages: 0,
    current_page: page,
    page_size: limit,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Time Logs Management
          </h1>
          <p className="text-gray-600 mt-1">
            View all system time tracking records
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Total:{" "}
            <span className="font-semibold">{pagination.total_items}</span>{" "}
            records
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="stopped">Stopped</option>
          </select>

          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Start Date"
            />
          </div>

          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="End Date"
            />
          </div>

          <button
            onClick={() => {
              setStatusFilter("");
              setStartDate("");
              setEndDate("");
              setPage(1);
            }}
            className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Time Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : timeLogs.length === 0 ? (
          <div className="text-center py-12">
            <Icons.Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No time logs found</p>
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
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeLogs.map((timeLog) => (
                  <tr
                    key={timeLog.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {timeLog.user_name || "Unknown"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {timeLog.user_email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 truncate max-w-xs">
                        {timeLog.task_title || "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatDurationFromSeconds(timeLog.duration)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(timeLog.status)}`}
                      >
                        {timeLog.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(timeLog.start_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(timeLog.end_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setViewingTimeLog(timeLog)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Icons.Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTimeLog(timeLog)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Time Log"
                        >
                          <Icons.Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={page}
              totalPages={pagination.total_pages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Time Log Detail Modal */}
      {viewingTimeLog && (
        <TimeLogDetailModal
          timeLog={viewingTimeLog}
          onClose={() => setViewingTimeLog(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingTimeLog && (
        <DeleteConfirmModal
          title="Delete Time Log"
          message="Are you sure you want to delete this time log? This action cannot be undone."
          onClose={() => setDeletingTimeLog(null)}
          onConfirm={() => deleteTimeLogMutation.mutate(deletingTimeLog.id)}
          isLoading={deleteTimeLogMutation.isPending}
        />
      )}
    </div>
  );
}

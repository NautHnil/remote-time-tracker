# TODO 17: Frontend Admin Time Logs Management

## Mục tiêu

Tạo trang quản lý time logs cho admin panel.

## Yêu cầu

### 1. Features

- List time logs với pagination, search, filter
- View time log details
- Approve/reject time logs
- Delete time logs
- Export time logs to CSV
- View timeline visualization

### 2. Filter Options

- By user
- By task
- By workspace
- By organization
- By status (all, approved, pending, rejected)
- By date range

## Files cần tạo

```
frontend/src/pages/admin/AdminTimeLogsPage.tsx
frontend/src/components/admin/timelogs/TimeLogTable.tsx
frontend/src/components/admin/timelogs/TimeLogFilters.tsx
frontend/src/components/admin/timelogs/TimeLogDetailModal.tsx
frontend/src/components/admin/timelogs/TimeLogTimeline.tsx
```

## Tasks chi tiết

### Task 17.1: Tạo Admin Time Logs Page

```tsx
// frontend/src/pages/admin/AdminTimeLogsPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import TimeLogTable from "../../components/admin/timelogs/TimeLogTable";
import TimeLogFilters from "../../components/admin/timelogs/TimeLogFilters";
import TimeLogDetailModal from "../../components/admin/timelogs/TimeLogDetailModal";
import TimeLogTimeline from "../../components/admin/timelogs/TimeLogTimeline";
import ConfirmDialog from "../../components/admin/shared/ConfirmDialog";
import Pagination from "../../components/admin/shared/Pagination";
import { toast } from "react-hot-toast";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";

interface FiltersState {
  search: string;
  user_id: string;
  task_id: string;
  workspace_id: string;
  organization_id: string;
  status: string;
  start_date: string;
  end_date: string;
}

const AdminTimeLogsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("start_time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    user_id: "",
    task_id: "",
    workspace_id: "",
    organization_id: "",
    status: "",
    start_date: "",
    end_date: "",
  });

  // Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTimeLog, setSelectedTimeLog] = useState<any>(null);
  const [selectedTimeLogs, setSelectedTimeLogs] = useState<number[]>([]);

  // Fetch time logs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "timelogs", page, pageSize, sortBy, sortOrder, filters],
    queryFn: async () => {
      const response = await adminService.getTimeLogs({
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...filters,
      });
      return response.data.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (timelogId: number) => adminService.deleteTimeLog(timelogId),
    onSuccess: () => {
      toast.success("Time log deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "timelogs"] });
      setDeleteDialogOpen(false);
      setSelectedTimeLog(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete time log");
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => adminService.bulkDeleteTimeLogs(ids),
    onSuccess: () => {
      toast.success("Time logs deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "timelogs"] });
      setSelectedTimeLogs([]);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete time logs",
      );
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ ids, approved }: { ids: number[]; approved: boolean }) =>
      adminService.bulkApproveTimeLogs(ids, approved),
    onSuccess: (_, variables) => {
      toast.success(
        `Time logs ${variables.approved ? "approved" : "rejected"} successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "timelogs"] });
      setSelectedTimeLogs([]);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update time logs",
      );
    },
  });

  // Handlers
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleFilterChange = (newFilters: Partial<FiltersState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleViewDetails = (timelog: any) => {
    setSelectedTimeLog(timelog);
    setDetailModalOpen(true);
  };

  const handleDelete = (timelog: any) => {
    setSelectedTimeLog(timelog);
    setDeleteDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTimeLogs(data?.timelogs.map((t: any) => t.id) || []);
    } else {
      setSelectedTimeLogs([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedTimeLogs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleBulkApprove = (approved: boolean) => {
    if (selectedTimeLogs.length === 0) {
      toast.error("Please select time logs first");
      return;
    }
    approveMutation.mutate({ ids: selectedTimeLogs, approved });
  };

  const handleExport = async () => {
    try {
      const response = await adminService.exportTimeLogs(filters);
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timelogs-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Time logs exported successfully");
    } catch (error) {
      toast.error("Failed to export time logs");
    }
  };

  // Summary stats
  const summaryStats = data
    ? {
        totalLogs: data.total,
        totalDuration: data.total_duration || 0,
        approvedCount: data.approved_count || 0,
        pendingCount: data.pending_count || 0,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Time Logs Management
          </h1>
          <p className="text-gray-500">{data?.total || 0} total time logs</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded ${viewMode === "table" ? "bg-white shadow-sm" : ""}`}
              title="Table view"
            >
              <TableCellsIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`p-2 rounded ${viewMode === "timeline" ? "bg-white shadow-sm" : ""}`}
              title="Timeline view"
            >
              <CalendarDaysIcon className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Logs</p>
            <p className="text-2xl font-bold text-gray-900">
              {summaryStats.totalLogs}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Duration</p>
            <p className="text-2xl font-bold text-gray-900">
              {Math.floor(summaryStats.totalDuration / 3600)}h{" "}
              {Math.floor((summaryStats.totalDuration % 3600) / 60)}m
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-green-600">
              {summaryStats.approvedCount}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {summaryStats.pendingCount}
            </p>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedTimeLogs.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-700">
            {selectedTimeLogs.length} time logs selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkApprove(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              disabled={approveMutation.isPending}
            >
              Approve Selected
            </button>
            <button
              onClick={() => handleBulkApprove(false)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              disabled={approveMutation.isPending}
            >
              Reject Selected
            </button>
            <button
              onClick={() => bulkDeleteMutation.mutate(selectedTimeLogs)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <TimeLogFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={() =>
          setFilters({
            search: "",
            user_id: "",
            task_id: "",
            workspace_id: "",
            organization_id: "",
            status: "",
            start_date: "",
            end_date: "",
          })
        }
      />

      {/* Content */}
      {viewMode === "table" ? (
        <TimeLogTable
          timelogs={data?.timelogs || []}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          selectedIds={selectedTimeLogs}
          onSort={handleSort}
          onView={handleViewDetails}
          onDelete={handleDelete}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onApprove={(timelog, approved) =>
            approveMutation.mutate({ ids: [timelog.id], approved })
          }
        />
      ) : (
        <TimeLogTimeline
          timelogs={data?.timelogs || []}
          isLoading={isLoading}
          onView={handleViewDetails}
        />
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={Math.ceil((data?.total || 0) / pageSize)}
        pageSize={pageSize}
        totalItems={data?.total || 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {/* Modals */}
      <TimeLogDetailModal
        isOpen={detailModalOpen}
        timelog={selectedTimeLog}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTimeLog(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Time Log"
        message="Are you sure you want to delete this time log? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() =>
          selectedTimeLog && deleteMutation.mutate(selectedTimeLog.id)
        }
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedTimeLog(null);
        }}
      />
    </div>
  );
};

export default AdminTimeLogsPage;
```

### Task 17.2: Tạo Time Log Table

```tsx
// frontend/src/components/admin/timelogs/TimeLogTable.tsx
import React from "react";
import {
  EyeIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface TimeLog {
  id: number;
  task_title: string;
  task_id: number;
  user_name: string;
  user_email: string;
  workspace_name: string;
  start_time: string;
  end_time?: string;
  duration: number;
  is_approved: boolean;
  screenshot_count: number;
}

interface TimeLogTableProps {
  timelogs: TimeLog[];
  isLoading: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  selectedIds: number[];
  onSort: (field: string) => void;
  onView: (timelog: TimeLog) => void;
  onDelete: (timelog: TimeLog) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: number) => void;
  onApprove: (timelog: TimeLog, approved: boolean) => void;
}

const TimeLogTable: React.FC<TimeLogTableProps> = ({
  timelogs,
  isLoading,
  sortBy,
  sortOrder,
  selectedIds,
  onSort,
  onView,
  onDelete,
  onSelectAll,
  onSelectOne,
  onApprove,
}) => {
  const columns = [
    { key: "select", label: "", sortable: false },
    { key: "task", label: "Task", sortable: true },
    { key: "user", label: "User", sortable: true },
    { key: "workspace", label: "Workspace", sortable: true },
    { key: "start_time", label: "Start Time", sortable: true },
    { key: "end_time", label: "End Time", sortable: true },
    { key: "duration", label: "Duration", sortable: true },
    { key: "status", label: "Status", sortable: false },
    { key: "actions", label: "Actions", sortable: false },
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUpIcon className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 ml-1" />
    );
  };

  const allSelected =
    timelogs.length > 0 && selectedIds.length === timelogs.length;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`
                    px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                    ${col.sortable ? "cursor-pointer hover:bg-gray-100" : ""}
                  `}
                  onClick={() => col.sortable && onSort(col.key)}
                >
                  {col.key === "select" ? (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => onSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  ) : (
                    <div className="flex items-center">
                      {col.label}
                      {col.sortable && <SortIcon column={col.key} />}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {timelogs.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No time logs found
                </td>
              </tr>
            ) : (
              timelogs.map((timelog) => (
                <tr key={timelog.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(timelog.id)}
                      onChange={() => onSelectOne(timelog.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                      {timelog.task_title || "Untitled"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {timelog.screenshot_count} screenshots
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {timelog.user_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {timelog.user_email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {timelog.workspace_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(timelog.start_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(timelog.end_time || "")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatDuration(timelog.duration)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        timelog.is_approved
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {timelog.is_approved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onView(timelog)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      {!timelog.is_approved && (
                        <button
                          onClick={() => onApprove(timelog, true)}
                          className="p-1 text-gray-400 hover:text-green-600 rounded"
                          title="Approve"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                      )}
                      {timelog.is_approved && (
                        <button
                          onClick={() => onApprove(timelog, false)}
                          className="p-1 text-gray-400 hover:text-yellow-600 rounded"
                          title="Reject"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(timelog)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimeLogTable;
```

## Acceptance Criteria

- [ ] Time log list hiển thị đúng với pagination
- [ ] Search và filter hoạt động
- [ ] Sort by columns hoạt động
- [ ] View time log details
- [ ] Approve/reject single và bulk
- [ ] Delete single và bulk
- [ ] Export to CSV
- [ ] Summary stats hiển thị đúng
- [ ] Timeline view hoạt động
- [ ] Checkbox selection hoạt động

## Dependencies

- TODO 11: Frontend Admin Layout
- TODO 08: Backend Admin TimeLogs API

## Estimated Time

- 5-6 giờ

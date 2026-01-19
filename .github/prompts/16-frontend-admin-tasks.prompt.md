# TODO 16: Frontend Admin Tasks Management

## Mục tiêu

Tạo trang quản lý tasks cho admin panel. Lưu ý: Admin chỉ xem và quản lý tasks, không tạo tasks từ web admin.

## Yêu cầu

### 1. Features

- List tasks với pagination, search, filter
- View task details với time logs và screenshots
- Edit task info (title, description)
- Delete task
- View task timeline
- Filter by status, user, workspace, date range

### 2. Filter Options

- By title/description
- By status (idle, running, paused, stopped, completed)
- By user
- By workspace
- By organization
- By is_manual (manual vs time tracker)
- By date range

## Files cần tạo

```
frontend/src/pages/admin/AdminTasksPage.tsx
frontend/src/components/admin/tasks/TaskTable.tsx
frontend/src/components/admin/tasks/TaskFilters.tsx
frontend/src/components/admin/tasks/TaskDetailDrawer.tsx
frontend/src/components/admin/tasks/TaskTimelineModal.tsx
frontend/src/components/admin/tasks/EditTaskModal.tsx
```

## Tasks chi tiết

### Task 16.1: Tạo Admin Tasks Page

```tsx
// frontend/src/pages/admin/AdminTasksPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import TaskTable from "../../components/admin/tasks/TaskTable";
import TaskFilters from "../../components/admin/tasks/TaskFilters";
import TaskDetailDrawer from "../../components/admin/tasks/TaskDetailDrawer";
import TaskTimelineModal from "../../components/admin/tasks/TaskTimelineModal";
import EditTaskModal from "../../components/admin/tasks/EditTaskModal";
import ConfirmDialog from "../../components/admin/shared/ConfirmDialog";
import Pagination from "../../components/admin/shared/Pagination";
import { toast } from "react-hot-toast";
import { ArrowPathIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface FiltersState {
  search: string;
  status: string;
  user_id: string;
  workspace_id: string;
  organization_id: string;
  is_manual: string;
  start_date: string;
  end_date: string;
}

const AdminTasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    status: "",
    user_id: "",
    workspace_id: "",
    organization_id: "",
    is_manual: "",
    start_date: "",
    end_date: "",
  });

  // Modal states
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Fetch tasks
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "tasks", page, pageSize, sortBy, sortOrder, filters],
    queryFn: async () => {
      const response = await adminService.getTasks({
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
    mutationFn: (taskId: number) => adminService.deleteTask(taskId),
    onSuccess: () => {
      toast.success("Task deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "tasks"] });
      setDeleteDialogOpen(false);
      setSelectedTask(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete task");
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

  const handleViewDetails = (task: any) => {
    setSelectedTask(task);
    setDetailDrawerOpen(true);
  };

  const handleViewTimeline = (task: any) => {
    setSelectedTask(task);
    setTimelineModalOpen(true);
  };

  const handleEdit = (task: any) => {
    setSelectedTask(task);
    setEditModalOpen(true);
  };

  const handleDelete = (task: any) => {
    setSelectedTask(task);
    setDeleteDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const response = await adminService.exportTasks(filters);
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Tasks exported successfully");
    } catch (error) {
      toast.error("Failed to export tasks");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks Management</h1>
          <p className="text-gray-500">
            {data?.total || 0} total tasks • View only (tasks created from
            desktop app)
          </p>
        </div>
        <div className="flex items-center space-x-3">
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

      {/* Filters */}
      <TaskFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={() =>
          setFilters({
            search: "",
            status: "",
            user_id: "",
            workspace_id: "",
            organization_id: "",
            is_manual: "",
            start_date: "",
            end_date: "",
          })
        }
      />

      {/* Table */}
      <TaskTable
        tasks={data?.tasks || []}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onView={handleViewDetails}
        onViewTimeline={handleViewTimeline}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

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
      <TaskDetailDrawer
        isOpen={detailDrawerOpen}
        task={selectedTask}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedTask(null);
        }}
      />

      <TaskTimelineModal
        isOpen={timelineModalOpen}
        task={selectedTask}
        onClose={() => {
          setTimelineModalOpen(false);
          setSelectedTask(null);
        }}
      />

      <EditTaskModal
        isOpen={editModalOpen}
        task={selectedTask}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTask(null);
        }}
        onSuccess={() => {
          setEditModalOpen(false);
          setSelectedTask(null);
          queryClient.invalidateQueries({ queryKey: ["admin", "tasks"] });
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Task"
        message={`Are you sure you want to delete task "${selectedTask?.title}"? This will delete all associated time logs and screenshots. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => selectedTask && deleteMutation.mutate(selectedTask.id)}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
};

export default AdminTasksPage;
```

### Task 16.2: Tạo Task Table

```tsx
// frontend/src/components/admin/tasks/TaskTable.tsx
import React from "react";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface Task {
  id: number;
  title: string;
  status: string;
  user_name: string;
  user_email: string;
  workspace_name: string;
  organization_name: string;
  is_manual: boolean;
  total_duration: number;
  timelog_count: number;
  screenshot_count: number;
  start_time?: string;
  end_time?: string;
  created_at: string;
}

interface TaskTableProps {
  tasks: Task[];
  isLoading: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  onView: (task: Task) => void;
  onViewTimeline: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onViewTimeline,
  onEdit,
  onDelete,
}) => {
  const columns = [
    { key: "title", label: "Task", sortable: true },
    { key: "user", label: "User", sortable: true },
    { key: "workspace", label: "Workspace", sortable: true },
    { key: "type", label: "Type", sortable: false },
    { key: "status", label: "Status", sortable: true },
    { key: "duration", label: "Duration", sortable: true },
    { key: "created_at", label: "Created", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "stopped":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUpIcon className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 ml-1" />
    );
  };

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
                  <div className="flex items-center">
                    {col.label}
                    {col.sortable && <SortIcon column={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                        {task.title || "Untitled Task"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {task.timelog_count} logs • {task.screenshot_count}{" "}
                        screenshots
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {task.user_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {task.user_email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {task.workspace_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {task.organization_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.is_manual
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {task.is_manual ? "Manual" : "Time Tracker"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(task.status)}`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDuration(task.total_duration)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(task.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onView(task)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onViewTimeline(task)}
                        className="p-1 text-gray-400 hover:text-purple-600 rounded"
                        title="View timeline"
                      >
                        <ClockIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onEdit(task)}
                        className="p-1 text-gray-400 hover:text-green-600 rounded"
                        title="Edit task"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDelete(task)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete task"
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

export default TaskTable;
```

### Task 16.3: Tạo Task Detail Drawer

```tsx
// frontend/src/components/admin/tasks/TaskDetailDrawer.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../../services/adminService";
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  PhotoIcon,
  UserIcon,
  FolderIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

interface TaskDetailDrawerProps {
  isOpen: boolean;
  task: any;
  onClose: () => void;
}

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  isOpen,
  task,
  onClose,
}) => {
  const { data: details, isLoading } = useQuery({
    queryKey: ["admin", "task", task?.id],
    queryFn: async () => {
      const response = await adminService.getTask(task.id);
      return response.data.data;
    },
    enabled: isOpen && !!task?.id,
  });

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Task Details
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : details ? (
              <div className="space-y-6">
                {/* Task Info */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {details.title || "Untitled Task"}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(details.status)}`}
                    >
                      {details.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span
                      className={`px-2 py-1 rounded ${
                        details.is_manual
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {details.is_manual ? "Manual Task" : "From Time Tracker"}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {details.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Description
                    </h4>
                    <p className="text-gray-700">{details.description}</p>
                  </div>
                )}

                {/* Time Stats */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">
                    Time Tracking
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-700">Total Duration</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatDuration(details.total_duration)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Pause Duration</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatDuration(details.pause_duration || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-500 mb-1">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm">Time Logs</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {details.timelog_count}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-500 mb-1">
                      <PhotoIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm">Screenshots</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {details.screenshot_count}
                    </p>
                  </div>
                </div>

                {/* User Info */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">User</p>
                    <p className="font-medium text-gray-900">
                      {details.user_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {details.user_email}
                    </p>
                  </div>
                </div>

                {/* Workspace Info */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <FolderIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Workspace</p>
                    <p className="font-medium text-gray-900">
                      {details.workspace_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {details.organization_name}
                    </p>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      Start: {formatDate(details.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      End: {formatDate(details.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      Created: {formatDate(details.created_at)}
                    </span>
                  </div>
                </div>

                {/* Recent Screenshots Preview */}
                {details.recent_screenshots &&
                  details.recent_screenshots.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">
                        Recent Screenshots
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {details.recent_screenshots.map((screenshot: any) => (
                          <div
                            key={screenshot.id}
                            className="relative aspect-video bg-gray-100 rounded overflow-hidden"
                          >
                            <img
                              src={
                                screenshot.thumbnail_url || screenshot.file_path
                              }
                              alt="Screenshot"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailDrawer;
```

## Acceptance Criteria

- [ ] Task list hiển thị đúng với pagination
- [ ] Search và filter hoạt động (status, user, workspace, is_manual)
- [ ] Sort by columns hoạt động
- [ ] View task details với time stats và screenshots
- [ ] View task timeline modal
- [ ] Edit task (title only)
- [ ] Delete task với confirm dialog
- [ ] Phân biệt rõ Manual vs Time Tracker tasks
- [ ] Export tasks to CSV

## Dependencies

- TODO 11: Frontend Admin Layout
- TODO 07: Backend Admin Tasks API

## Estimated Time

- 5-6 giờ

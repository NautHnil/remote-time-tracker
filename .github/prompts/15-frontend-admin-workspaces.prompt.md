# TODO 15: Frontend Admin Workspaces Management

## Mục tiêu

Tạo trang quản lý workspaces cho admin panel.

## Yêu cầu

### 1. Features

- List workspaces với pagination, search, filter
- View workspace details
- Edit workspace info
- Delete workspace
- View workspace members
- View workspace tasks
- Toggle workspace active status

### 2. Filter Options

- By name
- By organization
- By status (active/inactive)
- By admin (project manager)
- By date range

## Files cần tạo

```
frontend/src/pages/admin/AdminWorkspacesPage.tsx
frontend/src/components/admin/workspaces/WorkspaceTable.tsx
frontend/src/components/admin/workspaces/WorkspaceFilters.tsx
frontend/src/components/admin/workspaces/WorkspaceDetailDrawer.tsx
frontend/src/components/admin/workspaces/WorkspaceMembersModal.tsx
frontend/src/components/admin/workspaces/EditWorkspaceModal.tsx
```

## Tasks chi tiết

### Task 15.1: Tạo Admin Workspaces Page

```tsx
// frontend/src/pages/admin/AdminWorkspacesPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import WorkspaceTable from "../../components/admin/workspaces/WorkspaceTable";
import WorkspaceFilters from "../../components/admin/workspaces/WorkspaceFilters";
import WorkspaceDetailDrawer from "../../components/admin/workspaces/WorkspaceDetailDrawer";
import WorkspaceMembersModal from "../../components/admin/workspaces/WorkspaceMembersModal";
import EditWorkspaceModal from "../../components/admin/workspaces/EditWorkspaceModal";
import ConfirmDialog from "../../components/admin/shared/ConfirmDialog";
import Pagination from "../../components/admin/shared/Pagination";
import { toast } from "react-hot-toast";
import { ArrowPathIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface FiltersState {
  search: string;
  organization_id: string;
  status: string;
  admin_id: string;
  start_date: string;
  end_date: string;
}

const AdminWorkspacesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    organization_id: "",
    status: "",
    admin_id: "",
    start_date: "",
    end_date: "",
  });

  // Modal states
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);

  // Fetch workspaces
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "admin",
      "workspaces",
      page,
      pageSize,
      sortBy,
      sortOrder,
      filters,
    ],
    queryFn: async () => {
      const response = await adminService.getWorkspaces({
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
    mutationFn: (workspaceId: number) =>
      adminService.deleteWorkspace(workspaceId),
    onSuccess: () => {
      toast.success("Workspace deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "workspaces"] });
      setDeleteDialogOpen(false);
      setSelectedWorkspace(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete workspace",
      );
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({
      workspaceId,
      isActive,
    }: {
      workspaceId: number;
      isActive: boolean;
    }) => adminService.updateWorkspace(workspaceId, { is_active: isActive }),
    onSuccess: () => {
      toast.success("Workspace status updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "workspaces"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update workspace",
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

  const handleViewDetails = (workspace: any) => {
    setSelectedWorkspace(workspace);
    setDetailDrawerOpen(true);
  };

  const handleViewMembers = (workspace: any) => {
    setSelectedWorkspace(workspace);
    setMembersModalOpen(true);
  };

  const handleEdit = (workspace: any) => {
    setSelectedWorkspace(workspace);
    setEditModalOpen(true);
  };

  const handleDelete = (workspace: any) => {
    setSelectedWorkspace(workspace);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = (workspace: any, isActive: boolean) => {
    toggleStatusMutation.mutate({ workspaceId: workspace.id, isActive });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Workspaces Management
          </h1>
          <p className="text-gray-500">{data?.total || 0} total workspaces</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <button className="flex items-center px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <WorkspaceFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={() =>
          setFilters({
            search: "",
            organization_id: "",
            status: "",
            admin_id: "",
            start_date: "",
            end_date: "",
          })
        }
      />

      {/* Table */}
      <WorkspaceTable
        workspaces={data?.workspaces || []}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onView={handleViewDetails}
        onViewMembers={handleViewMembers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
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
      <WorkspaceDetailDrawer
        isOpen={detailDrawerOpen}
        workspace={selectedWorkspace}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedWorkspace(null);
        }}
      />

      <WorkspaceMembersModal
        isOpen={membersModalOpen}
        workspace={selectedWorkspace}
        onClose={() => {
          setMembersModalOpen(false);
          setSelectedWorkspace(null);
        }}
      />

      <EditWorkspaceModal
        isOpen={editModalOpen}
        workspace={selectedWorkspace}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedWorkspace(null);
        }}
        onSuccess={() => {
          setEditModalOpen(false);
          setSelectedWorkspace(null);
          queryClient.invalidateQueries({ queryKey: ["admin", "workspaces"] });
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Workspace"
        message={`Are you sure you want to delete workspace "${selectedWorkspace?.name}"? This will delete all associated tasks and data. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() =>
          selectedWorkspace && deleteMutation.mutate(selectedWorkspace.id)
        }
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedWorkspace(null);
        }}
      />
    </div>
  );
};

export default AdminWorkspacesPage;
```

### Task 15.2: Tạo Workspace Table

```tsx
// frontend/src/components/admin/workspaces/WorkspaceTable.tsx
import React from "react";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface Workspace {
  id: number;
  name: string;
  description: string;
  organization_name: string;
  organization_id: number;
  admin_name: string;
  admin_email: string;
  member_count: number;
  task_count: number;
  is_active: boolean;
  created_at: string;
}

interface WorkspaceTableProps {
  workspaces: Workspace[];
  isLoading: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  onView: (workspace: Workspace) => void;
  onViewMembers: (workspace: Workspace) => void;
  onEdit: (workspace: Workspace) => void;
  onDelete: (workspace: Workspace) => void;
  onToggleStatus: (workspace: Workspace, isActive: boolean) => void;
}

const WorkspaceTable: React.FC<WorkspaceTableProps> = ({
  workspaces,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onViewMembers,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const columns = [
    { key: "name", label: "Workspace", sortable: true },
    { key: "organization", label: "Organization", sortable: true },
    { key: "admin", label: "Admin", sortable: false },
    { key: "members", label: "Members", sortable: true },
    { key: "tasks", label: "Tasks", sortable: true },
    { key: "status", label: "Status", sortable: false },
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
            {workspaces.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No workspaces found
                </td>
              </tr>
            ) : (
              workspaces.map((workspace) => (
                <tr key={workspace.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {workspace.name}
                      </div>
                      {workspace.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {workspace.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {workspace.organization_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {workspace.admin_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {workspace.admin_email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {workspace.member_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {workspace.task_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() =>
                        onToggleStatus(workspace, !workspace.is_active)
                      }
                      className={`
                        inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${
                          workspace.is_active
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }
                      `}
                    >
                      {workspace.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(workspace.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onView(workspace)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onViewMembers(workspace)}
                        className="p-1 text-gray-400 hover:text-purple-600 rounded"
                        title="View members"
                      >
                        <UsersIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onEdit(workspace)}
                        className="p-1 text-gray-400 hover:text-green-600 rounded"
                        title="Edit workspace"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDelete(workspace)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete workspace"
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

export default WorkspaceTable;
```

### Task 15.3: Tạo Workspace Detail Drawer

```tsx
// frontend/src/components/admin/workspaces/WorkspaceDetailDrawer.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../../services/adminService";
import {
  XMarkIcon,
  FolderIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";

interface WorkspaceDetailDrawerProps {
  isOpen: boolean;
  workspace: any;
  onClose: () => void;
}

const WorkspaceDetailDrawer: React.FC<WorkspaceDetailDrawerProps> = ({
  isOpen,
  workspace,
  onClose,
}) => {
  const { data: details, isLoading } = useQuery({
    queryKey: ["admin", "workspace", workspace?.id],
    queryFn: async () => {
      const response = await adminService.getWorkspace(workspace.id);
      return response.data.data;
    },
    enabled: isOpen && !!workspace?.id,
  });

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Workspace Details
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
                {/* Workspace Info */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center">
                    <FolderIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {details.name}
                    </h3>
                    <span
                      className={`text-sm px-2 py-0.5 rounded ${
                        details.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {details.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Organization */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Organization</p>
                    <p className="font-medium text-gray-900">
                      {details.organization_name}
                    </p>
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

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-500 mb-1">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm">Members</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {details.member_count}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-500 mb-1">
                      <ClipboardDocumentListIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm">Tasks</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {details.task_count}
                    </p>
                  </div>
                </div>

                {/* Time Tracking Stats */}
                {details.total_duration !== undefined && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      Time Tracking
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Total Duration</span>
                        <span className="font-medium text-blue-900">
                          {formatDuration(details.total_duration)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Time Logs</span>
                        <span className="font-medium text-blue-900">
                          {details.timelog_count}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Screenshots</span>
                        <span className="font-medium text-blue-900">
                          {details.screenshot_count}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Project Manager
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-900">
                      {details.admin_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {details.admin_email}
                    </p>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      Created: {formatDate(details.created_at)}
                    </span>
                  </div>
                </div>

                {/* Recent Tasks */}
                {details.recent_tasks && details.recent_tasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">
                      Recent Tasks
                    </h4>
                    <div className="space-y-2">
                      {details.recent_tasks.map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-xs">
                              {task.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {task.user_name}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              task.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : task.status === "running"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {task.status}
                          </span>
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

export default WorkspaceDetailDrawer;
```

## Acceptance Criteria

- [ ] Workspace list hiển thị đúng với pagination
- [ ] Search và filter hoạt động
- [ ] Sort by columns hoạt động
- [ ] View workspace details trong drawer
- [ ] View workspace members modal
- [ ] Edit workspace modal hoạt động
- [ ] Delete workspace với confirm dialog
- [ ] Toggle active status hoạt động
- [ ] Show organization và admin info

## Dependencies

- TODO 11: Frontend Admin Layout
- TODO 06: Backend Admin Workspaces API

## Estimated Time

- 4-5 giờ

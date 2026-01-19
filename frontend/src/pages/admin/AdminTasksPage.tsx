/**
 * Admin Tasks Page
 * View and manage all system tasks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Icons } from "../../components/Icons";
import Pagination from "../../components/Pagination";
import { Button, IconButton, Input, Select } from "../../components/ui";
import {
  AdminOrganization,
  AdminTask,
  AdminUser,
  AdminWorkspace,
  adminService,
} from "../../services/adminService";

// Task Detail Modal Component
interface TaskDetailModalProps {
  task: AdminTask;
  onClose: () => void;
}

function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy HH:mm");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Task Details</h3>
            <IconButton onClick={onClose} variant="ghost">
              <Icons.Close className="h-5 w-5" />
            </IconButton>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              <p className="text-gray-900 font-medium">{task.title}</p>
            </div>

            {task.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Description
                </label>
                <p className="text-gray-700">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <p className="text-gray-900">{task.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Type
                </label>
                <p className="text-gray-900">
                  {task.is_manual ? "Manual" : "Auto Tracked"}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">User</label>
              <p className="text-gray-900">
                {task.user_name || task.user_email || `User #${task.user_id}`}
                {task.user_email && task.user_name && (
                  <span className="text-gray-500 text-sm ml-1">
                    ({task.user_email})
                  </span>
                )}
              </p>
            </div>

            {task.org_name && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Organization
                </label>
                <p className="text-gray-900">{task.org_name}</p>
              </div>
            )}

            {task.workspace_name && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Workspace
                </label>
                <p className="text-gray-900">{task.workspace_name}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Created
                </label>
                <p className="text-gray-700 text-sm">
                  {formatDate(task.created_at)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Updated
                </label>
                <p className="text-gray-700 text-sm">
                  {formatDate(task.updated_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 mt-4 border-t">
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
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
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isLoading} variant="danger">
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTasksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  const [viewingTask, setViewingTask] = useState<AdminTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<AdminTask | null>(null);

  // Fetch tasks
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "admin-tasks",
      page,
      pageSize,
      search,
      statusFilter,
      typeFilter,
      selectedUserId,
      selectedOrgId,
      selectedWorkspaceId,
    ],
    queryFn: async () => {
      const params: Record<string, any> = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.is_manual = typeFilter === "manual";
      if (selectedUserId) params.user_id = Number(selectedUserId);
      if (selectedOrgId) params.org_id = Number(selectedOrgId);
      if (selectedOrgId && selectedWorkspaceId) {
        params.workspace_id = Number(selectedWorkspaceId);
      }

      const response = await adminService.getTasks(params);
      return response.data;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users-options"],
    queryFn: async () => {
      const response = await adminService.getUsers({ page: 1, page_size: 200 });
      return response.data;
    },
  });

  const { data: orgsData } = useQuery({
    queryKey: ["admin-orgs-options"],
    queryFn: async () => {
      const response = await adminService.getOrganizations({
        page: 1,
        page_size: 200,
      });
      return response.data;
    },
  });

  const { data: workspacesData } = useQuery({
    queryKey: ["admin-workspaces-options", selectedOrgId],
    queryFn: async () => {
      const response = await adminService.getWorkspaces({
        page: 1,
        page_size: 200,
        org_id: selectedOrgId ? Number(selectedOrgId) : undefined,
      });
      return response.data;
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return adminService.deleteTask(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      setDeletingTask(null);
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy HH:mm");
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading tasks</p>
          <p className="text-sm">
            {String((error as Error).message || "Unknown error")}
          </p>
        </div>
      </div>
    );
  }

  // Handle undefined data
  const tasks = data?.tasks || [];
  const pagination = data?.pagination || {
    total_items: 0,
    total_pages: 0,
    current_page: page,
    page_size: pageSize,
  };

  const users = (usersData?.users || []) as AdminUser[];
  const organizations = (orgsData?.organizations || []) as AdminOrganization[];
  const workspaces = useMemo(() => {
    const list = (workspacesData?.workspaces || []) as AdminWorkspace[];
    if (!selectedOrgId) return list;
    return list.filter((ws) => String(ws.organization_id) === selectedOrgId);
  }, [workspacesData, selectedOrgId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-600 mt-1">View all system tasks</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Total:{" "}
            <span className="font-semibold">{pagination.total_items}</span>{" "}
            tasks
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
          <Input
            type="text"
            placeholder="Search tasks..."
            value={search}
            leftIcon={<Icons.Search className="h-4 w-4" />}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </Select>

          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            <option value="manual">Manual</option>
            <option value="auto">Auto Tracked</option>
          </Select>

          <Select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </Select>

          <Select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setSelectedWorkspaceId("");
              setPage(1);
            }}
          >
            <option value="">All Organizations</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>

          <Select
            value={selectedWorkspaceId}
            onChange={(e) => {
              setSelectedWorkspaceId(e.target.value);
              setPage(1);
            }}
            disabled={!selectedOrgId}
            className={!selectedOrgId ? "bg-gray-100 cursor-not-allowed" : ""}
          >
            <option value="">All Workspaces</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </Select>

          <div className="flex items-center justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setTypeFilter("");
                setSelectedUserId("");
                setSelectedOrgId("");
                setSelectedWorkspaceId("");
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <Icons.ListTodo className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tasks found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {task.user_name || `User #${task.user_id}`}
                        </p>
                        {task.user_email && (
                          <p className="text-gray-500 text-xs">
                            {task.user_email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(task.status)}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.is_manual ? "bg-purple-100 text-purple-800" : "bg-cyan-100 text-cyan-800"}`}
                      >
                        {task.is_manual ? "Manual" : "Auto"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.org_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(task.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <IconButton
                          onClick={() => setViewingTask(task)}
                          title="View Details"
                        >
                          <Icons.Eye className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          onClick={() => setDeletingTask(task)}
                          title="Delete Task"
                          variant="danger"
                        >
                          <Icons.Trash className="h-4 w-4" />
                        </IconButton>
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

      {/* Task Detail Modal */}
      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          onClose={() => setViewingTask(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingTask && (
        <DeleteConfirmModal
          title="Delete Task"
          message={`Are you sure you want to delete "${deletingTask.title}"? This action cannot be undone.`}
          onClose={() => setDeletingTask(null)}
          onConfirm={() => deleteTaskMutation.mutate(deletingTask.id)}
          isLoading={deleteTaskMutation.isPending}
        />
      )}
    </div>
  );
}

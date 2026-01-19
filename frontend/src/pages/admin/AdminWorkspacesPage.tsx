/**
 * Admin Workspaces Page
 * View and manage all system workspaces
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Icons } from "../../components/Icons";
import Pagination from "../../components/Pagination";
import { adminService, AdminWorkspace } from "../../services/adminService";

// Workspace Detail Modal
interface WorkspaceDetailModalProps {
  workspace: AdminWorkspace;
  onClose: () => void;
}

function WorkspaceDetailModal({
  workspace,
  onClose,
}: WorkspaceDetailModalProps) {
  const formatDate = (dateString: string | null | undefined) => {
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

        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Workspace Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icons.Close className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-indigo-500">
                <span className="text-white text-xl">
                  {workspace.name[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {workspace.name}
                </h4>
                <p className="text-sm text-gray-500">ID: {workspace.id}</p>
              </div>
            </div>

            {workspace.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Description
                </label>
                <p className="text-gray-700">{workspace.description}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500">
                Organization
              </label>
              <p className="text-gray-900">
                {workspace.org_name ||
                  `Organization #${workspace.organization_id}`}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Admin</label>
              <p className="text-gray-900">
                {workspace.admin_name || `Admin #${workspace.admin_id}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Members
                </label>
                <p className="text-gray-900 font-medium">
                  {workspace.member_count || 0}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Tasks
                </label>
                <p className="text-gray-900 font-medium">
                  {workspace.task_count || 0}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${workspace.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                >
                  {workspace.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Archived
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${workspace.is_archived ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}
                >
                  {workspace.is_archived ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Created
                </label>
                <p className="text-gray-700 text-sm">
                  {formatDate(workspace.created_at)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Updated
                </label>
                <p className="text-gray-700 text-sm">
                  {formatDate(workspace.updated_at)}
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

export default function AdminWorkspacesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");

  const [viewingWorkspace, setViewingWorkspace] =
    useState<AdminWorkspace | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] =
    useState<AdminWorkspace | null>(null);

  // Fetch workspaces
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-workspaces", page, limit, search, activeFilter],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (activeFilter) params.is_active = activeFilter === "active";

      const response = await adminService.getWorkspaces(params);
      return response.data;
    },
  });

  // Delete workspace mutation
  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (id: number) => {
      return adminService.deleteWorkspace(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workspaces"] });
      setDeletingWorkspace(null);
    },
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading workspaces</p>
          <p className="text-sm">
            {String((error as Error).message || "Unknown error")}
          </p>
        </div>
      </div>
    );
  }

  // Handle undefined data
  const workspaces = data?.workspaces || [];
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
            Workspaces Management
          </h1>
          <p className="text-gray-600 mt-1">
            View all system workspaces (projects)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Total:{" "}
            <span className="font-semibold">{pagination.total_items}</span>{" "}
            workspaces
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={() => {
              setSearch("");
              setActiveFilter("");
              setPage(1);
            }}
            className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Workspaces Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-12">
            <Icons.FolderKanban className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No workspaces found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workspace
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                {workspaces.map((workspace) => (
                  <tr
                    key={workspace.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-500">
                          <span className="text-white text-sm font-medium">
                            {workspace.name[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                            {workspace.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {workspace.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {workspace.org_name || `-`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {workspace.admin_name || `-`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {workspace.member_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${workspace.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {workspace.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(workspace.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setViewingWorkspace(workspace)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Icons.Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingWorkspace(workspace)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Workspace"
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

      {/* Workspace Detail Modal */}
      {viewingWorkspace && (
        <WorkspaceDetailModal
          workspace={viewingWorkspace}
          onClose={() => setViewingWorkspace(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingWorkspace && (
        <DeleteConfirmModal
          title="Delete Workspace"
          message={`Are you sure you want to delete "${deletingWorkspace.name}"? This will also delete all associated tasks and data. This action cannot be undone.`}
          onClose={() => setDeletingWorkspace(null)}
          onConfirm={() => deleteWorkspaceMutation.mutate(deletingWorkspace.id)}
          isLoading={deleteWorkspaceMutation.isPending}
        />
      )}
    </div>
  );
}

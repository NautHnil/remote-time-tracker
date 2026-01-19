/**
 * Admin Workspaces Page
 * View and manage all system workspaces
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Icons } from "../../components/Icons";
import Pagination from "../../components/Pagination";
import { Button, IconButton, Input, Select } from "../../components/ui";
import {
  AdminOrganization,
  AdminUser,
  AdminWorkspace,
  adminService,
} from "../../services/adminService";

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
            <IconButton onClick={onClose} variant="ghost">
              <Icons.Close className="h-5 w-5" />
            </IconButton>
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

export default function AdminWorkspacesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [viewingWorkspace, setViewingWorkspace] =
    useState<AdminWorkspace | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] =
    useState<AdminWorkspace | null>(null);

  // Fetch workspaces
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "admin-workspaces",
      page,
      pageSize,
      search,
      activeFilter,
      selectedOrgId,
      selectedUserId,
    ],
    queryFn: async () => {
      const params: Record<string, any> = { page, page_size: pageSize };
      if (search) params.search = search;
      if (activeFilter) params.is_active = activeFilter === "active";
      if (selectedOrgId) params.org_id = Number(selectedOrgId);
      if (selectedUserId) params.user_id = Number(selectedUserId);

      const response = await adminService.getWorkspaces(params);
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
    page_size: pageSize,
  };

  const users = (usersData?.users || []) as AdminUser[];
  const organizations = (orgsData?.organizations || []) as AdminOrganization[];
  const orgOptions = useMemo(() => organizations, [organizations]);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            type="text"
            placeholder="Search workspaces..."
            value={search}
            leftIcon={<Icons.Search className="h-4 w-4" />}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>

          <Select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Organizations</option>
            {orgOptions.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>

          <Select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Admin Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </Select>

          <div className="flex items-center justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setActiveFilter("");
                setSelectedOrgId("");
                setSelectedUserId("");
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
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
                        <IconButton
                          onClick={() => setViewingWorkspace(workspace)}
                          title="View Details"
                        >
                          <Icons.Eye className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          onClick={() => setDeletingWorkspace(workspace)}
                          title="Delete Workspace"
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

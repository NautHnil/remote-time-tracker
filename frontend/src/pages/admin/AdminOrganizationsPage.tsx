/**
 * Admin Organizations Page
 * View and manage all system organizations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Icons } from "../../components/Icons";
import Pagination from "../../components/Pagination";
import { Button, IconButton, Input, Select } from "../../components/ui";
import {
  AdminOrganization,
  AdminUser,
  adminService,
} from "../../services/adminService";

// Organization Detail Modal
interface OrgDetailModalProps {
  org: AdminOrganization;
  onClose: () => void;
}

function OrgDetailModal({ org, onClose }: OrgDetailModalProps) {
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
              Organization Details
            </h3>
            <IconButton onClick={onClose} variant="ghost">
              <Icons.Close className="h-5 w-5" />
            </IconButton>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center">
                <Icons.Building2 className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {org.name}
                </h4>
                <p className="text-sm text-gray-500">@{org.slug}</p>
              </div>
            </div>

            {org.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Description
                </label>
                <p className="text-gray-700">{org.description}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500">
                Owner ID
              </label>
              <p className="text-gray-900">{org.owner_id || "N/A"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Members
                </label>
                <p className="text-gray-900 font-medium">
                  {org.member_count || 0}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Workspaces
                </label>
                <p className="text-gray-900 font-medium">
                  {org.workspace_count || 0}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Verified
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${org.is_verified ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
                >
                  {org.is_verified ? "Verified" : "Not Verified"}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${org.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                >
                  {org.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Created
                </label>
                <p className="text-gray-700 text-sm">
                  {formatDate(org.created_at)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Updated
                </label>
                <p className="text-gray-700 text-sm">
                  {formatDate(org.updated_at)}
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

export default function AdminOrganizationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [viewingOrg, setViewingOrg] = useState<AdminOrganization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<AdminOrganization | null>(
    null,
  );

  // Fetch organizations
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "admin-organizations",
      page,
      pageSize,
      search,
      activeFilter,
      selectedUserId,
    ],
    queryFn: async () => {
      const params: Record<string, any> = { page, page_size: pageSize };
      if (search) params.search = search;
      if (activeFilter) params.is_active = activeFilter === "active";
      if (selectedUserId) params.user_id = Number(selectedUserId);

      const response = await adminService.getOrganizations(params);
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

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (id: number) => {
      return adminService.deleteOrganization(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setDeletingOrg(null);
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
          <p className="font-medium">Error loading organizations</p>
          <p className="text-sm">
            {String((error as Error).message || "Unknown error")}
          </p>
        </div>
      </div>
    );
  }

  // Handle undefined data
  const organizations = data?.organizations || [];
  const pagination = data?.pagination || {
    total_items: 0,
    total_pages: 0,
    current_page: page,
    page_size: pageSize,
  };

  const users = (usersData?.users || []) as AdminUser[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Organizations Management
          </h1>
          <p className="text-gray-600 mt-1">View all system organizations</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Total:{" "}
            <span className="font-semibold">{pagination.total_items}</span>{" "}
            organizations
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            type="text"
            placeholder="Search organizations..."
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
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Owners</option>
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
                setSelectedUserId("");
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12">
            <Icons.Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No organizations found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Icons.Building2 className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 truncate max-w-[150px]">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-500">@{org.slug}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${org.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    {org.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Owner ID:</span>
                    <span className="text-gray-700 truncate max-w-[150px]">
                      {org.owner_id || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Members:</span>
                    <span className="text-gray-700">
                      {org.member_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Workspaces:</span>
                    <span className="text-gray-700">
                      {org.workspace_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-700">
                      {formatDate(org.created_at)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                  <IconButton
                    onClick={() => setViewingOrg(org)}
                    title="View Details"
                  >
                    <Icons.Eye className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    onClick={() => setDeletingOrg(org)}
                    title="Delete Organization"
                    variant="danger"
                  >
                    <Icons.Trash className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            ))}
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

      {/* Organization Detail Modal */}
      {viewingOrg && (
        <OrgDetailModal org={viewingOrg} onClose={() => setViewingOrg(null)} />
      )}

      {/* Delete Confirmation Modal */}
      {deletingOrg && (
        <DeleteConfirmModal
          title="Delete Organization"
          message={`Are you sure you want to delete "${deletingOrg.name}"? This will also delete all associated workspaces, tasks, and data. This action cannot be undone.`}
          onClose={() => setDeletingOrg(null)}
          onConfirm={() => deleteOrgMutation.mutate(deletingOrg.id)}
          isLoading={deleteOrgMutation.isPending}
        />
      )}
    </div>
  );
}

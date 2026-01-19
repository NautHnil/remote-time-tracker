# TODO 14: Frontend Admin Organizations Management

## Mục tiêu

Tạo trang quản lý organizations cho admin panel.

## Yêu cầu

### 1. Features

- List organizations với pagination, search, filter
- View organization details
- Edit organization info
- Delete organization
- View organization members
- View organization workspaces
- Verify/unverify organization

### 2. Filter Options

- By name
- By status (verified/unverified)
- By plan
- By date range

## Files cần tạo

```
frontend/src/pages/admin/AdminOrganizationsPage.tsx
frontend/src/components/admin/organizations/OrganizationTable.tsx
frontend/src/components/admin/organizations/OrganizationFilters.tsx
frontend/src/components/admin/organizations/OrganizationDetailDrawer.tsx
frontend/src/components/admin/organizations/OrganizationMembersModal.tsx
frontend/src/components/admin/organizations/EditOrganizationModal.tsx
```

## Tasks chi tiết

### Task 14.1: Tạo Admin Organizations Page

```tsx
// frontend/src/pages/admin/AdminOrganizationsPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import OrganizationTable from "../../components/admin/organizations/OrganizationTable";
import OrganizationFilters from "../../components/admin/organizations/OrganizationFilters";
import OrganizationDetailDrawer from "../../components/admin/organizations/OrganizationDetailDrawer";
import OrganizationMembersModal from "../../components/admin/organizations/OrganizationMembersModal";
import EditOrganizationModal from "../../components/admin/organizations/EditOrganizationModal";
import ConfirmDialog from "../../components/admin/shared/ConfirmDialog";
import Pagination from "../../components/admin/shared/Pagination";
import { toast } from "react-hot-toast";
import { ArrowPathIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface FiltersState {
  search: string;
  verified: string;
  plan: string;
  start_date: string;
  end_date: string;
}

const AdminOrganizationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    verified: "",
    plan: "",
    start_date: "",
    end_date: "",
  });

  // Modal states
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);

  // Fetch organizations
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "admin",
      "organizations",
      page,
      pageSize,
      sortBy,
      sortOrder,
      filters,
    ],
    queryFn: async () => {
      const response = await adminService.getOrganizations({
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
    mutationFn: (orgId: number) => adminService.deleteOrganization(orgId),
    onSuccess: () => {
      toast.success("Organization deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      setDeleteDialogOpen(false);
      setSelectedOrg(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete organization",
      );
    },
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: ({ orgId, verified }: { orgId: number; verified: boolean }) =>
      adminService.updateOrganization(orgId, { is_verified: verified }),
    onSuccess: () => {
      toast.success("Organization status updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update organization",
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

  const handleViewDetails = (org: any) => {
    setSelectedOrg(org);
    setDetailDrawerOpen(true);
  };

  const handleViewMembers = (org: any) => {
    setSelectedOrg(org);
    setMembersModalOpen(true);
  };

  const handleEdit = (org: any) => {
    setSelectedOrg(org);
    setEditModalOpen(true);
  };

  const handleDelete = (org: any) => {
    setSelectedOrg(org);
    setDeleteDialogOpen(true);
  };

  const handleVerify = (org: any, verified: boolean) => {
    verifyMutation.mutate({ orgId: org.id, verified });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Organizations Management
          </h1>
          <p className="text-gray-500">
            {data?.total || 0} total organizations
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
          <button className="flex items-center px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <OrganizationFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={() =>
          setFilters({
            search: "",
            verified: "",
            plan: "",
            start_date: "",
            end_date: "",
          })
        }
      />

      {/* Table */}
      <OrganizationTable
        organizations={data?.organizations || []}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onView={handleViewDetails}
        onViewMembers={handleViewMembers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onVerify={handleVerify}
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
      <OrganizationDetailDrawer
        isOpen={detailDrawerOpen}
        organization={selectedOrg}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOrg(null);
        }}
      />

      <OrganizationMembersModal
        isOpen={membersModalOpen}
        organization={selectedOrg}
        onClose={() => {
          setMembersModalOpen(false);
          setSelectedOrg(null);
        }}
      />

      <EditOrganizationModal
        isOpen={editModalOpen}
        organization={selectedOrg}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedOrg(null);
        }}
        onSuccess={() => {
          setEditModalOpen(false);
          setSelectedOrg(null);
          queryClient.invalidateQueries({
            queryKey: ["admin", "organizations"],
          });
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Organization"
        message={`Are you sure you want to delete organization "${selectedOrg?.name}"? This will delete all associated workspaces, tasks, and data. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => selectedOrg && deleteMutation.mutate(selectedOrg.id)}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedOrg(null);
        }}
      />
    </div>
  );
};

export default AdminOrganizationsPage;
```

### Task 14.2: Tạo Organization Table

```tsx
// frontend/src/components/admin/organizations/OrganizationTable.tsx
import React from "react";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  CheckBadgeIcon,
  XCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface Organization {
  id: number;
  name: string;
  description: string;
  owner_name: string;
  owner_email: string;
  member_count: number;
  workspace_count: number;
  is_verified: boolean;
  plan: string;
  created_at: string;
}

interface OrganizationTableProps {
  organizations: Organization[];
  isLoading: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  onView: (org: Organization) => void;
  onViewMembers: (org: Organization) => void;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
  onVerify: (org: Organization, verified: boolean) => void;
}

const OrganizationTable: React.FC<OrganizationTableProps> = ({
  organizations,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onViewMembers,
  onEdit,
  onDelete,
  onVerify,
}) => {
  const columns = [
    { key: "name", label: "Organization", sortable: true },
    { key: "owner", label: "Owner", sortable: false },
    { key: "members", label: "Members", sortable: true },
    { key: "workspaces", label: "Workspaces", sortable: true },
    { key: "plan", label: "Plan", sortable: true },
    { key: "verified", label: "Verified", sortable: false },
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

  const getPlanBadgeColor = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case "enterprise":
        return "bg-purple-100 text-purple-800";
      case "pro":
        return "bg-blue-100 text-blue-800";
      case "free":
      default:
        return "bg-gray-100 text-gray-800";
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
            {organizations.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No organizations found
                </td>
              </tr>
            ) : (
              organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        {org.name}
                        {org.is_verified && (
                          <CheckBadgeIcon className="h-4 w-4 text-blue-500 ml-1" />
                        )}
                      </div>
                      {org.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {org.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {org.owner_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {org.owner_email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.member_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.workspace_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(org.plan)}`}
                    >
                      {org.plan || "Free"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onVerify(org, !org.is_verified)}
                      className={`
                        inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full
                        ${
                          org.is_verified
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }
                      `}
                    >
                      {org.is_verified ? (
                        <>
                          <CheckBadgeIcon className="h-4 w-4 mr-1" />
                          Verified
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Unverified
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(org.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onView(org)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onViewMembers(org)}
                        className="p-1 text-gray-400 hover:text-purple-600 rounded"
                        title="View members"
                      >
                        <UsersIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onEdit(org)}
                        className="p-1 text-gray-400 hover:text-green-600 rounded"
                        title="Edit organization"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDelete(org)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete organization"
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

export default OrganizationTable;
```

### Task 14.3: Tạo Organization Detail Drawer

```tsx
// frontend/src/components/admin/organizations/OrganizationDetailDrawer.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../../services/adminService";
import {
  XMarkIcon,
  BuildingOfficeIcon,
  UsersIcon,
  FolderIcon,
  CalendarIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

interface OrganizationDetailDrawerProps {
  isOpen: boolean;
  organization: any;
  onClose: () => void;
}

const OrganizationDetailDrawer: React.FC<OrganizationDetailDrawerProps> = ({
  isOpen,
  organization,
  onClose,
}) => {
  const { data: details, isLoading } = useQuery({
    queryKey: ["admin", "organization", organization?.id],
    queryFn: async () => {
      const response = await adminService.getOrganization(organization.id);
      return response.data.data;
    },
    enabled: isOpen && !!organization?.id,
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
              Organization Details
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
                {/* Organization Info */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      {details.name}
                      {details.is_verified && (
                        <CheckBadgeIcon className="h-5 w-5 text-blue-500 ml-2" />
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {details.plan || "Free"} Plan
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
                      <FolderIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm">Workspaces</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {details.workspace_count}
                    </p>
                  </div>
                </div>

                {/* Owner */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Owner
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-900">
                      {details.owner_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {details.owner_email}
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
                  {details.updated_at && (
                    <div className="flex items-center text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        Updated: {formatDate(details.updated_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Recent Workspaces */}
                {details.workspaces && details.workspaces.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">
                      Recent Workspaces
                    </h4>
                    <div className="space-y-2">
                      {details.workspaces.slice(0, 5).map((ws: any) => (
                        <div
                          key={ws.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {ws.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {ws.member_count} members
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${ws.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
                          >
                            {ws.is_active ? "Active" : "Inactive"}
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

export default OrganizationDetailDrawer;
```

## Acceptance Criteria

- [ ] Organization list hiển thị đúng với pagination
- [ ] Search và filter hoạt động
- [ ] Sort by columns hoạt động
- [ ] View organization details trong drawer
- [ ] View organization members modal
- [ ] Edit organization modal hoạt động
- [ ] Delete organization với confirm dialog
- [ ] Verify/unverify toggle hoạt động
- [ ] Error handling và loading states

## Dependencies

- TODO 11: Frontend Admin Layout
- TODO 05: Backend Admin Organizations API

## Estimated Time

- 4-5 giờ

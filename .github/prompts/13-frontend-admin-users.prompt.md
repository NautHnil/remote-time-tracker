# TODO 13: Frontend Admin Users Management

## Mục tiêu

Tạo trang quản lý users cho admin panel với đầy đủ chức năng CRUD.

## Yêu cầu

### 1. Features

- List users với pagination, search, filter
- Create new user
- Edit user info
- Delete user (soft delete)
- View user details
- Change user role
- Reset password
- Export users to CSV

### 2. Filter Options

- By role (admin/member)
- By system_role (admin/user)
- By organization
- By status (active/inactive)
- By date range

## Files cần tạo

```
frontend/src/pages/admin/AdminUsersPage.tsx
frontend/src/components/admin/users/UserTable.tsx
frontend/src/components/admin/users/UserFilters.tsx
frontend/src/components/admin/users/CreateUserModal.tsx
frontend/src/components/admin/users/EditUserModal.tsx
frontend/src/components/admin/users/UserDetailDrawer.tsx
frontend/src/components/admin/shared/DataTable.tsx
frontend/src/components/admin/shared/Pagination.tsx
frontend/src/components/admin/shared/ConfirmDialog.tsx
```

## Tasks chi tiết

### Task 13.1: Tạo Admin Users Page

```tsx
// frontend/src/pages/admin/AdminUsersPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import UserTable from "../../components/admin/users/UserTable";
import UserFilters from "../../components/admin/users/UserFilters";
import CreateUserModal from "../../components/admin/users/CreateUserModal";
import EditUserModal from "../../components/admin/users/EditUserModal";
import UserDetailDrawer from "../../components/admin/users/UserDetailDrawer";
import ConfirmDialog from "../../components/admin/shared/ConfirmDialog";
import Pagination from "../../components/admin/shared/Pagination";
import { toast } from "react-hot-toast";
import {
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface UserFiltersState {
  search: string;
  role: string;
  system_role: string;
  organization_id: string;
  status: string;
  start_date: string;
  end_date: string;
}

const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<UserFiltersState>({
    search: "",
    role: "",
    system_role: "",
    organization_id: "",
    status: "",
    start_date: "",
    end_date: "",
  });

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Fetch users
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "users", page, pageSize, sortBy, sortOrder, filters],
    queryFn: async () => {
      const response = await adminService.getUsers({
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
    mutationFn: (userId: number) => adminService.deleteUser(userId),
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete user");
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

  const handleFilterChange = (newFilters: Partial<UserFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleViewDetails = (user: any) => {
    setSelectedUser(user);
    setDetailDrawerOpen(true);
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDelete = (user: any) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const response = await adminService.exportUsers(filters);
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Users exported successfully");
    } catch (error) {
      toast.error("Failed to export users");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-500">{data?.total || 0} total users</p>
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
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <UserFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={() =>
          setFilters({
            search: "",
            role: "",
            system_role: "",
            organization_id: "",
            status: "",
            start_date: "",
            end_date: "",
          })
        }
      />

      {/* Table */}
      <UserTable
        users={data?.users || []}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onView={handleViewDetails}
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
      <CreateUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        }}
      />

      <EditUserModal
        isOpen={editModalOpen}
        user={selectedUser}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
          queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        }}
      />

      <UserDetailDrawer
        isOpen={detailDrawerOpen}
        user={selectedUser}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedUser(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete User"
        message={`Are you sure you want to delete user "${selectedUser?.email}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
};

export default AdminUsersPage;
```

### Task 13.2: Tạo User Table Component

```tsx
// frontend/src/components/admin/users/UserTable.tsx
import React from "react";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  system_role: string;
  organization_name?: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
}) => {
  const columns = [
    { key: "email", label: "Email", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "role", label: "Role", sortable: true },
    { key: "system_role", label: "System Role", sortable: true },
    { key: "organization", label: "Organization", sortable: false },
    { key: "status", label: "Status", sortable: false },
    { key: "created_at", label: "Created", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
  ];

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUpIcon className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 ml-1" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "member":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSystemRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "user":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSystemRoleBadgeColor(user.system_role)}`}
                    >
                      {user.system_role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.organization_name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onView(user)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onEdit(user)}
                        className="p-1 text-gray-400 hover:text-green-600 rounded"
                        title="Edit user"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDelete(user)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete user"
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

export default UserTable;
```

### Task 13.3: Tạo User Filters Component

```tsx
// frontend/src/components/admin/users/UserFilters.tsx
import React from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface UserFiltersProps {
  filters: {
    search: string;
    role: string;
    system_role: string;
    organization_id: string;
    status: string;
    start_date: string;
    end_date: string;
  };
  onChange: (filters: Partial<UserFiltersProps["filters"]>) => void;
  onReset: () => void;
}

const UserFilters: React.FC<UserFiltersProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Role Filter */}
        <select
          value={filters.role}
          onChange={(e) => onChange({ role: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>

        {/* System Role Filter */}
        <select
          value={filters.system_role}
          onChange={(e) => onChange({ system_role: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All System Roles</option>
          <option value="admin">System Admin</option>
          <option value="user">Regular User</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Date Range */}
        <input
          type="date"
          value={filters.start_date}
          onChange={(e) => onChange({ start_date: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Start Date"
        />

        <input
          type="date"
          value={filters.end_date}
          onChange={(e) => onChange({ end_date: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="End Date"
        />

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center justify-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 mr-1" />
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default UserFilters;
```

### Task 13.4: Tạo Create User Modal

```tsx
// frontend/src/components/admin/users/CreateUserModal.tsx
import React from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { adminService } from "../../../services/adminService";
import { toast } from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateUserForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  system_role: string;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({
    defaultValues: {
      role: "member",
      system_role: "user",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateUserForm) => adminService.createUser(data),
    onSuccess: () => {
      toast.success("User created successfully");
      reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create user");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Create New User
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  {...register("first_name")}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  {...register("last_name")}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  {...register("role")}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Role
                </label>
                <select
                  {...register("system_role")}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">Regular User</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {mutation.isPending ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUserModal;
```

## Acceptance Criteria

- [ ] User list hiển thị đúng với pagination
- [ ] Search và filter hoạt động
- [ ] Sort by columns hoạt động
- [ ] Create user modal hoạt động
- [ ] Edit user modal hoạt động
- [ ] Delete user với confirm dialog
- [ ] View user details trong drawer
- [ ] Export to CSV hoạt động
- [ ] Error handling và loading states

## Dependencies

- TODO 11: Frontend Admin Layout
- TODO 04: Backend Admin Users API

## Estimated Time

- 5-6 giờ

## Notes

- Cần cài đặt react-hook-form cho forms
- Cần cài đặt react-hot-toast cho notifications

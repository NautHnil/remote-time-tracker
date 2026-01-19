# TODO 18: Frontend Admin Screenshots Management

## Mục tiêu

Tạo trang quản lý screenshots cho admin panel với gallery view.

## Yêu cầu

### 1. Features

- Grid/gallery view screenshots
- View full-size screenshot
- Delete screenshots (single & bulk)
- Filter by user, task, workspace, date
- Storage usage statistics
- Download screenshots
- Lightbox viewer

### 2. Filter Options

- By user
- By task
- By workspace
- By organization
- By date range
- By file size

## Files cần tạo

```
frontend/src/pages/admin/AdminScreenshotsPage.tsx
frontend/src/components/admin/screenshots/ScreenshotGallery.tsx
frontend/src/components/admin/screenshots/ScreenshotFilters.tsx
frontend/src/components/admin/screenshots/ScreenshotLightbox.tsx
frontend/src/components/admin/screenshots/StorageStats.tsx
```

## Tasks chi tiết

### Task 18.1: Tạo Admin Screenshots Page

```tsx
// frontend/src/pages/admin/AdminScreenshotsPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import ScreenshotGallery from "../../components/admin/screenshots/ScreenshotGallery";
import ScreenshotFilters from "../../components/admin/screenshots/ScreenshotFilters";
import ScreenshotLightbox from "../../components/admin/screenshots/ScreenshotLightbox";
import StorageStats from "../../components/admin/screenshots/StorageStats";
import ConfirmDialog from "../../components/admin/shared/ConfirmDialog";
import Pagination from "../../components/admin/shared/Pagination";
import { toast } from "react-hot-toast";
import {
  ArrowPathIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

interface FiltersState {
  user_id: string;
  task_id: string;
  workspace_id: string;
  organization_id: string;
  start_date: string;
  end_date: string;
}

const AdminScreenshotsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(48);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<FiltersState>({
    user_id: "",
    task_id: "",
    workspace_id: "",
    organization_id: "",
    start_date: "",
    end_date: "",
  });

  // Modal states
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const [selectedScreenshots, setSelectedScreenshots] = useState<number[]>([]);

  // Fetch screenshots
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "screenshots", page, pageSize, filters],
    queryFn: async () => {
      const response = await adminService.getScreenshots({
        page,
        page_size: pageSize,
        ...filters,
      });
      return response.data.data;
    },
  });

  // Fetch storage stats
  const { data: storageStats } = useQuery({
    queryKey: ["admin", "screenshots", "storage"],
    queryFn: async () => {
      const response = await adminService.getScreenshotStorageStats();
      return response.data.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (screenshotId: number) =>
      adminService.deleteScreenshot(screenshotId),
    onSuccess: () => {
      toast.success("Screenshot deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "screenshots"] });
      setDeleteDialogOpen(false);
      setSelectedScreenshot(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete screenshot",
      );
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => adminService.bulkDeleteScreenshots(ids),
    onSuccess: () => {
      toast.success("Screenshots deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "screenshots"] });
      setSelectedScreenshots([]);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete screenshots",
      );
    },
  });

  // Handlers
  const handleFilterChange = (newFilters: Partial<FiltersState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleViewScreenshot = (screenshot: any, index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleDelete = (screenshot: any) => {
    setSelectedScreenshot(screenshot);
    setDeleteDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedScreenshots(data?.screenshots.map((s: any) => s.id) || []);
    } else {
      setSelectedScreenshots([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedScreenshots((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleBulkDelete = () => {
    if (selectedScreenshots.length === 0) {
      toast.error("Please select screenshots first");
      return;
    }
    bulkDeleteMutation.mutate(selectedScreenshots);
  };

  const handleDownload = async (screenshot: any) => {
    try {
      const response = await adminService.downloadScreenshot(screenshot.id);
      const blob = new Blob([response.data], { type: "image/png" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `screenshot-${screenshot.id}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download screenshot");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Screenshots Management
          </h1>
          <p className="text-gray-500">{data?.total || 0} total screenshots</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
              title="Grid view"
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
              title="List view"
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Storage Stats */}
      <StorageStats stats={storageStats} />

      {/* Bulk Actions */}
      {selectedScreenshots.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-700">
            {selectedScreenshots.length} screenshots selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            disabled={bulkDeleteMutation.isPending}
          >
            <TrashIcon className="h-5 w-5 mr-2" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Filters */}
      <ScreenshotFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={() =>
          setFilters({
            user_id: "",
            task_id: "",
            workspace_id: "",
            organization_id: "",
            start_date: "",
            end_date: "",
          })
        }
      />

      {/* Gallery */}
      <ScreenshotGallery
        screenshots={data?.screenshots || []}
        isLoading={isLoading}
        viewMode={viewMode}
        selectedIds={selectedScreenshots}
        onView={handleViewScreenshot}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
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
        pageSizeOptions={[24, 48, 96, 192]}
      />

      {/* Lightbox */}
      <ScreenshotLightbox
        isOpen={lightboxOpen}
        screenshots={data?.screenshots || []}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        onDownload={handleDownload}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Screenshot"
        message="Are you sure you want to delete this screenshot? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() =>
          selectedScreenshot && deleteMutation.mutate(selectedScreenshot.id)
        }
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedScreenshot(null);
        }}
      />
    </div>
  );
};

export default AdminScreenshotsPage;
```

### Task 18.2: Tạo Screenshot Gallery

```tsx
// frontend/src/components/admin/screenshots/ScreenshotGallery.tsx
import React from "react";
import {
  EyeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

interface Screenshot {
  id: number;
  file_path: string;
  thumbnail_url?: string;
  file_size: number;
  user_name: string;
  task_title: string;
  workspace_name: string;
  captured_at: string;
  monitor_index: number;
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
  isLoading: boolean;
  viewMode: "grid" | "list";
  selectedIds: number[];
  onView: (screenshot: Screenshot, index: number) => void;
  onDelete: (screenshot: Screenshot) => void;
  onDownload: (screenshot: Screenshot) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: number) => void;
}

const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({
  screenshots,
  isLoading,
  viewMode,
  selectedIds,
  onView,
  onDelete,
  onDownload,
  onSelectAll,
  onSelectOne,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allSelected =
    screenshots.length > 0 && selectedIds.length === screenshots.length;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (screenshots.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <p className="text-gray-500">No screenshots found</p>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Select All */}
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="rounded border-gray-300 mr-2"
          />
          <span className="text-sm text-gray-500">Select all</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {screenshots.map((screenshot, index) => (
            <div
              key={screenshot.id}
              className={`
                relative group rounded-lg overflow-hidden border-2 transition-all
                ${
                  selectedIds.includes(screenshot.id)
                    ? "border-blue-500"
                    : "border-transparent hover:border-gray-200"
                }
              `}
            >
              {/* Checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(screenshot.id)}
                  onChange={() => onSelectOne(screenshot.id)}
                  className="rounded border-gray-300"
                />
              </div>

              {/* Image */}
              <div
                className="aspect-video bg-gray-100 cursor-pointer"
                onClick={() => onView(screenshot, index)}
              >
                <img
                  src={screenshot.thumbnail_url || screenshot.file_path}
                  alt="Screenshot"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onView(screenshot, index)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    title="View"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDownload(screenshot)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:bg-green-50 hover:text-green-600"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDelete(screenshot)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-2 text-xs">
                <p className="text-gray-900 truncate">{screenshot.user_name}</p>
                <p className="text-gray-500">
                  {formatDate(screenshot.captured_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded border-gray-300"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Preview
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Task
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Workspace
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Captured
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {screenshots.map((screenshot, index) => (
            <tr key={screenshot.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(screenshot.id)}
                  onChange={() => onSelectOne(screenshot.id)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="px-6 py-4">
                <div
                  className="w-20 h-12 bg-gray-100 rounded overflow-hidden cursor-pointer"
                  onClick={() => onView(screenshot, index)}
                >
                  <img
                    src={screenshot.thumbnail_url || screenshot.file_path}
                    alt="Screenshot"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {screenshot.user_name}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                {screenshot.task_title || "-"}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {screenshot.workspace_name}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatDate(screenshot.captured_at)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatFileSize(screenshot.file_size)}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onView(screenshot, index)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDownload(screenshot)}
                    className="p-1 text-gray-400 hover:text-green-600"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDelete(screenshot)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScreenshotGallery;
```

### Task 18.3: Tạo Screenshot Lightbox

```tsx
// frontend/src/components/admin/screenshots/ScreenshotLightbox.tsx
import React, { useEffect, useCallback } from "react";
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

interface Screenshot {
  id: number;
  file_path: string;
  user_name: string;
  task_title: string;
  captured_at: string;
}

interface ScreenshotLightboxProps {
  isOpen: boolean;
  screenshots: Screenshot[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDownload: (screenshot: Screenshot) => void;
}

const ScreenshotLightbox: React.FC<ScreenshotLightboxProps> = ({
  isOpen,
  screenshots,
  currentIndex,
  onClose,
  onNavigate,
  onDownload,
}) => {
  const currentScreenshot = screenshots[currentIndex];

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < screenshots.length - 1) {
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, screenshots.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentScreenshot) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black bg-opacity-50">
        <div className="text-white">
          <p className="font-medium">{currentScreenshot.user_name}</p>
          <p className="text-sm text-gray-300">
            {currentScreenshot.task_title || "No task"} •{" "}
            {formatDate(currentScreenshot.captured_at)}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-white text-sm">
            {currentIndex + 1} / {screenshots.length}
          </span>
          <button
            onClick={() => onDownload(currentScreenshot)}
            className="p-2 text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowDownTrayIcon className="h-6 w-6" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/10 rounded-lg"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center relative px-16">
        <img
          src={currentScreenshot.file_path}
          alt="Screenshot"
          className="max-h-full max-w-full object-contain"
        />

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <ChevronLeftIcon className="h-8 w-8" />
          </button>
        )}
        {currentIndex < screenshots.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <ChevronRightIcon className="h-8 w-8" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="bg-black bg-opacity-50 p-2 overflow-x-auto">
        <div className="flex items-center justify-center space-x-2">
          {screenshots
            .slice(Math.max(0, currentIndex - 5), currentIndex + 6)
            .map((screenshot, idx) => {
              const actualIndex = Math.max(0, currentIndex - 5) + idx;
              return (
                <div
                  key={screenshot.id}
                  onClick={() => onNavigate(actualIndex)}
                  className={`
                  w-16 h-10 rounded overflow-hidden cursor-pointer flex-shrink-0
                  ${actualIndex === currentIndex ? "ring-2 ring-white" : "opacity-50 hover:opacity-100"}
                `}
                >
                  <img
                    src={screenshot.file_path}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default ScreenshotLightbox;
```

### Task 18.4: Tạo Storage Stats

```tsx
// frontend/src/components/admin/screenshots/StorageStats.tsx
import React from "react";
import { ServerIcon } from "@heroicons/react/24/outline";

interface StorageStatsProps {
  stats?: {
    total_size: number;
    total_count: number;
    size_by_user: { user_name: string; size: number; count: number }[];
    size_by_workspace: {
      workspace_name: string;
      size: number;
      count: number;
    }[];
  };
}

const StorageStats: React.FC<StorageStatsProps> = ({ stats }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (!stats) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Storage Usage</h3>
        <ServerIcon className="h-6 w-6 text-gray-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Stats */}
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-700">Total Storage</p>
          <p className="text-2xl font-bold text-blue-900">
            {formatFileSize(stats.total_size)}
          </p>
          <p className="text-sm text-blue-600">
            {stats.total_count.toLocaleString()} files
          </p>
        </div>

        {/* Top Users */}
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">
            Top Users by Storage
          </p>
          <div className="space-y-2">
            {stats.size_by_user.slice(0, 3).map((user, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{user.user_name}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatFileSize(user.size)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Workspaces */}
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">
            Top Workspaces
          </p>
          <div className="space-y-2">
            {stats.size_by_workspace.slice(0, 3).map((ws, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {ws.workspace_name}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatFileSize(ws.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageStats;
```

## Acceptance Criteria

- [ ] Screenshot gallery hiển thị đúng (grid/list view)
- [ ] Filter hoạt động (user, task, workspace, date)
- [ ] Lightbox viewer với keyboard navigation
- [ ] Download single screenshot
- [ ] Delete single và bulk screenshots
- [ ] Storage stats hiển thị đúng
- [ ] Thumbnail navigation trong lightbox
- [ ] Responsive gallery layout
- [ ] Lazy loading images

## Dependencies

- TODO 11: Frontend Admin Layout
- TODO 09: Backend Admin Screenshots API

## Estimated Time

- 5-6 giờ

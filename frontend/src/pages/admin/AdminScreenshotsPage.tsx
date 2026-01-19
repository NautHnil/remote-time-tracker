/**
 * Admin Screenshots Page
 * View and manage all system screenshots
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Icons } from "../../components/Icons";
import Pagination from "../../components/Pagination";
import { AdminScreenshot, adminService } from "../../services/adminService";
import { API_BASE_URL } from "../../services/config";

// Screenshot Preview Modal
interface ScreenshotPreviewModalProps {
  screenshot: AdminScreenshot;
  onClose: () => void;
}

function ScreenshotPreviewModal({
  screenshot,
  onClose,
}: ScreenshotPreviewModalProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy HH:mm:ss");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getImageUrl = () => {
    const token = localStorage.getItem("access_token");
    return `${API_BASE_URL}/screenshots/${screenshot.id}/view?token=${token}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div
          className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full z-10 max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Screenshot Preview
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icons.Close className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Image Preview */}
            <div className="lg:w-2/3 bg-gray-900 flex items-center justify-center min-h-[300px]">
              <img
                src={getImageUrl()}
                alt={`Screenshot ${screenshot.id}`}
                className="max-w-full max-h-[60vh] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23374151' width='100' height='100'/%3E%3Ctext fill='%239CA3AF' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>

            {/* Details Panel */}
            <div className="lg:w-1/3 p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    File Path
                  </label>
                  <p className="text-gray-900 text-sm break-all">
                    {screenshot.file_path}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    File Size
                  </label>
                  <p className="text-gray-900">
                    {formatFileSize(screenshot.file_size)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Captured At
                  </label>
                  <p className="text-gray-900">
                    {formatDate(screenshot.captured_at)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    User
                  </label>
                  <p className="text-gray-900">
                    {screenshot.user_name || "Unknown"}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {screenshot.user_email}
                  </p>
                </div>

                {screenshot.task_title && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Task
                    </label>
                    <p className="text-gray-900">{screenshot.task_title}</p>
                  </div>
                )}

                {screenshot.org_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Organization
                    </label>
                    <p className="text-gray-900">{screenshot.org_name}</p>
                  </div>
                )}

                {screenshot.workspace_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Workspace
                    </label>
                    <p className="text-gray-900">{screenshot.workspace_name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end px-6 py-4 border-t border-gray-200">
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

export default function AdminScreenshotsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(24);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [viewingScreenshot, setViewingScreenshot] =
    useState<AdminScreenshot | null>(null);
  const [deletingScreenshot, setDeletingScreenshot] =
    useState<AdminScreenshot | null>(null);

  // Fetch screenshots
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-screenshots", page, limit, startDate, endDate],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await adminService.getScreenshots(params);
      return response.data;
    },
  });

  // Delete screenshot mutation
  const deleteScreenshotMutation = useMutation({
    mutationFn: async (id: number) => {
      return adminService.deleteScreenshot(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-screenshots"] });
      setDeletingScreenshot(null);
    },
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, HH:mm");
  };

  const getThumbnailUrl = (screenshot: AdminScreenshot) => {
    const token = localStorage.getItem("access_token");
    return `${API_BASE_URL}/screenshots/${screenshot.id}/view?token=${token}`;
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading screenshots</p>
          <p className="text-sm">
            {String((error as Error).message || "Unknown error")}
          </p>
        </div>
      </div>
    );
  }

  // Handle undefined data
  const screenshots = data?.screenshots || [];
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
            Screenshots Management
          </h1>
          <p className="text-gray-600 mt-1">View all captured screenshots</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Total:{" "}
            <span className="font-semibold">{pagination.total_items}</span>{" "}
            screenshots
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
              className="w-full px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Screenshots Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-12">
            <Icons.Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No screenshots found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
            {screenshots.map((screenshot) => (
              <div
                key={screenshot.id}
                className="group relative bg-gray-100 rounded-lg overflow-hidden aspect-video cursor-pointer"
                onClick={() => setViewingScreenshot(screenshot)}
              >
                <img
                  src={getThumbnailUrl(screenshot)}
                  alt={`Screenshot ${screenshot.id}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23374151' width='100' height='100'/%3E%3Ctext fill='%239CA3AF' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E";
                  }}
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingScreenshot(screenshot);
                      }}
                      className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                    >
                      <Icons.Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingScreenshot(screenshot);
                      }}
                      className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                    >
                      <Icons.Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Info Badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">
                    {screenshot.user_name || "Unknown"}
                  </p>
                  <p className="text-white/70 text-xs">
                    {formatDate(screenshot.captured_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && (data.pagination?.total_pages || 0) > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={page}
              totalPages={data.pagination?.total_pages || 1}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Screenshot Preview Modal */}
      {viewingScreenshot && (
        <ScreenshotPreviewModal
          screenshot={viewingScreenshot}
          onClose={() => setViewingScreenshot(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingScreenshot && (
        <DeleteConfirmModal
          title="Delete Screenshot"
          message="Are you sure you want to delete this screenshot? This action cannot be undone."
          onClose={() => setDeletingScreenshot(null)}
          onConfirm={() =>
            deleteScreenshotMutation.mutate(deletingScreenshot.id)
          }
          isLoading={deleteScreenshotMutation.isPending}
        />
      )}
    </div>
  );
}

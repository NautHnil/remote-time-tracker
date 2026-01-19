/**
 * Admin Screenshots Page
 * View and manage all system screenshots
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Icons } from "../../components/Icons";
import Pagination from "../../components/Pagination";
import { Button, IconButton, Input, Select } from "../../components/ui";
import {
  AdminOrganization,
  AdminScreenshot,
  AdminUser,
  AdminWorkspace,
  adminService,
} from "../../services/adminService";
import { API_BASE_URL } from "../../services/config";

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

// Screenshot Lightbox Modal
interface ScreenshotLightboxModalProps {
  screenshots: AdminScreenshot[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function ScreenshotLightboxModal({
  screenshots,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: ScreenshotLightboxModalProps) {
  const current = screenshots[currentIndex];
  if (!current) return null;

  const token = localStorage.getItem("access_token");
  const imageUrl = `${API_BASE_URL}/admin/screenshots/${current.id}/view?token=${token}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div
          className="fixed inset-0 bg-black/80 transition-opacity"
          onClick={onClose}
        />

        <div className="relative z-10 w-full max-w-6xl">
          <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
            <div className="absolute top-4 right-4 z-20">
              <IconButton
                onClick={onClose}
                className="bg-white/90 hover:bg-white"
              >
                <Icons.Close className="h-5 w-5" />
              </IconButton>
            </div>

            <div className="relative flex items-center justify-center min-h-[60vh]">
              <img
                src={imageUrl}
                alt={`Screenshot ${current.id}`}
                className="max-h-[80vh] w-auto max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Crect fill='%23374151' width='160' height='160'/%3E%3Ctext fill='%239CA3AF' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                }}
              />

              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <IconButton
                  onClick={onPrev}
                  disabled={screenshots.length <= 1}
                  className="bg-white/90 hover:bg-white"
                >
                  <Icons.ChevronLeft className="h-5 w-5" />
                </IconButton>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <IconButton
                  onClick={onNext}
                  disabled={screenshots.length <= 1}
                  className="bg-white/90 hover:bg-white"
                >
                  <Icons.ChevronRight className="h-5 w-5" />
                </IconButton>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-white/80">
            <span>
              {currentIndex + 1} / {screenshots.length}
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onPrev}
                disabled={screenshots.length <= 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onNext}
                disabled={screenshots.length <= 1}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminScreenshotsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  const [selectedScreenshot, setSelectedScreenshot] =
    useState<AdminScreenshot | null>(null);
  const [deletingScreenshot, setDeletingScreenshot] =
    useState<AdminScreenshot | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Fetch screenshots
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "admin-screenshots",
      page,
      pageSize,
      startDate,
      endDate,
      selectedUserId,
      selectedOrgId,
      selectedWorkspaceId,
    ],
    queryFn: async () => {
      const params: Record<string, any> = { page, page_size: pageSize };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedUserId) params.user_id = Number(selectedUserId);
      if (selectedOrgId) params.org_id = Number(selectedOrgId);
      if (selectedOrgId && selectedWorkspaceId) {
        params.workspace_id = Number(selectedWorkspaceId);
      }

      const response = await adminService.getScreenshots(params);
      return response.data;
    },
  });

  // Filter options
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

  const formatDateFull = (dateString: string | null | undefined) => {
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

  const getThumbnailUrl = (screenshot: AdminScreenshot) => {
    const token = localStorage.getItem("access_token");
    return `${API_BASE_URL}/admin/screenshots/${screenshot.id}/view?token=${token}`;
  };

  const getImageUrl = (screenshot: AdminScreenshot) => {
    const token = localStorage.getItem("access_token");
    return `${API_BASE_URL}/admin/screenshots/${screenshot.id}/view?token=${token}`;
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
    page_size: pageSize,
  };

  const users = (usersData?.users || []) as AdminUser[];
  const organizations = (orgsData?.organizations || []) as AdminOrganization[];
  const workspaces = useMemo(() => {
    const list = (workspacesData?.workspaces || []) as AdminWorkspace[];
    if (!selectedOrgId) return list;
    return list.filter((ws) => String(ws.organization_id) === selectedOrgId);
  }, [workspacesData, selectedOrgId]);

  useEffect(() => {
    if (screenshots.length === 0) {
      setSelectedScreenshot(null);
      return;
    }

    if (!selectedScreenshot) {
      setSelectedScreenshot(screenshots[0]);
      return;
    }

    const stillExists = screenshots.some(
      (item) => item.id === selectedScreenshot.id,
    );
    if (!stillExists) {
      setSelectedScreenshot(screenshots[0]);
    }
  }, [screenshots, selectedScreenshot]);

  const selectedIndex = useMemo(() => {
    if (!selectedScreenshot) return -1;
    return screenshots.findIndex((item) => item.id === selectedScreenshot.id);
  }, [screenshots, selectedScreenshot]);

  const handlePrev = () => {
    if (screenshots.length === 0 || selectedIndex === -1) return;
    const nextIndex =
      (selectedIndex - 1 + screenshots.length) % screenshots.length;
    setSelectedScreenshot(screenshots[nextIndex]);
  };

  const handleNext = () => {
    if (screenshots.length === 0 || selectedIndex === -1) return;
    const nextIndex = (selectedIndex + 1) % screenshots.length;
    setSelectedScreenshot(screenshots[nextIndex]);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            {/* <label className="block text-sm font-medium text-gray-700 mb-1">
              User
            </label> */}
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
          </div>

          <div>
            {/* <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization
            </label> */}
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
          </div>

          <div>
            {/* <label className="block text-sm font-medium text-gray-700 mb-1">
              Workspace
            </label> */}
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
            {/* {!selectedOrgId && (
              <p className="text-xs text-gray-400 mt-1">
                Select an organization first
              </p>
            )} */}
          </div>

          <div>
            {/* <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label> */}
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            {/* <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label> */}
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSelectedUserId("");
                setSelectedOrgId("");
                setSelectedWorkspaceId("");
                setPage(1);
              }}
              variant="secondary"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Screenshots Gallery */}
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
          <div className="space-y-6 p-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-3">
                <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                  {selectedScreenshot ? (
                    <img
                      src={getImageUrl(selectedScreenshot)}
                      alt={`Screenshot ${selectedScreenshot.id}`}
                      className="max-w-full max-h-full object-contain cursor-zoom-in"
                      onClick={() => setLightboxOpen(true)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23374151' width='100' height='100'/%3E%3Ctext fill='%239CA3AF' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  ) : null}

                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <IconButton
                      onClick={handlePrev}
                      disabled={screenshots.length <= 1}
                      className="bg-white/90 hover:bg-white"
                    >
                      <Icons.ChevronLeft className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <IconButton
                      onClick={handleNext}
                      disabled={screenshots.length <= 1}
                      className="bg-white/90 hover:bg-white"
                    >
                      <Icons.ChevronRight className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {selectedIndex >= 0
                      ? `Showing ${selectedIndex + 1} of ${screenshots.length}`
                      : ""}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handlePrev}
                      disabled={screenshots.length <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleNext}
                      disabled={screenshots.length <= 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Screenshot Details
                  </h3>
                  {selectedScreenshot ? (
                    <div className="mt-4 space-y-3 text-sm">
                      <div>
                        <p className="text-gray-500">Captured At</p>
                        <p className="text-gray-900">
                          {formatDateFull(selectedScreenshot.captured_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">User</p>
                        <p className="text-gray-900">
                          {selectedScreenshot.user_name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedScreenshot.user_email}
                        </p>
                      </div>
                      {selectedScreenshot.task_title && (
                        <div>
                          <p className="text-gray-500">Task</p>
                          <p className="text-gray-900">
                            {selectedScreenshot.task_title}
                          </p>
                        </div>
                      )}
                      {selectedScreenshot.org_name && (
                        <div>
                          <p className="text-gray-500">Organization</p>
                          <p className="text-gray-900">
                            {selectedScreenshot.org_name}
                          </p>
                        </div>
                      )}
                      {selectedScreenshot.workspace_name && (
                        <div>
                          <p className="text-gray-500">Workspace</p>
                          <p className="text-gray-900">
                            {selectedScreenshot.workspace_name}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500">File Size</p>
                        <p className="text-gray-900">
                          {formatFileSize(selectedScreenshot.file_size)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">File Path</p>
                        <p className="text-gray-900 break-all">
                          {selectedScreenshot.file_path}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">
                      Select a screenshot to view details.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Actions
                  </h3>
                  <div className="mt-3 flex flex-col space-y-2">
                    <Button
                      variant="danger"
                      onClick={() =>
                        selectedScreenshot &&
                        setDeletingScreenshot(selectedScreenshot)
                      }
                      disabled={!selectedScreenshot}
                    >
                      Delete Screenshot
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setLightboxOpen(true)}
                      disabled={!selectedScreenshot}
                    >
                      View Large
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {screenshots.map((screenshot) => (
                <button
                  key={screenshot.id}
                  type="button"
                  onClick={() => {
                    setSelectedScreenshot(screenshot);
                    setLightboxOpen(true);
                  }}
                  className={`group relative bg-gray-100 rounded-lg overflow-hidden aspect-video focus:outline-none ring-2 transition-colors ${
                    selectedScreenshot?.id === screenshot.id
                      ? "ring-primary-500"
                      : "ring-transparent"
                  }`}
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

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingScreenshot(screenshot);
                      }}
                      className="bg-white"
                    >
                      <Icons.Trash className="h-4 w-4" />
                    </IconButton>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-left">
                    <p className="text-white text-xs truncate">
                      {screenshot.user_name || "Unknown"}
                    </p>
                    <p className="text-white/70 text-xs">
                      {formatDate(screenshot.captured_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
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

      {/* Lightbox Modal */}
      {lightboxOpen && selectedIndex >= 0 && (
        <ScreenshotLightboxModal
          screenshots={screenshots}
          currentIndex={selectedIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
}

import { format, parseISO } from "date-fns";
import React, { useCallback, useEffect, useState } from "react";
import AuthenticatedImage from "../components/AuthenticatedImage";
import Pagination from "../components/Pagination";
import { screenshotService } from "../services";

interface Screenshot {
  id: number;
  file_path: string;
  file_name: string;
  captured_at: string;
  screen_number: number;
  task_id?: number;
  file_size: number;
  user_id: number;
}

const ScreenshotsPage: React.FC = () => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] =
    useState<Screenshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dateFilter, setDateFilter] = useState({
    start: "",
    end: "",
  });

  useEffect(() => {
    loadScreenshots();
  }, [page, pageSize]);

  // Cleanup cache when component unmounts
  useEffect(() => {
    return () => {
      screenshotService.clearCache();
    };
  }, []);

  const loadScreenshots = async () => {
    try {
      setLoading(true);
      const response = await screenshotService.list(page, pageSize);

      if (response.data) {
        const paginationData = response.data as any;
        if (Array.isArray(paginationData.data)) {
          setScreenshots(paginationData.data);
          setTotalPages(paginationData.total_pages || 1);
          setTotalItems(paginationData.total || 0);
        } else if (Array.isArray(paginationData)) {
          setScreenshots(paginationData);
          setTotalPages(1);
          setTotalItems(paginationData.length);
        } else {
          setScreenshots([]);
          setTotalPages(1);
          setTotalItems(0);
        }
      }
    } catch (error) {
      console.error("Failed to load screenshots:", error);
      setScreenshots([]);
    } finally {
      setLoading(false);
    }
  };

  const loadScreenshotsByDateRange = async () => {
    if (!dateFilter.start || !dateFilter.end) {
      alert("Please select both start and end dates");
      return;
    }

    try {
      setLoading(true);
      const response = await screenshotService.getByDateRange(
        dateFilter.start,
        dateFilter.end
      );

      if (Array.isArray(response.data)) {
        setScreenshots(response.data);
      } else {
        setScreenshots([]);
      }
      setPage(1);
      setTotalPages(1);
    } catch (error) {
      console.error("Failed to load screenshots by date range:", error);
      setScreenshots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(
    async (screenshot: Screenshot) => {
      if (!window.confirm("Are you sure you want to delete this screenshot?")) {
        return;
      }

      try {
        await screenshotService.delete(screenshot.id);
        setScreenshots((prev) => prev.filter((s) => s.id !== screenshot.id));
        if (selectedScreenshot?.id === screenshot.id) {
          setSelectedScreenshot(null);
        }
      } catch (error) {
        console.error("Failed to delete screenshot:", error);
        alert("Failed to delete screenshot");
      }
    },
    [selectedScreenshot]
  );

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }, []);

  const formatDate = useCallback(
    (dateString: string, formatString: string): string => {
      try {
        return format(parseISO(dateString), formatString);
      } catch (error) {
        console.error("Error formatting date:", error);
        return "Invalid date";
      }
    },
    []
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!selectedScreenshot) return;

    const currentIndex = screenshots.findIndex(
      (s) => s.id === selectedScreenshot.id
    );

    if (e.key === "ArrowLeft" && currentIndex > 0) {
      setSelectedScreenshot(screenshots[currentIndex - 1]);
    } else if (
      e.key === "ArrowRight" &&
      currentIndex < screenshots.length - 1
    ) {
      setSelectedScreenshot(screenshots[currentIndex + 1]);
    } else if (e.key === "Escape") {
      setSelectedScreenshot(null);
    }
  };

  useEffect(() => {
    if (selectedScreenshot) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedScreenshot, screenshots]);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Screenshots</h1>
            <p className="text-gray-600 mt-1">
              View and manage your captured screenshots
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter.start}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, start: e.target.value })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateFilter.end}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, end: e.target.value })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={loadScreenshotsByDateRange}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                Filter
              </button>
              {(dateFilter.start || dateFilter.end) && (
                <button
                  onClick={() => {
                    setDateFilter({ start: "", end: "" });
                    loadScreenshots();
                  }}
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 rounded ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1 rounded ${
                  viewMode === "list"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading screenshots...</p>
            </div>
          </div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No screenshots found
            </h3>
            <p className="text-gray-600">
              Screenshots will appear here as you track time
            </p>
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className="group relative bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all border border-gray-200"
                    onClick={() => setSelectedScreenshot(screenshot)}
                  >
                    <AuthenticatedImage
                      screenshotId={screenshot.id}
                      alt={screenshot.file_name}
                      className="aspect-video bg-gray-200 flex items-center justify-center w-full h-full object-cover"
                    />
                    <div className="p-3">
                      <p className="text-gray-900 text-sm font-medium truncate">
                        Screen {screenshot.screen_number + 1}
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
                        {formatDate(screenshot.captured_at, "MMM dd, HH:mm:ss")}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatFileSize(screenshot.file_size)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(screenshot);
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedScreenshot(screenshot)}
                  >
                    <div className="w-32 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                      <AuthenticatedImage
                        screenshotId={screenshot.id}
                        alt={screenshot.file_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium truncate">
                        {screenshot.file_name}
                      </p>
                      <p className="text-gray-600 text-sm mt-1">
                        Screen {screenshot.screen_number + 1} •{" "}
                        {formatDate(
                          screenshot.captured_at,
                          "MMM dd, yyyy HH:mm:ss"
                        )}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatFileSize(screenshot.file_size)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(screenshot);
                      }}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!dateFilter.start && !dateFilter.end && totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={(newPage) => setPage(newPage)}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1); // Reset to first page when changing page size
                  }}
                  showPageSizeSelector={true}
                  showFirstLast={true}
                  showJumpToPage={true}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
          onClick={() => setSelectedScreenshot(null)}
        >
          <button
            onClick={() => setSelectedScreenshot(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              const currentIndex = screenshots.findIndex(
                (s) => s.id === selectedScreenshot.id
              );
              if (currentIndex > 0) {
                setSelectedScreenshot(screenshots[currentIndex - 1]);
              }
            }}
            disabled={
              screenshots.findIndex((s) => s.id === selectedScreenshot.id) === 0
            }
            className="absolute left-4 text-white hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed z-10"
          >
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              const currentIndex = screenshots.findIndex(
                (s) => s.id === selectedScreenshot.id
              );
              if (currentIndex < screenshots.length - 1) {
                setSelectedScreenshot(screenshots[currentIndex + 1]);
              }
            }}
            disabled={
              screenshots.findIndex((s) => s.id === selectedScreenshot.id) ===
              screenshots.length - 1
            }
            className="absolute right-4 text-white hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed z-10"
          >
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          <div
            className="max-w-7xl max-h-screen p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <AuthenticatedImage
              screenshotId={selectedScreenshot.id}
              alt={selectedScreenshot.file_name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              priority
            />
            <div className="mt-4 text-center">
              <p className="text-white font-medium">
                {selectedScreenshot.file_name}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Screen {selectedScreenshot.screen_number + 1} •{" "}
                {formatDate(
                  selectedScreenshot.captured_at,
                  "MMM dd, yyyy HH:mm:ss"
                )}{" "}
                • {formatFileSize(selectedScreenshot.file_size)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenshotsPage;

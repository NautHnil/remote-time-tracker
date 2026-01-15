import { format, parseISO } from "date-fns";
import React, { useCallback, useEffect, useState } from "react";
import { screenshotService } from "../services";
import AuthenticatedImage from "./AuthenticatedImage";
import { Icons } from "./Icons";
import Lightbox from "./Lightbox";
import OptimizedImage from "./OptimizedImage";
import Pagination from "./Pagination";
import { ScreenshotGrid, ScreenshotList } from "./ScreenshotViews";

interface Screenshot {
  id: number;
  filePath?: string; // Optional for server screenshots
  fileName: string;
  capturedAt: string;
  screenNumber: number;
  taskId?: number;
  fileSize: number;
}

interface ScreenshotViewerProps {
  onClose?: () => void; // Optional now since we're in master layout
}

const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({
  onClose: _onClose,
}) => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] =
    useState<Screenshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [viewSource, setViewSource] = useState<"local" | "server">("local");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadScreenshots();
  }, [dateFilter, viewSource, page, pageSize]);

  // Cleanup cache when component unmounts (server mode only)
  useEffect(() => {
    return () => {
      if (viewSource === "server") {
        screenshotService.clearCache();
      }
    };
  }, [viewSource]);

  const loadScreenshots = async () => {
    try {
      setLoading(true);

      if (viewSource === "local") {
        // Load screenshots from local database via IPC
        const result = await window.electronAPI.getScreenshots({
          date: dateFilter || undefined,
        });

        // Transform from database format (camelCase from rowToScreenshot)
        const screenshots = (result || []).map((item: any) => ({
          id: item.id,
          filePath: item.filePath,
          fileName: item.fileName,
          capturedAt: item.capturedAt,
          screenNumber: item.screenNumber,
          taskId: item.taskId,
          fileSize: item.fileSize,
        }));

        setScreenshots(screenshots);
        setTotalPages(1);
      } else {
        // Load screenshots from server API
        if (dateFilter) {
          // Use date range filter
          const response = await screenshotService.getByDateRange(
            dateFilter,
            dateFilter
          );
          const serverScreenshots = (response.data || []).map((item: any) => ({
            id: item.id,
            fileName: item.file_name,
            capturedAt: item.captured_at,
            screenNumber: item.screen_number || 0,
            taskId: item.task_id,
            fileSize: item.file_size,
          }));
          setScreenshots(serverScreenshots);
          setTotalPages(1);
        } else {
          // Use pagination
          const response = await screenshotService.list(page, pageSize);
          if (response.data) {
            const paginationData = response.data as any;
            if (Array.isArray(paginationData.data)) {
              const serverScreenshots = paginationData.data.map(
                (item: any) => ({
                  id: item.id,
                  fileName: item.file_name,
                  capturedAt: item.captured_at,
                  screenNumber: item.screen_number || 0,
                  taskId: item.task_id,
                  fileSize: item.file_size,
                })
              );
              setScreenshots(serverScreenshots);
              setTotalPages(paginationData.total_pages || 1);
              setTotalItems(paginationData.total || 0);
            } else if (Array.isArray(paginationData)) {
              const serverScreenshots = paginationData.map((item: any) => ({
                id: item.id,
                fileName: item.file_name,
                capturedAt: item.captured_at,
                screenNumber: item.screen_number || 0,
                taskId: item.task_id,
                fileSize: item.file_size,
              }));
              setScreenshots(serverScreenshots);
              setTotalPages(1);
              setTotalItems(serverScreenshots.length);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load screenshots:", error);
      setScreenshots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(
    async (screenshot: Screenshot) => {
      if (!confirm("Are you sure you want to delete this screenshot?")) {
        return;
      }

      try {
        if (viewSource === "local") {
          await window.electronAPI.deleteScreenshot(screenshot.id);
        } else {
          await screenshotService.delete(screenshot.id);
        }
        setScreenshots((prev) => prev.filter((s) => s.id !== screenshot.id));
        if (selectedScreenshot?.id === screenshot.id) {
          setSelectedScreenshot(null);
        }
      } catch (error) {
        console.error("Failed to delete screenshot:", error);
        alert("Failed to delete screenshot");
      }
    },
    [selectedScreenshot, viewSource]
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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white/50 dark:bg-dark-800/50 backdrop-blur-sm border border-gray-200 dark:border-dark-700/50 rounded-xl px-4 py-3 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Source Toggle */}
          <div className="flex gap-0.5 bg-gray-100 dark:bg-dark-800/80 rounded-lg p-0.5 border border-gray-200 dark:border-dark-700/50">
            <button
              onClick={() => {
                setViewSource("local");
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewSource === "local"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-700/50"
              }`}
            >
              <Icons.Monitor className="w-4 h-4" />
              <span>Local</span>
            </button>
            <button
              onClick={() => {
                setViewSource("server");
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewSource === "server"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-700/50"
              }`}
            >
              <Icons.Server className="w-4 h-4" />
              <span>Server</span>
            </button>
          </div>

          {viewSource === "local" && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
              <Icons.Warning className="w-3.5 h-3.5" />
              Unsynced only
            </span>
          )}

          {/* Date filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-lg px-3 py-1.5 hover:border-gray-400 dark:hover:border-dark-500 transition-all focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500">
            <Icons.Calendar className="w-4 h-4 text-gray-400 dark:text-dark-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-gray-700 dark:text-dark-200 text-sm focus:outline-none cursor-pointer"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="text-gray-400 dark:text-dark-400 hover:text-gray-600 dark:hover:text-white p-0.5 rounded hover:bg-gray-200 dark:hover:bg-dark-700/50"
                title="Clear filter"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex gap-0.5 bg-gray-100 dark:bg-dark-800/80 rounded-lg p-0.5 border border-gray-200 dark:border-dark-700/50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-700/50"
              }`}
              title="Grid view"
            >
              <Icons.Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-700/50"
              }`}
              title="List view"
            >
              <Icons.List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => loadScreenshots()}
            className="p-2 rounded-lg text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-700/50 transition-colors"
            title="Refresh"
          >
            <Icons.Refresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-dark-700 border-t-primary-500"></div>
              <span className="text-gray-500 dark:text-dark-400 text-sm">
                Loading screenshots...
              </span>
            </div>
          </div>
        ) : screenshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-dark-400">
            <div className="w-20 h-20 mb-4 rounded-full bg-gray-100 dark:bg-dark-800 flex items-center justify-center">
              <Icons.Camera className="w-10 h-10 text-gray-400 dark:text-dark-600" />
            </div>
            <p className="text-lg font-medium text-gray-600 dark:text-dark-300">
              {viewSource === "local"
                ? "No local screenshots"
                : "No screenshots found"}
            </p>
            <p className="text-sm mt-2 text-gray-400 dark:text-dark-500 max-w-md text-center">
              {viewSource === "local"
                ? "Local screenshots will appear here as you track time."
                : "Screenshots will appear here after syncing."}
            </p>
            {viewSource === "local" && (
              <p className="text-xs mt-3 text-gray-400 dark:text-dark-600 flex items-center gap-1.5">
                <Icons.Info className="w-4 h-4" />
                Synced screenshots are automatically deleted to save disk space.
              </p>
            )}
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <ScreenshotGrid
                screenshots={screenshots}
                onSelect={setSelectedScreenshot}
                onDelete={handleDelete}
                formatDate={formatDate}
                formatFileSize={formatFileSize}
                ImageComponent={
                  viewSource === "local" ? OptimizedImage : AuthenticatedImage
                }
                isServerMode={viewSource === "server"}
              />
            ) : (
              <ScreenshotList
                screenshots={screenshots}
                onSelect={setSelectedScreenshot}
                onDelete={handleDelete}
                formatDate={formatDate}
                formatFileSize={formatFileSize}
                ImageComponent={
                  viewSource === "local" ? OptimizedImage : AuthenticatedImage
                }
                isServerMode={viewSource === "server"}
              />
            )}

            <div className="mt-6">
              <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-dark-500 text-sm mb-4">
                <Icons.Camera className="w-4 h-4" />
                <span>
                  Showing {screenshots.length} screenshot
                  {screenshots.length !== 1 ? "s" : ""}
                  {viewSource === "server" && " from server"}
                </span>
              </div>

              {/* Pagination for server mode */}
              {viewSource === "server" && !dateFilter && totalPages > 1 && (
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
              )}
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {selectedScreenshot && (
        <Lightbox
          screenshot={selectedScreenshot}
          screenshots={screenshots}
          onClose={() => setSelectedScreenshot(null)}
          onNavigate={setSelectedScreenshot}
          isServerMode={viewSource === "server"}
          zIndex={50}
        />
      )}
    </div>
  );
};

export default ScreenshotViewer;

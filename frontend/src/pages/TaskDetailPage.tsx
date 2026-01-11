import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { screenshotService, taskService } from "../services";

interface Task {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  status: string;
  priority: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

interface Screenshot {
  id: number;
  file_name: string;
  file_path: string;
  captured_at: string;
  screen_number: number;
  time_log_id?: number;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [screenshotUrls, setScreenshotUrls] = useState<Record<number, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [screenshotsLoading, setScreenshotsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTask = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await taskService.getById(Number(id));
      setTask(response.data);
    } catch (error) {
      console.error("Failed to load task:", error);
      setError("Failed to load task details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadScreenshots = useCallback(async () => {
    if (!id) return;
    try {
      setScreenshotsLoading(true);
      setError(null);
      const response = await screenshotService.getByTaskId(Number(id));
      const screenshotData = response.data || [];
      setScreenshots(screenshotData);

      // Load screenshot URLs
      const urls: Record<number, string> = {};
      await Promise.all(
        screenshotData.map(async (screenshot) => {
          try {
            urls[screenshot.id] = await screenshotService.getViewUrl(
              screenshot.id
            );
          } catch (err) {
            console.error(
              `Failed to load URL for screenshot ${screenshot.id}:`,
              err
            );
          }
        })
      );
      setScreenshotUrls(urls);
    } catch (error) {
      console.error("Failed to load screenshots:", error);
      setError("Failed to load screenshots");
    } finally {
      setScreenshotsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
    loadScreenshots();
  }, [loadTask, loadScreenshots]);

  const getViewUrl = useCallback(
    (screenshotId: number): string => {
      return screenshotUrls[screenshotId] || "";
    },
    [screenshotUrls]
  );

  const getPriorityColor = useCallback((priority: number) => {
    if (priority >= 3) return "text-red-600 bg-red-100";
    if (priority === 2) return "text-yellow-600 bg-yellow-100";
    if (priority === 1) return "text-blue-600 bg-blue-100";
    return "text-gray-600 bg-gray-100";
  }, []);

  const getPriorityLabel = useCallback((priority: number) => {
    if (priority >= 3) return "High";
    if (priority === 2) return "Medium";
    if (priority === 1) return "Low";
    return "None";
  }, []);

  const handleImageClick = useCallback((url: string) => {
    if (url) setSelectedImage(url);
  }, []);

  const closeImagePreview = useCallback(() => {
    setSelectedImage(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading task...</div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Error</h1>
        <p className="text-red-600">{error}</p>
        <Link to="/tasks" className="text-blue-600 hover:text-blue-800">
          ← Back to Tasks
        </Link>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Task Not Found</h1>
        <Link to="/tasks" className="text-blue-600 hover:text-blue-800">
          ← Back to Tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/tasks"
            className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Tasks
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">{task.title}</h1>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
              task.priority
            )}`}
          >
            {getPriorityLabel(task.priority)}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              task.status === "active"
                ? "bg-green-100 text-green-800"
                : task.status === "completed"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {task.status}
          </span>
        </div>
      </div>

      {/* Task Details */}
      <div className="card">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1 text-gray-900">
              {task.description || "No description"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Created</h3>
              <p className="mt-1 text-gray-900">
                {format(new Date(task.created_at), "MMM d, yyyy HH:mm")}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Last Updated
              </h3>
              <p className="mt-1 text-gray-900">
                {format(new Date(task.updated_at), "MMM d, yyyy HH:mm")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Screenshots Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Screenshots ({screenshots.length})
          </h2>
        </div>

        {screenshotsLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading screenshots...
          </div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No screenshots found for this task
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {screenshots.map((screenshot) => {
              const url = getViewUrl(screenshot.id);
              return (
                <div
                  key={screenshot.id}
                  className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleImageClick(url)}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={screenshot.file_name}
                      className="w-full h-32 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">Loading...</span>
                    </div>
                  )}
                  <div className="p-2 bg-gray-50">
                    <p className="text-xs text-gray-600 truncate">
                      {format(
                        new Date(screenshot.captured_at),
                        "MMM d, HH:mm:ss"
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      Screen {screenshot.screen_number}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImagePreview}
        >
          <div className="relative max-w-6xl max-h-full">
            <button
              onClick={closeImagePreview}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75"
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

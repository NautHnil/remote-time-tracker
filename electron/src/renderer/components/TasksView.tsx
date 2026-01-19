import * as datefns from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { presenceService } from "../services/presenceService";
import { formatDurationDetailed } from "../utils/timeFormat";
import AuthenticatedImage from "./AuthenticatedImage";
import { Icons } from "./Icons";
import Lightbox from "./Lightbox";
import OptimizedImage from "./OptimizedImage";
import Pagination from "./Pagination";
import { ScreenshotGrid, ScreenshotList } from "./ScreenshotViews";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  startTime?: string;
  endTime?: string;
  duration?: number;
  screenshot_count?: number;
  is_manual?: boolean; // true: manually created, false: auto from time tracker
  created_at: string;
  updated_at: string;
}

interface TasksViewProps {
  onNavigateToTracker?: () => void;
}

export default function TasksView({ onNavigateToTracker }: TasksViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form states for create
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI.tasks.getAll();
      if (result.success) {
        setTasks(result.data || []);
      } else {
        setError(result.message || "Failed to load tasks");
      }
    } catch (error: any) {
      console.error("Failed to load tasks:", error);
      setError(error.message || "An error occurred while loading tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEditStart = useCallback((task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingId || !editTitle.trim()) return;

    try {
      const result = await window.electronAPI.tasks.update(editingId, {
        title: editTitle.trim(),
      });
      if (result.success) {
        await loadTasks();
        // Force update state to trigger re-render
        setTasks((prev) => [...prev]);
      } else {
        alert(result.message || "Failed to update task");
      }
    } catch (error: any) {
      console.error("Failed to update task:", error);
      alert(error.message || "An error occurred while updating task");
    } finally {
      setEditingId(null);
      setEditTitle("");
    }
  }, [editingId, editTitle, loadTasks]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditTitle("");
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("Are you sure you want to delete this task?")) return;

      try {
        const result = await window.electronAPI.tasks.delete(id);
        if (result.success) {
          await loadTasks();
        } else {
          alert(result.message || "Failed to delete task");
        }
      } catch (error: any) {
        console.error("Failed to delete task:", error);
        alert(error.message || "An error occurred while deleting task");
      }
    },
    [loadTasks],
  );

  const handleCreateTask = useCallback(async () => {
    if (!newTitle.trim()) return;

    try {
      const result = await window.electronAPI.tasks.create({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        priority: newPriority,
        is_manual: true, // Mark as manually created
      });

      if (result.success) {
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewPriority("medium");
        await loadTasks();
        setTasks((prev) => [...prev]);
      } else {
        alert(result.message || "Failed to create task");
      }
    } catch (error: any) {
      console.error("Failed to create task:", error);
      alert(error.message || "An error occurred while creating task");
    }
  }, [newTitle, newDescription, newPriority, loadTasks]);

  const handleViewDetails = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleStartTask = useCallback(
    async (task: Task) => {
      try {
        // Only allow starting manual tasks
        if (!task.is_manual) {
          alert(
            "Only manual tasks can be started from here. Auto-tracked tasks are created when you start time tracking from the Time Tracker view.",
          );
          return;
        }

        // Check if task is in a valid state to start
        if (task.status === "completed" || task.status === "cancelled") {
          alert(
            `Cannot start a ${task.status} task. Please create a new task or change the status first.`,
          );
          return;
        }

        // Check if there's already an active tracking session
        const status = await window.electronAPI.timeTracker.getStatus();
        if (status.isTracking) {
          const confirmSwitch = confirm(
            "There is an active tracking session. Do you want to stop it and start tracking this task instead?",
          );
          if (!confirmSwitch) {
            return;
          }
          // Stop the current session first
          await window.electronAPI.timeTracker.stop();
          await presenceService.heartbeat("idle");
        }

        // Start time tracking for this manual task with task ID and title
        await window.electronAPI.timeTracker.start(task.id, task.title);
        await presenceService.heartbeat("working");

        // Update task status to in_progress
        await window.electronAPI.tasks.update(task.id, {
          status: "in_progress",
        });

        // Navigate to tracker view to show the active tracking
        if (onNavigateToTracker) {
          onNavigateToTracker();
        }

        await loadTasks();
        setTasks((prev) => [...prev]);
      } catch (error: any) {
        console.error("Failed to start task:", error);
        alert(error.message || "Failed to start time tracking");
      }
    },
    [loadTasks, onNavigateToTracker],
  );

  // Stop manual task in-progress (logic same time tracker)
  const handleStopTask = useCallback(
    async (task: Task) => {
      try {
        // Confirm stop
        const confirmStop = confirm("Stop tracking this manual task?");
        if (!confirmStop) return;

        // Stop tracking with the manual task's title
        await window.electronAPI.timeTracker.stop(task.title);
        await presenceService.heartbeat("idle");
        // Update task status to completed
        await window.electronAPI.tasks.update(task.id, { status: "completed" });
        await setTimeout(async () => {
          await loadTasks();
        }, 5000); // Small delay to ensure backend processes the stop
        setTasks((prev) => [...prev]);
      } catch (error: any) {
        console.error("Failed to stop task:", error);
        alert(error.message || "Failed to stop time tracking");
      }
    },
    [loadTasks],
  );

  const getPriorityColor = useCallback((priority: Task["priority"]) => {
    switch (priority) {
      case "urgent":
        return "text-red-400 bg-red-500/20";
      case "high":
        return "text-orange-400 bg-orange-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/20";
      case "low":
        return "text-green-400 bg-green-500/20";
    }
  }, []);

  const getStatusColor = useCallback((status: Task["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-400 bg-green-500/20";
      case "in_progress":
        return "text-blue-400 bg-blue-500/20";
      case "pending":
        return "text-gray-400 bg-gray-500/20";
      case "cancelled":
        return "text-red-400 bg-red-500/20";
      default:
        return "text-yellow-400 bg-yellow-500/20";
    }
  }, []);

  const formatDuration = useCallback((seconds?: number) => {
    if (!seconds) return "0s";

    // Debug: Check if value seems to be in wrong unit
    // If seconds > 86400 (24 hours), it's likely milliseconds
    if (seconds > 86400) {
      console.warn(
        `⚠️  Duration seems to be in milliseconds, not seconds:`,
        seconds,
      );
      // Assume it's already in milliseconds, don't multiply
      return formatDurationDetailed(seconds, "minimal");
    }

    // Backend returns duration in seconds, convert to milliseconds
    return formatDurationDetailed(seconds * 1000, "minimal");
  }, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return datefns.format(new Date(dateString), "dd/MM/yyyy HH:mm:ss");
    } catch (error) {
      return "Invalid Date";
    }
  }, []);

  const getTaskTypeLabel = useCallback((task: Task) => {
    return task.is_manual ? "Manual" : "Auto-tracked";
  }, []);

  const getTaskTypeBadgeColor = useCallback((task: Task) => {
    return task.is_manual
      ? "text-purple-400 bg-purple-500/20"
      : "text-cyan-400 bg-cyan-500/20";
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-dark-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="glass-dark rounded-2xl p-8 text-center border border-red-500/30">
          <div className="text-red-400 mb-4">
            <Icons.X className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-dark-200 mb-2">
            Failed to Load Tasks
          </h3>
          <p className="text-gray-500 dark:text-dark-400 mb-4">{error}</p>
          <button onClick={loadTasks} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-dark rounded-xl p-4 border border-gray-200 dark:border-dark-800/50">
        <div className="flex flex-wrap gap-3 justify-between">
          <div></div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-all bg-primary-500 text-white hover:bg-primary-600 shadow-lg flex items-center gap-2`}
          >
            <Icons.Plus className="w-5 h-5" />
            Create Task
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Total Tasks",
            value: tasks.length,
            icon: Icons.Task,
            color: "primary",
          },
          {
            label: "Manual Tasks",
            value: tasks.filter((t) => t.is_manual).length,
            icon: Icons.Edit,
            color: "purple",
          },
          {
            label: "Auto-tracked",
            value: tasks.filter((t) => !t.is_manual).length,
            icon: Icons.Clock,
            color: "cyan",
          },
          {
            label: "Completed",
            value: tasks.filter((t) => t.status === "completed").length,
            icon: Icons.Check,
            color: "green",
          },
          {
            label: "Total Time",
            value: formatDuration(
              tasks.reduce((sum, t) => sum + (t.duration || 0), 0),
            ),
            icon: Icons.Chart,
            color: "accent",
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="glass-dark rounded-xl p-4 border border-gray-200 dark:border-dark-800/50"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              <span className="text-2xl font-bold text-gray-900 dark:text-dark-50">
                {stat.value}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="glass-dark rounded-2xl p-12 text-center border border-gray-200 dark:border-dark-800/50">
          <Icons.Task className="w-16 h-16 text-gray-400 dark:text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-dark-200 mb-2">
            No tasks yet
          </h3>
          <p className="text-gray-500 dark:text-dark-400 mb-6">
            Create your first task to start tracking
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Task
          </button>
        </div>
      ) : (
        <div className="glass-dark rounded-2xl border border-gray-200 dark:border-dark-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-dark-800/50 bg-gray-50 dark:bg-dark-900/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-dark-300">
                    Task
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-dark-300">
                    Type
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-dark-300">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-dark-300">
                    Priority
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-dark-300">
                    Duration
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-dark-300">
                    Screenshots
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-dark-300">
                    Created
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600 dark:text-dark-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-800/50">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-800/30 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(task)}
                  >
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {editingId === task.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="input flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave();
                              if (e.key === "Escape") handleEditCancel();
                            }}
                          />
                          <button
                            onClick={handleEditSave}
                            className="p-1 text-green-400 hover:text-green-300"
                          >
                            <Icons.Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <Icons.X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-dark-100">
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                                {task.description}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStart(task);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-blue-400 hover:text-blue-300 transition-all"
                            title="Edit title"
                          >
                            <Icons.Edit className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTaskTypeBadgeColor(
                          task,
                        )}`}
                      >
                        {getTaskTypeLabel(task)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          task.status,
                        )}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                          task.priority,
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-dark-300">
                      {formatDuration(task.duration)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-dark-300">
                      {task.screenshot_count || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-dark-400">
                      {formatDate(task.created_at)}
                    </td>
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {task.is_manual ? (
                          <>
                            {task.status === "in_progress" ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStopTask(task);
                                }}
                                className="p-1.5 text-red-400 hover:text-red-300 transition-colors rounded hover:bg-red-500/10"
                                title="Stop tracking"
                              >
                                <Icons.Stop className="w-4 h-4" />
                              </button>
                            ) : task.status !== "completed" ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartTask(task);
                                }}
                                className="p-1.5 text-green-400 hover:text-green-300 transition-colors rounded hover:bg-green-500/10"
                                title="Start tracking"
                              >
                                <Icons.Play className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(task);
                                }}
                                className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors rounded hover:bg-blue-500/10"
                                title="View details"
                              >
                                <Icons.Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(task.id);
                              }}
                              className="p-1.5 text-red-400 hover:text-red-300 transition-colors rounded hover:bg-red-500/10"
                              title="Delete"
                            >
                              <Icons.Trash className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(task);
                              }}
                              className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors rounded hover:bg-blue-500/10"
                              title="View details"
                            >
                              <Icons.Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(task.id);
                              }}
                              className="p-1.5 text-red-400 hover:text-red-300 transition-colors rounded hover:bg-red-500/10"
                              title="Delete"
                            >
                              <Icons.Trash className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 !my-0">
          <div className="glass-dark rounded-2xl border border-gray-200 dark:border-dark-800/50 w-full max-w-md animate-scale-up">
            <div className="p-6 border-b border-gray-200 dark:border-dark-800/50">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-50">
                Create New Task
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input w-full"
                  placeholder="Enter task title"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input w-full min-h-[100px] resize-none"
                  placeholder="Enter task description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-2">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) =>
                    setNewPriority(e.target.value as Task["priority"])
                  }
                  className="input w-full"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-dark-800/50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTitle("");
                  setNewDescription("");
                  setNewPriority("medium");
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTitle.trim()}
                className="btn btn-primary"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

// Task Detail Modal Component
interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

interface TaskScreenshot {
  id: number;
  filePath?: string;
  fileName: string;
  capturedAt: string;
  screenNumber: number;
  taskId?: number;
  fileSize: number;
  imageUrl?: string | null;
  isLocal?: boolean;
}

function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const [screenshots, setScreenshots] = useState<TaskScreenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] =
    useState<TaskScreenshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [viewSource, setViewSource] = useState<"local" | "server">("local");

  const loadScreenshots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewSource === "local") {
        // Load local screenshots
        const localResult = await window.electronAPI.screenshots.getByTask(
          task.id,
        );
        const screenshotsData = Array.isArray(localResult) ? localResult : [];

        const screenshotsFormatted: TaskScreenshot[] = screenshotsData.map(
          (s: any) => ({
            id: s.id,
            filePath: s.filePath || s.file_path,
            fileName: s.fileName || s.file_name || `screenshot-${s.id}.png`,
            capturedAt: s.capturedAt || s.captured_at,
            screenNumber: s.screenNumber ?? s.screen_number ?? 0,
            taskId: s.taskId ?? s.task_id,
            fileSize: s.fileSize ?? s.file_size ?? 0,
            isLocal: true,
          }),
        );
        setScreenshots(screenshotsFormatted);
      } else {
        // Load server screenshots
        const { screenshotService } = await import("../services");
        const serverResponse = await screenshotService.getByTask(task.id);
        const serverData = serverResponse.data || [];

        const screenshotsFormatted: TaskScreenshot[] = serverData.map(
          (s: any) => ({
            id: s.id,
            fileName: s.file_name || `screenshot-${s.id}.png`,
            capturedAt: s.captured_at,
            screenNumber: s.screen_number || 0,
            taskId: s.task_id,
            fileSize: s.file_size || 0,
            isLocal: false,
          }),
        );
        setScreenshots(screenshotsFormatted);
      }
    } catch (error: any) {
      console.error("Failed to load screenshots:", error);
      setError(error.message || "Failed to load screenshots");
      setScreenshots([]);
    } finally {
      setLoading(false);
    }
  }, [task.id, viewSource]);

  useEffect(() => {
    loadScreenshots();
  }, [loadScreenshots]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewSource === "server") {
        import("../services").then(({ screenshotService }) => {
          screenshotService.clearCache();
        });
      }
    };
  }, [viewSource]);

  const handleDelete = useCallback(
    async (screenshot: TaskScreenshot) => {
      if (!confirm("Are you sure you want to delete this screenshot?")) {
        return;
      }

      try {
        if (viewSource === "local") {
          await window.electronAPI.deleteScreenshot(screenshot.id);
        } else {
          const { screenshotService } = await import("../services");
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
    [selectedScreenshot, viewSource],
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = datefns.parseISO(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return datefns.format(date, "MMM d, yyyy hh:mm a");
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0s";
    // Backend returns duration in seconds, convert to milliseconds
    return formatDurationDetailed(seconds * 1000, "minimal");
  };

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }, []);

  const formatDateDetail = useCallback(
    (dateString: string, _format?: string): string => {
      return formatDate(dateString); // Reuse existing formatDate
    },
    [],
  );

  // Pagination logic
  const totalPages = Math.ceil(screenshots.length / pageSize);
  const paginatedScreenshots = screenshots.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 !my-0">
      <div className="glass-dark rounded-2xl border border-gray-200 dark:border-dark-800/50 w-full max-w-6xl max-h-[90vh] overflow-hidden animate-scale-up flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-800/50 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-dark-50 mb-2">
              {task.title}
            </h3>
            {task.description && (
              <p className="text-gray-500 dark:text-dark-400">
                {task.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-dark-400 hover:text-gray-600 dark:hover:text-dark-200 transition-colors"
          >
            <Icons.X className="w-6 h-6" />
          </button>
        </div>

        {/* Task Info */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-800/50 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">
              Status
            </div>
            <div className="text-gray-900 dark:text-dark-100 font-medium capitalize">
              {task.status.replace("_", " ")}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">
              Priority
            </div>
            <div className="text-gray-900 dark:text-dark-100 font-medium capitalize">
              {task.priority}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">
              Duration
            </div>
            <div className="text-gray-900 dark:text-dark-100 font-medium">
              {formatDuration(task.duration)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">
              Created
            </div>
            <div className="text-gray-900 dark:text-dark-100 font-medium text-sm">
              {formatDate(task.created_at)}
            </div>
          </div>
        </div>

        {/* Screenshots Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-800/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-dark-50">
              Screenshots ({screenshots.length})
            </h4>

            {/* Source Toggle */}
            <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1">
              <button
                onClick={() => {
                  setViewSource("local");
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewSource === "local"
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-white"
                }`}
              >
                Local
              </button>
              <button
                onClick={() => {
                  setViewSource("server");
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewSource === "server"
                    ? "bg-green-600 text-white"
                    : "text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-white"
                }`}
              >
                Server
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === "grid"
                  ? "bg-primary-600 text-white"
                  : "text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-white"
              }`}
            >
              <Icons.Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === "list"
                  ? "bg-primary-600 text-white"
                  : "text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-white"
              }`}
            >
              <Icons.List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Screenshots Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-dark-400">
                  Loading screenshots...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-400 mb-4">
                <Icons.X className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-500 dark:text-dark-400 mb-4">{error}</p>
              <button
                onClick={loadScreenshots}
                className="btn btn-primary text-sm"
              >
                Retry
              </button>
            </div>
          ) : screenshots.length === 0 ? (
            <div className="text-center py-12">
              <Icons.Camera className="w-16 h-16 text-gray-400 dark:text-dark-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-dark-400">
                No screenshots for this task
              </p>
            </div>
          ) : (
            <>
              {viewMode === "grid" ? (
                <ScreenshotGrid
                  screenshots={paginatedScreenshots}
                  onSelect={setSelectedScreenshot}
                  onDelete={handleDelete}
                  formatDate={formatDateDetail}
                  formatFileSize={formatFileSize}
                  ImageComponent={
                    viewSource === "local" ? OptimizedImage : AuthenticatedImage
                  }
                  isServerMode={viewSource === "server"}
                />
              ) : (
                <ScreenshotList
                  screenshots={paginatedScreenshots}
                  onSelect={setSelectedScreenshot}
                  onDelete={handleDelete}
                  formatDate={formatDateDetail}
                  formatFileSize={formatFileSize}
                  ImageComponent={
                    viewSource === "local" ? OptimizedImage : AuthenticatedImage
                  }
                  isServerMode={viewSource === "server"}
                />
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={screenshots.length}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    showPageSizeSelector={false}
                    showFirstLast={true}
                    showJumpToPage={false}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-800/50 flex items-center justify-end">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>

      {/* Gallery Lightbox */}
      {selectedScreenshot && (
        <Lightbox
          screenshot={selectedScreenshot}
          screenshots={screenshots}
          onClose={() => setSelectedScreenshot(null)}
          onNavigate={setSelectedScreenshot}
          isServerMode={viewSource === "server"}
          zIndex={250}
        />
      )}
    </div>
  );
}

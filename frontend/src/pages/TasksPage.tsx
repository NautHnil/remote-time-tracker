import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { taskService } from "../services";

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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState(0);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await taskService.list(1, 100);
      setTasks(response.data || []);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEditStart = useCallback((task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
  }, []);

  const handleEditSave = useCallback(
    async (taskId: number) => {
      if (!editTitle.trim()) {
        alert("Task title cannot be empty");
        return;
      }

      try {
        await taskService.update(taskId, { title: editTitle });
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, title: editTitle } : t))
        );
        setEditingId(null);
        setEditTitle("");
      } catch (error) {
        console.error("Failed to update task:", error);
        alert("Failed to update task");
      }
    },
    [editTitle]
  );

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditTitle("");
  }, []);

  const handleDelete = useCallback(async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await taskService.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Failed to delete task");
    }
  }, []);

  const handleCreateTask = useCallback(async () => {
    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) {
      alert("Task title is required");
      return;
    }

    try {
      const response = await taskService.create({
        title: trimmedTitle,
        description: newTaskDescription.trim() || undefined,
        priority: newTaskPriority,
      });
      setTasks((prev) => [response.data, ...prev]);
      setShowCreateModal(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskPriority(0);
    } catch (error) {
      console.error("Failed to create task:", error);
      alert("Failed to create task");
    }
  }, [newTaskTitle, newTaskDescription, newTaskPriority]);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority(0);
  }, []);

  const getPriorityColor = useCallback((priority: number) => {
    if (priority >= 3) return "text-red-600";
    if (priority === 2) return "text-yellow-600";
    if (priority === 1) return "text-blue-600";
    return "text-gray-600";
  }, []);

  const getPriorityLabel = useCallback((priority: number) => {
    if (priority >= 3) return "High";
    if (priority === 2) return "Medium";
    if (priority === 1) return "Low";
    return "None";
  }, []);

  const getStatusColor = useCallback((status: string) => {
    if (status === "active") return "bg-green-100 text-green-800";
    if (status === "completed") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Tasks</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Create Task
        </button>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task title"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>None</option>
                  <option value={1}>Low</option>
                  <option value={2}>Medium</option>
                  <option value={3}>High</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={handleCloseCreateModal}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="card">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tasks found. Create your first task!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {editingId === task.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditSave(task.id);
                            if (e.key === "Escape") handleEditCancel();
                          }}
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <Link
                          to={`/tasks/${task.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {task.title}
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {task.description || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-medium ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {getPriorityLabel(task.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(task.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {editingId === task.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditSave(task.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditStart(task)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <Link
                            to={`/tasks/${task.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

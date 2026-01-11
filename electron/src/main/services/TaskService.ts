import { AppConfig } from "../config";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  userId: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  screenshot_count?: number;
  is_manual?: boolean; // true: manually created, false: auto from time tracker
  createdAt: string;
  updatedAt: string;
}

interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: Task["priority"];
  status?: Task["status"];
  is_manual?: boolean; // Default to true when creating manually
}

interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: Task["status"];
  priority?: Task["priority"];
}

export class TaskService {
  /**
   * Convert priority string to number for backend
   * low = 0, medium = 1, high = 2, urgent = 3
   */
  private priorityToNumber(priority?: Task["priority"]): number {
    if (!priority) return 1; // default to medium
    switch (priority) {
      case "low":
        return 0;
      case "medium":
        return 1;
      case "high":
        return 2;
      case "urgent":
        return 3;
      default:
        return 1;
    }
  }

  /**
   * Convert priority number to string for frontend
   */
  private priorityToString(
    priority?: number
  ): "low" | "medium" | "high" | "urgent" {
    switch (priority) {
      case 0:
        return "low";
      case 1:
        return "medium";
      case 2:
        return "high";
      case 3:
        return "urgent";
      default:
        return "medium";
    }
  }

  private async getAuthToken(): Promise<string | null> {
    const { default: Store } = await import("electron-store");
    const store = new Store();
    const credentials = store.get("credentials") as
      | { accessToken?: string }
      | undefined;
    return credentials?.accessToken || null;
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const url = `${AppConfig.apiUrl}${endpoint}`;
    console.log(`[TaskService] Making request to: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    console.log(
      `[TaskService] Response status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TaskService] Error response: ${errorText}`);

      let error: { message?: string } = {};
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText || response.statusText };
      }

      throw new Error(
        error.message ||
          `Request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async getAllTasks(): Promise<{
    success: boolean;
    data?: Task[];
    message?: string;
  }> {
    try {
      // Check authentication first
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: "Not authenticated. Please login first.",
          data: [],
        };
      }

      const response = await this.makeRequest("/tasks");
      // Transform backend response to frontend format (convert priority number to string)
      const tasks = (response.data.tasks || []).map((task: any) => ({
        ...task,
        priority: this.priorityToString(task.priority),
      }));
      return {
        success: true,
        data: tasks,
      };
    } catch (error: any) {
      console.error("Failed to get all tasks:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getTaskById(
    id: number
  ): Promise<{ success: boolean; data?: Task; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: "Not authenticated. Please login first.",
        };
      }

      const response = await this.makeRequest(`/tasks/${id}`);
      // Transform backend response to frontend format (convert priority number to string)
      const task = response.data
        ? {
            ...response.data,
            priority: this.priorityToString(response.data.priority),
          }
        : undefined;
      return {
        success: true,
        data: task,
      };
    } catch (error: any) {
      console.error(`Failed to get task ${id}:`, error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async createTask(
    request: CreateTaskRequest
  ): Promise<{ success: boolean; data?: Task; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: "Not authenticated. Please login first.",
        };
      }

      // Convert priority string to number for backend
      const backendRequest = {
        ...request,
        priority: this.priorityToNumber(request.priority),
      };

      const response = await this.makeRequest("/tasks", {
        method: "POST",
        body: JSON.stringify(backendRequest),
      });

      // Transform response back to frontend format
      const task = response.data
        ? {
            ...response.data,
            priority: this.priorityToString(response.data.priority),
          }
        : undefined;

      return {
        success: true,
        data: task,
      };
    } catch (error: any) {
      console.error("Failed to create task:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateTask(
    id: number,
    request: UpdateTaskRequest
  ): Promise<{ success: boolean; data?: Task; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: "Not authenticated. Please login first.",
        };
      }

      // Convert priority string to number for backend if provided
      const backendRequest: Record<string, unknown> = { ...request };
      if (request.priority) {
        backendRequest.priority = this.priorityToNumber(request.priority);
      }

      const response = await this.makeRequest(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(backendRequest),
      });

      // Transform response back to frontend format
      const task = response.data
        ? {
            ...response.data,
            priority: this.priorityToString(response.data.priority),
          }
        : undefined;

      return {
        success: true,
        data: task,
      };
    } catch (error: any) {
      console.error(`Failed to update task ${id}:`, error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async deleteTask(
    id: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: "Not authenticated. Please login first.",
        };
      }

      await this.makeRequest(`/tasks/${id}`, {
        method: "DELETE",
      });
      return {
        success: true,
      };
    } catch (error: any) {
      console.error(`Failed to delete task ${id}:`, error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getActiveTasks(): Promise<{
    success: boolean;
    data?: Task[];
    message?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: "Not authenticated. Please login first.",
          data: [],
        };
      }

      const response = await this.makeRequest("/tasks/active");
      // Transform backend response to frontend format (convert priority number to string)
      const tasks = (response.data.tasks || []).map((task: any) => ({
        ...task,
        priority: this.priorityToString(task.priority),
      }));
      return {
        success: true,
        data: tasks,
      };
    } catch (error: any) {
      console.error("Failed to get active tasks:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

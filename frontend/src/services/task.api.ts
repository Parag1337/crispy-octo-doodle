import api from "./api";
import type { Task, TaskPriority, TaskStatus } from "../types/task.types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const fetchMyTasks = () => api.get<ApiResponse<Task[]>>("/tasks/my");
export const fetchGuideTasks = () => api.get<ApiResponse<Task[]>>("/tasks/guide");

export const createGuideTask = (payload: {
  groupId: string;
  projectId?: string;
  assigneeId: string;
  title: string;
  description?: string;
  dueDate: string;
  priority?: TaskPriority;
}) => api.post<ApiResponse<Task>>("/tasks", payload);

export const updateMyTaskStatus = (
  taskId: string,
  payload: {
    status: TaskStatus;
    completionNote?: string;
    completionCommitUrls?: string[];
  }
) => api.patch<ApiResponse<Task>>(`/tasks/${taskId}/status`, payload);

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskParty {
  name: string;
  email: string;
}

export interface TaskGroupRef {
  name: string;
}

export interface TaskProjectRef {
  id: string;
  title: string;
  subjectName: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  completionNote?: string;
  completionCommitUrls?: string[];
  completedAt?: string | null;
  assignee?: TaskParty;
  group?: TaskGroupRef;
  project?: TaskProjectRef;
  createdBy?: TaskParty;
}

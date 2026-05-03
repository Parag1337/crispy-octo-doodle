import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { fetchGuideGroups, fetchMyGroup } from "../services/group.api";
import { createGuideTask, fetchGuideTasks, fetchMyTasks, updateMyTaskStatus } from "../services/task.api";
import type { ProjectGroup } from "../types/group.types";
import type { Task, TaskPriority, TaskStatus } from "../types/task.types";
import { fetchAllCommits, mapTasksToCommits, parseRepoFromUrl, type GitHubCommit } from "../utils/commitMapping";
import { formatDate } from "../utils/helpers";

const getDefaultRepoUrl = (group: ProjectGroup | null) => {
  if (!group) return "";
  const projectRepo = group.projects.find((entry) => Boolean(entry.repositoryUrl))?.repositoryUrl;
  return projectRepo ?? group.repositoryUrl ?? "";
};

type CompletionDraft = {
  open: boolean;
  note: string;
  selectedCommitUrls: string[];
};

const defaultDraft: CompletionDraft = {
  open: false,
  note: "",
  selectedCommitUrls: []
};

const statusBadgeClass: Record<TaskStatus, string> = {
  todo: "bg-[var(--warn)]/15 text-[var(--warn)] border-[var(--warn)]/40",
  "in-progress": "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/40",
  done: "bg-[var(--ok)]/15 text-[var(--ok)] border-[var(--ok)]/40"
};

const TasksPage = () => {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [guideGroups, setGuideGroups] = useState<ProjectGroup[]>([]);
  const [guideTasks, setGuideTasks] = useState<Task[]>([]);
  const [groupId, setGroupId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isCreating, setIsCreating] = useState(false);
  const [guideMessage, setGuideMessage] = useState("");

  const [studentTasks, setStudentTasks] = useState<Task[]>([]);
  const [studentGroup, setStudentGroup] = useState<ProjectGroup | null>(null);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [isCommitsLoading, setIsCommitsLoading] = useState(false);
  const [commitsError, setCommitsError] = useState("");
  const [isTaskUpdating, setIsTaskUpdating] = useState("");
  const [completionDraftByTask, setCompletionDraftByTask] = useState<Record<string, CompletionDraft>>({});
  const [studentMessage, setStudentMessage] = useState("");

  const selectedGuideGroup = useMemo(
    () => guideGroups.find((group) => group.id === groupId) ?? null,
    [guideGroups, groupId]
  );

  const guideAssignees = useMemo(
    () => (selectedGuideGroup?.members ?? []).filter((member) => member.role === "student"),
    [selectedGuideGroup]
  );

  const commitsByTaskId = useMemo(() => {
    const links = mapTasksToCommits(studentTasks, commits);
    return new Map(links.map((entry) => [entry.task.id, entry.commits]));
  }, [studentTasks, commits]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setIsLoading(true);
      setError("");

      try {
        if (user.role === "guide") {
          const [groupsRes, tasksRes] = await Promise.all([fetchGuideGroups(), fetchGuideTasks()]);
          const nextGroups = groupsRes.data.data;

          setGuideGroups(nextGroups);
          setGuideTasks(tasksRes.data.data);

          const firstGroup = nextGroups[0] ?? null;
          setGroupId((current) => current || firstGroup?.id || "");
          setProjectId((current) => current || firstGroup?.projects?.[0]?.id || "");

          const initialAssignee = (firstGroup?.members ?? []).find((member) => member.role === "student");
          setAssigneeId((current) => current || initialAssignee?.id || "");
        }

        if (user.role === "student") {
          const [tasksRes, groupsRes] = await Promise.all([fetchMyTasks(), fetchMyGroup()]);
          const myGroup = groupsRes.data.data[0] ?? null;

          setStudentTasks(tasksRes.data.data);
          setStudentGroup(myGroup);
          setRepositoryUrl(getDefaultRepoUrl(myGroup));
          setGithubToken(localStorage.getItem("github-commits-token") ?? "");
        }
      } catch {
        setError("Unable to load task workspace.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [user]);

  useEffect(() => {
    const nextAssignee = guideAssignees[0]?.id ?? "";
    if (!guideAssignees.some((member) => member.id === assigneeId)) {
      setAssigneeId(nextAssignee);
    }
  }, [assigneeId, guideAssignees]);

  useEffect(() => {
    if (!selectedGuideGroup) {
      setProjectId("");
      return;
    }

    if (!selectedGuideGroup.projects.some((project) => project.id === projectId)) {
      setProjectId(selectedGuideGroup.projects[0]?.id ?? "");
    }
  }, [projectId, selectedGuideGroup]);

  useEffect(() => {
    const loadCommits = async () => {
      if (!repositoryUrl.trim()) {
        setCommits([]);
        setCommitsError("");
        return;
      }

      const parsedRepo = parseRepoFromUrl(repositoryUrl);
      if (!parsedRepo) {
        setCommits([]);
        setCommitsError("Enter a valid GitHub repository URL to map commits.");
        return;
      }

      setIsCommitsLoading(true);
      setCommitsError("");

      try {
        const items = await fetchAllCommits(parsedRepo.owner, parsedRepo.repo, githubToken.trim() || undefined);
        setCommits(items);
      } catch (err) {
        setCommits([]);
        setCommitsError(err instanceof Error ? err.message : "Unable to load commits.");
      } finally {
        setIsCommitsLoading(false);
      }
    };

    if (user?.role === "student") {
      void loadCommits();
    }
  }, [githubToken, repositoryUrl, user?.role]);

  const handleGuideCreateTask = async () => {
    if (!groupId || !assigneeId || !title.trim() || !dueDate) {
      setGuideMessage("Please fill group, assignee, title, and due date.");
      return;
    }

    if (selectedGuideGroup?.projects?.length && !projectId) {
      setGuideMessage("Please select a project for this group before assigning the task.");
      return;
    }

    setIsCreating(true);
    setGuideMessage("");

    try {
      const response = await createGuideTask({
        groupId,
        projectId: projectId || undefined,
        assigneeId,
        title: title.trim(),
        description: description.trim(),
        dueDate: new Date(dueDate).toISOString(),
        priority
      });

      setGuideTasks((current) => [response.data.data, ...current]);
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("medium");
      setGuideMessage("Task created and assigned successfully.");
    } catch {
      setGuideMessage("Unable to create task. Check group and assignee selection.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusUpdate = async (
    taskId: string,
    nextStatus: TaskStatus,
    options?: { note?: string; commitUrls?: string[] }
  ) => {
    setIsTaskUpdating(taskId);
    setStudentMessage("");

    try {
      const response = await updateMyTaskStatus(taskId, {
        status: nextStatus,
        completionNote: options?.note,
        completionCommitUrls: options?.commitUrls
      });

      setStudentTasks((current) => current.map((task) => (task.id === taskId ? response.data.data : task)));
      setCompletionDraftByTask((current) => ({
        ...current,
        [taskId]: { ...defaultDraft }
      }));
      setStudentMessage(nextStatus === "done" ? "Task marked as completed." : "Task status updated.");
    } catch {
      setStudentMessage("Unable to update task status.");
    } finally {
      setIsTaskUpdating("");
    }
  };

  const toggleCompletion = (taskId: string) => {
    setCompletionDraftByTask((current) => {
      const draft = current[taskId] ?? { ...defaultDraft };
      return {
        ...current,
        [taskId]: {
          ...draft,
          open: !draft.open
        }
      };
    });
  };

  const updateDraftNote = (taskId: string, note: string) => {
    setCompletionDraftByTask((current) => {
      const draft = current[taskId] ?? { ...defaultDraft };
      return {
        ...current,
        [taskId]: {
          ...draft,
          note
        }
      };
    });
  };

  const toggleDraftCommit = (taskId: string, commitUrl: string) => {
    setCompletionDraftByTask((current) => {
      const draft = current[taskId] ?? { ...defaultDraft };
      const selected = draft.selectedCommitUrls.includes(commitUrl)
        ? draft.selectedCommitUrls.filter((item) => item !== commitUrl)
        : [...draft.selectedCommitUrls, commitUrl];

      return {
        ...current,
        [taskId]: {
          ...draft,
          selectedCommitUrls: selected
        }
      };
    });
  };

  const saveToken = () => {
    localStorage.setItem("github-commits-token", githubToken.trim());
    setStudentMessage("GitHub token saved for commit mapping.");
  };

  if (user?.role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading tasks...</p>;
  }

  if (error) {
    return <p className="text-sm text-[var(--danger)]">{error}</p>;
  }

  if (user?.role === "guide") {
    return (
      <div className="space-y-6">
        <section className="lit-card rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
          <h2 className="text-2xl font-bold text-[var(--text-strong)]">Create and Assign Tasks</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Assign tasks to students in your mentored groups.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label htmlFor="guide-task-group" className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-body)]">Group</span>
              <select
                id="guide-task-group"
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-4 py-3 text-sm text-[var(--text-body)] shadow-sm outline-none transition hover:border-[color:var(--primary-light)]/50 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary)]/12"
              >
                {guideGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="guide-task-project" className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-body)]">Project</span>
              <select
                id="guide-task-project"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-4 py-3 text-sm text-[var(--text-body)] shadow-sm outline-none transition hover:border-[color:var(--primary-light)]/50 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary)]/12"
              >
                <option value="">Select a project</option>
                {selectedGuideGroup?.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} · {project.subjectName}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="guide-task-assignee" className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-body)]">Assignee</span>
              <select
                id="guide-task-assignee"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-4 py-3 text-sm text-[var(--text-body)] shadow-sm outline-none transition hover:border-[color:var(--primary-light)]/50 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary)]/12"
              >
                {guideAssignees.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </label>

            <Input id="guide-task-title" label="Task title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Complete module and map GitHub commits" />

            <label htmlFor="guide-task-priority" className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-body)]">Priority</span>
              <select
                id="guide-task-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-4 py-3 text-sm text-[var(--text-body)] shadow-sm outline-none transition hover:border-[color:var(--primary-light)]/50 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary)]/12"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <Input id="guide-task-due" type="date" label="Due date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />

            <label htmlFor="guide-task-description" className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-[var(--text-body)]">Task description</span>
              <textarea
                id="guide-task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add implementation details, expected output, and commit note format."
                rows={4}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-4 py-3 text-sm text-[var(--text-body)] shadow-sm outline-none transition placeholder:text-[var(--text-muted)] hover:border-[color:var(--primary-light)]/50 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary)]/12"
              />
            </label>
          </div>

          <div className="mt-4">
            <Button onClick={() => void handleGuideCreateTask()} disabled={isCreating || !guideAssignees.length}>
              {isCreating ? "Creating..." : "Create Task"}
            </Button>
            {guideMessage ? <p className="mt-2 text-sm text-[var(--primary)]">{guideMessage}</p> : null}
            {!guideAssignees.length ? <p className="mt-2 text-sm text-[var(--warn)]">Selected group has no student members.</p> : null}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <h3 className="text-lg font-semibold text-[var(--text-strong)]">Assigned Tasks</h3>
          {guideTasks.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">No tasks assigned yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {guideTasks.map((task) => (
                <li key={task.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-strong)]">{task.title}</p>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass[task.status]}`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{task.description || "No description"}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Project: {task.project?.title ?? task.group?.name ?? "-"} · Assignee: {task.assignee?.name ?? "-"} · Due: {formatDate(task.dueDate)} · Priority: {task.priority}
                  </p>
                  {task.status === "done" ? (
                    <div className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                      <p>Completion note: {task.completionNote || "-"}</p>
                      {(task.completionCommitUrls ?? []).length > 0 ? (
                        <div className="space-y-1">
                          {(task.completionCommitUrls ?? []).map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-[var(--primary)] hover:underline">
                              {url}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="lit-card rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
        <h2 className="text-2xl font-bold text-[var(--text-strong)]">My Task Execution</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Start tasks, complete tasks, and map related GitHub commits as evidence.</p>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <h3 className="text-base font-semibold text-[var(--text-strong)]">Commit Mapping Setup</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Input
            id="student-task-repo-url"
            label="GitHub Repository URL"
            value={repositoryUrl}
            onChange={(event) => setRepositoryUrl(event.target.value)}
            placeholder="https://github.com/owner/repository"
          />
          <p className="text-xs text-[var(--text-muted)]">Auto-filled from your group/project when available.</p>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Input
            id="student-github-token"
            label="GitHub Token (optional)"
            value={githubToken}
            onChange={(event) => setGithubToken(event.target.value)}
            placeholder="ghp_..."
            type="password"
            autoComplete="off"
          />
          <Button type="button" variant="secondary" onClick={saveToken}>
            Save Token
          </Button>
        </div>
        {studentGroup ? <p className="mt-2 text-xs text-[var(--text-muted)]">Group: {studentGroup.name}</p> : null}
        {isCommitsLoading ? <p className="mt-2 text-sm text-[var(--text-muted)]">Loading commits...</p> : null}
        {commitsError ? <p className="mt-2 text-sm text-[var(--danger)]">{commitsError}</p> : null}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <h3 className="text-lg font-semibold text-[var(--text-strong)]">My Assigned Tasks</h3>
        {studentMessage ? <p className="mt-2 text-sm text-[var(--primary)]">{studentMessage}</p> : null}
        {studentTasks.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">No tasks assigned yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {studentTasks.map((task) => {
              const mappedCommits = commitsByTaskId.get(task.id) ?? [];
              const draft = completionDraftByTask[task.id] ?? defaultDraft;

              return (
                <li key={task.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-[var(--text-strong)]">{task.title}</p>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-1)]/50 px-2 py-1 text-[10px] font-mono font-bold text-[var(--primary)]">
                      TASK-{task.id?.slice(-4).toUpperCase()}
                    </span>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass[task.status]}`}>
                      {task.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-[var(--text-muted)]">{task.description || "No description"}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Due: {formatDate(task.dueDate)} · Priority: {task.priority} · Group: {task.group?.name ?? "-"}
                  </p>

                  {task.status !== "done" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {task.status === "todo" ? (
                        <Button
                          variant="secondary"
                          disabled={isTaskUpdating === task.id}
                          onClick={() => void handleStatusUpdate(task.id, "in-progress")}
                        >
                          Start Task
                        </Button>
                      ) : null}
                      <Button variant="primary" disabled={isTaskUpdating === task.id} onClick={() => toggleCompletion(task.id)}>
                        {draft.open ? "Cancel Completion" : "Complete Task"}
                      </Button>
                    </div>
                  ) : null}

                  {task.status === "done" ? (
                    <div className="mt-3 rounded-lg border border-[var(--ok)]/30 bg-[var(--ok)]/10 p-3 text-xs text-[var(--text-body)]">
                      <p>Completed on: {task.completedAt ? formatDate(task.completedAt) : "-"}</p>
                      <p className="mt-1">Summary: {task.completionNote || "No summary provided."}</p>
                      {(task.completionCommitUrls ?? []).length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {(task.completionCommitUrls ?? []).map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-[var(--primary)] hover:underline">
                              {url}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2">No commit links attached.</p>
                      )}
                    </div>
                  ) : null}

                  {draft.open ? (
                    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3">
                      <label htmlFor={`completion-note-${task.id}`} className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Completion summary — Include TASK-{task.id?.slice(-4).toUpperCase()} in commit
                        </span>
                        <textarea
                          id={`completion-note-${task.id}`}
                          value={draft.note}
                          onChange={(event) => updateDraftNote(task.id, event.target.value)}
                          placeholder="What was completed? (Use TASK-ID in commit messages for auto-linking)"
                          rows={3}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-3 py-2 text-sm text-[var(--text-body)] shadow-sm outline-none transition placeholder:text-[var(--text-muted)] hover:border-[color:var(--primary-light)]/50 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary)]/12"
                        />
                      </label>

                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Suggested related commits (TASK-ID or keyword match)</p>
                        {mappedCommits.length === 0 ? (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-[var(--warn)]">
                              No commits with TASK-{task.id?.slice(-4).toUpperCase()} or matching keywords found.
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              💡 Tip: Include <span className="bg-[var(--bg-1)] px-1 rounded font-mono">TASK-{task.id?.slice(-4).toUpperCase()}</span> in commit messages to auto-link.
                            </p>
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {mappedCommits.slice(0, 6).map((commit) => (
                              <label key={commit.sha} className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-2 text-xs text-[var(--text-body)]">
                                <input
                                  type="checkbox"
                                  checked={draft.selectedCommitUrls.includes(commit.url)}
                                  onChange={() => toggleDraftCommit(task.id, commit.url)}
                                  className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                />
                                <span>
                                  <span className="font-semibold">{commit.sha.slice(0, 7)}</span> - {commit.message}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button
                          disabled={isTaskUpdating === task.id}
                          onClick={() =>
                            void handleStatusUpdate(task.id, "done", {
                              note: draft.note,
                              commitUrls: draft.selectedCommitUrls
                            })
                          }
                        >
                          {isTaskUpdating === task.id ? "Saving..." : "Submit Completion"}
                        </Button>
                        <Button variant="secondary" onClick={() => toggleCompletion(task.id)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default TasksPage;

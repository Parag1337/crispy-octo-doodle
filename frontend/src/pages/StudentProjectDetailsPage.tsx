import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ExternalLink, GitCommitHorizontal, Link2, ListChecks } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { fetchMyGroup, updateGroupProject } from "../services/group.api";
import { fetchMyTasks } from "../services/task.api";
import type { Task } from "../types/task.types";
import { formatDate } from "../utils/helpers";
import { fetchAllCommits, mapTasksToCommits, parseRepoFromUrl, type GitHubCommit } from "../utils/commitMapping";
import type { GroupProject, ProjectGroup } from "../types/group.types";

const StudentProjectDetailsPage = () => {
  const { user } = useAuth();
  const { projectId = "" } = useParams();

  const [group, setGroup] = useState<ProjectGroup | null>(null);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [myGroup, setMyGroup] = useState<ProjectGroup | null>(null);

  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [isCommitsLoading, setIsCommitsLoading] = useState(false);
  const [commitsError, setCommitsError] = useState("");

  useEffect(() => {
    setGithubToken(localStorage.getItem("github-commits-token") ?? "");
  }, [projectId, user?.id]);

  useEffect(() => {
    const loadTasksAndGroup = async () => {
      setIsTasksLoading(true);
      try {
        const [tasksResponse, groupResponse] = await Promise.all([fetchMyTasks(), fetchMyGroup()]);
        setTasks(tasksResponse.data.data);
        const nextGroup = groupResponse.data.data[0] ?? null;
        setMyGroup(nextGroup);
        setGroup(nextGroup);
      } catch {
        setTasks([]);
        setMyGroup(null);
        setGroup(null);
      } finally {
        setIsTasksLoading(false);
      }
    };

    void loadTasksAndGroup();
  }, []);

  const project = useMemo<GroupProject | null>(() => group?.projects.find((entry) => entry.id === projectId) ?? null, [group, projectId]);

  useEffect(() => {
    setRepositoryUrl(project?.repositoryUrl ?? "");
  }, [project]);

  useEffect(() => {
    const loadCommits = async () => {
      if (!repositoryUrl.trim()) {
        setCommits([]);
        setCommitsError("");
        return;
      }

      const repoInfo = parseRepoFromUrl(repositoryUrl);
      if (!repoInfo) {
        setCommits([]);
        setCommitsError("Enter a valid GitHub repository URL.");
        return;
      }

      setIsCommitsLoading(true);
      setCommitsError("");
      try {
        const items = await fetchAllCommits(repoInfo.owner, repoInfo.repo, githubToken.trim() || undefined);
        setCommits(items);
      } catch (err) {
        setCommits([]);
        setCommitsError(err instanceof Error ? err.message : "Unable to fetch commits.");
      } finally {
        setIsCommitsLoading(false);
      }
    };

    void loadCommits();
  }, [repositoryUrl, githubToken]);

  const subjectTasks = useMemo(() => {
    if (!project) return [];
    const keyword = project.subjectName.toLowerCase();

    const matching = tasks.filter((task) => {
      const inTitle = task.title.toLowerCase().includes(keyword);
      const inDescription = task.description.toLowerCase().includes(keyword);
      return inTitle || inDescription;
    });

    return matching.length > 0 ? matching : tasks;
  }, [project, tasks]);

  const taskCommitLinks = useMemo(() => mapTasksToCommits(subjectTasks, commits), [subjectTasks, commits]);

  const handleSaveRepository = async () => {
    if (!project) return;

    const nextUrl = repositoryUrl.trim();
    if (!nextUrl) {
      setSaveError("Please enter a GitHub link.");
      setSaveMessage("");
      return;
    }

    if (!myGroup) {
      setSaveError("Group not found. Join your group first.");
      setSaveMessage("");
      return;
    }

    try {
      await updateGroupProject(myGroup.id, project.id, { repositoryUrl: nextUrl });
    } catch {
      setSaveError("Unable to save repository URL to group. Please try again.");
      setSaveMessage("");
      return;
    }

    setGroup((current) =>
      current
        ? {
            ...current,
            projects: (current.projects ?? []).map((entry) => (entry.id === project.id ? { ...entry, repositoryUrl: nextUrl } : entry))
          }
        : current
    );
    setSaveError("");
    setSaveMessage("GitHub link saved successfully.");
  };

  const handleSaveToken = () => {
    localStorage.setItem("github-commits-token", githubToken.trim());
    setSaveError("");
    setSaveMessage("GitHub token saved for commit fetching.");
  };

  if (user && user.role !== "student") {
    return <Navigate to="/dashboard" replace />;
  }

  if (!project) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-card">
        <p className="text-sm text-[var(--text-muted)]">Project not found.</p>
        <Link to="/student/projects" className="mt-3 inline-block text-sm font-medium text-[var(--primary)] hover:underline">
          Back to Projects
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="reveal-up delay-1 lit-card rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--primary)] font-medium">Project Details</p>
        <h2 className="mt-2 text-3xl font-bold text-[var(--text-strong)]">{project.title}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Title</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{project.title}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Subject</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{project.subjectName}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Guide Name</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{project.guideName}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-[var(--primary)]">
          <Link2 size={16} />
          <h3 className="text-base font-semibold text-[var(--text-strong)]">Add GitHub Link</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Input
            id="project-repo-url"
            label="GitHub Repository URL"
            value={repositoryUrl}
            onChange={(event) => {
              setRepositoryUrl(event.target.value);
              setSaveError("");
              setSaveMessage("");
            }}
            placeholder="https://github.com/owner/repository"
          />
          <Button type="button" onClick={() => void handleSaveRepository()} className="h-[46px] bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg-0)]">
            Save Link
          </Button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Input
            id="github-token"
            label="GitHub Token (optional, for private repos)"
            value={githubToken}
            onChange={(event) => {
              setGithubToken(event.target.value);
              setSaveError("");
            }}
            placeholder="ghp_..."
            type="password"
            autoComplete="off"
          />
          <Button type="button" variant="secondary" onClick={handleSaveToken} className="h-[46px]">
            Save Token
          </Button>
        </div>
        {saveMessage ? <p className="mt-2 text-sm text-[var(--ok)]">{saveMessage}</p> : null}
        {saveError ? <p className="mt-2 text-sm text-[var(--danger)]">{saveError}</p> : null}
        {project.repositoryUrl ? (
          <a
            href={project.repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Open repository <ExternalLink size={14} />
          </a>
        ) : null}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-[var(--primary)]">
          <GitCommitHorizontal size={16} />
          <h3 className="text-base font-semibold text-[var(--text-strong)]">All Commits</h3>
        </div>

        {!repositoryUrl.trim() ? (
          <p className="text-sm text-[var(--text-muted)]">Add a GitHub link to view commits here.</p>
        ) : isCommitsLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading commits...</p>
        ) : commitsError ? (
          <p className="text-sm text-[var(--danger)]">{commitsError}</p>
        ) : commits.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No commits found for this repository.</p>
        ) : (
          <ul className="space-y-2">
            {commits.map((commit) => (
              <li key={commit.sha} className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                <a href={commit.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--text-strong)] hover:text-[var(--primary)]">
                  {commit.message}
                </a>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {commit.author} · {commit.date ? formatDate(commit.date) : "Unknown date"} · {commit.sha.slice(0, 7)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-[var(--primary)]">
          <ListChecks size={16} />
          <h3 className="text-base font-semibold text-[var(--text-strong)]">Tasks Assigned by Teachers</h3>
        </div>
        <p className="mb-3 text-xs text-[var(--text-muted)]">Showing tasks for subject: {project.subjectName}</p>

        {isTasksLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading tasks...</p>
        ) : subjectTasks.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No tasks assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {subjectTasks.map((task) => (
              <li key={task.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                <p className="text-sm font-semibold text-[var(--text-strong)]">{task.title}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{task.description || "No description"}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Due: {formatDate(task.dueDate)} · Status: {task.status} · Priority: {task.priority}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-[var(--primary)]">
          <GitCommitHorizontal size={16} />
          <h3 className="text-base font-semibold text-[var(--text-strong)]">Task-to-Commit Linking</h3>
        </div>
        {taskCommitLinks.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No tasks available for mapping.</p>
        ) : (
          <ul className="space-y-3">
            {taskCommitLinks.map((item) => (
              <li key={item.task.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                <p className="text-sm font-semibold text-[var(--text-strong)]">{item.task.title}</p>
                {item.commits.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--warn)]">No related commits detected.</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-[var(--ok)]">Linked commits: {item.commits.length}</p>
                    {item.commits.slice(0, 3).map((commit) => (
                      <a key={commit.sha} href={commit.url} target="_blank" rel="noreferrer" className="block text-xs text-[var(--primary)] hover:underline">
                        {commit.sha.slice(0, 7)} · {commit.message}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link to="/student/projects" className="inline-block text-sm font-medium text-[var(--primary)] hover:underline">
        Back to Projects
      </Link>
    </div>
  );
};

export default StudentProjectDetailsPage;

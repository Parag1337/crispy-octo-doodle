import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ExternalLink, GitCommitHorizontal, Layers3, ListChecks, Users2 } from "lucide-react";
import axios from "axios";
import Button from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { fetchGuideGroups, fetchGuideTasks, type GuideTask } from "../services/guide.api";
import type { GroupProject, ProjectGroup } from "../types/group.types";
import { fetchAllCommits, getContributionSummary, mapTasksToCommits, parseRepoFromUrl } from "../utils/commitMapping";
import { formatDate } from "../utils/helpers";

const GuideMentoringProjectsPage = () => {
  const { user } = useAuth();

  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [tasks, setTasks] = useState<GuideTask[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [githubToken, setGithubToken] = useState("");
  const [commitsError, setCommitsError] = useState("");
  const [isCommitsLoading, setIsCommitsLoading] = useState(false);
  const [commits, setCommits] = useState<Awaited<ReturnType<typeof fetchAllCommits>>>([]);

  const loadGuideData = async (preserveSelection = true) => {
    try {
      const [groupsRes, tasksRes] = await Promise.all([fetchGuideGroups(), fetchGuideTasks()]);
      const nextGroups = groupsRes.data.data;
      setGroups(nextGroups);
      setTasks(tasksRes.data.data);
      setError("");

      if (!preserveSelection || !nextGroups.some((group) => group.id === selectedGroupId)) {
        const firstGroup = nextGroups[0] ?? null;
        setSelectedGroupId(firstGroup?.id ?? "");
        setSelectedProjectId(firstGroup?.projects[0]?.id ?? "");
      } else {
        const currentGroup = nextGroups.find((group) => group.id === selectedGroupId) ?? null;
        if (currentGroup && !currentGroup.projects.some((project) => project.id === selectedProjectId)) {
          setSelectedProjectId(currentGroup.projects?.[0]?.id ?? "");
        }
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { message?: string } | undefined)?.message;
        setError(message ?? "Unable to refresh mentored projects.");
      } else {
        setError("Unable to refresh mentored projects.");
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setGithubToken(localStorage.getItem("github-commits-token") ?? "");
      await loadGuideData(false);
      setIsLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedGroup = useMemo(() => groups.find((group) => group.id === selectedGroupId) ?? null, [groups, selectedGroupId]);
  const selectedProject = useMemo<GroupProject | null>(() => selectedGroup?.projects.find((project) => project.id === selectedProjectId) ?? null, [selectedGroup, selectedProjectId]);

  const groupTasks = useMemo(() => {
    if (!selectedGroup) return [];
    return tasks.filter((task) => task.group?.name === selectedGroup.name);
  }, [selectedGroup, tasks]);

  const taskCommitLinks = useMemo(() => mapTasksToCommits(groupTasks, commits), [groupTasks, commits]);
  const contributionSummary = useMemo(() => getContributionSummary(commits), [commits]);

  useEffect(() => {
    const loadCommits = async () => {
      if (!selectedProject?.repositoryUrl) {
        await loadGuideData(true);
        return;
      }

      const parsed = parseRepoFromUrl(selectedProject.repositoryUrl);
      if (!parsed) {
        setCommits([]);
        setCommitsError("Invalid GitHub repository URL for this project.");
        return;
      }

      setIsCommitsLoading(true);
      setCommitsError("");
      try {
        const items = await fetchAllCommits(parsed.owner, parsed.repo, githubToken.trim() || undefined);
        setCommits(items);
      } catch (err) {
        setCommits([]);
        setCommitsError(err instanceof Error ? err.message : "Unable to fetch commits.");
      } finally {
        setIsCommitsLoading(false);
      }
    };

    if (selectedProject) {
      void loadCommits();
    }
  }, [selectedProject, githubToken]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadGuideData(true);
    setIsRefreshing(false);
  };

  if (user && user.role !== "guide") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <section className="reveal-up delay-1 lit-card rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--primary)] font-medium">Guide Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-[var(--text-strong)]">Projects You Are Mentoring</h2>
        <p className="mt-3 max-w-3xl text-sm text-[var(--text-muted)] md:text-base">
          Review commits, check individual contribution by account, and map commits to assigned tasks.
        </p>
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={() => void handleRefresh()} disabled={isRefreshing}>
            {isRefreshing ? "Syncing..." : "Refresh Project Data"}
          </Button>
        </div>
      </section>

      {error ? <p className="rounded-xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <label htmlFor="guide-project-group" className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--text-body)]">Select Project Group</span>
          <select
            id="guide-project-group"
            value={selectedGroupId}
            onChange={(event) => {
              const nextGroup = groups.find((group) => group.id === event.target.value) ?? null;
              setSelectedGroupId(event.target.value);
              setSelectedProjectId(nextGroup?.projects[0]?.id ?? "");
            }}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-4 py-3 text-sm text-[var(--text-body)] shadow-sm outline-none transition hover:border-[color:var(--primary-light)]/50 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary)]/12"
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading mentoring data...</p>
      ) : !selectedGroup ? (
        <p className="text-sm text-[var(--text-muted)]">No mentored projects found yet.</p>
      ) : (selectedGroup.projects?.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">This group has no projects yet.</p>
      ) : (
        <>
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
            <label htmlFor="guide-project-select" className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-body)]">Select Project</span>
              <select
                id="guide-project-select"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-4 py-3 text-sm text-[var(--text-body)] shadow-sm outline-none transition hover:border-[color:var(--primary-light)]/50 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary)]/12"
              >
                {(selectedGroup.projects ?? []).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} · {project.subjectName}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2 text-[var(--primary)]">
              <Layers3 size={16} />
              <h3 className="text-base font-semibold text-[var(--text-strong)]">Project Summary</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Title</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{selectedProject?.title || "Not set"}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Group</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{selectedGroup.name}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Subject</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{selectedProject?.subjectName || "Not set"}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Guide</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{selectedProject?.guideName || "Not assigned"}</p>
              </div>
            </div>
            {selectedProject?.repositoryUrl ? (
              <a href={selectedProject.repositoryUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
                Open repository <ExternalLink size={14} />
              </a>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-muted)]">Repository URL not added for this project.</p>
            )}
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2 text-[var(--primary)]">
              <GitCommitHorizontal size={16} />
              <h3 className="text-base font-semibold text-[var(--text-strong)]">Commits</h3>
            </div>
            {isCommitsLoading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading commits...</p>
            ) : commitsError ? (
              <p className="text-sm text-[var(--danger)]">{commitsError}</p>
            ) : commits.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No commits found for this project.</p>
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
              <Users2 size={16} />
              <h3 className="text-base font-semibold text-[var(--text-strong)]">Individual Contribution</h3>
            </div>
            {contributionSummary.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No contribution data available.</p>
            ) : (
              <ul className="space-y-2">
                {contributionSummary.map((entry) => (
                  <li key={entry.author} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                    <p className="text-sm font-medium text-[var(--text-strong)]">{entry.author}</p>
                    <p className="text-sm text-[var(--primary)]">{entry.count} commits</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2 text-[var(--primary)]">
              <ListChecks size={16} />
              <h3 className="text-base font-semibold text-[var(--text-strong)]">Task-to-Commit Mapping</h3>
            </div>
            {groupTasks.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No tasks found for this group.</p>
            ) : (
              <ul className="space-y-3">
                {taskCommitLinks.map((item) => (
                  <li key={item.task.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                    <p className="text-sm font-semibold text-[var(--text-strong)]">{item.task.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Due: {formatDate(item.task.dueDate)} · Status: {item.task.status}</p>
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

          <Link to="/dashboard" className="inline-block text-sm font-medium text-[var(--primary)] hover:underline">
            Back to Dashboard
          </Link>
        </>
      )}
    </div>
  );
};

export default GuideMentoringProjectsPage;

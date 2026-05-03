import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, Sparkles } from "lucide-react";
import { fetchMyGroup } from "../services/group.api";
import { fetchMyProgressUpdates } from "../services/progress.api";
import { fetchMyTasks } from "../services/task.api";
import type { ProjectGroup } from "../types/group.types";
import { selectEdiMajorProjectGroup } from "../utils/groupSelection";
import type { ProgressUpdate } from "../types/progress.types";
import type { Task } from "../types/task.types";
import { formatDate } from "../utils/helpers";

const StudentDashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [group, setGroup] = useState<ProjectGroup | null>(null);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [tasksResponse, groupResponse, progressResponse] = await Promise.all([
          fetchMyTasks(),
          fetchMyGroup(),
          fetchMyProgressUpdates()
        ]);

        setTasks(tasksResponse.data.data);
        setGroup(selectEdiMajorProjectGroup(groupResponse.data.data));
        setProgressUpdates(progressResponse.data.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const message = (err.response?.data as { message?: string } | undefined)?.message;
          setError(message ?? "Failed to load dashboard data");
        } else {
          setError("Failed to load dashboard data");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const dueThisWeekCount = useMemo(() => {
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(now.getDate() + 7);

    return tasks.filter((task) => {
      const due = new Date(task.dueDate);
      return due >= now && due <= in7Days;
    }).length;
  }, [tasks]);

  const activeTasksCount = useMemo(() => tasks.filter((task) => task.status !== "done").length, [tasks]);

  const progressSubmittedCount = progressUpdates.length;

  const averageCompletion = useMemo(() => {
    if (progressUpdates.length === 0) return 0;

    const total = progressUpdates.reduce((sum, item) => sum + item.completionPercent, 0);
    return Math.round(total / progressUpdates.length);
  }, [progressUpdates]);

  const upcomingTasks = useMemo(
    () => [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 3),
    [tasks]
  );

  const taskNotifications = useMemo(
    () => [...tasks]
      .filter((task) => task.status !== "done")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5),
    [tasks]
  );

  const recentActivity = useMemo(
    () => progressUpdates.slice(0, 3).map((update) => `${update.summary} (${formatDate(update.createdAt)})`),
    [progressUpdates]
  );

  const quickStats = [
    { label: "Active Tasks", value: String(activeTasksCount), tone: "text-[var(--primary)]" },
    { label: "Due This Week", value: String(dueThisWeekCount), tone: "text-[var(--warn)]" },
    { label: "Progress Submitted", value: String(progressSubmittedCount), tone: "text-[var(--ok)]" },
    { label: "Team Members", value: String(group?.members?.length ?? 0), tone: "text-[var(--accent)]" }
  ];

  if (isLoading) {
    return <div className="text-sm text-[var(--text-muted)]">Loading student dashboard...</div>;
  }

  if (error) {
    return <div className="text-sm text-[var(--danger)]">{error}</div>;
  }

  return (
    <div className="grid gap-6 md:gap-8">
      <section className="reveal-up delay-1 glass-panel rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] shadow-card p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-1)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              <Sparkles size={14} /> Overview
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--text-strong)] md:text-4xl">Student Dashboard</h2>
            
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to="/student/edi-major-project"
          className="reveal-up delay-2 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card transition hover:-translate-y-0.5 hover:border-[var(--primary)]/50"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--primary)] font-medium">Major Project</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-strong)]">EDI</h3>
            </div>
            <div className="rounded-2xl bg-[var(--primary)]/10 p-3 text-[var(--primary)]">
              <ClipboardList size={20} />
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Open the EDI major project workspace, group details, and submission flow.</p>
        </Link>

        <Link
          to="/student/course-project"
          className="reveal-up delay-3 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card transition hover:-translate-y-0.5 hover:border-[var(--primary)]/50"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ok)] font-medium">Course Project</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-strong)]">CP</h3>
            </div>
            <div className="rounded-2xl bg-[var(--ok)]/12 p-3 text-[var(--ok)]">
              <BookOpen size={20} />
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Open the course project workspace for planning, tracking, and team coordination.</p>
        </Link>
      </section>

      <section className="grid gap-6 md:gap-8 lg:grid-cols-[1fr_1.2fr]">
        <article className="reveal-up delay-2 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Group Details</p>
          {group ? (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Group Name</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text-strong)]">{group.name}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-[var(--border)] bg-[var(--bg-1)]/80 p-3">
                  <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Members</p>
                  <p className="mt-1 text-sm font-medium text-[var(--text-body)]">{group.members?.length ?? 0} / 4</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--bg-1)]/80 p-3">
                  <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Guide</p>
                  <p className="mt-1 text-sm font-medium text-[var(--text-body)]">{group.ediGuide?.name ?? "Not assigned"}</p>
                </div>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg-1)]/80 p-3">
                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">GitHub Repository</p>
                {group.repositoryUrl ? (
                  <a href={group.repositoryUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-[var(--primary)] hover:underline">
                    {group.repositoryUrl}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">Not added yet</p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">No group details available yet.</p>
          )}
        </article>

        <article className="reveal-up delay-3 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text-strong)]">Notifications</h3>
            <span className="rounded-full bg-[var(--primary)]/15 px-2 py-1 text-xs text-[var(--primary)]">Assigned by Guide</span>
          </div>
          <ul className="mt-4 space-y-2">
            {taskNotifications.map((task) => (
              <li key={task.id} className="rounded-md border border-[var(--border)] bg-[var(--bg-1)]/80 p-3">
                <p className="text-sm font-medium text-[var(--text-strong)]">New task assigned: {task.title}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Due {formatDate(task.dueDate)} · Priority {task.priority}</p>
              </li>
            ))}
            {taskNotifications.length === 0 ? (
              <li className="text-xs text-[var(--text-muted)]">No new task notifications.</li>
            ) : null}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 md:gap-8 sm:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((item) => (
          <article key={item.label} className="reveal-up delay-4 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-card transition hover:-translate-y-0.5 hover:border-[var(--primary)]/50 hover:shadow-card">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{item.label}</p>
            <p className={`mt-2 text-3xl font-bold ${item.tone}`}>{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 md:gap-8 lg:grid-cols-[1.3fr_1fr]">
        <article className="reveal-up delay-5 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text-strong)]">Upcoming Deadlines</h3>
            <span className="rounded-full bg-[var(--primary)]/15 px-2 py-1 text-xs text-[var(--primary)]">Sprint 3</span>
          </div>

          <ul className="space-y-3">
            {upcomingTasks.map((task) => (
              <li key={task.title} className="rounded-md border border-[var(--border)] bg-[var(--bg-1)]/80 p-3 transition hover:border-[var(--primary)]/50">
                <p className="text-sm font-medium text-[var(--text-strong)]">{task.title}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Due: {formatDate(task.dueDate)}</p>
                <p className="mt-2 inline-block rounded bg-[var(--primary)]/15 px-2 py-1 text-xs text-[var(--primary)]">
                  Status: {task.status} | Priority: {task.priority}
                </p>
              </li>
            ))}
            {upcomingTasks.length === 0 ? <li className="text-xs text-[var(--text-muted)]">No tasks assigned yet.</li> : null}
          </ul>
        </article>

        <article className="reveal-up delay-6 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <h3 className="text-base font-semibold text-[var(--text-strong)]">Recent Activity</h3>
          <ul className="mt-4 space-y-3">
            {recentActivity.map((activity) => (
              <li key={activity} className="rounded-md border border-[var(--border)] bg-[var(--bg-1)]/80 p-3 text-sm text-[var(--text-body)] transition hover:border-[var(--primary)]/50">
                {activity}
              </li>
            ))}
            {recentActivity.length === 0 ? <li className="text-xs text-[var(--text-muted)]">No recent progress updates.</li> : null}
          </ul>
        </article>
      </section>

      <section className="reveal-up delay-6 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <h3 className="text-base font-semibold text-[var(--text-strong)]">Progress Snapshot</h3>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm text-[var(--text-body)]">
            <span>Overall completion</span>
            <span>{averageCompletion}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--primary)]/15">
            <div
              className="h-2 rounded-full bg-[var(--primary)]"
              style={{ width: `${averageCompletion}%` }}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;

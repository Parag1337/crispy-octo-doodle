import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import { Link } from "react-router-dom";
import { Users, User, ListTodo, Gauge, Sparkles, ArrowRight } from "lucide-react";

// Avatar component (copied from GroupPage)
function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-sm font-semibold text-[var(--primary)] ring-1 ring-[var(--primary)]/25">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
import axios from "axios";
import { formatDate } from "../utils/helpers";
import type { ProjectGroup } from "../types/group.types";
import { fetchGuideGroups, fetchGuideProgressUpdates, fetchGuideTasks, type GuideProgressUpdate, type GuideTask } from "../services/guide.api";

const GuideDashboard = () => {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [tasks, setTasks] = useState<GuideTask[]>([]);
  const [updates, setUpdates] = useState<GuideProgressUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<ProjectGroup | null>(null);

  useEffect(() => {
    const loadGuideDashboard = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [groupsRes, tasksRes, updatesRes] = await Promise.all([
          fetchGuideGroups(),
          fetchGuideTasks(),
          fetchGuideProgressUpdates()
        ]);

        setGroups(groupsRes.data.data);
        setTasks(tasksRes.data.data);
        setUpdates(updatesRes.data.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const message = (err.response?.data as { message?: string } | undefined)?.message;
          setError(message ?? "Failed to load guide dashboard data");
        } else {
          setError("Failed to load guide dashboard data");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadGuideDashboard();
  }, []);

  const totalStudents = useMemo(() => groups.reduce((sum, group) => sum + (group.members?.length ?? 0), 0), [groups]);
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "done").length, [tasks]);
  const avgProgress = useMemo(() => {
    if (!updates.length) return 0;
    const total = updates.reduce((sum, item) => sum + item.completionPercent, 0);
    return Math.round(total / updates.length);
  }, [updates]);

  const latestUpdates = useMemo(() => updates.slice(0, 5), [updates]);
  const urgentTasks = useMemo(() => tasks.filter((task) => task.priority === "high").slice(0, 5), [tasks]);

  if (isLoading) {
    return <div className="text-sm text-[var(--text-muted)]">Loading guide dashboard...</div>;
  }

  if (error) {
    return <div className="text-sm text-[var(--danger)]">{error}</div>;
  }


  return (
    <div className="space-y-8 md:space-y-10">
      <section className="reveal-up delay-1 glass-panel rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-1)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              <Sparkles size={14} /> Guide command center
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-[var(--text-strong)] md:text-4xl">Guide Dashboard</h2>
            <p className="mt-3 max-w-3xl text-base leading-6 text-[var(--text-muted)]">
          Monitor team health, review student progress, and track urgent delivery risks across all your groups.
            </p>
          </div>
          <Link
            to="/guide/subjects"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-4 py-3 text-sm font-semibold text-[var(--text-strong)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
          >
            Update subjects <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <article className="reveal-up delay-2 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card flex flex-col items-start">
          <span className="mb-2 inline-flex items-center gap-2 text-[var(--primary)]"><Users size={20} /> GROUPS MENTORED</span>
          <span className="mt-1 text-3xl font-extrabold text-[var(--primary)]">{groups.length}</span>
        </article>
        <article className="reveal-up delay-3 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card flex flex-col items-start">
          <span className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]"><User size={20} /> STUDENTS</span>
          <span className="mt-1 text-3xl font-extrabold text-[var(--accent)]">{totalStudents}</span>
        </article>
        <article className="reveal-up delay-4 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card flex flex-col items-start">
          <span className="mb-2 inline-flex items-center gap-2 text-[var(--warn)]"><ListTodo size={20} /> OPEN TASKS</span>
          <span className="mt-1 text-3xl font-extrabold text-[var(--warn)]">{openTasks}</span>
        </article>
        <article className="reveal-up delay-5 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card flex flex-col items-start">
          <span className="mb-2 inline-flex items-center gap-2 text-[var(--ok)]"><Gauge size={20} /> AVERAGE PROGRESS</span>
          <span className="mt-1 text-3xl font-extrabold text-[var(--ok)]">{avgProgress}%</span>
        </article>
      </section>

      {/* Groups & Urgent Tasks */}
      <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* My Groups Card */}
        <article className="reveal-up delay-3 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <h3 className="text-base font-semibold text-[var(--text-strong)]">My Groups</h3>
          <ul className="mt-4 space-y-3">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  className="font-semibold text-[var(--primary)] mb-1 hover:underline text-left transition-colors duration-150 focus:outline-none focus:text-[var(--accent)]"
                  onClick={() => setSelectedGroup(group)}
                >
                  {group.name}
                </button>
              </li>
            ))}
            {groups.length === 0 ? <li className="text-xs text-[var(--primary)]/60">No groups assigned to you yet.</li> : null}
          </ul>

          {/* Modal for group details */}
          {selectedGroup && (
            <Modal open={!!selectedGroup} title={selectedGroup.name} onClose={() => setSelectedGroup(null)}>
              <div className="space-y-4">
                <div>
                  <p className="text-base font-bold text-[var(--primary)]">Group Name: <span className="text-[var(--text-strong)]">{selectedGroup.name}</span></p>
                  <p className="text-sm text-[var(--ok)]">Guide: <span className="text-[var(--text-strong)]">{selectedGroup.ediGuide?.name ?? "Not assigned"}</span></p>
                  <p className="text-sm text-[var(--text-body)]">
                    GitHub Repo:{" "}
                    {selectedGroup.repositoryUrl ? (
                      <a href={selectedGroup.repositoryUrl} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline">
                        {selectedGroup.repositoryUrl}
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">Not added</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--primary)] mb-2">Members</p>
                  {selectedGroup.members.length === 0 ? (
                    <div className="text-xs text-[var(--primary)]/60">No members in this group.</div>
                  ) : (
                    <ul className="space-y-2">
                      {selectedGroup.members.map((member) => (
                        <li key={member.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/80 px-2 py-2 text-sm text-[var(--text-body)]">
                          <div className="flex items-center gap-2">
                            <Avatar name={member.name} />
                            <div>
                              <p className="text-sm font-semibold text-[var(--primary)]">{member.name}</p>
                              <p className="text-xs text-[var(--accent)]">{member.email}</p>
                              <p className="text-xs text-[var(--accent)]">
                                Branch: <span className="text-[var(--primary)]/80">{member.branch ?? "-"}</span> · Division: <span className="text-[var(--primary)]/80">{member.division ?? "-"}</span> · Roll No: <span className="text-[var(--primary)]/80">{member.rollNo ?? "-"}</span>
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Modal>
          )}
        </article>

        {/* Urgent Tasks Card */}
        <article className="reveal-up delay-4 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <h3 className="text-base font-semibold text-[var(--text-strong)]">Urgent Tasks</h3>
          <ul className="mt-4 space-y-3">
            {urgentTasks.map((task) => (
              <li key={task.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/80 p-3 text-sm text-[var(--text-body)]">
                <p className="font-medium text-[var(--text-strong)]">{task.title}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Group: {task.group?.name ?? "-"}</p>
                <p className="text-xs text-[var(--text-muted)]">Assignee: {task.assignee?.name ?? "-"}</p>
                <p className="mt-1 text-xs text-[var(--warn)] font-medium">Due: {formatDate(task.dueDate)}</p>
              </li>
            ))}
            {urgentTasks.length === 0 ? <li className="text-xs text-[var(--text-muted)]">No high-priority tasks right now.</li> : null}
          </ul>
        </article>
      </section>

      {/* Recent Student Updates Card */}
      <section className="reveal-up delay-5 hover-glow lit-card rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <h3 className="text-base font-semibold text-[var(--text-strong)]">Recent Student Updates</h3>
        <ul className="mt-4 space-y-3">
          {latestUpdates.map((update) => (
            <li key={update.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/80 p-3 text-sm text-[var(--text-body)]">
              <p className="font-medium text-[var(--text-strong)]">{update.summary}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Student: {update.student?.name ?? "Unknown"}</p>
              <p className="text-xs text-[var(--text-muted)]">Submitted: {formatDate(update.createdAt)}</p>
              <p className="mt-1 text-xs text-[var(--primary)] font-medium">Completion: {update.completionPercent}%</p>
            </li>
          ))}
          {latestUpdates.length === 0 ? <li className="text-xs text-[var(--text-muted)]">No recent student updates.</li> : null}
        </ul>
      </section>
    </div>
  );
};

export default GuideDashboard;

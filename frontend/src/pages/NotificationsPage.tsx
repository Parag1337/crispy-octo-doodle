import { useEffect, useState } from "react";
import axios from "axios";
import { Bell, Users, Check, X, Megaphone, ListTodo } from "lucide-react";
import { fetchMyTasks } from "../services/task.api";
import type { Task } from "../types/task.types";
import { formatDate } from "../utils/helpers";

const NotificationsPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await fetchMyTasks();
        // Only show pending/in-progress tasks as notifications
        setTasks(response.data.data.filter((t: Task) => t.status !== "done"));
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || "Failed to load notifications");
        }
      } finally {
        setIsLoading(false);
      }
    };
    void loadTasks();
  }, []);

  // Mock Data for UI demonstration
  const mockInvites = [
    { id: 1, groupName: "Computer Engineering-A-2", sender: "Rahul Sharma", date: "2 hours ago" }
  ];

  const mockAdminNotices = [
    { id: 1, title: "Final Project Submission Guidelines", sender: "System Admin", date: "1 day ago" },
    { id: 2, title: "Server Maintenance Tomorrow", sender: "System Admin", date: "3 days ago" }
  ];

  if (isLoading) {
    return <div className="text-sm text-[var(--text-muted)]">Loading notifications...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-strong)] flex items-center gap-3">
          <Bell className="text-[var(--primary)]" size={32} /> Notifications Dashboard
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">Manage your group invitations, task assignments, and admin notices.</p>
      </div>

      <div className="grid gap-6">
        
        {/* Section: Group Invitations */}
        <section className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--bg-1)] px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-strong)] flex items-center gap-2">
              <Users size={20} className="text-[var(--primary)]" /> Pending Invitations
            </h2>
            <span className="bg-[var(--primary)] text-white text-xs px-2 py-1 rounded-full font-bold">{mockInvites.length}</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {mockInvites.map((invite) => (
              <div key={invite.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-[var(--bg-1)]/50">
                <div>
                  <p className="font-medium text-[var(--text-strong)] text-base">Invitation to join <span className="text-[var(--primary)]">{invite.groupName}</span></p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Sent by {invite.sender} • {invite.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 px-4 py-2 bg-[var(--ok)]/10 text-[var(--ok)] rounded-lg text-sm font-medium hover:bg-[var(--ok)]/20 transition">
                    <Check size={16} /> Accept
                  </button>
                  <button className="flex items-center gap-1 px-4 py-2 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg text-sm font-medium hover:bg-[var(--danger)]/20 transition">
                    <X size={16} /> Decline
                  </button>
                </div>
              </div>
            ))}
            {mockInvites.length === 0 && (
              <p className="p-6 text-sm text-[var(--text-muted)] text-center">No pending invitations.</p>
            )}
          </div>
        </section>

        {/* Section: Task Assignments */}
        <section className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--bg-1)] px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-strong)] flex items-center gap-2">
              <ListTodo size={20} className="text-[#8b5cf6]" /> Task Assignments
            </h2>
            <span className="bg-[#8b5cf6] text-white text-xs px-2 py-1 rounded-full font-bold">{tasks.length}</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {tasks.map((task) => (
              <div key={task.id} className="p-6 flex flex-col sm:flex-row justify-between gap-4 transition hover:bg-[var(--bg-1)]/50">
                <div>
                  <p className="font-medium text-[var(--text-strong)] text-base">{task.title}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Assigned by your Guide</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-[var(--text-strong)]">Due: {formatDate(task.dueDate)}</p>
                  <span className={`mt-2 inline-block text-xs px-2 py-1 rounded-full font-medium ${
                    task.priority === "high" ? "bg-[var(--danger)]/10 text-[var(--danger)]" : 
                    task.priority === "medium" ? "bg-[var(--warn)]/10 text-[var(--warn)]" : 
                    "bg-[var(--ok)]/10 text-[var(--ok)]"
                  }`}>
                    Priority: {task.priority}
                  </span>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="p-6 text-sm text-[var(--text-muted)] text-center">No active task assignments.</p>
            )}
            {error && <p className="p-6 text-sm text-[var(--danger)] text-center">{error}</p>}
          </div>
        </section>

        {/* Section: Admin Notices */}
        <section className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--bg-1)] px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-strong)] flex items-center gap-2">
              <Megaphone size={20} className="text-[var(--warn)]" /> Admin Notices
            </h2>
            <span className="bg-[var(--warn)] text-white text-xs px-2 py-1 rounded-full font-bold">{mockAdminNotices.length}</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {mockAdminNotices.map((notice) => (
              <div key={notice.id} className="p-6 transition hover:bg-[var(--bg-1)]/50">
                <p className="font-medium text-[var(--text-strong)] text-base">{notice.title}</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">From {notice.sender} • {notice.date}</p>
              </div>
            ))}
            {mockAdminNotices.length === 0 && (
              <p className="p-6 text-sm text-[var(--text-muted)] text-center">No new admin notices.</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default NotificationsPage;

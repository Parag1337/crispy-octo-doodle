import { useEffect, useState } from "react";
import axios from "axios";
import { Bell, Users, Check, X, ListTodo, Info } from "lucide-react";
import { fetchMyTasks } from "../services/task.api";
import { fetchMyInvites, respondToInvite } from "../services/group.api";
import type { Task } from "../types/task.types";
import type { PendingInvite } from "../types/group.types";
import { formatDate } from "../utils/helpers";

const NotificationsPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewItem, setPreviewItem] = useState<{ title: string; subtitle: string; content: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tasksRes, invitesRes] = await Promise.all([
          fetchMyTasks(),
          fetchMyInvites()
        ]);
        setTasks(tasksRes.data.data.filter((t: Task) => t.status !== "done"));
        setInvites(invitesRes.data.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || "Failed to load notifications");
        }
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, []);

  const handleInviteResponse = async (groupId: string, action: "accept" | "decline") => {
    try {
      await respondToInvite(groupId, action);
      setInvites((prev) => prev.filter((inv) => inv.group._id !== groupId));
    } catch (err) {
      alert("Failed to respond to invitation");
    }
  };

  const openTaskPreview = (task: Task) => {
    setPreviewItem({
      title: task.title,
      subtitle: `Due: ${formatDate(task.dueDate)} | Priority: ${task.priority}`,
      content: task.description || "No additional description provided for this task."
    });
  };

  if (isLoading) {
    return <div className="text-sm text-[var(--text-muted)] p-8">Loading notifications...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-8 relative">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-strong)] flex items-center gap-3">
          <Bell className="text-[var(--primary)]" size={32} /> Notifications Dashboard
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">Manage your group invitations and task assignments.</p>
        {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
      </div>

      <div className="grid gap-6">
        
        {/* Section: Group Invitations */}
        <section className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--bg-1)] px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-strong)] flex items-center gap-2">
              <Users size={20} className="text-[var(--primary)]" /> Pending Invitations
            </h2>
            <span className="bg-[var(--primary)] text-white text-xs px-2 py-1 rounded-full font-bold">{invites.length}</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {invites.map((invite) => (
              <div key={invite.group._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-[var(--bg-1)]/50">
                <div>
                  <p className="font-medium text-[var(--text-strong)] text-base">Invitation to join <span className="text-[var(--primary)]">{invite.group.name}</span></p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Sent on {formatDate(invite.invitedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleInviteResponse(invite.group._id, "accept")}
                    className="flex items-center gap-1 px-4 py-2 bg-[var(--ok)]/10 text-[var(--ok)] rounded-lg text-sm font-medium hover:bg-[var(--ok)]/20 transition"
                  >
                    <Check size={16} /> Accept
                  </button>
                  <button 
                    onClick={() => handleInviteResponse(invite.group._id, "decline")}
                    className="flex items-center gap-1 px-4 py-2 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg text-sm font-medium hover:bg-[var(--danger)]/20 transition"
                  >
                    <X size={16} /> Decline
                  </button>
                </div>
              </div>
            ))}
            {invites.length === 0 && (
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
              <div 
                key={task.id} 
                onClick={() => openTaskPreview(task)}
                className="p-6 flex flex-col sm:flex-row justify-between gap-4 transition hover:bg-[var(--bg-1)]/80 cursor-pointer"
              >
                <div>
                  <p className="font-medium text-[var(--text-strong)] text-base">{task.title}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-1">{task.description || "Click to view details"}</p>
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
          </div>
        </section>

      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-start bg-[var(--bg-1)]">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-strong)] flex items-center gap-2">
                  <Info size={20} className="text-[var(--primary)]" /> Message Preview
                </h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">{previewItem.subtitle}</p>
              </div>
              <button 
                onClick={() => setPreviewItem(null)}
                className="text-[var(--text-muted)] hover:text-[var(--danger)] transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <h4 className="font-semibold text-[var(--text-strong)] mb-4">{previewItem.title}</h4>
              <div className="text-sm text-[var(--text-body)] whitespace-pre-wrap leading-relaxed bg-[var(--bg-0)] p-4 rounded-xl border border-[var(--border)]">
                {previewItem.content}
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-1)] flex justify-end">
              <button 
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary)]/90 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NotificationsPage;

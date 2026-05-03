import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Modal from "../components/Modal";
import Button from "../components/Button";
import Input from "../components/Input";
import {
  fetchMyGroup, fetchMyInvites, createGroup, updateGroup, deleteGroup,
  leaveGroup, inviteStudent, respondToInvite, cancelInvite, removeMember,
  fetchGuideGroups, fetchAllGroups,
  fetchAllGroupNames
} from "../services/group.api";
import type { ProjectGroup, PendingInvite } from "../types/group.types";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function errMsg(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string } | undefined)?.message ?? "Something went wrong.";
  }
  return "Something went wrong.";
}

function normalizeGroups(data: ProjectGroup | ProjectGroup[] | null | undefined): ProjectGroup[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-sm font-semibold text-[var(--primary)] ring-1 ring-[var(--primary)]/25">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Student: no group yet ────────────────────────────────────────────────────

function NoGroupView({ invites, onAccept, onDecline, onOpenCreate, canCreateGroup }: {
  invites: PendingInvite[];
  onAccept: (groupId: string) => Promise<void>;
  onDecline: (groupId: string) => Promise<void>;
  onOpenCreate: () => void;
  canCreateGroup: boolean;
}) {
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const respond = async (groupId: string, action: "accept" | "decline") => {
    setRespondingId(groupId);
    try {
      if (action === "accept") await onAccept(groupId);
      else await onDecline(groupId);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Groups</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text-strong)]">Project Groups</h2>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-strong)]">
            Pending Invites
            <span className="ml-2 rounded-full bg-[var(--primary)]/15 px-2 py-0.5 text-xs text-[var(--primary)]">{invites.length}</span>
          </h3>
          {invites.map((inv) => (
            <div key={inv.groupId} className="lit-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-card">
              <div>
                <p className="text-base font-semibold text-[var(--text-strong)]">{inv.groupName}</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Invited by <span className="font-medium">{inv.owner?.name || "Unknown"}</span>
                  &nbsp;·&nbsp; {inv.memberCount}/4 members
                  &nbsp;·&nbsp; Subject: {inv.subject}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  disabled={respondingId === inv.groupId}
                  onClick={() => void respond(inv.groupId, "accept")}
                  className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-card hover:bg-[var(--primary-light)] disabled:opacity-50 transition"
                >
                  Accept
                </button>
                <button
                  disabled={respondingId === inv.groupId}
                  onClick={() => void respond(inv.groupId, "decline")}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] hover:bg-[var(--bg-2)] disabled:opacity-50 transition"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Empty state */}
      <section className="lit-card rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-card">
        <h3 className="text-base font-semibold text-[var(--text-strong)]">No Groups Yet</h3>
        <p className="mt-1 text-sm text-[var(--text-body)]">
          Create your first group and invite up to 3 teammates. Each group can have up to 4 members.
        </p>
        <div className="mt-4">
          {canCreateGroup ? (
            <Button onClick={onOpenCreate}>Create Group</Button>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">You have already used your group creation slot.</p>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Student: has a group ─────────────────────────────────────────────────────

function MyGroupView({ group, userId, onUpdate, onLeft, onDeleted }: {
  group: ProjectGroup;
  userId: string;
  onUpdate: (g: ProjectGroup) => void;
  onLeft: (groupId: string) => void;
  onDeleted: (groupId: string) => void;
}) {
  const isOwner = group.owner?.id === userId;

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [inviting, setInviting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editSubject, setEditSubject] = useState(group.subject);
  const [editErr, setEditErr] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [actionErr, setActionErr] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteErr("");
    setInviting(true);
    try {
      const res = await inviteStudent(group.id, inviteEmail.trim());
      onUpdate(res.data.data);
      setInviteEmail("");
    } catch (err) {
      setInviteErr(errMsg(err));
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (studentId: string) => {
    setActionErr("");
    try {
      const res = await cancelInvite(group.id, studentId);
      onUpdate(res.data.data);
    } catch (err) {
      setActionErr(errMsg(err));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setActionErr("");
    try {
      const res = await removeMember(group.id, memberId);
      onUpdate(res.data.data);
    } catch (err) {
      setActionErr(errMsg(err));
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubject.trim()) {
      setEditErr("Subject is required.");
      return;
    }
    setEditErr("");
    setEditLoading(true);
    try {
      const res = await updateGroup(group.id, {
        name: editName.trim(),
        subject: editSubject.trim()
      });
      onUpdate(res.data.data);
      setEditOpen(false);
    } catch (err) {
      setEditErr(errMsg(err));
    } finally {
      setEditLoading(false);
    }
  };

  const handleLeave = async () => {
    setActionErr("");
    try {
      await leaveGroup(group.id);
      onLeft(group.id);
    } catch (err) {
      setActionErr(errMsg(err));
    }
  };

  const handleDelete = async () => {
    setActionErr("");
    setDeleteLoading(true);
    try {
      await deleteGroup(group.id);
      onDeleted(group.id);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (err) {
      setActionErr(errMsg(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const spotsLeft = 4 - (group.members?.length ?? 0);

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setShowDetails(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowDetails(true);
          }
        }}
        className="lit-card cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card transition hover:-translate-y-0.5 hover:border-[var(--primary)]/50"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Group</p>
        <h3 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-strong)]">{group.name}</h3>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--primary)]">
          <span>{group.members?.length ?? 0}/4 Members</span>
          <span>
            {group.guide || group.cpGuide || (group.courseProjectRegistrations?.some((registration) => Boolean(registration.labFaculty)) ?? false)
              ? "Faculty Assigned"
              : "Faculty Not Assigned"}
          </span>
        </div>
        {group.courseProjectRegistrations?.length ? (
          <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/60 px-4 py-3 text-sm text-[var(--text-body)]">
            <p className="font-medium text-[var(--text-strong)]">Registered subjects</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {group.courseProjectRegistrations.map((registration) => registration.subjectName).join(", ")}
            </p>
          </div>
        ) : null}
      </article>

      <Modal open={showDetails} title={`Group Details - ${group.name}`} onClose={() => setShowDetails(false)}>
        <div className="space-y-4">
          {actionErr && <p className="rounded-lg border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-2 text-sm text-[var(--danger)]">{actionErr}</p>}

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Group</p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-strong)]">{group.name}</h3>
            </div>
            {isOwner && (
              <button
                onClick={() => {
                  setEditName(group.name);
                  setEditSubject(group.subject);
                  setEditOpen(true);
                }}
                className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--bg-2)] transition"
              >
                Edit
              </button>
            )}
          </div>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-strong)]">
                Team Members
                <span className="ml-2 text-xs font-normal text-[var(--primary)]/80">{group.members?.length ?? 0}/4</span>
              </h3>
              {spotsLeft === 0
                ? <span className="rounded-full bg-[var(--primary)]/15 px-2 py-0.5 text-xs text-[var(--primary)]">Full</span>
                : <span className="text-xs text-[var(--primary)]/80">{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>
              }
            </div>
            <ul className="space-y-2">
              {group.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-0)]/70 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--text-strong)]">{member.name}</p>
                        {member.id === group.owner.id && (
                          <span className="rounded bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--primary)]">Owner</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{member.email}</p>
                    </div>
                  </div>
                  {isOwner && member.id !== userId && (
                    <button
                      onClick={() => void handleRemoveMember(member.id)}
                      className="text-xs text-[var(--danger)] hover:text-[var(--danger)]/80 transition"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {(group.courseProjectRegistrations?.length ?? 0) > 0 && (
            <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/80 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-strong)]">Course Project Registrations</h3>
                <p className="text-xs text-[var(--text-muted)]">Registered subjects and assigned lab faculty.</p>
              </div>
              <ul className="space-y-3">
                {group.courseProjectRegistrations.map((registration) => (
                  <li key={registration.subjectId} className="rounded-xl border border-[var(--border)] bg-[var(--bg-0)]/70 px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--text-strong)]">{registration.subjectName}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Lab faculty: {registration.labFaculty?.name ?? "Not assigned"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isOwner && (
            <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--text-strong)]">Invite Teammates</h3>

              {spotsLeft > 0 ? (
                <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => void handleInvite(e)}>
                  <input
                    type="email"
                    placeholder="Enter student email..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2.5 text-sm text-[var(--text-body)] shadow-soft outline-none ring-[var(--focus)] transition focus:border-[var(--focus)] focus:ring"
                  />
                  <Button type="submit" disabled={inviting}>{inviting ? "Sending..." : "Send Invite"}</Button>
                </form>
              ) : (
                <p className="text-sm text-[var(--primary)]/80">Group is full (4/4 members).</p>
              )}

              {inviteErr && <p className="mt-2 text-sm text-[var(--danger)]">{inviteErr}</p>}

              {(group.pendingInvites?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--primary)]/80">
                    Pending ({group.pendingInvites?.length ?? 0})
                  </p>
                  <ul className="space-y-2">
                    {(group.pendingInvites ?? []).map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-0)]/70 px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-strong)]">{s.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{s.email}</p>
                        </div>
                        <button
                          onClick={() => void handleCancelInvite(s.id)}
                          className="text-xs text-[var(--primary)]/80 hover:text-[var(--danger)] transition"
                        >
                          Cancel
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <div className="flex justify-end">
            {isOwner ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-2 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)]/20 transition"
              >
                Delete Group
              </button>
            ) : (
              <button
                onClick={() => void handleLeave()}
                className="rounded-lg border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-2 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)]/20 transition"
              >
                Leave Group
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} title="Edit Group" onClose={() => setEditOpen(false)}>
        <form className="space-y-4" onSubmit={(e) => void handleEdit(e)}>
          <Input id="e-name" label="Group Name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
          <Input id="e-subject" label="Subject" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} required />
          {editErr && <p className="text-sm text-[var(--danger)]">{editErr}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-body)] hover:bg-[var(--bg-2)]" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={editLoading}>{editLoading ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showDeleteConfirm} title="Confirm Delete" onClose={() => setShowDeleteConfirm(false)}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Are you sure you want to delete <span className="font-semibold text-[var(--text-strong)]">{group.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              className="border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-body)] hover:bg-[var(--bg-2)]"
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button variant="danger" type="button" onClick={() => void handleDelete()} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Student page (orchestrates no-group / has-group) ─────────────────────────

function StudentGroupPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const newSubject = "General";
  const [createErr, setCreateErr] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [allGroupNames, setAllGroupNames] = useState<{ name: string; branch: string; division: string; subject?: string }[]>([]);
  const creationLocked = user?.role === "student" && Boolean(user?.hasCreatedGroup || groups.length > 0);
  // Compute available group numbers for dropdown
  const branch = user?.branch || "";
  const division = user?.division || "";
  const groupPrefix = `${branch}-${division}-`;
  const takenNumbers = allGroupNames
    .filter(g => g.branch === branch && g.division === division && g.name.startsWith(groupPrefix))
    .map(g => parseInt(g.name.replace(groupPrefix, ""), 10))
    .filter(n => !isNaN(n));
  const availableNumbers = Array.from({ length: 21 }, (_, i) => i).filter(n => !takenNumbers.includes(n));

  useEffect(() => {
    const load = async () => {
      try {
        const [groupRes, invitesRes, allGroupNamesRes] = await Promise.all([
          fetchMyGroup(),
          fetchMyInvites(),
          fetchAllGroupNames()
        ]);
        const myGroups = normalizeGroups(groupRes.data.data as ProjectGroup | ProjectGroup[] | null);
        setGroups(myGroups);
        setInvites(invitesRes.data.data);
        setAllGroupNames(allGroupNamesRes.data.data);
      } catch (err) {
        setError(errMsg(err));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const handleAccept = async (groupId: string) => {
    const res = await respondToInvite(groupId, "accept");
    if (res.data.data.joined) {
      const groupRes = await fetchMyGroup();
      const myGroups = normalizeGroups(groupRes.data.data as ProjectGroup | ProjectGroup[] | null);
      setGroups(myGroups);
      setInvites([]);
    }
  };

  const handleDecline = async (groupId: string) => {
    await respondToInvite(groupId, "decline");
    setInvites((prev) => prev.filter((i) => i.groupId !== groupId));
  };

  const handleCreateAnother = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creationLocked) {
      setCreateErr("You can create only one group.");
      return;
    }
    if (!newName.trim()) { setCreateErr("Group name is required."); return; }
    setCreateErr("");
    setCreateLoading(true);
    try {
      const res = await createGroup({
        name: newName.trim(),
        subject: newSubject
      });
      setGroups((prev) => [res.data.data, ...prev]);
      setNewName("");
      setShowCreate(false);
    } catch (err) {
      setCreateErr(errMsg(err));
    } finally {
      setCreateLoading(false);
    }
  };

  if (isLoading) return <p className="text-sm text-[var(--text-muted)]">Loading...</p>;
  if (error) return <p className="text-sm text-[var(--danger)]">{error}</p>;

  if (groups.length === 0) {
    return (
      <>
        <NoGroupView
          invites={invites}
          onAccept={handleAccept}
          onDecline={handleDecline}
          canCreateGroup={!creationLocked}
          onOpenCreate={() => {
            if (creationLocked) return;
            setCreateErr("");
            setShowCreate(true);
          }}
        />
        <Modal open={showCreate} title="Create Group" onClose={() => setShowCreate(false)}>
          <form className="space-y-4" onSubmit={(e) => void handleCreateAnother(e)}>
            {/* Show branch and division info above the group name dropdown */}
            <div className="mb-2">
              <span className="block text-xs text-[var(--text-muted)]">Branch:</span>
              <span className="block text-sm font-semibold text-[var(--text-strong)]">{branch || <span className="text-[var(--danger)]">Not set</span>}</span>
              <span className="block text-xs text-[var(--text-muted)] mt-1">Division:</span>
              <span className="block text-sm font-semibold text-[var(--text-strong)]">{division || <span className="text-[var(--danger)]">Not set</span>}</span>
            </div>
            <label htmlFor="cg-name-empty" className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--text-strong)]">Group Name</span>
              <select
                id="cg-name-empty"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--text-body)] shadow-sm outline-none ring-[var(--focus)] transition focus:border-[var(--focus)] focus:ring"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                disabled={!branch || !division}
              >
                <option value="">{!branch || !division ? "Set branch and division in your profile" : "Select Group"}</option>
                {branch && division && availableNumbers.map(n => (
                  <option key={n} value={`${branch}-${division}-${n}`}>{`${branch}-${division}-${n}`}</option>
                ))}
              </select>
            </label>
            {/* Group context is generic and shared across separate project modules. */}
            <div className="mt-2">
              <span className="block text-sm font-medium text-[var(--text-strong)]">Group Context</span>
              <span className="block text-base font-semibold text-[var(--primary)]">General</span>
            </div>
            {createErr && <p className="text-sm text-[var(--danger)]">{createErr}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" className="border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-body)] hover:bg-[var(--bg-2)]" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createLoading || creationLocked}>{createLoading ? "Creating..." : "Create Group"}</Button>
            </div>
          </form>
        </Modal>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Your Groups</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text-strong)]">My Groups</h2>
          <p className="mt-1 text-sm text-[var(--text-body)]">Manage your groups, invites, and team members.</p>
        </div>
        {creationLocked ? (
          <p className="text-sm text-[var(--text-muted)]">You have already created or joined a group.</p>
        ) : (
          <Button onClick={() => { setCreateErr(""); setShowCreate(true); }}>Create Group</Button>
        )}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((group) => (
          <MyGroupView
            key={group.id}
            group={group}
            userId={user?.id ?? ""}
            onUpdate={(updated) => setGroups((prev) => prev.map((g) => g.id === updated.id ? updated : g))}
            onLeft={(groupId) => setGroups((prev) => prev.filter((g) => g.id !== groupId))}
            onDeleted={(groupId) => setGroups((prev) => prev.filter((g) => g.id !== groupId))}
          />
        ))}
      </div>

      <Modal open={showCreate} title="Create Group" onClose={() => setShowCreate(false)}>
        <form className="space-y-4" onSubmit={(e) => void handleCreateAnother(e)}>
          {/* Show branch and division info above the group name dropdown */}
          <div className="mb-2">
            <span className="block text-xs text-[var(--text-muted)]">Branch:</span>
            <span className="block text-sm font-semibold text-[var(--text-strong)]">{branch || <span className="text-[var(--danger)]">Not set</span>}</span>
            <span className="block text-xs text-[var(--text-muted)] mt-1">Division:</span>
            <span className="block text-sm font-semibold text-[var(--text-strong)]">{division || <span className="text-[var(--danger)]">Not set</span>}</span>
          </div>
          <label htmlFor="cg-name" className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--text-strong)]">Group Name</span>
            <select
              id="cg-name"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--text-body)] shadow-soft outline-none ring-[var(--focus)] transition focus:border-[var(--focus)] focus:ring"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              disabled={!branch || !division}
            >
              <option value="">{!branch || !division ? "Set branch and division in your profile" : "Select Group"}</option>
              {branch && division && availableNumbers.map(n => {
                const groupValue = `${branch}-${division}-${n}`;
                // Check if this group number is already taken for the selected subject
                const taken = allGroupNames.some(g => g.name === groupValue && newSubject && g.subject === newSubject);
                return (
                  <option
                    key={n}
                    value={groupValue}
                    disabled={taken}
                  >
                    {groupValue}
                    {taken ? ' (Taken)' : ''}
                  </option>
                );
              })}
            </select>
          </label>
          {/* Fallback/error if branch or division is missing */}
          {(!branch || !division) && (
            <p className="text-sm text-[var(--danger)] mt-2">Branch and division must be set in your profile to create a group.</p>
          )}
          {createErr && <p className="text-sm text-[var(--danger)]">{createErr}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-body)] hover:bg-[var(--bg-2)]" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={createLoading || creationLocked}>{createLoading ? "Creating..." : "Create Group"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Guide page: read-only list of assigned groups ────────────────────────────

function GuideGroupPage() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGuideGroups()
      .then((res) => setGroups(res.data.data))
      .catch((err: unknown) => setError(errMsg(err)))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleGroup = (groupId: string) => {
    setExpandedGroupId((current) => (current === groupId ? null : groupId));
  };

  if (isLoading) return <p className="text-sm text-[var(--text-muted)]">Loading your groups...</p>;
  if (error) return <p className="text-sm text-[var(--danger)]">{error}</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Assigned to you</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text-strong)]">My Groups</h2>
      </div>
      {groups.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center shadow-card">
          <p className="text-[var(--text-muted)]">No groups assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((g) => {
            const isExpanded = expandedGroupId === g.id;
            return (
              <article key={g.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
                <button
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-semibold text-[var(--text-strong)]">{g.name}</h3>
                    <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--primary)]">
                      {isExpanded ? "Hide members" : "Show members"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Members: {g.members.length}</p>
                </button>

                {isExpanded ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Group details</p>
                    <p className="text-sm text-[var(--text-muted)]">Owner: {g.owner.name}</p>
                    {g.repositoryUrl ? (
                      <a href={g.repositoryUrl} target="_blank" rel="noreferrer" className="inline-block text-xs text-[var(--primary)] hover:underline">
                        GitHub Repository
                      </a>
                    ) : null}
                    <ul className="mt-3 space-y-2">
                      {g.members.map((m) => (
                        <li key={m.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/80 p-3 text-sm text-[var(--text-body)]">
                          <div className="flex items-start gap-3">
                            <Avatar name={m.name} />
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-strong)]">{m.name}</p>
                              <p className="text-xs text-[var(--text-muted)]">{m.email}</p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                Branch: {m.branch ?? "-"} · Division: {m.division ?? "-"} · Roll No: {m.rollNo ?? "-"}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Admin page: all groups + assign guide ────────────────────────────────────

function AdminGroupPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllGroups()
      .then((gr) => {
        setGroups(gr.data.data);
      })
      .catch((err: unknown) => setError(errMsg(err)))
      .finally(() => setIsLoading(false));
  }, []);

  const ediGroups = groups.filter((group) => group.isEdiRegistered);
  const courseProjectGroups = groups.filter((group) => (group.courseProjectRegistrations?.length ?? 0) > 0);
  const ediAssignedCount = ediGroups.filter((group) => Boolean(group.ediGuide)).length;
  const ediPendingAssignmentCount = ediGroups.length - ediAssignedCount;
  const totalMembers = groups.reduce((sum, group) => sum + group.members.length, 0);
  const averageGroupSize = groups.length === 0 ? 0 : totalMembers / groups.length;
  const cpRegistrationCount = groups.reduce((sum, group) => sum + (group.courseProjectRegistrations?.length ?? 0), 0);
  const cpLabPendingCount = groups.reduce(
    (sum, group) => sum + (group.courseProjectRegistrations ?? []).filter((registration) => !registration.labFaculty).length,
    0
  );

  const divisionCounts = Object.entries(
    groups.reduce((acc, group) => {
      const division = group.owner.division?.trim() || "Unassigned";
      acc[division] = (acc[division] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);

  if (isLoading) return <p className="text-sm text-[var(--text-muted)]">Loading all groups...</p>;
  if (error) return <p className="text-sm text-[var(--danger)]">{error}</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Admin Panel</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text-strong)]">Group Directory</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Open dedicated EDI and Course Project group pages from the tiles below.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-card">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Total Groups</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text-strong)]">{groups.length}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Across EDI and Course Project</p>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-card">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">EDI Pending Guide</p>
          <p className="mt-2 text-2xl font-bold text-[var(--warn)]">{ediPendingAssignmentCount}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{ediAssignedCount}/{ediGroups.length} assigned</p>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-card">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">CP Lab Faculty Pending</p>
          <p className="mt-2 text-2xl font-bold text-[var(--warn)]">{cpLabPendingCount}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Across {cpRegistrationCount} registrations</p>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-card">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Avg Team Size</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text-strong)]">{averageGroupSize.toFixed(1)}/4</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Based on active groups</p>
        </article>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate("/admin/edi-groups")}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 text-left shadow-card transition hover:border-[var(--primary)]/40"
        >
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Open</p>
          <p className="mt-1 text-lg font-semibold text-[var(--text-strong)]">EDI Groups</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{ediGroups.length} groups available</p>
          <p className="mt-3 text-xs font-medium text-[var(--primary)]">View division-wise EDI groups</p>
        </button>

        <button
          type="button"
          onClick={() => navigate("/admin/course-project-groups")}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 text-left shadow-card transition hover:border-[var(--primary)]/40"
        >
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Open</p>
          <p className="mt-1 text-lg font-semibold text-[var(--text-strong)]">CP Groups</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {courseProjectGroups.length} groups available
          </p>
          <p className="mt-3 text-xs font-medium text-[var(--primary)]">View subject-wise CP groups</p>
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <h3 className="text-base font-semibold text-[var(--text-strong)]">Needs Attention</h3>
          <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            <p>EDI groups without guide: <span className="font-semibold text-[var(--text-strong)]">{ediPendingAssignmentCount}</span></p>
            <p>CP registrations without lab faculty: <span className="font-semibold text-[var(--text-strong)]">{cpLabPendingCount}</span></p>
            <p>Groups below 4 members: <span className="font-semibold text-[var(--text-strong)]">{groups.filter((group) => group.members.length < 4).length}</span></p>
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <h3 className="text-base font-semibold text-[var(--text-strong)]">Top Active Divisions</h3>
          {divisionCounts.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">No division data available yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {divisionCounts.map(([division, count]) => (
                <div key={division} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/60 px-3 py-2 text-sm">
                  <span className="text-[var(--text-body)]">Division {division}</span>
                  <span className="font-semibold text-[var(--text-strong)]">{count} groups</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {groups.length === 0 && (
        <div className="lit-card rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center shadow-card">
          <p className="text-[var(--text-muted)]">No groups available yet.</p>
        </div>
      )}

    </div>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const GroupPage = () => {
  const { user } = useAuth();
  if (user?.role === "guide") return <GuideGroupPage />;
  if (user?.role === "admin") return <AdminGroupPage />;
  return <StudentGroupPage />;
};

export default GroupPage;

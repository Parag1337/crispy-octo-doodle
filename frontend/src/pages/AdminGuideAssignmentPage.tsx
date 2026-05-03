import { useEffect, useState } from "react";
import axios from "axios";
import { Link, Navigate } from "react-router-dom";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
import {
  assignGuide,
  assignGuideRandom,
  fetchAllGroups,
  fetchAllGuides,
  fetchEdiGuideLimit,
  updateEdiGuideLimit
} from "../services/group.api";
import type { GuideUser, ProjectGroup } from "../types/group.types";

function errMsg(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string } | undefined)?.message ?? "Something went wrong.";
  }
  return "Something went wrong.";
}

const AdminGuideAssignmentPage = () => {
  const { user } = useAuth();

  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [guides, setGuides] = useState<GuideUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [globalLimitDraft, setGlobalLimitDraft] = useState("8");
  const [savingGlobalLimit, setSavingGlobalLimit] = useState(false);
  const [assigningGroupId, setAssigningGroupId] = useState("");
  const [reassignGroup, setReassignGroup] = useState<ProjectGroup | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const isEdiMajorProjectGroup = (group: ProjectGroup) => group.isEdiRegistered && group.subject === "Engineering Design Innovation";

  const loadAll = async () => {
    const [groupResponse, limitResponse] = await Promise.all([
      fetchAllGroups(),
      fetchEdiGuideLimit()
    ]);
    setGroups(groupResponse.data.data);
    setGlobalLimitDraft(String(limitResponse.data.data.limit));
  };

  const loadGuides = async () => {
    const guideResponse = await fetchAllGuides();
    setGuides(guideResponse.data.data);
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        await Promise.all([loadAll(), loadGuides()]);
      } catch (err) {
        setError(errMsg(err));
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const ediGroups = groups
    .filter(isEdiMajorProjectGroup)
    .sort((left, right) => {
      const leftDivision = left.owner?.division ?? "";
      const rightDivision = right.owner?.division ?? "";
      return leftDivision.localeCompare(rightDivision) || left.name.localeCompare(right.name);
    });

  const assignedCount = ediGroups.filter((group) => Boolean(group.ediGuide)).length;
  const unassignedCount = ediGroups.length - assignedCount;

  const handleSaveGlobalLimit = async () => {
    const raw = globalLimitDraft;
    const nextLimit = Number(raw);

    if (!Number.isInteger(nextLimit) || nextLimit < 0) {
      setError("Guide limit must be a non-negative integer.");
      return;
    }

    setError("");
    setMessage("");
    setSavingGlobalLimit(true);

    try {
      await updateEdiGuideLimit(nextLimit);
      setMessage("Global guide capacity updated.");
      await loadAll();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSavingGlobalLimit(false);
    }
  };

  const handleRandomAssign = async (groupId: string) => {
    setError("");
    setMessage("");
    setAssigningGroupId(groupId);

    try {
      const response = await assignGuideRandom(groupId);
      setGroups((current) => current.map((group) => (group.id === groupId ? response.data.data : group)));
      setMessage(response.data.message || "Random guide assigned successfully.");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setAssigningGroupId("");
    }
  };

  const handleReassignGuide = async (groupId: string) => {
    if (!selectedGuideId) {
      setError("Select a guide before saving.");
      return;
    }

    setError("");
    setMessage("");
    setAssigningGroupId(groupId);

    try {
      const response = await assignGuide(groupId, selectedGuideId);
      setGroups((current) => current.map((group) => (group.id === groupId ? response.data.data : group)));
      setMessage(response.data.message || "Guide reassigned successfully.");
      setReassignGroup(null);
      setSelectedGuideId("");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setAssigningGroupId("");
    }
  };

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading guide assignment workspace...</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Admin Panel</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-strong)]">EDI Guide Assignment</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Assign guides to EDI-registered groups and manage one global assignment capacity limit.
        </p>
        <div className="mt-4">
          <Link to="/groups">
            <Button variant="secondary">Open Group Directory</Button>
          </Link>
          <Link to="/admin/guides" className="ml-2 inline-block">
            <Button variant="secondary">Open Guide Directory</Button>
          </Link>
        </div>
      </header>

      {message ? <p className="rounded-lg border border-[var(--ok)]/35 bg-[var(--ok)]/10 px-4 py-3 text-sm text-[var(--ok)]">{message}</p> : null}
      {error ? <p className="rounded-lg border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[var(--text-strong)]">Global Guide Capacity</h3>
          <p className="text-xs text-[var(--text-muted)]">One limit applies to all guides. Guide names are managed in Guide Directory.</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/60 p-3">
          <label htmlFor="global-limit" className="text-sm font-medium text-[var(--text-body)]">Max EDI groups per guide</label>
          <input
            id="global-limit"
            type="number"
            min={0}
            value={globalLimitDraft}
            onChange={(event) => setGlobalLimitDraft(event.target.value)}
            className="w-24 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--text-body)] outline-none ring-[var(--focus)] transition focus:border-[var(--focus)] focus:ring"
          />
          <Button type="button" onClick={() => void handleSaveGlobalLimit()} disabled={savingGlobalLimit}>
            {savingGlobalLimit ? "Saving..." : "Save"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--text-strong)]">EDI Groups Guide Assignment</h3>
          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-3 py-1 text-xs text-[var(--text-muted)]">
            {ediGroups.length} groups
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-card">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Total EDI Groups</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-strong)]">{ediGroups.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-card">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Assigned</p>
            <p className="mt-1 text-xl font-semibold text-[var(--ok)]">{assignedCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-card">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Pending Assignment</p>
            <p className="mt-1 text-xl font-semibold text-[var(--warn)]">{unassignedCount}</p>
          </div>
        </div>

        {ediGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-5 text-sm text-[var(--text-muted)]">
            No EDI groups available for assignment yet.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {ediGroups.map((group) => (
              <article key={group.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h4 className="font-semibold text-[var(--text-strong)]">{group.name}</h4>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Owner: {group.owner?.name || "Unknown"} · {group.members?.length ?? 0}/4 members
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Division: {group.owner?.division ?? "-"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {group.ediGuide ? `Guide: ${group.ediGuide.name}` : "Guide Not Assigned"}
                    </p>
                  </div>

                  {group.ediGuide ? (
                    <Button
                      type="button"
                      onClick={() => {
                        setReassignGroup(group);
                        setSelectedGuideId(group.ediGuide?.id ?? guides[0]?.id ?? "");
                        setError("");
                      }}
                    >
                      Reassign Guide
                    </Button>
                  ) : (
                    <button
                      onClick={() => void handleRandomAssign(group.id)}
                      disabled={assigningGroupId === group.id}
                      className="shrink-0 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20 transition"
                    >
                      {assigningGroupId === group.id ? "Assigning..." : "Assign Random Guide"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(reassignGroup)}
        title={reassignGroup ? `Reassign Guide - ${reassignGroup.name}` : "Reassign Guide"}
        onClose={() => {
          setReassignGroup(null);
          setSelectedGuideId("");
        }}
      >
        {reassignGroup ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/60 p-4">
              <p className="text-sm font-semibold text-[var(--text-strong)]">{reassignGroup.name}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Owner: {reassignGroup.owner?.name || "Unknown"}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Current guide: {reassignGroup.ediGuide?.name ?? "Not assigned"}</p>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Select guide
              </span>
              <select
                value={selectedGuideId}
                onChange={(event) => setSelectedGuideId(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-0)] px-3 py-3 text-sm text-[var(--text-body)] outline-none transition focus:border-[var(--primary)]/45 focus:ring-4 focus:ring-[color:var(--primary)]/10"
              >
                <option value="">Select guide</option>
                {guides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setReassignGroup(null);
                  setSelectedGuideId("");
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleReassignGuide(reassignGroup.id)} disabled={assigningGroupId === reassignGroup.id}>
                {assigningGroupId === reassignGroup.id ? "Saving..." : "Save Reassignment"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

    </div>
  );
};

export default AdminGuideAssignmentPage;

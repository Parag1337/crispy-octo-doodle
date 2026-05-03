import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, Navigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { assignGuide, assignGuideRandom, fetchAllGroups, fetchAllGuides } from "../services/group.api";
import type { GuideUser, ProjectGroup } from "../types/group.types";

function errMsg(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string } | undefined)?.message ?? "Something went wrong.";
  }
  return "Something went wrong.";
}

const AdminGuideDetailsPage = () => {
  const { user } = useAuth();
  const { guideId = "" } = useParams();

  const [guides, setGuides] = useState<GuideUser[]>([]);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingGroupId, setSavingGroupId] = useState("");
  const [selectedGuideByGroup, setSelectedGuideByGroup] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [guideResponse, groupResponse] = await Promise.all([fetchAllGuides(), fetchAllGroups()]);
        setGuides(guideResponse.data.data);
        setGroups(groupResponse.data.data);
        setSelectedGuideByGroup(
          Object.fromEntries(
            groupResponse.data.data
              .filter((group) => Boolean(group.ediGuide?.id))
              .map((group) => [group.id, group.ediGuide?.id ?? ""])
          )
        );
      } catch (err) {
        setError(errMsg(err));
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === guideId) ?? null,
    [guides, guideId]
  );

  const ediGroups = useMemo(
    () => groups.filter((group) => group.ediGuide?.id === guideId),
    [groups, guideId]
  );

  const cpGroups = useMemo(
    () =>
      groups.filter((group) =>
        (group.courseProjectRegistrations ?? []).some((registration) => registration.labFaculty?.id === guideId)
      ),
    [groups, guideId]
  );

  const handleAssignEdiGuide = async (groupId: string) => {
    const guideToAssign = selectedGuideByGroup[groupId];
    if (!guideToAssign) {
      setError("Select a guide before saving.");
      return;
    }

    setError("");
    setSavingGroupId(groupId);

    try {
      const response = await assignGuide(groupId, guideToAssign);
      setGroups((current) => current.map((group) => (group.id === groupId ? response.data.data : group)));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSavingGroupId("");
    }
  };

  const handleRandomAssign = async (groupId: string) => {
    setError("");
    setSavingGroupId(groupId);

    try {
      const response = await assignGuideRandom(groupId);
      setGroups((current) => current.map((group) => (group.id === groupId ? response.data.data : group)));
      setSelectedGuideByGroup((current) => ({
        ...current,
        [groupId]: response.data.data.ediGuide?.id ?? ""
      }));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSavingGroupId("");
    }
  };

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading guide details...</p>;
  }

  if (!selectedGuide) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--danger)]">Guide not found.</p>
        <Link to="/admin/guides">
          <Button variant="secondary">Back to Guide Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Admin Panel</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-strong)]">{selectedGuide.name}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Assigned EDI and Course Project groups are shown below.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/admin/guides">
            <Button variant="secondary">Back to Guide Directory</Button>
          </Link>
          <Link to="/admin/edi-guide-assignment">
            <Button variant="secondary">Open EDI Assignment</Button>
          </Link>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Guide</p>
          <p className="mt-2 text-xl font-semibold text-[var(--text-strong)]">{selectedGuide.name}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{selectedGuide.email}</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">EDI Groups</p>
          <p className="mt-2 text-3xl font-bold text-[var(--text-strong)]">{ediGroups.length}</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Course Project Groups</p>
          <p className="mt-2 text-3xl font-bold text-[var(--text-strong)]">{cpGroups.length}</p>
        </article>
      </section>

      {error ? <p className="rounded-lg border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <h3 className="text-lg font-semibold text-[var(--text-strong)]">EDI Groups</h3>
        {ediGroups.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">No EDI groups assigned.</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {ediGroups.map((group) => (
              <article key={`edi-${group.id}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-strong)]">{group.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Owner: {group.owner?.name || "Unknown"}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Members: {group.members?.length ?? 0}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Current guide: {group.ediGuide?.name ?? "Not assigned"}
                    </p>
                  </div>

                  {group.ediGuide ? (
                    <div className="flex w-full flex-col gap-2 sm:max-w-xs">
                      <label className="block">
                        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                          Reassign guide
                        </span>
                        <select
                          value={selectedGuideByGroup[group.id] ?? group.ediGuide?.id ?? ""}
                          onChange={(event) =>
                            setSelectedGuideByGroup((current) => ({
                              ...current,
                              [group.id]: event.target.value
                            }))
                          }
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-0)] px-3 py-3 text-sm text-[var(--text-body)] outline-none transition focus:border-[var(--primary)]/45 focus:ring-4 focus:ring-[color:var(--primary)]/10"
                        >
                          {guides.map((guide) => (
                            <option key={guide.id} value={guide.id}>
                              {guide.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button type="button" onClick={() => void handleAssignEdiGuide(group.id)} disabled={savingGroupId === group.id}>
                        {savingGroupId === group.id ? "Saving..." : "Save Reassignment"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col gap-2 sm:max-w-xs">
                      <p className="text-xs text-[var(--text-muted)]">No EDI guide assigned yet.</p>
                      <Button type="button" onClick={() => void handleRandomAssign(group.id)} disabled={savingGroupId === group.id}>
                        {savingGroupId === group.id ? "Assigning..." : "Assign Random Guide"}
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <h3 className="text-lg font-semibold text-[var(--text-strong)]">Course Project Groups</h3>
        {cpGroups.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">No Course Project groups assigned.</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {cpGroups.map((group) => (
              <article key={`cp-${group.id}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/60 p-4">
                <p className="text-sm font-semibold text-[var(--text-strong)]">{group.name}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Owner: {group.owner.name}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Subjects: {(group.courseProjectRegistrations ?? [])
                    .filter((registration) => registration.labFaculty?.id === guideId)
                    .map((registration) => registration.subjectName)
                    .join(", ") || "None"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminGuideDetailsPage;

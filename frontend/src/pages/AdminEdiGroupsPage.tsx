import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllGroups } from "../services/group.api";
import type { ProjectGroup } from "../types/group.types";

function AdminEdiGroupsPage() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllGroups()
      .then((response) => setGroups(response.data.data))
      .catch(() => setError("Failed to load EDI groups."))
      .finally(() => setIsLoading(false));
  }, []);

  const compareText = (left?: string, right?: string) => (left ?? "").localeCompare(right ?? "");

  const ediGroups = groups.filter((group) => group.isEdiRegistered);

  const groupedByDivision = ediGroups.reduce((acc, group) => {
    const division = group.owner?.division?.trim() || "Unassigned Division";
    const branch = group.owner?.branch?.trim() || "Unknown Branch";
    const key = `${branch}::${division}`;

    if (!acc[key]) {
      acc[key] = {
        key,
        branch,
        division,
        entries: [] as ProjectGroup[]
      };
    }

    acc[key].entries.push(group);
    return acc;
  }, {} as Record<string, { key: string; branch: string; division: string; entries: ProjectGroup[] }>);

  const divisionSections = Object.values(groupedByDivision)
    .sort((left, right) => compareText(left.branch, right.branch) || compareText(left.division, right.division))
    .map((section) => ({
      ...section,
      entries: [...section.entries].sort((left, right) => compareText(left.name, right.name))
    }));

  if (isLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading EDI groups...</p>;
  }

  if (error) {
    return <p className="text-sm text-[var(--danger)]">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Admin Panel</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text-strong)]">EDI Groups</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Groups are segregated division-wise for quick EDI review.</p>
        </div>
        <Link
          to="/groups"
          className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-body)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
        >
          Back to Groups
        </Link>
      </div>

      {ediGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-5 text-sm text-[var(--text-muted)]">
          No groups registered for EDI yet.
        </div>
      ) : (
        <div className="space-y-4">
          {divisionSections.map((divisionSection) => (
            <section key={divisionSection.key} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-[var(--text-strong)]">
                  {divisionSection.branch} - Division {divisionSection.division}
                </h3>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-3 py-1 text-xs text-[var(--text-muted)]">
                  {divisionSection.entries.length} groups
                </span>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {divisionSection.entries.map((group) => (
                  <article key={`${divisionSection.key}-${group.id}`} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/60 p-4">
                    <h4 className="font-semibold text-[var(--text-strong)]">{group.name}</h4>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Owner: {group.owner?.name || "Unknown"}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Members: {group.members?.length ?? 0}/4</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Guide: {group.ediGuide?.name ?? "Not assigned"}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminEdiGroupsPage;

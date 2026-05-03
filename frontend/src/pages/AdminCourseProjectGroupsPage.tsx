import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllGroups } from "../services/group.api";
import type { ProjectGroup } from "../types/group.types";

function AdminCourseProjectGroupsPage() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllGroups()
      .then((response) => setGroups(response.data.data))
      .catch(() => setError("Failed to load course project groups."))
      .finally(() => setIsLoading(false));
  }, []);

  const compareText = (left?: string, right?: string) => (left ?? "").localeCompare(right ?? "");

  const courseProjectGroups = groups.filter((group) => (group.courseProjectRegistrations?.length ?? 0) > 0);

  const groupedBySubject = courseProjectGroups.reduce((acc, group) => {
    (group.courseProjectRegistrations ?? []).forEach((registration) => {
      const subjectName = registration.subjectName?.trim() || "Untitled Subject";
      const subjectId = registration.subjectId || subjectName;
      const key = `${subjectId}::${subjectName.toLowerCase()}`;

      if (!acc[key]) {
        acc[key] = {
          subjectId,
          subjectName,
          entries: [] as Array<{ group: ProjectGroup; labFacultyName: string | null }>
        };
      }

      acc[key].entries.push({
        group,
        labFacultyName: registration.labFaculty?.name ?? null
      });
    });

    return acc;
  }, {} as Record<string, { subjectId: string; subjectName: string; entries: Array<{ group: ProjectGroup; labFacultyName: string | null }> }>);

  const subjectSections = Object.values(groupedBySubject)
    .sort((left, right) => compareText(left.subjectName, right.subjectName))
    .map((section) => ({
      ...section,
      entries: [...section.entries].sort((left, right) => compareText(left.group.name, right.group.name))
    }));

  if (isLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading course project groups...</p>;
  }

  if (error) {
    return <p className="text-sm text-[var(--danger)]">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">Admin Panel</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text-strong)]">Course Project Groups</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Groups are segregated subject-wise for quick review and assignment checks.</p>
        </div>
        <Link
          to="/groups"
          className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-body)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
        >
          Back to Groups
        </Link>
      </div>

      {courseProjectGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-5 text-sm text-[var(--text-muted)]">
          No groups registered for Course Project subjects yet.
        </div>
      ) : (
        <div className="space-y-4">
          {subjectSections.map((subjectSection) => (
            <section key={subjectSection.subjectId} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-[var(--text-strong)]">{subjectSection.subjectName}</h3>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-3 py-1 text-xs text-[var(--text-muted)]">
                  {subjectSection.entries.length} groups
                </span>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {subjectSection.entries.map((entry) => (
                  <article key={`${subjectSection.subjectId}-${entry.group.id}`} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/60 p-4">
                    <h4 className="font-semibold text-[var(--text-strong)]">{entry.group.name}</h4>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Owner: {entry.group.owner?.name || "Unknown"}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Members: {entry.group.members?.length ?? 0}/4</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Lab faculty: {entry.labFacultyName ?? "Not selected"}</p>
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

export default AdminCourseProjectGroupsPage;

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { fetchMyGroup, registerEdiGroup } from "../services/group.api";
import type { ProjectGroup } from "../types/group.types";
import { selectEdiMajorProjectGroup } from "../utils/groupSelection";

function getErrorMessage(err: unknown, fallback = "Something went wrong.") {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string } | undefined)?.message ?? fallback;
  }
  return fallback;
}

const EdiMajorProjectPage = () => {
  const [group, setGroup] = useState<ProjectGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const loadGroup = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetchMyGroup();
        const groups = response.data.data;
        setGroup(selectEdiMajorProjectGroup(groups));
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load your group."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadGroup();
  }, []);

  const guideStatusLabel = useMemo(() => {
    if (!group?.isEdiRegistered) return "Not Registered for EDI";
    return group.ediGuide ? "Guide Assigned" : "Guide Not Assigned";
  }, [group]);

  const isRegistered = Boolean(group?.isEdiRegistered);
  const hasAssignedGuide = Boolean(group?.ediGuide);

  const registerGroupForEdi = async () => {
    if (!group) return;

    setRegisterError("");
    setIsRegistering(true);

    try {
      const response = await registerEdiGroup(group.id);
      setGroup(response.data.data);
      setShowConfirm(false);
    } catch (err) {
      setRegisterError(getErrorMessage(err, "Unable to register group for EDI."));
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading EDI workspace...</p>;
  }

  if (error) {
    return <p className="text-sm text-[var(--danger)]">{error}</p>;
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <section className="lit-card rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--primary)] font-medium">Major Project</p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--text-strong)]">EDI</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Create or join a group first. Then you can register it for EDI and request guide assignment.</p>
          <div className="mt-5">
            <Link to="/groups"><Button>Open Groups</Button></Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="reveal-up delay-1 lit-card rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--primary)] font-medium">Major Project</p>
        <h2 className="mt-2 text-3xl font-bold text-[var(--text-strong)]">EDI</h2>
        <p className="mt-3 max-w-3xl text-sm text-[var(--text-muted)] md:text-base">
          Complete EDI registration first, then wait for guide assignment. Task work starts after the guide is assigned.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Group Block</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-strong)]">{group.name}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
              <p className="text-xs text-[var(--text-muted)]">Step 1</p>
              <p className="mt-1 text-sm font-medium text-[var(--text-strong)]">EDI Registration</p>
              <p className={`mt-1 text-sm ${isRegistered ? "text-[var(--ok)]" : "text-[var(--warn)]"}`}>
                {isRegistered ? "Registered" : "Pending"}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
              <p className="text-xs text-[var(--text-muted)]">Step 2</p>
              <p className="mt-1 text-sm font-medium text-[var(--text-strong)]">Guide Assignment</p>
              <p className={`mt-1 text-sm ${hasAssignedGuide ? "text-[var(--ok)]" : "text-[var(--text-muted)]"}`}>
                {guideStatusLabel}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Guide Block</p>
          <h3 className="mt-2 text-base font-semibold text-[var(--text-strong)]">Assigned Guide</h3>
          {hasAssignedGuide ? (
            <div className="mt-3 rounded-lg border border-[var(--ok)]/35 bg-[var(--ok)]/10 p-3">
              <p className="text-sm font-semibold text-[var(--text-strong)]">{group.ediGuide?.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{group.ediGuide?.email}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">No guide assigned yet. Admin can assign after EDI registration.</p>
          )}
        </article>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Actions Block</p>
        {registerError && <p className="mt-3 text-sm text-[var(--danger)]">{registerError}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          {!isRegistered ? (
            <Button onClick={() => setShowConfirm(true)}>Register Your Group</Button>
          ) : (
            <span className="rounded-lg border border-[var(--ok)]/35 bg-[var(--ok)]/10 px-3 py-2 text-sm font-medium text-[var(--ok)]">
              Group is registered for EDI
            </span>
          )}
          <Link to="/groups"><Button variant="secondary">Open Groups</Button></Link>
          {hasAssignedGuide ? <Link to="/tasks"><Button variant="secondary">View Tasks</Button></Link> : null}
        </div>
        {!hasAssignedGuide ? (
          <p className="mt-3 text-xs text-[var(--text-muted)]">Tasks will appear only after a guide is assigned.</p>
        ) : null}
      </section>

      <Modal open={showConfirm} title="Confirm EDI Registration" onClose={() => setShowConfirm(false)}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-body)]">
            Register group <span className="font-semibold text-[var(--text-strong)]">{group.name}</span> for EDI now?
            After registration, admin can assign a guide for this group.
          </p>
          {registerError && <p className="text-sm text-[var(--danger)]">{registerError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowConfirm(false)} disabled={isRegistering}>Cancel</Button>
            <Button type="button" onClick={() => void registerGroupForEdi()} disabled={isRegistering}>
              {isRegistering ? "Registering..." : "Confirm Register"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EdiMajorProjectPage;

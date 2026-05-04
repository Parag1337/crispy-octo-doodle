import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { AlertCircle, BookOpen, Check, Search } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import { assignCourseProjectLabFaculty, fetchGuidesBySubject, fetchMyGroup, registerCourseProjectSubject } from "../services/group.api";
import { fetchAllSubjects, type Subject } from "../services/subject.api";
import type { GuideUser, ProjectGroup } from "../types/group.types";
import { selectEdiMajorProjectGroup } from "../utils/groupSelection";

function getErrorMessage(err: unknown, fallback = "Something went wrong.") {
	if (axios.isAxiosError(err)) {
		return (err.response?.data as { message?: string } | undefined)?.message ?? fallback;
	}

	return fallback;
}

const CourseProjectPage = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
	const [group, setGroup] = useState<ProjectGroup | null>(null);
	const [guides, setGuides] = useState<GuideUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isGuidesLoading, setIsGuidesLoading] = useState(false);
	const [actionMessage, setActionMessage] = useState("");
	const [actionError, setActionError] = useState("");
	const [busySubjectId, setBusySubjectId] = useState<string | null>(null);
	const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
	const [facultySearch, setFacultySearch] = useState("");
	const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
	const [pendingFaculty, setPendingFaculty] = useState<GuideUser | null>(null);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	useEffect(() => {
		const loadData = async () => {
			setIsLoading(true);
			try {
				const [subjectsResponse, groupResponse] = await Promise.all([fetchAllSubjects(), fetchMyGroup()]);
				const nonEdiSubjects = subjectsResponse.data.data.filter(
					(subject) => !/\bedi\b/i.test(subject.name)
				);
				setSubjects(nonEdiSubjects);
				
				const groups = groupResponse.data.data;
				// First, try to find a group that has course project registrations
				let userGroup: typeof groups[0] | null | undefined = groups.find((g) => (g.courseProjectRegistrations?.length ?? 0) > 0);
				// If no group has registrations, fall back to EDI major project group
				if (!userGroup) {
					userGroup = selectEdiMajorProjectGroup(groups);
				}
				setGroup(userGroup ?? null);
			} catch (err) {
				console.error("Failed to fetch subjects", err);
			} finally {
				setIsLoading(false);
			}
		};
		loadData();
	}, []);

	const getRegistration = (subjectId: string) => group?.courseProjectRegistrations?.find((registration) => registration.subjectId === subjectId) ?? null;

	const activeSubject = useMemo(
		() => subjects.find((subject) => subject.id === activeSubjectId) ?? null,
		[activeSubjectId, subjects]
	);

	const activeRegistration = useMemo(
		() => (activeSubject ? getRegistration(activeSubject.id) : null),
		[activeSubject, group]
	);

	useEffect(() => {
		const loadGuides = async () => {
			if (!isFacultyModalOpen || !activeSubjectId) {
				setGuides([]);
				return;
			}

			setIsGuidesLoading(true);
			try {
				const guidesResponse = await fetchGuidesBySubject(activeSubjectId);
				setGuides(guidesResponse.data.data);
			} catch (guideErr) {
				console.error("Failed to fetch subject-specific faculty list", guideErr);
				setGuides([]);
			} finally {
				setIsGuidesLoading(false);
			}
		};

		void loadGuides();
	}, [activeSubjectId, isFacultyModalOpen]);

	const filteredGuides = useMemo(() => {
		const query = facultySearch.trim().toLowerCase();
		return [...guides]
			.filter((guide) => {
				if (!query) return true;
				return guide.name.toLowerCase().includes(query) || guide.email.toLowerCase().includes(query);
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [facultySearch, guides]);

	const openFacultyModal = (subjectId: string) => {
		setActiveSubjectId(subjectId);
		setFacultySearch("");
		setIsFacultyModalOpen(true);
	};

	const closeFacultyModal = () => {
		setIsFacultyModalOpen(false);
		setActiveSubjectId(null);
		setFacultySearch("");
		setPendingFaculty(null);
		setIsConfirmOpen(false);
	};

	const handleRegisterSubject = async (subject: Subject) => {
		if (!group) return;

		setActionError("");
		setActionMessage("");
		setBusySubjectId(subject.id);

		try {
			const response = await registerCourseProjectSubject(group.id, { subjectId: subject.id });
			setGroup(response.data.data);
			setActionMessage(`${subject.name} registered. Select your lab faculty next.`);
			setActiveSubjectId(subject.id);
			setIsFacultyModalOpen(true);
		} catch (err) {
			setActionError(getErrorMessage(err, "Unable to register this subject."));
		} finally {
			setBusySubjectId(null);
		}
	};

	const handleFacultyChange = async (subjectId: string, facultyId: string) => {
		if (!group) return;

		setActionError("");
		setActionMessage("");
		setBusySubjectId(subjectId);

		try {
			const response = await assignCourseProjectLabFaculty(group.id, {
				subjectId,
				facultyId: facultyId || null
			});
			setGroup(response.data.data);
			setActionMessage("Lab faculty updated successfully.");
			closeFacultyModal();
		} catch (err) {
			setActionError(getErrorMessage(err, "Unable to update lab faculty."));
		} finally {
			setBusySubjectId(null);
		}
	};

	const promptFacultySelection = (guide: GuideUser) => {
		setPendingFaculty(guide);
		setIsConfirmOpen(true);
	};

	const confirmFacultySelection = async () => {
		if (!activeSubject || !pendingFaculty) return;
		await handleFacultyChange(activeSubject.id, pendingFaculty.id);
		setIsConfirmOpen(false);
	};

  return (
    <div className="space-y-6">
      <section className="reveal-up delay-1 lit-card rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
		<p className="text-xs uppercase tracking-[0.2em] text-[var(--ok)] font-medium">Course Project</p>
        <h2 className="mt-2 text-3xl font-bold text-[var(--text-strong)]">Subjects &amp; Workspaces</h2>
        <p className="mt-3 max-w-3xl text-sm text-[var(--text-muted)] md:text-base">
				Register your group under the correct subject, then pick your respective lab faculty in a searchable modal.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
		  <Link to="/groups"><Button className="bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg-0)]">Manage My Group</Button></Link>
          <Link to="/dashboard"><Button variant="secondary">Back to Dashboard</Button></Link>
        </div>
      </section>

		{actionMessage ? <p className="rounded-xl border border-[var(--ok)]/35 bg-[var(--ok)]/10 px-4 py-3 text-sm text-[var(--ok)]">{actionMessage}</p> : null}
		{actionError ? <p className="rounded-xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">{actionError}</p> : null}
		{!group ? (
			<div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
				Create or join your group first, then come back here to register each subject and pick a lab faculty.
				<div className="mt-4">
					<Link to="/groups"><Button variant="secondary">Open Groups</Button></Link>
				</div>
			</div>
		) : null}

      {isLoading ? (
		<div className="p-8 text-center text-[var(--text-muted)]">Loading subjects...</div>
	  ) : subjects.length === 0 ? (
		<div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
			<AlertCircle size={32} className="mx-auto mb-3 opacity-50" />
			<p>No course subjects have been published by the administration yet.</p>
		</div>
	  ) : (
		<section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{subjects.map((subject, idx) => (
				<article 
					key={subject.id} 
					className="reveal-up rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card hover:bg-[var(--bg-1)] transition-colors group cursor-default"
					style={{ animationDelay: `${(idx + 2) * 50}ms` }}
				>
					<div className="flex items-center gap-3 mb-3">
						<div className="bg-[var(--ok)]/12 p-2 rounded-lg text-[var(--ok)] group-hover:scale-110 transition-transform">
							<BookOpen size={20} />
						</div>
						<h3 className="font-bold text-[var(--text-strong)]">{subject.name}</h3>
					</div>
					<p className="text-sm text-[var(--text-muted)]">
						{subject.description || "Course project guidelines and milestone submissions will be evaluated under this subject."}
					</p>
					{group ? (
						<div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
							<div className="flex items-center justify-between gap-3">
								<div className="text-sm">
									<p className="font-medium text-[var(--text-strong)]">{getRegistration(subject.id) ? "Registered" : "Not registered yet"}</p>
									<p className="text-xs text-[var(--text-muted)]">
										{getRegistration(subject.id)?.labFaculty?.name ? `Lab faculty: ${getRegistration(subject.id)?.labFaculty?.name}` : "Select the lab faculty after registration."}
									</p>
								</div>
								<Button
									onClick={() => openFacultyModal(subject.id)}
									disabled={busySubjectId === subject.id}
									className="shrink-0 bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg-0)]"
								>
									{getRegistration(subject.id) ? "Select / Change Faculty" : "Register Your Group"}
								</Button>
							</div>
							{getRegistration(subject.id)?.labFaculty ? (
								<div className="rounded-lg border border-[var(--ok)]/35 bg-[var(--ok)]/10 px-3 py-2 text-sm text-[var(--ok)]">
									<Check size={16} className="mr-2 inline-block align-[-2px]" />
									Selected: {getRegistration(subject.id)?.labFaculty?.name}
								</div>
							) : null}
						</div>
					) : null}
				</article>
			))}
      	</section>
	  )}

		<Modal open={isFacultyModalOpen && Boolean(activeSubject)} title={activeSubject?.name ?? "Select Lab Faculty"} onClose={closeFacultyModal}>
			{activeSubject ? (
				<div className="space-y-5">
					<p className="text-sm text-[var(--text-muted)]">
						{activeRegistration ? "Change or confirm the lab faculty for this subject." : "Register your group first, then pick the lab faculty from the searchable list."}
					</p>

					{!activeRegistration ? (
						<div className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/60 p-4">
							<div className="flex items-start justify-between gap-4">
								<div>
									<p className="text-sm font-semibold text-[var(--text-strong)]">Register this subject</p>
									<p className="mt-1 text-xs text-[var(--text-muted)]">Once registered, the faculty picker appears in this modal.</p>
								</div>
								<Button onClick={() => void handleRegisterSubject(activeSubject)} disabled={busySubjectId === activeSubject.id}>
									{busySubjectId === activeSubject.id ? "Registering..." : "Register Your Group"}
								</Button>
							</div>
						</div>
					) : null}

					{activeRegistration ? (
						<div className="space-y-4">
							<Input
								id="faculty-search"
								label="Search lab faculty"
								value={facultySearch}
								onChange={(event) => setFacultySearch(event.target.value)}
								placeholder="Search by name or email"
							/>

							<div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
								<Search size={14} />
								<span>{isGuidesLoading ? "Loading faculty..." : `${filteredGuides.length} faculty found`}</span>
							</div>

							<div className="grid gap-2 max-h-[320px] overflow-y-auto pr-1">
								{isGuidesLoading ? (
									<p className="rounded-lg border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--text-muted)]">
										Loading teachers for this subject...
									</p>
								) : filteredGuides.length === 0 ? (
									<p className="rounded-lg border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--text-muted)]">
										No faculty match this subject or your search.
									</p>
								) : (
									filteredGuides.map((guide) => {
										const isSelected = activeRegistration.labFaculty?.id === guide.id;
										return (
											<button
												key={guide.id}
												type="button"
												onClick={() => promptFacultySelection(guide)}
												disabled={busySubjectId === activeSubject.id}
												className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
													isSelected
														? "border-[var(--ok)]/40 bg-[var(--ok)]/10"
														: "border-[var(--border)] bg-[var(--bg-1)]/60 hover:border-[var(--primary)]/50 hover:bg-[var(--bg-1)]"
												}`}
											>
												<div>
													<p className="font-semibold text-[var(--text-strong)]">{guide.name}</p>
													<p className="mt-1 text-xs text-[var(--text-muted)]">{guide.email}</p>
												</div>
												{isSelected ? <Check size={16} className="mt-0.5 text-[var(--ok)]" /> : null}
											</button>
										);
									})
								)}
							</div>
						</div>
					) : null}
				</div>
			) : null}
		</Modal>

		<Modal open={isConfirmOpen && Boolean(pendingFaculty)} title="Confirm Teacher Selection" onClose={() => setIsConfirmOpen(false)}>
			{pendingFaculty ? (
				<div className="space-y-5">
					<p className="text-sm text-[var(--text-muted)]">
						Are you sure to select <span className="font-semibold text-[var(--text-strong)]">{pendingFaculty.name}</span> as your guide?
					</p>
					<div className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/60 px-4 py-3">
						<p className="text-sm font-semibold text-[var(--text-strong)]">{pendingFaculty.name}</p>
						<p className="text-xs text-[var(--text-muted)]">{pendingFaculty.email}</p>
					</div>
					<div className="flex justify-end gap-3">
						<Button variant="secondary" type="button" onClick={() => setIsConfirmOpen(false)} disabled={busySubjectId === activeSubjectId}>
							Cancel
						</Button>
						<Button type="button" onClick={() => void confirmFacultySelection()} disabled={busySubjectId === activeSubjectId}>
							{busySubjectId === activeSubjectId ? "Saving..." : "Confirm"}
						</Button>
					</div>
				</div>
			) : null}
		</Modal>
    </div>
  );
};

export default CourseProjectPage;
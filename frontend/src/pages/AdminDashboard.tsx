import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { BookOpen, Plus, Trash2, Users, Sparkles, ArrowRight, LayoutGrid, FolderOpen } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import { fetchAllSubjects, createSubject, deleteSubject, type Subject } from "../services/subject.api";
import { fetchAllGroups } from "../services/group.api";
import type { ProjectGroup } from "../types/group.types";

const AdminDashboard = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
	const [groups, setGroups] = useState<ProjectGroup[]>([]);
	const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

	const [isAdding, setIsAdding] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			const [subsRes, groupsRes] = await Promise.all([
				fetchAllSubjects(),
				fetchAllGroups()
			]);
			let allSubjects = subsRes.data.data;
			
			// Add EDI as a default subject if not already present
			const ediExists = allSubjects.some((s) => s.id === "edi" || s.name.toLowerCase() === "engineering design innovation");
			if (!ediExists) {
				allSubjects = [
					...allSubjects,
					{ id: "edi", name: "Engineering Design Innovation", description: "EDI major project" }
				];
			}
			
			setSubjects(allSubjects);
			setGroups(groupsRes.data.data);
		} catch (err) {
			console.error("Failed to load dashboard data", err);
		}
	};

	const handleAddSubject = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);
		try {
			await createSubject({ name, description });
			setIsAdding(false);
			setName("");
			setDescription("");
			loadData();
		} catch (err) {
			if (axios.isAxiosError(err)) {
				setError((err.response?.data as any)?.message || "Failed to add subject");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteSubject = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		// Prevent deletion of EDI (default subject)
		if (id === "edi") {
			alert("Engineering Design Innovation (EDI) is a default subject and cannot be deleted.");
			return;
		}
		if (!confirm("Are you sure you want to delete this subject?")) return;
		try {
			await deleteSubject(id);
			if (activeSubjectId === id) setActiveSubjectId(null);
			loadData();
		} catch (err) {
			console.error("Failed to delete", err);
		}
	};

	const togglePreview = (id: string) => {
		setActiveSubjectId(curr => curr === id ? null : id);
	};

	const normalize = (value?: string | null) => (value ?? "").trim().toLowerCase();

	const isGroupMappedToSubject = (group: ProjectGroup, subject: Subject) => {
		const subjectId = normalize(subject.id);
		const subjectName = normalize(subject.name);
		const groupSubject = normalize(group.subject);

		// Check if subject is EDI
		if (subjectId === "edi" || subjectName === "engineering design innovation") {
			return group.isEdiRegistered ?? false;
		}

		if (groupSubject && (groupSubject === subjectId || groupSubject === subjectName)) {
			return true;
		}

    	return (group.courseProjectRegistrations ?? []).some((registration) => {
			const registrationSubjectId = normalize(registration.subjectId);
			const registrationSubjectName = normalize(registration.subjectName);
			return registrationSubjectId === subjectId || registrationSubjectName === subjectName;
		});
	};

	const subjectsWithGroups = subjects.filter((subject) =>
		groups.some((group) => isGroupMappedToSubject(group, subject))
	).length;
	const subjectsWithoutGroups = Math.max(subjects.length - subjectsWithGroups, 0);

	const unassignedGroups = groups.filter((group) => !group.subject?.trim()).length;

	return (
		<div className="space-y-6">
			<header className="reveal-up delay-1 glass-panel rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
				<div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-1)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
							<Sparkles size={14} /> Admin overview
						</p>
						<h2 className="mt-3 text-3xl font-bold text-[var(--text-strong)]">Admin Dashboard</h2>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">Manage subjects here and open dedicated pages for group-level operations. Page responsibilities stay separate and easy to maintain.</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Link
							to="/groups"
							className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] px-4 py-2 text-sm font-semibold text-[var(--text-body)] transition hover:border-[var(--primary)]/35 hover:text-[var(--primary)]"
						>
							Open Groups Page <ArrowRight size={16} />
						</Link>
						<Button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2">
							<Plus size={16} /> {isAdding ? "Cancel" : "Add Subject"}
						</Button>
					</div>
				</div>
			</header>

			<section className="reveal-up delay-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
					<div className="flex items-center justify-between">
						<p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Total Subjects</p>
						<LayoutGrid size={16} className="text-[var(--primary)]" />
					</div>
					<p className="mt-3 text-3xl font-bold text-[var(--text-strong)]">{subjects.length}</p>
				</div>

				<div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
					<div className="flex items-center justify-between">
						<p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Total Groups</p>
						<Users size={16} className="text-[var(--primary)]" />
					</div>
					<p className="mt-3 text-3xl font-bold text-[var(--text-strong)]">{groups.length}</p>
				</div>

				<div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
					<div className="flex items-center justify-between">
						<p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Subjects Without Groups</p>
						<BookOpen size={16} className="text-[var(--warn)]" />
					</div>
					<p className="mt-3 text-3xl font-bold text-[var(--text-strong)]">{subjectsWithoutGroups}</p>
				</div>

				<div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card">
					<div className="flex items-center justify-between">
						<p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Unassigned Groups</p>
						<FolderOpen size={16} className="text-[var(--warn)]" />
					</div>
					<p className="mt-3 text-3xl font-bold text-[var(--text-strong)]">{unassignedGroups}</p>
				</div>
			</section>

			{isAdding && (
				<form onSubmit={handleAddSubject} className="reveal-up delay-3 rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card max-w-xl">
					<h3 className="text-lg font-bold text-[var(--text-strong)] mb-4">New Subject</h3>
					<div className="space-y-4">
						<Input 
							id="name" 
							label="Subject Name" 
							value={name} 
							onChange={(e) => setName(e.target.value)} 
							placeholder="e.g. Software Engineering"
							required 
						/>
						<div>
							<label htmlFor="desc" className="mb-2 block text-sm font-medium text-[var(--text-body)]">Description</label>
							<textarea 
								id="desc"
								className="min-h-[100px] w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-4 py-3 text-sm text-[var(--text-body)] shadow-sm outline-none transition placeholder:text-[var(--text-muted)] hover:border-[color:var(--primary-light)]/50 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary)]/12"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Optional description..."
							/>
						</div>
						{error && <p className="rounded-2xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">{error}</p>}
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Saving..." : "Save Subject"}
						</Button>
					</div>
				</form>
			)}

			<div className="grid gap-4 reveal-up delay-4">
				{subjects.length === 0 && !isAdding && (
					<div className="text-center py-12 rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-muted)] shadow-card">
						<BookOpen size={32} className="mx-auto mb-3 opacity-50" />
						<p>No subjects have been configured yet.</p>
					</div>
				)}

				{subjects.map(subject => {
					const subjectGroups = groups.filter((group) => isGroupMappedToSubject(group, subject));
					const isExpanded = activeSubjectId === subject.id;

					return (
						<div key={subject.id} className="rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] shadow-card overflow-hidden transition-all duration-300">
							<div 
								onClick={() => togglePreview(subject.id)}
								className="p-5 flex justify-between items-center cursor-pointer hover:bg-[var(--bg-1)]/70 transition-colors"
							>
								<div className="flex items-center gap-4">
									<div className="bg-[var(--primary)]/10 p-3 rounded-2xl text-[var(--primary)]">
										<BookOpen size={20} />
									</div>
									<div>
										<div className="flex items-center gap-2">
											<h3 className="text-lg font-bold text-[var(--text-strong)]">{subject.name}</h3>
											{subject.id === "edi" && (
												<span className="inline-flex items-center rounded-full bg-[var(--primary)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
													Default
												</span>
											)}
										</div>
										{subject.description && <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-1">{subject.description}</p>}
									</div>
								</div>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
										<Users size={16} />
										<span className="font-medium">{subjectGroups.length} Groups</span>
									</div>
									<button 
										onClick={(e) => handleDeleteSubject(subject.id, e)} 
										disabled={subject.id === "edi"}
										className="rounded-2xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:opacity-40 disabled:cursor-not-allowed"
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>

							{isExpanded && (
								<div className="border-t border-[var(--border)] p-5 bg-[var(--bg-0)]/50">
									<h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Registered Groups Snapshot</h4>
									{subjectGroups.length === 0 ? (
										<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-4">
											<p className="text-sm italic text-[var(--text-muted)]">No groups currently mapped to this subject.</p>
											<Link to="/groups" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-light)]">
												Manage groups in Groups page <ArrowRight size={14} />
											</Link>
										</div>
									) : (
										<div className="grid gap-3 md:grid-cols-2">
											{subjectGroups.map(group => (
												<div key={group.id} className="flex items-start justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-4">
													<div>
														<p className="font-bold text-[var(--text-strong)]">{group.name}</p>
														<p className="mt-1 text-xs text-[var(--text-muted)]">Owner: {group.owner?.name}</p>
													</div>
													<span className="rounded-full bg-[var(--ok)]/12 px-2 py-1 text-xs font-semibold text-[var(--ok)]">
														{group.members?.length || 0} Members
													</span>
												</div>
											))}
											<div className="md:col-span-2 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-1)]/50 p-4 text-sm text-[var(--text-muted)]">
												For full member, invite, and guide assignment actions, continue in the
												<Link to="/groups" className="ml-1 font-semibold text-[var(--primary)] hover:text-[var(--primary-light)]">Groups page</Link>.
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default AdminDashboard;

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Check,
  Download,
  ExternalLink,
  FileText,
  FolderPlus,
  Layers3,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
import {
  addGroupProject,
  deleteProjectDocument,
  fetchMyGroup,
  updateGroupProject,
  uploadProjectDocuments,
} from "../services/group.api";
import { fetchAllSubjects, type Subject } from "../services/subject.api";
import type { GroupProject, ProjectGroup } from "../types/group.types";
import { selectEdiMajorProjectGroup } from "../utils/groupSelection";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace("/api", "") ??
  "http://localhost:5501";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileEmoji(mimeType: string): string {
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📋";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "🗜️";
  return "📎";
}

// ─── Documents panel ──────────────────────────────────────────────────────────

function ProjectDocumentsPanel({
  project,
  groupId,
  onGroupUpdate,
}: {
  project: GroupProject;
  groupId: string;
  onGroupUpdate: (g: ProjectGroup) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const docs: ProjectDocument[] = project.documents ?? [];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setUploadError("");
    setUploadSuccess("");
    setIsUploading(true);

    try {
      const response = await uploadProjectDocuments(groupId, project.id, files);
      onGroupUpdate(response.data.data);
      setUploadSuccess(`${files.length} file${files.length !== 1 ? "s" : ""} uploaded successfully.`);
      // auto-clear after 3 s
      setTimeout(() => setUploadSuccess(""), 3000);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingDocId(docId);
    setUploadError("");
    setUploadSuccess("");
    try {
      const response = await deleteProjectDocument(groupId, project.id, docId);
      onGroupUpdate(response.data.data);
    } catch {
      setUploadError("Delete failed. Please try again.");
    } finally {
      setDeletingDocId(null);
    }
  };

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <FileText size={13} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
            Docs
          </span>
          {docs.length > 0 && (
            <span className="ml-0.5 rounded-full bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
              {docs.length}
            </span>
          )}
        </div>

        {/* Upload trigger */}
        <label
          htmlFor={`doc-upload-${project.id}`}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/80 px-2.5 py-1.5 text-xs font-medium text-[var(--text-body)] transition hover:border-[var(--primary)]/50 hover:text-[var(--primary)] ${
            isUploading ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Upload size={12} />
          {isUploading ? "Uploading…" : "Upload"}
          <input
            ref={inputRef}
            id={`doc-upload-${project.id}`}
            type="file"
            multiple
            className="sr-only"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.zip,.rar"
            onChange={(e) => void handleFileUpload(e)}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Feedback */}
      {uploadSuccess && (
        <p className="flex items-center gap-1.5 rounded-lg border border-[var(--ok)]/30 bg-[var(--ok)]/8 px-3 py-2 text-xs text-[var(--ok)]">
          <Check size={11} /> {uploadSuccess}
        </p>
      )}
      {uploadError && (
        <p className="flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/8 px-3 py-2 text-xs text-[var(--danger)]">
          <X size={11} /> {uploadError}
        </p>
      )}

      {/* Document list */}
      {docs.length === 0 ? (
        <p className="text-xs italic text-[var(--text-muted)]">No documents uploaded yet.</p>
      ) : (
        <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-0.5">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="group/doc flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-0)]/60 px-3 py-2 transition hover:border-[var(--primary)]/30"
            >
              <span className="shrink-0 text-sm leading-none">{getFileEmoji(doc.mimeType)}</span>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-xs font-medium text-[var(--text-body)]"
                  title={doc.originalName}
                >
                  {doc.originalName}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">{formatFileSize(doc.size)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover/doc:opacity-100">
                <a
                  href={`${API_BASE}/uploads/documents/${doc.filename}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1 text-[var(--text-muted)] transition hover:text-[var(--primary)]"
                  title="Open / Download"
                >
                  <Download size={12} />
                </a>
                <button
                  type="button"
                  onClick={() => void handleDelete(doc.id)}
                  disabled={deletingDocId === doc.id}
                  className="rounded p-1 text-[var(--text-muted)] transition hover:text-[var(--danger)] disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const StudentProjectsPage = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [group, setGroup] = useState<ProjectGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const loadPageData = async () => {
      setIsLoading(true);
      try {
        const [subjectsResponse, groupResponse] = await Promise.all([fetchAllSubjects(), fetchMyGroup()]);
        const groups = groupResponse.data.data;
        
        // First, try to find a group that has projects
        let userGroup: typeof groups[0] | null | undefined = groups.find((g) => (g.projects?.length ?? 0) > 0);
        
        // If no group has projects yet, fall back to EDI major project group
        if (!userGroup) {
          userGroup = selectEdiMajorProjectGroup(groups);
        }

        let allSubjects = subjectsResponse.data.data;
        
        // If the selected group is EDI registered, add EDI as a subject option
        if (userGroup?.isEdiRegistered) {
          allSubjects = [
            ...allSubjects,
            { id: "edi", name: "Engineering Design Innovation" }
          ];
        }

        setSubjects(allSubjects);
        setGroup(userGroup ?? null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadPageData();
  }, []);

  const projects = useMemo(() => group?.projects ?? [], [group]);
  const existingSubjectIds = useMemo(
    () => new Set(group?.projects.map((project) => project.subjectId) ?? []),
    [group]
  );
  const ediProjectAlreadyExists = useMemo(
    () => group?.projects.some((project) => project.subjectName === "Engineering Design Innovation") ?? false,
    [group]
  );

  const resetForm = () => {
    setSubjectId("");
    setTitle("");
    setFormError("");
  };

  const onCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const resolveGuideName = (project: GroupProject) => {
    // If project already has a guide name assigned, use it
    if (project.guideName && project.guideName !== "Not assigned") {
      return project.guideName;
    }

    // Otherwise, look for a matching course project registration
    if (!group?.courseProjectRegistrations?.length) {
      return "Not assigned";
    }

    // Find matching registration by subject ID or subject name
    const registration = group.courseProjectRegistrations.find((entry) => {
      const entrySubjectIdStr = String(entry.subjectId ?? "").trim();
      const projectSubjectIdStr = String(project.subjectId ?? "").trim();
      const namesMatch = entry.subjectName === project.subjectName;
      const idsMatch = entrySubjectIdStr === projectSubjectIdStr && entrySubjectIdStr !== "";

      return namesMatch || idsMatch;
    });

    // Return the faculty name if found, otherwise "Not assigned"
    if (registration?.labFaculty?.name) {
      return registration.labFaculty.name;
    }

    return "Not assigned";
  };

  const openEditModal = (project: GroupProject) => {
    setSelectedProjectId(project.id);
    setEditTitle(project.title);
    setEditError("");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedProjectId("");
    setEditTitle("");
    setEditError("");
  };

  const handleEditTitle = async () => {
    if (!selectedProject) {
      setEditError("Project not found.");
      return;
    }

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditError("Please enter a project title.");
      return;
    }

    if (!group) {
      setEditError("Group not found.");
      return;
    }

    try {
      const response = await updateGroupProject(group.id, selectedProject.id, {
        title: trimmedTitle
      });

      setGroup(response.data.data);
      closeEditModal();
    } catch {
      setEditError("Unable to update title right now. Please try again.");
    }
  };

  const handleAddProject = async () => {
    const trimmedTitle = title.trim();
    if (!subjectId) {
      setFormError("Please select a subject.");
      return;
    }
    if (!trimmedTitle) {
      setFormError("Please enter a project title.");
      return;
    }

    const selectedSubject = subjects.find((subject) => subject.id === subjectId);
    if (!selectedSubject) {
      setFormError("Selected subject is invalid.");
      return;
    }

    if (!group) {
      setFormError("Group not found.");
      return;
    }

    try {
      const response = await addGroupProject(group.id, {
        title: trimmedTitle,
        subjectId: selectedSubject.id
      });
      setGroup(response.data.data);
      onCloseModal();
    } catch {
      setFormError("Unable to add project right now. Please try again.");
    }
  };

  if (user && user.role !== "student") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <section className="reveal-up delay-1 lit-card rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--primary)] font-medium">Student Projects</p>
        <h2 className="mt-2 text-3xl font-bold text-[var(--text-strong)]">Projects</h2>
        <p className="mt-3 max-w-3xl text-sm text-[var(--text-muted)] md:text-base">
          Add your project with subject and title. Upload supporting documents directly from each project tile.
        </p>
        <div className="mt-5">
          <Button
            type="button"
            onClick={() => {
              setFormError("");
              setIsModalOpen(true);
            }}
            className="bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg-0)]"
          >
            <FolderPlus size={16} /> Add Project
          </Button>
        </div>
      </section>

      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading project data...</p>
      ) : projects.length === 0 ? (
        <section className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-8 text-center text-[var(--text-muted)]">
          <p>No projects added yet. Click "Add Project" to create your first project tile.</p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: GroupProject) => (
            <div
              key={project.id}
              className="relative reveal-up rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card transition hover:border-[var(--primary)]/50 hover:-translate-y-0.5 flex flex-col"
            >
              {/* Edit title button */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  openEditModal(project);
                }}
                className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-1)]/95 px-3 py-2 text-xs font-medium text-[var(--text-body)] transition hover:bg-[var(--bg-0)]"
              >
                <Pencil size={14} /> Edit title
              </button>

              {/* Project info (links to details page) */}
              <Link to={`/student/projects/${project.id}`} className="block">
                <div className="mb-3 flex items-center gap-2 text-[var(--primary)]">
                  <Layers3 size={16} />
                  <p className="text-xs uppercase tracking-[0.2em] font-semibold">Project Tile</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Title</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-strong)]">{project.title}</p>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Subject</p>
                    <p className="mt-1 text-sm font-medium text-[var(--text-body)]">{project.subjectName}</p>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)]/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Guide Name</p>
                    <p className="mt-1 text-sm font-medium text-[var(--text-body)]">{resolveGuideName(project)}</p>
                  </div>

                  {project.repositoryUrl ? (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--primary)]">
                      <ExternalLink size={12} />
                      <span className="truncate">{project.repositoryUrl.replace("https://github.com/", "")}</span>
                    </div>
                  ) : null}

                  <p className="text-xs text-[var(--primary)]">Open complete project details →</p>
                </div>
              </Link>

              {/* ── Documents panel ── */}
              {group && (
                <ProjectDocumentsPanel
                  project={project}
                  groupId={group.id}
                  onGroupUpdate={setGroup}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {/* Add project modal */}
      <Modal open={isModalOpen} title="Add Project" onClose={onCloseModal}>
        <div className="space-y-4">
          <label htmlFor="project-subject" className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-body)]">Select Subject</span>
            <select
              id="project-subject"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/80 px-4 py-3 text-sm text-[var(--text-body)] shadow-sm outline-none transition hover:border-[color:var(--primary-light)]/50 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary)]/12"
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setFormError("");
              }}
            >
              <option value="">Choose a subject</option>
              {subjects.map((subject) => {
                const isEdiOption = subject.id === "edi";
                const isDisabled = isEdiOption
                  ? ediProjectAlreadyExists
                  : existingSubjectIds.has(subject.id);

                return (
                  <option key={subject.id} value={subject.id} disabled={isDisabled}>
                    {subject.name}
                    {isDisabled ? " (already added)" : ""}
                  </option>
                );
              })}
            </select>
          </label>

          <Input
            id="project-title"
            label="Title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setFormError("");
            }}
            placeholder="Enter project title"
            maxLength={120}
            required
          />

          {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCloseModal}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddProject}>
              Save Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit title modal */}
      <Modal open={isEditModalOpen} title="Edit Project Title" onClose={closeEditModal}>
        <div className="space-y-4">
          <Input
            id="edit-project-title"
            label="Title"
            value={editTitle}
            onChange={(event) => {
              setEditTitle(event.target.value);
              setEditError("");
            }}
            placeholder="Enter new project title"
            maxLength={120}
            required
          />

          {editError ? <p className="text-sm text-[var(--danger)]">{editError}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEditTitle}>
              Save Title
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentProjectsPage;

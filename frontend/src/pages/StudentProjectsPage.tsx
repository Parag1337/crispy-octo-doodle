import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { FolderPlus, Layers3, Pencil, FilePlus2, FileText, Trash2, Upload, X } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
import { addGroupProject, fetchMyGroup, updateGroupProject, uploadProjectDocuments, deleteProjectDocument } from "../services/group.api";
import { fetchAllSubjects, type Subject } from "../services/subject.api";
import type { GroupProject, ProjectGroup } from "../types/group.types";
import { selectEdiMajorProjectGroup } from "../utils/groupSelection";

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

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

  // Document upload state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docProjectId, setDocProjectId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [docError, setDocError] = useState("");
  const [docSuccess, setDocSuccess] = useState("");
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPageData = async () => {
      setIsLoading(true);
      try {
        const [subjectsResponse, groupResponse] = await Promise.all([fetchAllSubjects(), fetchMyGroup()]);
        let allSubjects = subjectsResponse.data.data;
        const userGroup = selectEdiMajorProjectGroup(groupResponse.data.data);

        // If the selected group is EDI registered, add EDI as a subject option
        if (userGroup?.isEdiRegistered) {
          allSubjects = [
            ...allSubjects,
            { id: "edi", name: "Engineering Design Innovation" }
          ];
        }

        setSubjects(allSubjects);
        setGroup(userGroup);
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

  // Document modal helpers
  const docProject = useMemo(
    () => projects.find((project) => project.id === docProjectId) ?? null,
    [projects, docProjectId]
  );

  const openDocModal = (project: GroupProject) => {
    setDocProjectId(project.id);
    setSelectedFiles([]);
    setDocError("");
    setDocSuccess("");
    setIsDocModalOpen(true);
  };

  const closeDocModal = () => {
    setIsDocModalOpen(false);
    setDocProjectId("");
    setSelectedFiles([]);
    setDocError("");
    setDocSuccess("");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...fileArray]);
    setDocError("");
    setDocSuccess("");
    // Reset input so re-selecting the same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadDocuments = async () => {
    if (!group || !docProject) return;
    if (selectedFiles.length === 0) {
      setDocError("Please select at least one file.");
      return;
    }

    setIsUploading(true);
    setDocError("");
    setDocSuccess("");

    try {
      const response = await uploadProjectDocuments(group.id, docProject.id, selectedFiles);
      setGroup(response.data.data);
      setSelectedFiles([]);
      setDocSuccess(`${selectedFiles.length} document(s) uploaded successfully!`);
    } catch {
      setDocError("Failed to upload documents. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!group || !docProject) return;

    setDeletingDocId(documentId);
    setDocError("");

    try {
      const response = await deleteProjectDocument(group.id, docProject.id, documentId);
      setGroup(response.data.data);
      setDocSuccess("Document deleted.");
    } catch {
      setDocError("Failed to delete document.");
    } finally {
      setDeletingDocId(null);
    }
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
          Add your project with subject and title. Each tile shows title, subject, and assigned guide name.
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
            <div key={project.id} className="relative reveal-up rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card transition hover:border-[var(--primary)]/50 hover:-translate-y-0.5">
              {/* Header row: label + action buttons */}
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[var(--primary)]">
                  <Layers3 size={16} />
                  <p className="text-xs uppercase tracking-[0.2em] font-semibold">Project Tile</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      openDocModal(project);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition hover:bg-[var(--primary)]/20 hover:border-[var(--primary)]/50"
                  >
                    <FilePlus2 size={13} /> Docs
                    {(project.documents?.length ?? 0) > 0 && (
                      <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-[var(--bg-0)]">
                        {project.documents.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      openEditModal(project);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-1)]/95 px-3 py-1.5 text-xs font-medium text-[var(--text-body)] transition hover:bg-[var(--bg-0)]"
                  >
                    <Pencil size={13} /> Edit title
                  </button>
                </div>
              </div>

              <Link to={`/student/projects/${project.id}`} className="block">
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
                    <p className="mt-1 text-sm font-medium text-[var(--text-body)]">{project.guideName}</p>
                  </div>

                  {/* Document count badge */}
                  {(project.documents?.length ?? 0) > 0 && (
                    <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Documents</p>
                      <p className="mt-1 text-sm font-medium text-[var(--primary)]">{project.documents.length} file{project.documents.length !== 1 ? "s" : ""} attached</p>
                    </div>
                  )}

                  <p className="text-xs text-[var(--primary)]">Open complete project details</p>
                </div>
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* Add Project Modal */}
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

      {/* Edit Title Modal */}
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

      {/* Add Documents Modal */}
      <Modal open={isDocModalOpen && Boolean(docProject)} title={`Documents — ${docProject?.title ?? ""}`} onClose={closeDocModal}>
        <div className="space-y-5">
          <p className="text-sm text-[var(--text-muted)]">
            Upload documents for this project (PDF, Word, Excel, PowerPoint, images, ZIP — up to 10 MB each, max 5 at a time).
          </p>

          {/* File picker area */}
          <div
            className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-1)]/50 p-6 text-center transition hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={28} className="mx-auto mb-2 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
            <p className="text-sm font-medium text-[var(--text-body)]">Click to browse files</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">or drag & drop</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.zip,.rar"
            />
          </div>

          {/* Selected files preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] font-medium">
                Selected ({selectedFiles.length})
              </p>
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/60 px-4 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="shrink-0 text-[var(--primary)]" />
                    <span className="truncate text-sm text-[var(--text-body)]">{file.name}</span>
                    <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    className="shrink-0 rounded-full p-1 text-[var(--text-muted)] transition hover:bg-[var(--danger)]/15 hover:text-[var(--danger)]"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {docError ? <p className="text-sm text-[var(--danger)]">{docError}</p> : null}
          {docSuccess ? <p className="text-sm text-[var(--ok)]">{docSuccess}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeDocModal}>
              Close
            </Button>
            {selectedFiles.length > 0 && (
              <Button
                type="button"
                onClick={() => void handleUploadDocuments()}
                disabled={isUploading}
                className="bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg-0)]"
              >
                <Upload size={15} />
                {isUploading ? "Uploading..." : `Upload ${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </div>

          {/* Existing documents list */}
          {(docProject?.documents?.length ?? 0) > 0 && (
            <div className="space-y-2 border-t border-[var(--border)] pt-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] font-medium">
                Uploaded Documents ({docProject!.documents.length})
              </p>
              {docProject!.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/60 px-4 py-3 transition hover:border-[var(--primary)]/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 rounded-lg bg-[var(--primary)]/10 p-2">
                      <FileText size={16} className="text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0">
                      <a
                        href={`${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ?? "http://localhost:5501"}/uploads/documents/${doc.filename}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-medium text-[var(--text-strong)] hover:text-[var(--primary)] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {doc.originalName}
                      </a>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {formatFileSize(doc.size)} · {doc.mimeType.split("/").pop()?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDocument(doc.id)}
                    disabled={deletingDocId === doc.id}
                    className="shrink-0 rounded-lg border border-transparent p-2 text-[var(--text-muted)] transition hover:border-[var(--danger)]/30 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:opacity-50"
                    title="Delete document"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StudentProjectsPage;

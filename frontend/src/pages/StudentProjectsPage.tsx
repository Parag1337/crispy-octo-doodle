import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { FolderPlus, Layers3, Pencil } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
import { addGroupProject, fetchMyGroup, updateGroupProject } from "../services/group.api";
import { fetchAllSubjects, type Subject } from "../services/subject.api";
import type { GroupProject, ProjectGroup } from "../types/group.types";
import { selectEdiMajorProjectGroup } from "../utils/groupSelection";

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
                    <p className="mt-1 text-sm font-medium text-[var(--text-body)]">{project.guideName}</p>
                  </div>

                  <p className="text-xs text-[var(--primary)]">Open complete project details</p>
                </div>
              </Link>
            </div>
          ))}
        </section>
      )}

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

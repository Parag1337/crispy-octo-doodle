export const fetchAllGroupNames = () =>
	api.get<AR<{ name: string; branch: string; division: string }[]>>("/groups/all-public");
import api from "./api";
import type {
	ProjectGroup,
	PendingInvite,
	GuideUser,
	EdiDivisionStudentSummary,
	StudentDivisionSummary,
	StudentDivisionDetails
} from "../types/group.types";

interface AR<T> { success: boolean; message: string; data: T; }

export const fetchMyGroup = () => api.get<AR<ProjectGroup[]>>("/groups/my");
export const fetchMyInvites = () => api.get<AR<PendingInvite[]>>("/groups/invites");
export const fetchGuideGroups = () => api.get<AR<ProjectGroup[]>>("/groups/guide");
export const fetchAllGroups = () => api.get<AR<ProjectGroup[]>>("/groups/all");
export const fetchAllGuides = () => api.get<AR<GuideUser[]>>("/groups/guides-list");
export const fetchGuidesBySubject = (subjectId: string) => api.get<AR<GuideUser[]>>(`/groups/guides-by-subject/${subjectId}`);

export const createGroup = (data: { name: string; subject: string; repositoryUrl?: string }) =>
	api.post<AR<ProjectGroup>>("/groups", data);

export const updateGroup = (id: string, data: { name?: string; subject?: string; repositoryUrl?: string }) =>
	api.patch<AR<ProjectGroup>>(`/groups/${id}`, data);

export const deleteGroup = (id: string) =>
	api.delete<AR<null>>(`/groups/${id}`);

export const leaveGroup = (id: string) =>
	api.delete<AR<null>>(`/groups/${id}/leave`);

export const inviteStudent = (groupId: string, email: string) =>
	api.post<AR<ProjectGroup>>(`/groups/${groupId}/invites`, { email });

export const respondToInvite = (groupId: string, action: "accept" | "decline") =>
	api.post<AR<{ joined: boolean }>>(`/groups/${groupId}/invites/respond`, { action });

export const cancelInvite = (groupId: string, studentId: string) =>
	api.delete<AR<ProjectGroup>>(`/groups/${groupId}/invites/${studentId}`);

export const removeMember = (groupId: string, memberId: string) =>
	api.delete<AR<ProjectGroup>>(`/groups/${groupId}/members/${memberId}`);

export const assignGuide = (groupId: string, guideId: string | null) =>
	api.post<AR<ProjectGroup>>(`/groups/${groupId}/assign-guide`, { guideId });

export const assignGuideRandom = (groupId: string) =>
	api.post<AR<ProjectGroup>>(`/groups/${groupId}/assign-guide-random`);

export const fetchEdiGuideLimit = () =>
	api.get<AR<{ limit: number }>>("/groups/edi-limit");

export const fetchEdiUngroupedStudentsByDivision = () =>
	api.get<AR<EdiDivisionStudentSummary[]>>("/groups/edi-ungrouped-students");

export const fetchStudentDivisionSummary = () =>
	api.get<AR<StudentDivisionSummary[]>>("/groups/student-division-summary");

export const fetchStudentDivisionDetails = (branch: string, division: string) =>
	api.get<AR<StudentDivisionDetails>>("/groups/student-division-details", {
		params: { branch, division }
	});

export const updateEdiGuideLimit = (limit: number) =>
	api.patch<AR<{ limit: number }>>("/groups/edi-limit", { limit });

export const assignCpGuide = (groupId: string, guideId: string | null) =>
	api.post<AR<ProjectGroup>>(`/groups/${groupId}/assign-cp-guide`, { guideId });

export const registerEdiGroup = (groupId: string) =>
	api.post<AR<ProjectGroup>>(`/groups/${groupId}/register-edi`);

export const registerCourseProjectSubject = (groupId: string, data: { subjectId: string }) =>
	api.post<AR<ProjectGroup>>(`/groups/${groupId}/register-course-project`, data);

export const assignCourseProjectLabFaculty = (groupId: string, data: { subjectId: string; facultyId: string | null }) =>
	api.post<AR<ProjectGroup>>(`/groups/${groupId}/course-project-lab-faculty`, data);

export const addGroupProject = (groupId: string, data: { title: string; subjectId: string }) =>
	api.post<AR<ProjectGroup>>(`/groups/${groupId}/projects`, data);

export const updateGroupProject = (groupId: string, projectId: string, data: { repositoryUrl?: string | null; title?: string }) =>
	api.patch<AR<ProjectGroup>>(`/groups/${groupId}/projects/${projectId}`, data);

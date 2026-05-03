export interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: string;
  branch?: string;
  division?: string;
  rollNo?: string;
}

export interface GroupOwner {
  id: string;
  name: string;
  email: string;
  branch?: string;
  division?: string;
}

export interface GuideUser {
  id: string;
  name: string;
  email: string;
  teachingSubjectIds?: string[];
  ediAssignedCount?: number;
}

export interface ProjectDocument {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string | null;
}

export interface GroupProject {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  guideName: string;
  repositoryUrl?: string | null;
  documents: ProjectDocument[];
  createdBy: string;
  createdAt: string | null;
}

export interface CourseProjectRegistration {
  subjectId: string;
  subjectName: string;
  labFaculty: GuideUser | null;
  registeredAt: string | null;
}

export interface PendingInviteStudent {
  id: string;
  name: string;
  email: string;
}

export interface ProjectGroup {
  id: string;
  name: string;
  subject: string;
  repositoryUrl?: string | null;
  isEdiRegistered: boolean;
  ediGuide: GuideUser | null;
  cpGuide: GuideUser | null;
  guide: GuideUser | null;
  projects: GroupProject[];
  courseProjectRegistrations: CourseProjectRegistration[];
  owner: GroupOwner;
  members: GroupMember[];
  pendingInvites: PendingInviteStudent[];
}

export interface PendingInvite {
  groupId: string;
  groupName: string;
  subject: string;
  owner: GroupOwner;
  memberCount: number;
}

export interface EdiUngroupedStudent {
  id: string;
  name: string;
  email: string;
  branch: string;
  division: string;
  rollNo: string | null;
}

export interface EdiDivisionStudentSummary {
  key: string;
  branch: string;
  division: string;
  totalStudents: number;
  groupedStudents: number;
  ungroupedStudents: number;
  potentialFullGroups: number;
  studentsNeededToCompleteNextGroup: number;
  remainingStudents: EdiUngroupedStudent[];
}

export interface StudentDivisionSummary {
  key: string;
  branch: string;
  division: string;
  totalStudents: number;
  studentsInGroups: number;
  studentsNotInGroups: number;
}

export interface StudentDivisionStudent {
  id: string;
  name: string;
  email: string;
  branch: string;
  division: string;
  rollNo: string | null;
  groupId: string | null;
  groupName: string | null;
}

export interface StudentDivisionDetails {
  branch: string;
  division: string;
  totalStudents: number;
  studentsInGroupsCount: number;
  studentsNotInGroupsCount: number;
  studentsInGroups: StudentDivisionStudent[];
  studentsNotInGroups: StudentDivisionStudent[];
}

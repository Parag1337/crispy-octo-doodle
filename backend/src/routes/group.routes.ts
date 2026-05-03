import { Router } from "express";
import {
	createGroup, getMyGroup, getMyInvites,
	inviteStudent, respondToInvite, cancelInvite,
	removeMember, leaveGroup, updateGroup, deleteGroup,
	addGroupProject, updateGroupProject,
	uploadProjectDocuments, deleteProjectDocument, uploadMiddleware,
	registerCourseProjectSubject, assignCourseProjectLabFaculty,
	registerEdiGroup,
	getGuideGroups,
	assignGuide, assignGuideRandomly, getEdiGuideLimit, updateEdiGuideLimit, assignCpGuide, getAllGroups, getAllGuides, getGuidesBySubject,
	getAllGroupNames, getEdiUngroupedStudentsByDivision, getStudentDivisionSummary, getStudentDivisionDetails
} from "../controllers/group.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

// Specific static paths MUST come before /:id param routes
router.get("/my",          authenticate, authorizeRoles("student"), getMyGroup);
router.get("/invites",     authenticate, authorizeRoles("student"), getMyInvites);
router.get("/guide",       authenticate, authorizeRoles("guide"),   getGuideGroups);
router.get("/all",         authenticate, authorizeRoles("admin"),   getAllGroups);
router.get("/edi-ungrouped-students", authenticate, authorizeRoles("admin"), getEdiUngroupedStudentsByDivision);
router.get("/student-division-summary", authenticate, authorizeRoles("admin"), getStudentDivisionSummary);
router.get("/student-division-details", authenticate, authorizeRoles("admin"), getStudentDivisionDetails);
router.get("/edi-limit",   authenticate, authorizeRoles("admin"),   getEdiGuideLimit);
router.patch("/edi-limit", authenticate, authorizeRoles("admin"),   updateEdiGuideLimit);
router.get("/all-public",  authenticate, authorizeRoles("student", "guide", "admin"), getAllGroupNames);
router.get("/guides-list", authenticate, authorizeRoles("student", "guide", "admin"), getAllGuides);
router.get("/guides-by-subject/:subjectId", authenticate, authorizeRoles("student", "guide", "admin"), getGuidesBySubject);

// Student: create group
router.post("/", authenticate, authorizeRoles("student"), createGroup);

// Student owner: manage own group
router.patch("/:id",                        authenticate, authorizeRoles("student"), updateGroup);
router.post("/:id/projects",               authenticate, authorizeRoles("student"), addGroupProject);
router.patch("/:id/projects/:projectId",    authenticate, authorizeRoles("student"), updateGroupProject);
router.post("/:id/projects/:projectId/documents", authenticate, authorizeRoles("student"), uploadMiddleware.array("documents", 5), uploadProjectDocuments);
router.delete("/:id/projects/:projectId/documents/:documentId", authenticate, authorizeRoles("student"), deleteProjectDocument);
router.delete("/:id",                       authenticate, authorizeRoles("student"), deleteGroup);
router.delete("/:id/leave",                 authenticate, authorizeRoles("student"), leaveGroup);
router.post("/:id/register-course-project", authenticate, authorizeRoles("student"), registerCourseProjectSubject);
router.post("/:id/course-project-lab-faculty", authenticate, authorizeRoles("student"), assignCourseProjectLabFaculty);
router.post("/:id/register-edi",           authenticate, authorizeRoles("student"), registerEdiGroup);
router.post("/:id/invites",                 authenticate, authorizeRoles("student"), inviteStudent);
router.post("/:id/invites/respond",         authenticate, authorizeRoles("student"), respondToInvite);
router.delete("/:id/invites/:studentId",    authenticate, authorizeRoles("student"), cancelInvite);
router.delete("/:id/members/:memberId",     authenticate, authorizeRoles("student"), removeMember);

// Admin: guide assignment
router.post("/:id/assign-guide", authenticate, authorizeRoles("admin"), assignGuide);
router.post("/:id/assign-guide-random", authenticate, authorizeRoles("admin"), assignGuideRandomly);
router.post("/:id/assign-cp-guide", authenticate, authorizeRoles("admin"), assignCpGuide);

export default router;

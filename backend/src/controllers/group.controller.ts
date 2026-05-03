// ─── Public: view all group names, branch, division ─────────────────────────────
import type { Request } from "express";
export const getAllGroupNames = asyncHandler(async (_req: Request, res: Response) => {
	const groups = await ProjectGroupModel.find({}, { name: 1, _id: 0 })
		.populate({ path: "owner", select: "branch division" })
		.lean();
	// Each group: { name, owner: { branch, division } }
	const result = groups.map((g: any) => ({
		name: g.name,
		branch: g.owner?.branch || null,
		division: g.owner?.division || null
	}));
	res.status(200).json(new ApiResponse(true, "Group names fetched", result));
});
import type { Response } from "express";
import { Types } from "mongoose";
import { ProjectGroupModel } from "../models/projectGroup.model";
import { SubjectModel } from "../models/subject.model";
import { SystemSettingModel } from "../models/systemSetting.model";
import { UserModel } from "../models/user.model";
import type { AuthenticatedRequest } from "../types/auth.types";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const POPULATE = [
	{ path: "owner", select: "name email branch division" },
	{ path: "ediGuide", select: "name email" },
	{ path: "cpGuide", select: "name email" },
	{ path: "courseProjectRegistrations.subjectId", select: "name" },
	{ path: "courseProjectRegistrations.labFaculty", select: "name email" },
	{ path: "members", select: "name email role branch division rollNo" },
	{ path: "pendingInvites", select: "name email" }
];

type PopUser = {
	_id: unknown;
	name: string;
	email: string;
	role?: string;
	branch?: string;
	division?: string;
	rollNo?: string;
	teachingSubjects?: unknown[];
};

type StudentSummary = {
	id: string;
	name: string;
	email: string;
	branch: string;
	division: string;
	rollNo: string | null;
};

type StudentGroupStatus = StudentSummary & {
	groupId: string | null;
	groupName: string | null;
};
const toTeachingSubjectIds = (subjects: unknown[] = []) =>
	subjects
		.map((subject) => {
			if (typeof subject === "string") return subject;
			if (subject && typeof subject === "object" && "_id" in subject) return String((subject as { _id?: unknown })._id ?? "");
			return String(subject ?? "");
		})
		.filter(Boolean);

const fu = (u: PopUser | null | undefined) => {
	if (!u || typeof u !== "object") {
		return { id: "", name: "Unknown", email: "", branch: undefined, division: undefined, rollNo: undefined, teachingSubjectIds: [] };
	}
	return {
		id: String(u._id ?? ""),
		name: u.name ?? "Unknown",
		email: u.email ?? "",
		branch: u.branch,
		division: u.division,
		rollNo: u.rollNo,
		teachingSubjectIds: toTeachingSubjectIds(u.teachingSubjects)
	};
};

const EDI_GLOBAL_LIMIT_KEY = "edi_global_assignment_limit";
const EDI_GLOBAL_LIMIT_DEFAULT = 8;

const getEdiGlobalLimit = async () => {
	const setting = await SystemSettingModel.findOne({ key: EDI_GLOBAL_LIMIT_KEY }).select("valueNumber").lean();
	if (!setting || typeof setting.valueNumber !== "number") return EDI_GLOBAL_LIMIT_DEFAULT;
	return setting.valueNumber;
};

const normalizeRepositoryUrl = (value: string) => value.trim().replace(/\/+$/, "");
const isValidGithubRepositoryUrl = (value: string) =>
	/^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/i.test(value);

const toMember = (user: PopUser | null | undefined) => {
	if (!user || typeof user !== "object") return null;
	return { ...fu(user), role: user.role ?? "student" };
};

const formatGroup = (g: Record<string, unknown>) => {
	const owner = g.owner as PopUser | null;
	const ownerMember = toMember(owner);
	const members = (g.members as PopUser[])
		.filter(Boolean)
		.map((m) => m ? toMember(m) : null)
		.filter(Boolean);

	const finalMembers = ownerMember && !members.some((member) => member.id === ownerMember.id)
		? [ownerMember, ...members]
		: members;

	return {
		id: String(g._id),
		name: g.name as string,
		subject: (g.subject as string) || "General",
		repositoryUrl: (g.repositoryUrl as string | null | undefined) ?? null,
		isEdiRegistered: Boolean(g.isEdiRegistered),
		owner: fu(owner),
		guide: g.ediGuide ? fu(g.ediGuide as PopUser | null) : null,
		ediGuide: g.ediGuide ? fu(g.ediGuide as PopUser | null) : null,
		cpGuide: g.cpGuide ? fu(g.cpGuide as PopUser | null) : null,
		projects: ((g.projects as unknown[]) ?? []).map((entry) => {
			const project = entry as {
				_id?: unknown;
				title?: unknown;
				subjectId?: unknown;
				subjectName?: unknown;
				guideName?: unknown;
				repositoryUrl?: unknown;
				createdBy?: unknown;
				createdAt?: unknown;
			};

			const subjectId = project.subjectId as { _id?: unknown } | undefined | null;
			const createdBy = project.createdBy as { _id?: unknown } | undefined | null;

			return {
				id: String(project._id ?? ""),
				title: String(project.title ?? ""),
				subjectId: String(subjectId?._id ?? project.subjectId ?? ""),
				subjectName: String(project.subjectName ?? ""),
				guideName: String(project.guideName ?? "Not assigned"),
				repositoryUrl: (project.repositoryUrl as string | null | undefined) ?? null,
				createdBy: String(createdBy?._id ?? project.createdBy ?? ""),
				createdAt: project.createdAt ? new Date(project.createdAt as string | number | Date).toISOString() : null
			};
		}),
		courseProjectRegistrations: ((g.courseProjectRegistrations as unknown[]) ?? []).map((entry) => {
			const registration = entry as {
				subjectId?: unknown;
				subjectName?: unknown;
				labFaculty?: PopUser | null;
				registeredAt?: unknown;
			};

			const subjectId = registration.subjectId as { _id?: unknown } | undefined | null;

			return {
				subjectId: String(subjectId?._id ?? registration.subjectId ?? ""),
				subjectName: String(registration.subjectName ?? ""),
				labFaculty: registration.labFaculty ? fu(registration.labFaculty) : null,
				registeredAt: registration.registeredAt ? new Date(registration.registeredAt as string | number | Date).toISOString() : null
			};
		}),
		members: finalMembers,
		pendingInvites: (g.pendingInvites as PopUser[]).filter(Boolean).map((p) => p ? fu(p) : null).filter(Boolean)
	};
};

const userBelongsToGroup = (group: { owner: unknown; members: unknown[] }, userId: string) =>
	String(group.owner) === userId || group.members.some((memberId) => String(memberId) === userId);

const resolveProjectGuideName = async (group: Record<string, unknown>, subjectId: string) => {
	const registrations = (group.courseProjectRegistrations as Array<{ subjectId?: unknown; labFaculty?: unknown }>) ?? [];
	const registration = registrations.find((entry) => String((entry.subjectId as { _id?: unknown } | undefined)?._id ?? entry.subjectId ?? "") === subjectId);
	if (!registration?.labFaculty) return "Not assigned";

	const facultyId = String((registration.labFaculty as { _id?: unknown } | undefined)?._id ?? registration.labFaculty ?? "");
	const faculty = await UserModel.findById(facultyId).select("name").lean();
	return faculty?.name ?? "Not assigned";
};

// ─── Student: create a group (becomes owner + first member) ──────────────────
export const createGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const ownerId = req.user!.userId;
	const { name, subject, repositoryUrl } = req.body as { name?: string; subject?: string; repositoryUrl?: string | null };
	const user = await UserModel.findById(ownerId).select("hasCreatedGroup").lean();
	const existingGroup = await ProjectGroupModel.exists({ $or: [{ owner: ownerId }, { members: ownerId }] });

	if (user?.hasCreatedGroup || existingGroup) {
		res.status(409).json(new ApiResponse(false, "You can create only one group", null));
		return;
	}

	if (!name?.trim()) {
		res.status(400).json(new ApiResponse(false, "Group name is required", null));
		return;
	}

	if (!subject?.trim()) {
		res.status(400).json(new ApiResponse(false, "Subject is required", null));
		return;
	}

	let normalizedRepositoryUrl: string | null = null;
	if (repositoryUrl && repositoryUrl.trim()) {
		normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
		if (!isValidGithubRepositoryUrl(normalizedRepositoryUrl)) {
			res.status(400).json(new ApiResponse(false, "Provide a valid GitHub repository URL", null));
			return;
		}
	}

	const group = await ProjectGroupModel.create({
		name: name.trim(),
		subject: subject.trim(),
		repositoryUrl: normalizedRepositoryUrl,
		isEdiRegistered: false,
		owner: new Types.ObjectId(ownerId),
		ediGuide: null,
		cpGuide: null,
		courseProjectRegistrations: [],
		members: [new Types.ObjectId(ownerId)],
		pendingInvites: []
	});

	const populated = await group.populate(POPULATE);
	await UserModel.updateOne({ _id: ownerId }, { $set: { hasCreatedGroup: true } });
	res.status(201).json(new ApiResponse(true, "Group created", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Student: fetch all groups where the user is the owner or a member ───
export const getMyGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const userId = req.user!.userId;

	const groups = await ProjectGroupModel.find({
		$or: [{ owner: userId }, { members: userId }]
	}).populate(POPULATE).sort({ createdAt: -1 }).lean();

	res.status(200).json(
		new ApiResponse(true, "Groups fetched", groups.map((g) => formatGroup(g as unknown as Record<string, unknown>)))
	);
});

// ─── Student: fetch all pending invites sent to them ─────────────────────────
export const getMyInvites = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const userId = req.user!.userId;

	const groups = await ProjectGroupModel.find({ pendingInvites: userId })
		.populate("owner", "name email")
		.populate("members", "name email")
		.lean();

	const result = groups.map((g) => {
		const owner = g.owner as PopUser | null;
		return {
			groupId: String(g._id),
			groupName: g.name,
			subject: g.subject || "General",
			owner: owner ? fu(owner) : { id: "", name: "Unknown", email: "" },
			memberCount: (g.members as unknown[]).length
		};
	});

	res.status(200).json(new ApiResponse(true, "Invites fetched", result));
});

// ─── Student owner: invite a student by email ────────────────────────────────
export const inviteStudent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const ownerId = req.user!.userId;
	const { id } = req.params as { id: string };
	const { email } = req.body as { email?: string };

	if (!email?.trim()) {
		res.status(400).json(new ApiResponse(false, "Email is required", null));
		return;
	}

	const group = await ProjectGroupModel.findOne({ _id: id, owner: ownerId });
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found or you are not the owner", null));
		return;
	}

	if (group.members.length >= 4) {
		res.status(400).json(new ApiResponse(false, "Group is full (maximum 4 members)", null));
		return;
	}

	const student = await UserModel.findOne({ email: email.trim().toLowerCase(), role: "student" });
	if (!student) {
		res.status(404).json(new ApiResponse(false, "No student account found with that email", null));
		return;
	}

	const studentId = String(student._id);

	if (studentId === ownerId) {
		res.status(400).json(new ApiResponse(false, "You cannot invite yourself", null));
		return;
	}

	if (group.members.some((m) => String(m) === studentId)) {
		res.status(409).json(new ApiResponse(false, "This student is already a member", null));
		return;
	}

	if (group.pendingInvites.some((i) => String(i) === studentId)) {
		res.status(409).json(new ApiResponse(false, "Invite already sent to this student", null));
		return;
	}

	group.pendingInvites.push(new Types.ObjectId(studentId));
	await group.save();

	const populated = await group.populate(POPULATE);
	res.status(200).json(new ApiResponse(true, "Invite sent", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Student: accept or decline an invite ────────────────────────────────────
export const respondToInvite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const studentId = req.user!.userId;
	const { id } = req.params as { id: string };
	const { action } = req.body as { action?: string };

	if (action !== "accept" && action !== "decline") {
		res.status(400).json(new ApiResponse(false, "Action must be 'accept' or 'decline'", null));
		return;
	}

	const group = await ProjectGroupModel.findOne({ _id: id, pendingInvites: studentId });
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Invite not found", null));
		return;
	}

	if (action === "accept") {
		if (group.members.length >= 4) {
			res.status(400).json(new ApiResponse(false, "Group is now full", null));
			return;
		}
		group.pendingInvites = group.pendingInvites.filter((i) => String(i) !== studentId);
		group.members.push(new Types.ObjectId(studentId));
	} else {
		group.pendingInvites = group.pendingInvites.filter((i) => String(i) !== studentId);
	}

	await group.save();
	res.status(200).json(new ApiResponse(true, action === "accept" ? "Joined group successfully" : "Invite declined", { joined: action === "accept" }));
});

// ─── Student owner: cancel a pending invite ───────────────────────────────────
export const cancelInvite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const ownerId = req.user!.userId;
	const { id, studentId } = req.params as { id: string; studentId: string };

	const group = await ProjectGroupModel.findOne({ _id: id, owner: ownerId });
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found or unauthorized", null));
		return;
	}

	group.pendingInvites = group.pendingInvites.filter((i) => String(i) !== studentId);
	await group.save();

	const populated = await group.populate(POPULATE);
	res.status(200).json(new ApiResponse(true, "Invite cancelled", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Student owner: remove a member ──────────────────────────────────────────
export const removeMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const ownerId = req.user!.userId;
	const { id, memberId } = req.params as { id: string; memberId: string };

	if (memberId === ownerId) {
		res.status(400).json(new ApiResponse(false, "Owner cannot remove themselves. Delete the group instead.", null));
		return;
	}

	const group = await ProjectGroupModel.findOne({ _id: id, owner: ownerId });
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found or unauthorized", null));
		return;
	}

	group.members = group.members.filter((m) => String(m) !== memberId);
	await group.save();

	const populated = await group.populate(POPULATE);
	res.status(200).json(new ApiResponse(true, "Member removed", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Student member: leave group (non-owner only) ────────────────────────────
export const leaveGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const userId = req.user!.userId;
	const { id } = req.params as { id: string };

	const group = await ProjectGroupModel.findOne({ _id: id, members: userId });
	if (!group) {
		res.status(404).json(new ApiResponse(false, "You are not in this group", null));
		return;
	}

	if (String(group.owner) === userId) {
		res.status(400).json(new ApiResponse(false, "Group owner cannot leave. Delete the group instead.", null));
		return;
	}

	group.members = group.members.filter((m) => String(m) !== userId);
	await group.save();

	res.status(200).json(new ApiResponse(true, "Left group successfully", null));
});

// ─── Student owner: update group name / subject ──────────────────────────────
export const updateGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const userId = req.user!.userId;
	const { id } = req.params as { id: string };
	const { name, subject, repositoryUrl } = req.body as { name?: string; subject?: string; repositoryUrl?: string | null };

	const group = await ProjectGroupModel.findById(id);
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found or unauthorized", null));
		return;
	}

	const isMember = group.members.some((memberId) => String(memberId) === userId);
	if (!isMember) {
		res.status(403).json(new ApiResponse(false, "Only group members can update this group", null));
		return;
	}

	const isOwner = String(group.owner) === userId;
	if ((name?.trim() || subject?.trim()) && !isOwner) {
		res.status(403).json(new ApiResponse(false, "Only group owner can update name or subject", null));
		return;
	}

	if (name?.trim()) group.name = name.trim();
	if (subject?.trim()) group.subject = subject.trim();
	if (repositoryUrl !== undefined) {
		if (!repositoryUrl || !repositoryUrl.trim()) {
			group.repositoryUrl = null;
		} else {
			const normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
			if (!isValidGithubRepositoryUrl(normalizedRepositoryUrl)) {
				res.status(400).json(new ApiResponse(false, "Provide a valid GitHub repository URL", null));
				return;
			}
			group.repositoryUrl = normalizedRepositoryUrl;
		}
	}
	await group.save();

	const populated = await group.populate(POPULATE);
	res.status(200).json(new ApiResponse(true, "Group updated", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Group members: create a shared project ────────────────────────────────
export const addGroupProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const userId = req.user!.userId;
	const { id } = req.params as { id: string };
	const { title, subjectId } = req.body as { title?: string; subjectId?: string };

	if (!title?.trim()) {
		res.status(400).json(new ApiResponse(false, "Project title is required", null));
		return;
	}

	if (!subjectId?.trim()) {
		res.status(400).json(new ApiResponse(false, "Subject is required", null));
		return;
	}

	const group = await ProjectGroupModel.findById(id);
	if (!group || !userBelongsToGroup(group.toObject() as unknown as { owner: unknown; members: unknown[] }, userId)) {
		res.status(404).json(new ApiResponse(false, "Group not found or unauthorized", null));
		return;
	}

	let subjectName: string;
	let guideName: string;

	const existingProjects = group.projects ?? [];
	const hasDuplicate = existingProjects.some((project) => {
		if (subjectId === "edi") {
			return project.subjectName === "Engineering Design Innovation";
		}
		return String(project.subjectId) === subjectId;
	});

	if (hasDuplicate) {
		res.status(400).json(new ApiResponse(false, "A project for this subject already exists. Only one project is allowed per subject.", null));
		return;
	}

	if (subjectId === "edi") {
		// Special case for EDI projects
		if (!group.isEdiRegistered) {
			res.status(400).json(new ApiResponse(false, "EDI projects can only be added to EDI registered groups", null));
			return;
		}
		subjectName = "Engineering Design Innovation";
		guideName = group.ediGuide ? (await UserModel.findById(group.ediGuide).select("name").lean())?.name ?? "Not assigned" : "Not assigned";
	} else {
		// Regular course project
		if (!Types.ObjectId.isValid(subjectId)) {
			res.status(400).json(new ApiResponse(false, "Invalid subject ID", null));
			return;
		}

		const subject = await SubjectModel.findById(subjectId).select("name").lean();
		if (!subject) {
			res.status(404).json(new ApiResponse(false, "Subject not found", null));
			return;
		}

		subjectName = subject.name;
		guideName = await resolveProjectGuideName(group.toObject() as unknown as Record<string, unknown>, subjectId);
	}

	group.projects = existingProjects;
	group.projects.push({
		_id: new Types.ObjectId(),
		title: title.trim(),
		subjectId: subjectId === "edi" ? new Types.ObjectId() : new Types.ObjectId(subjectId), // For EDI, use a dummy ObjectId since it's not a real subject
		subjectName,
		guideName,
		repositoryUrl: null,
		createdBy: new Types.ObjectId(userId),
		createdAt: new Date()
	});

	await group.save();
	const populated = await group.populate(POPULATE);
	res.status(201).json(new ApiResponse(true, "Project added", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Group members: update a shared project ────────────────────────────────
export const updateGroupProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const userId = req.user!.userId;
	const { id, projectId } = req.params as { id: string; projectId: string };
	const { repositoryUrl, title } = req.body as { repositoryUrl?: string | null; title?: string };

	const group = await ProjectGroupModel.findById(id);
	if (!group || !userBelongsToGroup(group.toObject() as unknown as { owner: unknown; members: unknown[] }, userId)) {
		res.status(404).json(new ApiResponse(false, "Group not found or unauthorized", null));
		return;
	}

	const project = group.projects?.find((entry) => String(entry._id) === projectId);
	if (!project) {
		res.status(404).json(new ApiResponse(false, "Project not found", null));
		return;
	}

	if (title !== undefined) {
		if (!title.trim()) {
			res.status(400).json(new ApiResponse(false, "Project title cannot be empty", null));
			return;
		}
		project.title = title.trim();
	}

	if (repositoryUrl !== undefined) {
		if (!repositoryUrl || !repositoryUrl.trim()) {
			project.repositoryUrl = null;
		} else {
			const normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
			if (!isValidGithubRepositoryUrl(normalizedRepositoryUrl)) {
				res.status(400).json(new ApiResponse(false, "Provide a valid GitHub repository URL", null));
				return;
			}
			project.repositoryUrl = normalizedRepositoryUrl;
		}
	}

	await group.save();
	const populated = await group.populate(POPULATE);
	res.status(200).json(new ApiResponse(true, "Project updated", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Student owner: register a subject for course project ───────────────────
export const registerCourseProjectSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const ownerId = req.user!.userId;
	const { id } = req.params as { id: string };
	const { subjectId } = req.body as { subjectId?: string };

	if (!subjectId?.trim()) {
		res.status(400).json(new ApiResponse(false, "Subject is required", null));
		return;
	}

	if (!Types.ObjectId.isValid(subjectId)) {
		res.status(400).json(new ApiResponse(false, "Invalid subject ID", null));
		return;
	}

	const group = await ProjectGroupModel.findOne({ _id: id, owner: ownerId });
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found or unauthorized", null));
		return;
	}

	group.courseProjectRegistrations = group.courseProjectRegistrations ?? [];

	const subject = await SubjectModel.findById(subjectId).select("name");
	if (!subject) {
		res.status(404).json(new ApiResponse(false, "Subject not found", null));
		return;
	}

	const existingRegistration = group.courseProjectRegistrations.find((entry) => String(entry.subjectId) === subjectId);
	if (!existingRegistration) {
		group.courseProjectRegistrations.push({
			subjectId: new Types.ObjectId(subjectId),
			subjectName: subject.name,
			labFaculty: null,
			registeredAt: new Date()
		});
		await group.save();
	}

	const populated = await group.populate(POPULATE);
	res.status(200).json(new ApiResponse(true, "Subject registered for course project", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Student owner: select lab faculty for a registered subject ────────────
export const assignCourseProjectLabFaculty = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const ownerId = req.user!.userId;
	const { id } = req.params as { id: string };
	const { subjectId, facultyId } = req.body as { subjectId?: string; facultyId?: string | null };

	if (!subjectId?.trim()) {
		res.status(400).json(new ApiResponse(false, "Subject is required", null));
		return;
	}

	if (!Types.ObjectId.isValid(subjectId)) {
		res.status(400).json(new ApiResponse(false, "Invalid subject ID", null));
		return;
	}

	const group = await ProjectGroupModel.findOne({ _id: id, owner: ownerId });
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found or unauthorized", null));
		return;
	}

	group.courseProjectRegistrations = group.courseProjectRegistrations ?? [];

	const registration = group.courseProjectRegistrations.find((entry) => String(entry.subjectId) === subjectId);
	if (!registration) {
		res.status(400).json(new ApiResponse(false, "Register the subject before choosing a lab faculty", null));
		return;
	}

	let assignedFacultyName: string | null = null;

	if (facultyId) {
		if (!Types.ObjectId.isValid(facultyId)) {
			res.status(400).json(new ApiResponse(false, "Invalid faculty ID", null));
			return;
		}

		const faculty = await UserModel.findOne({ _id: facultyId, role: "guide" }).select("name").lean();
		if (!faculty) {
			res.status(404).json(new ApiResponse(false, "Lab faculty not found", null));
			return;
		}

		registration.labFaculty = new Types.ObjectId(facultyId);
		assignedFacultyName = faculty.name;
	} else {
		registration.labFaculty = null;
		assignedFacultyName = null;
	}

	group.projects = group.projects?.map((project) => {
		if (String(project.subjectId) !== subjectId) return project;
		return {
			...project,
			title: project.title,
			subjectId: project.subjectId,
			subjectName: project.subjectName,
			guideName: assignedFacultyName ?? "Not assigned",
			repositoryUrl: project.repositoryUrl ?? null,
			createdBy: project.createdBy,
			createdAt: project.createdAt,
			_id: project._id
		};
	});

	await group.save();
	const populated = await group.populate(POPULATE);
	res.status(200).json(new ApiResponse(true, "Lab faculty updated", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Student owner: register group for EDI guide assignment ─────────────────
export const registerEdiGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const ownerId = req.user!.userId;
	const { id } = req.params as { id: string };

	const group = await ProjectGroupModel.findOne({ _id: id, owner: ownerId });
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found or unauthorized", null));
		return;
	}

	if (group.isEdiRegistered) {
		const populatedGroup = await group.populate(POPULATE);
		res.status(200).json(new ApiResponse(true, "Group already registered for EDI", formatGroup(populatedGroup.toObject() as unknown as Record<string, unknown>)));
		return;
	}

	group.isEdiRegistered = true;
	await group.save();

	const populated = await group.populate(POPULATE);
	res.status(200).json(new ApiResponse(true, "Group registered for EDI successfully", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Student owner: delete group ─────────────────────────────────────────────
export const deleteGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const ownerId = req.user!.userId;
	const { id } = req.params as { id: string };

	const group = await ProjectGroupModel.findOneAndDelete({ _id: id, owner: ownerId });
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found or unauthorized", null));
		return;
	}

	res.status(200).json(new ApiResponse(true, "Group deleted", null));
});

// ─── Guide: view groups assigned to them ─────────────────────────────────────
export const getGuideGroups = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const guideId = req.user!.userId;

	const groups = await ProjectGroupModel.find({
		$or: [
			{ ediGuide: guideId },
			{ cpGuide: guideId },
			{ "courseProjectRegistrations.labFaculty": guideId }
		]
	}).populate(POPULATE).sort({ createdAt: -1 }).lean();

	res.status(200).json(new ApiResponse(true, "Guide groups fetched", groups.map((g) => formatGroup(g as unknown as Record<string, unknown>))));
});

// ─── Admin: assign or unassign a guide to a group ────────────────────────────
export const assignGuide = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const { id } = req.params as { id: string };
	const { guideId } = req.body as { guideId?: string | null };
	const EDI_MAJOR_PROJECT_SUBJECT = "Engineering Design Innovation";

	const group = await ProjectGroupModel.findById(id);
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found", null));
		return;
	}

	if (!group.isEdiRegistered || group.subject !== EDI_MAJOR_PROJECT_SUBJECT) {
		res.status(400).json(new ApiResponse(false, "Only EDI major project groups can receive EDI guides", null));
		return;
	}

	if (guideId) {
		if (!Types.ObjectId.isValid(guideId)) {
			res.status(400).json(new ApiResponse(false, "Invalid guide ID", null));
			return;
		}
		const guide = await UserModel.findOne({ _id: guideId, role: "guide" });
		if (!guide) {
			res.status(404).json(new ApiResponse(false, "Guide not found", null));
			return;
		}
		if (group.cpGuide && String(group.cpGuide) === guideId) {
			res.status(400).json(new ApiResponse(false, "EDI and Course Project guides must be different", null));
			return;
		}
		group.ediGuide = new Types.ObjectId(guideId);
	} else {
		group.ediGuide = undefined;
	}

	await group.save();
	const populated = await group.populate(POPULATE);
	res.status(200).json(new ApiResponse(true, "EDI guide assignment updated", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Admin: randomly assign EDI guide with capacity limit ───────────────────
export const assignGuideRandomly = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const { id } = req.params as { id: string };
	const EDI_MAJOR_PROJECT_SUBJECT = "Engineering Design Innovation";

	const group = await ProjectGroupModel.findById(id);
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found", null));
		return;
	}

	if (!group.isEdiRegistered || group.subject !== EDI_MAJOR_PROJECT_SUBJECT) {
		res.status(400).json(new ApiResponse(false, "Only EDI major project groups can receive EDI guides", null));
		return;
	}

	const guides = await UserModel.find({ role: "guide" }).select("name email").lean();
	if (guides.length === 0) {
		res.status(400).json(new ApiResponse(false, "No guides available for assignment", null));
		return;
	}

	const globalLimit = await getEdiGlobalLimit();
	if (globalLimit <= 0) {
		res.status(400).json(new ApiResponse(false, "Global EDI guide limit is set to 0. Increase it to allow assignment.", null));
		return;
	}

	const guideIds = guides.map((guide) => guide._id);
	const assignmentStats = await ProjectGroupModel.aggregate<{ _id: Types.ObjectId; count: number }>([
		{ $match: { isEdiRegistered: true, ediGuide: { $in: guideIds } } },
		{ $group: { _id: "$ediGuide", count: { $sum: 1 } } }
	]);

	const countMap = new Map(assignmentStats.map((entry) => [String(entry._id), entry.count]));
	const currentGuideId = group.ediGuide ? String(group.ediGuide) : null;

	const eligibleGuides = guides.filter((guide) => {
		const guideId = String(guide._id);
		const currentCount = countMap.get(guideId) ?? 0;
		const countAfterUnassigningCurrent = currentGuideId === guideId ? Math.max(0, currentCount - 1) : currentCount;
		return countAfterUnassigningCurrent < globalLimit;
	});

	if (eligibleGuides.length === 0) {
		res.status(400).json(new ApiResponse(false, "No guide has remaining EDI assignment capacity", null));
		return;
	}

	const randomIndex = Math.floor(Math.random() * eligibleGuides.length);
	const selectedGuide = eligibleGuides[randomIndex];
	group.ediGuide = new Types.ObjectId(String(selectedGuide._id));

	await group.save();
	const populated = await group.populate(POPULATE);
	res.status(200).json(
		new ApiResponse(
			true,
			`Random EDI guide assigned successfully (global limit ${globalLimit})`,
			formatGroup(populated.toObject() as unknown as Record<string, unknown>)
		)
	);
});

// ─── Admin: get global EDI guide assignment limit ──────────────────────────
export const getEdiGuideLimit = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
	const limit = await getEdiGlobalLimit();
	res.status(200).json(new ApiResponse(true, "Global EDI guide limit fetched", { limit }));
});

// ─── Admin: set global EDI guide assignment limit ──────────────────────────
export const updateEdiGuideLimit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const { limit } = req.body as { limit?: number };

	if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 0) {
		res.status(400).json(new ApiResponse(false, "Limit must be a non-negative integer", null));
		return;
	}

	await SystemSettingModel.findOneAndUpdate(
		{ key: EDI_GLOBAL_LIMIT_KEY },
		{ $set: { valueNumber: limit } },
		{ upsert: true, new: true }
	);

	res.status(200).json(new ApiResponse(true, "Global EDI assignment limit updated", { limit }));
});

// ─── Admin: assign or unassign a course project guide ───────────────────────
export const assignCpGuide = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const { id } = req.params as { id: string };
	const { guideId } = req.body as { guideId?: string | null };

	const group = await ProjectGroupModel.findById(id);
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found", null));
		return;
	}

	if (guideId) {
		if (!Types.ObjectId.isValid(guideId)) {
			res.status(400).json(new ApiResponse(false, "Invalid guide ID", null));
			return;
		}
		const guide = await UserModel.findOne({ _id: guideId, role: "guide" });
		if (!guide) {
			res.status(404).json(new ApiResponse(false, "Guide not found", null));
			return;
		}
		if (group.ediGuide && String(group.ediGuide) === guideId) {
			res.status(400).json(new ApiResponse(false, "EDI and Course Project guides must be different", null));
			return;
		}
		group.cpGuide = new Types.ObjectId(guideId);
	} else {
		group.cpGuide = undefined;
	}

	await group.save();
	const populated = await group.populate(POPULATE);
	res.status(200).json(new ApiResponse(true, "Course project guide assignment updated", formatGroup(populated.toObject() as unknown as Record<string, unknown>)));
});

// ─── Admin: view all groups ───────────────────────────────────────────────────
export const getAllGroups = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
	const groups = await ProjectGroupModel.find({}).populate(POPULATE).sort({ createdAt: -1 }).lean();

	res.status(200).json(new ApiResponse(true, "Groups fetched", groups.map((g) => formatGroup(g as unknown as Record<string, unknown>))));
});

// ─── Admin: student division summary (in groups vs not in groups) ───────────
export const getStudentDivisionSummary = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
	const [students, groups] = await Promise.all([
		UserModel.find({ role: "student" }).select("name email branch division rollNo").lean(),
		ProjectGroupModel.find({}).select("name members").lean()
	]);

	const groupedStudentIds = new Set<string>();
	for (const group of groups) {
		for (const memberId of group.members ?? []) {
			groupedStudentIds.add(String(memberId));
		}
	}

	const divisionMap = new Map<string, {
		key: string;
		branch: string;
		division: string;
		totalStudents: number;
		studentsInGroups: number;
		studentsNotInGroups: number;
	}>();

	for (const student of students) {
		const branch = student.branch?.trim() || "Unknown Branch";
		const division = student.division?.trim() || "Unassigned Division";
		const key = `${branch}::${division}`;

		if (!divisionMap.has(key)) {
			divisionMap.set(key, {
				key,
				branch,
				division,
				totalStudents: 0,
				studentsInGroups: 0,
				studentsNotInGroups: 0
			});
		}

		const bucket = divisionMap.get(key)!;
		bucket.totalStudents += 1;
		if (groupedStudentIds.has(String(student._id))) {
			bucket.studentsInGroups += 1;
		} else {
			bucket.studentsNotInGroups += 1;
		}
	}

	const result = [...divisionMap.values()].sort((left, right) => `${left.branch}-${left.division}`.localeCompare(`${right.branch}-${right.division}`));
	res.status(200).json(new ApiResponse(true, "Student division summary fetched", result));
});

// ─── Admin: student details for one branch+division ─────────────────────────
export const getStudentDivisionDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const branch = String(req.query.branch ?? "").trim();
	const division = String(req.query.division ?? "").trim();

	if (!branch || !division) {
		res.status(400).json(new ApiResponse(false, "branch and division query params are required", null));
		return;
	}

	const [students, groups] = await Promise.all([
		UserModel.find({ role: "student", branch, division }).select("name email branch division rollNo").lean(),
		ProjectGroupModel.find({}).select("name members").lean()
	]);

	const studentToGroupMap = new Map<string, { groupId: string; groupName: string }>();
	for (const group of groups) {
		for (const memberId of group.members ?? []) {
			const key = String(memberId);
			if (!studentToGroupMap.has(key)) {
				studentToGroupMap.set(key, { groupId: String(group._id), groupName: group.name });
			}
		}
	}

	const studentsInGroups: StudentGroupStatus[] = [];
	const studentsNotInGroups: StudentGroupStatus[] = [];

	for (const student of students) {
		const mappedGroup = studentToGroupMap.get(String(student._id));
		const mapped: StudentGroupStatus = {
			id: String(student._id),
			name: student.name,
			email: student.email,
			branch: student.branch?.trim() || branch,
			division: student.division?.trim() || division,
			rollNo: student.rollNo?.trim() || null,
			groupId: mappedGroup?.groupId ?? null,
			groupName: mappedGroup?.groupName ?? null
		};

		if (mappedGroup) {
			studentsInGroups.push(mapped);
		} else {
			studentsNotInGroups.push(mapped);
		}
	}

	const sortStudents = (left: StudentGroupStatus, right: StudentGroupStatus) => {
		if (left.rollNo && right.rollNo) return left.rollNo.localeCompare(right.rollNo);
		if (left.rollNo && !right.rollNo) return -1;
		if (!left.rollNo && right.rollNo) return 1;
		return left.name.localeCompare(right.name);
	};

	studentsInGroups.sort(sortStudents);
	studentsNotInGroups.sort(sortStudents);

	res.status(200).json(
		new ApiResponse(true, "Student division details fetched", {
			branch,
			division,
			totalStudents: students.length,
			studentsInGroupsCount: studentsInGroups.length,
			studentsNotInGroupsCount: studentsNotInGroups.length,
			studentsInGroups,
			studentsNotInGroups
		})
	);
});

// ─── Admin: division-wise ungrouped student summary for EDI ─────────────────
export const getEdiUngroupedStudentsByDivision = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
	const [students, ediGroups] = await Promise.all([
		UserModel.find({ role: "student" }).select("name email branch division rollNo").lean(),
		ProjectGroupModel.find({ isEdiRegistered: true }).select("members").lean()
	]);

	const groupedStudentIds = new Set<string>();
	for (const group of ediGroups) {
		for (const memberId of group.members ?? []) {
			groupedStudentIds.add(String(memberId));
		}
	}

	const divisionMap = new Map<string, {
		key: string;
		branch: string;
		division: string;
		totalStudents: number;
		groupedStudents: number;
		ungroupedStudents: number;
		remainingStudents: StudentSummary[];
	}>();

	for (const student of students) {
		const branch = student.branch?.trim() || "Unknown Branch";
		const division = student.division?.trim() || "Unassigned Division";
		const key = `${branch}::${division}`;

		if (!divisionMap.has(key)) {
			divisionMap.set(key, {
				key,
				branch,
				division,
				totalStudents: 0,
				groupedStudents: 0,
				ungroupedStudents: 0,
				remainingStudents: []
			});
		}

		const bucket = divisionMap.get(key)!;
		bucket.totalStudents += 1;

		const isGroupedForEdi = groupedStudentIds.has(String(student._id));
		if (isGroupedForEdi) {
			bucket.groupedStudents += 1;
		} else {
			bucket.ungroupedStudents += 1;
			bucket.remainingStudents.push({
				id: String(student._id),
				name: student.name,
				email: student.email,
				branch,
				division,
				rollNo: student.rollNo?.trim() || null
			});
		}
	}

	const result = [...divisionMap.values()]
		.map((bucket) => {
			bucket.remainingStudents.sort((left, right) => {
				if (left.rollNo && right.rollNo) return left.rollNo.localeCompare(right.rollNo);
				if (left.rollNo && !right.rollNo) return -1;
				if (!left.rollNo && right.rollNo) return 1;
				return left.name.localeCompare(right.name);
			});

			const studentsNeededToCompleteNextGroup = bucket.ungroupedStudents === 0
				? 0
				: (4 - (bucket.ungroupedStudents % 4)) % 4;

			return {
				...bucket,
				potentialFullGroups: Math.floor(bucket.ungroupedStudents / 4),
				studentsNeededToCompleteNextGroup
			};
		})
		.sort((left, right) => `${left.branch}-${left.division}`.localeCompare(`${right.branch}-${right.division}`));

	res.status(200).json(new ApiResponse(true, "EDI ungrouped students by division fetched", result));
});

// ─── Admin: list all guide users ─────────────────────────────────────────────
export const getAllGuides = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
	const guides = await UserModel.find({ role: "guide" })
		.select("name email teachingSubjects")
		.populate("teachingSubjects", "name description")
		.lean();

	const guideIds = guides.map((guide) => guide._id);
	const assignmentStats = await ProjectGroupModel.aggregate<{ _id: Types.ObjectId; count: number }>([
		{ $match: { isEdiRegistered: true, ediGuide: { $in: guideIds } } },
		{ $group: { _id: "$ediGuide", count: { $sum: 1 } } }
	]);

	const countMap = new Map(assignmentStats.map((entry) => [String(entry._id), entry.count]));
	const result = guides.map((guide) => ({
		...fu(guide as unknown as PopUser),
		ediAssignedCount: countMap.get(String(guide._id)) ?? 0
	}));

	res.status(200).json(new ApiResponse(true, "Guides fetched", result));
});

// ─── Student / Guide / Admin: list guides for a subject ─────────────────────
export const getGuidesBySubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const { subjectId } = req.params as { subjectId: string };

	if (!Types.ObjectId.isValid(subjectId)) {
		res.status(400).json(new ApiResponse(false, "Invalid subject ID", null));
		return;
	}

	const subject = await SubjectModel.findById(subjectId).select("_id").lean();
	if (!subject) {
		res.status(404).json(new ApiResponse(false, "Subject not found", null));
		return;
	}

	const guides = await UserModel.find({ role: "guide", teachingSubjects: subjectId })
		.select("name email teachingSubjects")
		.populate("teachingSubjects", "name description")
		.lean();

	res.status(200).json(
		new ApiResponse(true, "Guides fetched", guides.map((g) => fu(g as unknown as PopUser)))
	);
});


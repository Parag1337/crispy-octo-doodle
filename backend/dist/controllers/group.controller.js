"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuidesBySubject = exports.getAllGuides = exports.getEdiUngroupedStudentsByDivision = exports.getStudentDivisionDetails = exports.getStudentDivisionSummary = exports.getAllGroups = exports.assignCpGuide = exports.updateEdiGuideLimit = exports.getEdiGuideLimit = exports.assignGuideRandomly = exports.assignGuide = exports.getGuideGroups = exports.deleteGroup = exports.registerEdiGroup = exports.assignCourseProjectLabFaculty = exports.registerCourseProjectSubject = exports.updateGroupProject = exports.addGroupProject = exports.updateGroup = exports.leaveGroup = exports.removeMember = exports.cancelInvite = exports.respondToInvite = exports.inviteStudent = exports.getMyInvites = exports.getMyGroup = exports.createGroup = exports.getAllGroupNames = void 0;
exports.getAllGroupNames = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const groups = await projectGroup_model_1.ProjectGroupModel.find({}, { name: 1, _id: 0 })
        .populate({ path: "owner", select: "branch division" })
        .lean();
    // Each group: { name, owner: { branch, division } }
    const result = groups.map((g) => ({
        name: g.name,
        branch: g.owner?.branch || null,
        division: g.owner?.division || null
    }));
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Group names fetched", result));
});
const mongoose_1 = require("mongoose");
const projectGroup_model_1 = require("../models/projectGroup.model");
const subject_model_1 = require("../models/subject.model");
const systemSetting_model_1 = require("../models/systemSetting.model");
const user_model_1 = require("../models/user.model");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = require("../utils/asyncHandler");
const POPULATE = [
    { path: "owner", select: "name email branch division" },
    { path: "ediGuide", select: "name email" },
    { path: "cpGuide", select: "name email" },
    { path: "courseProjectRegistrations.subjectId", select: "name" },
    { path: "courseProjectRegistrations.labFaculty", select: "name email" },
    { path: "members", select: "name email role branch division rollNo" },
    { path: "pendingInvites", select: "name email" }
];
const toTeachingSubjectIds = (subjects = []) => subjects
    .map((subject) => {
    if (typeof subject === "string")
        return subject;
    if (subject && typeof subject === "object" && "_id" in subject)
        return String(subject._id ?? "");
    return String(subject ?? "");
})
    .filter(Boolean);
const fu = (u) => {
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
    const setting = await systemSetting_model_1.SystemSettingModel.findOne({ key: EDI_GLOBAL_LIMIT_KEY }).select("valueNumber").lean();
    if (!setting || typeof setting.valueNumber !== "number")
        return EDI_GLOBAL_LIMIT_DEFAULT;
    return setting.valueNumber;
};
const normalizeRepositoryUrl = (value) => value.trim().replace(/\/+$/, "");
const isValidGithubRepositoryUrl = (value) => /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/i.test(value);
const toMember = (user) => {
    if (!user || typeof user !== "object")
        return null;
    return { ...fu(user), role: user.role ?? "student" };
};
const formatGroup = (g) => {
    const owner = g.owner;
    const ownerMember = toMember(owner);
    const members = g.members
        .filter(Boolean)
        .map((m) => m ? toMember(m) : null)
        .filter(Boolean);
    const finalMembers = ownerMember && !members.some((member) => member.id === ownerMember.id)
        ? [ownerMember, ...members]
        : members;
    return {
        id: String(g._id),
        name: g.name,
        subject: g.subject || "General",
        repositoryUrl: g.repositoryUrl ?? null,
        isEdiRegistered: Boolean(g.isEdiRegistered),
        owner: fu(owner),
        guide: g.ediGuide ? fu(g.ediGuide) : null,
        ediGuide: g.ediGuide ? fu(g.ediGuide) : null,
        cpGuide: g.cpGuide ? fu(g.cpGuide) : null,
        projects: (g.projects ?? []).map((entry) => {
            const project = entry;
            const subjectId = project.subjectId;
            const createdBy = project.createdBy;
            return {
                id: String(project._id ?? ""),
                title: String(project.title ?? ""),
                subjectId: String(subjectId?._id ?? project.subjectId ?? ""),
                subjectName: String(project.subjectName ?? ""),
                guideName: String(project.guideName ?? "Not assigned"),
                repositoryUrl: project.repositoryUrl ?? null,
                createdBy: String(createdBy?._id ?? project.createdBy ?? ""),
                createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : null
            };
        }),
        courseProjectRegistrations: (g.courseProjectRegistrations ?? []).map((entry) => {
            const registration = entry;
            const subjectId = registration.subjectId;
            return {
                subjectId: String(subjectId?._id ?? registration.subjectId ?? ""),
                subjectName: String(registration.subjectName ?? ""),
                labFaculty: registration.labFaculty ? fu(registration.labFaculty) : null,
                registeredAt: registration.registeredAt ? new Date(registration.registeredAt).toISOString() : null
            };
        }),
        members: finalMembers,
        pendingInvites: g.pendingInvites.filter(Boolean).map((p) => p ? fu(p) : null).filter(Boolean)
    };
};
const userBelongsToGroup = (group, userId) => String(group.owner) === userId || group.members.some((memberId) => String(memberId) === userId);
const resolveProjectGuideName = async (group, subjectId) => {
    const registrations = group.courseProjectRegistrations ?? [];
    const registration = registrations.find((entry) => String(entry.subjectId?._id ?? entry.subjectId ?? "") === subjectId);
    if (!registration?.labFaculty)
        return "Not assigned";
    const facultyId = String(registration.labFaculty?._id ?? registration.labFaculty ?? "");
    const faculty = await user_model_1.UserModel.findById(facultyId).select("name").lean();
    return faculty?.name ?? "Not assigned";
};
// ─── Student: create a group (becomes owner + first member) ──────────────────
exports.createGroup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const ownerId = req.user.userId;
    const { name, subject, repositoryUrl } = req.body;
    const user = await user_model_1.UserModel.findById(ownerId).select("hasCreatedGroup").lean();
    const existingGroup = await projectGroup_model_1.ProjectGroupModel.exists({ $or: [{ owner: ownerId }, { members: ownerId }] });
    if (user?.hasCreatedGroup || existingGroup) {
        res.status(409).json(new ApiResponse_1.ApiResponse(false, "You can create only one group", null));
        return;
    }
    if (!name?.trim()) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Group name is required", null));
        return;
    }
    if (!subject?.trim()) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Subject is required", null));
        return;
    }
    let normalizedRepositoryUrl = null;
    if (repositoryUrl && repositoryUrl.trim()) {
        normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
        if (!isValidGithubRepositoryUrl(normalizedRepositoryUrl)) {
            res.status(400).json(new ApiResponse_1.ApiResponse(false, "Provide a valid GitHub repository URL", null));
            return;
        }
    }
    const group = await projectGroup_model_1.ProjectGroupModel.create({
        name: name.trim(),
        subject: subject.trim(),
        repositoryUrl: normalizedRepositoryUrl,
        isEdiRegistered: false,
        owner: new mongoose_1.Types.ObjectId(ownerId),
        ediGuide: null,
        cpGuide: null,
        courseProjectRegistrations: [],
        members: [new mongoose_1.Types.ObjectId(ownerId)],
        pendingInvites: []
    });
    const populated = await group.populate(POPULATE);
    await user_model_1.UserModel.updateOne({ _id: ownerId }, { $set: { hasCreatedGroup: true } });
    res.status(201).json(new ApiResponse_1.ApiResponse(true, "Group created", formatGroup(populated.toObject())));
});
// ─── Student: fetch all groups where the user is the owner or a member ───
exports.getMyGroup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const groups = await projectGroup_model_1.ProjectGroupModel.find({
        $or: [{ owner: userId }, { members: userId }]
    }).populate(POPULATE).sort({ createdAt: -1 }).lean();
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Groups fetched", groups.map((g) => formatGroup(g))));
});
// ─── Student: fetch all pending invites sent to them ─────────────────────────
exports.getMyInvites = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const groups = await projectGroup_model_1.ProjectGroupModel.find({ pendingInvites: userId })
        .populate("owner", "name email")
        .populate("members", "name email")
        .lean();
    const result = groups.map((g) => {
        const owner = g.owner;
        return {
            groupId: String(g._id),
            groupName: g.name,
            subject: g.subject || "General",
            owner: owner ? fu(owner) : { id: "", name: "Unknown", email: "" },
            memberCount: g.members.length
        };
    });
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Invites fetched", result));
});
// ─── Student owner: invite a student by email ────────────────────────────────
exports.inviteStudent = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const { email } = req.body;
    if (!email?.trim()) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Email is required", null));
        return;
    }
    const group = await projectGroup_model_1.ProjectGroupModel.findOne({ _id: id, owner: ownerId });
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found or you are not the owner", null));
        return;
    }
    if (group.members.length >= 4) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Group is full (maximum 4 members)", null));
        return;
    }
    const student = await user_model_1.UserModel.findOne({ email: email.trim().toLowerCase(), role: "student" });
    if (!student) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "No student account found with that email", null));
        return;
    }
    const studentId = String(student._id);
    if (studentId === ownerId) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "You cannot invite yourself", null));
        return;
    }
    if (group.members.some((m) => String(m) === studentId)) {
        res.status(409).json(new ApiResponse_1.ApiResponse(false, "This student is already a member", null));
        return;
    }
    if (group.pendingInvites.some((i) => String(i) === studentId)) {
        res.status(409).json(new ApiResponse_1.ApiResponse(false, "Invite already sent to this student", null));
        return;
    }
    group.pendingInvites.push(new mongoose_1.Types.ObjectId(studentId));
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Invite sent", formatGroup(populated.toObject())));
});
// ─── Student: accept or decline an invite ────────────────────────────────────
exports.respondToInvite = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const studentId = req.user.userId;
    const { id } = req.params;
    const { action } = req.body;
    if (action !== "accept" && action !== "decline") {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Action must be 'accept' or 'decline'", null));
        return;
    }
    const group = await projectGroup_model_1.ProjectGroupModel.findOne({ _id: id, pendingInvites: studentId });
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Invite not found", null));
        return;
    }
    if (action === "accept") {
        if (group.members.length >= 4) {
            res.status(400).json(new ApiResponse_1.ApiResponse(false, "Group is now full", null));
            return;
        }
        group.pendingInvites = group.pendingInvites.filter((i) => String(i) !== studentId);
        group.members.push(new mongoose_1.Types.ObjectId(studentId));
    }
    else {
        group.pendingInvites = group.pendingInvites.filter((i) => String(i) !== studentId);
    }
    await group.save();
    res.status(200).json(new ApiResponse_1.ApiResponse(true, action === "accept" ? "Joined group successfully" : "Invite declined", { joined: action === "accept" }));
});
// ─── Student owner: cancel a pending invite ───────────────────────────────────
exports.cancelInvite = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const ownerId = req.user.userId;
    const { id, studentId } = req.params;
    const group = await projectGroup_model_1.ProjectGroupModel.findOne({ _id: id, owner: ownerId });
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found or unauthorized", null));
        return;
    }
    group.pendingInvites = group.pendingInvites.filter((i) => String(i) !== studentId);
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Invite cancelled", formatGroup(populated.toObject())));
});
// ─── Student owner: remove a member ──────────────────────────────────────────
exports.removeMember = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const ownerId = req.user.userId;
    const { id, memberId } = req.params;
    if (memberId === ownerId) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Owner cannot remove themselves. Delete the group instead.", null));
        return;
    }
    const group = await projectGroup_model_1.ProjectGroupModel.findOne({ _id: id, owner: ownerId });
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found or unauthorized", null));
        return;
    }
    group.members = group.members.filter((m) => String(m) !== memberId);
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Member removed", formatGroup(populated.toObject())));
});
// ─── Student member: leave group (non-owner only) ────────────────────────────
exports.leaveGroup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const group = await projectGroup_model_1.ProjectGroupModel.findOne({ _id: id, members: userId });
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "You are not in this group", null));
        return;
    }
    if (String(group.owner) === userId) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Group owner cannot leave. Delete the group instead.", null));
        return;
    }
    group.members = group.members.filter((m) => String(m) !== userId);
    await group.save();
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Left group successfully", null));
});
// ─── Student owner: update group name / subject ──────────────────────────────
exports.updateGroup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, subject, repositoryUrl } = req.body;
    const group = await projectGroup_model_1.ProjectGroupModel.findById(id);
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found or unauthorized", null));
        return;
    }
    const isMember = group.members.some((memberId) => String(memberId) === userId);
    if (!isMember) {
        res.status(403).json(new ApiResponse_1.ApiResponse(false, "Only group members can update this group", null));
        return;
    }
    const isOwner = String(group.owner) === userId;
    if ((name?.trim() || subject?.trim()) && !isOwner) {
        res.status(403).json(new ApiResponse_1.ApiResponse(false, "Only group owner can update name or subject", null));
        return;
    }
    if (name?.trim())
        group.name = name.trim();
    if (subject?.trim())
        group.subject = subject.trim();
    if (repositoryUrl !== undefined) {
        if (!repositoryUrl || !repositoryUrl.trim()) {
            group.repositoryUrl = null;
        }
        else {
            const normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
            if (!isValidGithubRepositoryUrl(normalizedRepositoryUrl)) {
                res.status(400).json(new ApiResponse_1.ApiResponse(false, "Provide a valid GitHub repository URL", null));
                return;
            }
            group.repositoryUrl = normalizedRepositoryUrl;
        }
    }
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Group updated", formatGroup(populated.toObject())));
});
// ─── Group members: create a shared project ────────────────────────────────
exports.addGroupProject = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, subjectId } = req.body;
    if (!title?.trim()) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Project title is required", null));
        return;
    }
    if (!subjectId?.trim()) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Subject is required", null));
        return;
    }
    const group = await projectGroup_model_1.ProjectGroupModel.findById(id);
    if (!group || !userBelongsToGroup(group.toObject(), userId)) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found or unauthorized", null));
        return;
    }
    let subjectName;
    let guideName;
    if (subjectId === "edi") {
        // Special case for EDI projects
        if (!group.isEdiRegistered) {
            res.status(400).json(new ApiResponse_1.ApiResponse(false, "EDI projects can only be added to EDI registered groups", null));
            return;
        }
        subjectName = "Engineering Design Innovation";
        guideName = group.ediGuide ? (await user_model_1.UserModel.findById(group.ediGuide).select("name").lean())?.name ?? "Not assigned" : "Not assigned";
    }
    else {
        // Regular course project
        if (!mongoose_1.Types.ObjectId.isValid(subjectId)) {
            res.status(400).json(new ApiResponse_1.ApiResponse(false, "Invalid subject ID", null));
            return;
        }
        const subject = await subject_model_1.SubjectModel.findById(subjectId).select("name").lean();
        if (!subject) {
            res.status(404).json(new ApiResponse_1.ApiResponse(false, "Subject not found", null));
            return;
        }
        subjectName = subject.name;
        guideName = await resolveProjectGuideName(group.toObject(), subjectId);
    }
    group.projects = group.projects ?? [];
    group.projects.push({
        _id: new mongoose_1.Types.ObjectId(),
        title: title.trim(),
        subjectId: subjectId === "edi" ? new mongoose_1.Types.ObjectId() : new mongoose_1.Types.ObjectId(subjectId), // For EDI, use a dummy ObjectId since it's not a real subject
        subjectName,
        guideName,
        repositoryUrl: null,
        createdBy: new mongoose_1.Types.ObjectId(userId),
        createdAt: new Date()
    });
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(201).json(new ApiResponse_1.ApiResponse(true, "Project added", formatGroup(populated.toObject())));
});
// ─── Group members: update a shared project ────────────────────────────────
exports.updateGroupProject = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { id, projectId } = req.params;
    const { repositoryUrl } = req.body;
    const group = await projectGroup_model_1.ProjectGroupModel.findById(id);
    if (!group || !userBelongsToGroup(group.toObject(), userId)) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found or unauthorized", null));
        return;
    }
    const project = group.projects?.find((entry) => String(entry._id) === projectId);
    if (!project) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Project not found", null));
        return;
    }
    if (repositoryUrl !== undefined) {
        if (!repositoryUrl || !repositoryUrl.trim()) {
            project.repositoryUrl = null;
        }
        else {
            const normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
            if (!isValidGithubRepositoryUrl(normalizedRepositoryUrl)) {
                res.status(400).json(new ApiResponse_1.ApiResponse(false, "Provide a valid GitHub repository URL", null));
                return;
            }
            project.repositoryUrl = normalizedRepositoryUrl;
        }
    }
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Project updated", formatGroup(populated.toObject())));
});
// ─── Student owner: register a subject for course project ───────────────────
exports.registerCourseProjectSubject = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const { subjectId } = req.body;
    if (!subjectId?.trim()) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Subject is required", null));
        return;
    }
    if (!mongoose_1.Types.ObjectId.isValid(subjectId)) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Invalid subject ID", null));
        return;
    }
    const group = await projectGroup_model_1.ProjectGroupModel.findOne({ _id: id, owner: ownerId });
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found or unauthorized", null));
        return;
    }
    group.courseProjectRegistrations = group.courseProjectRegistrations ?? [];
    const subject = await subject_model_1.SubjectModel.findById(subjectId).select("name");
    if (!subject) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Subject not found", null));
        return;
    }
    const existingRegistration = group.courseProjectRegistrations.find((entry) => String(entry.subjectId) === subjectId);
    if (!existingRegistration) {
        group.courseProjectRegistrations.push({
            subjectId: new mongoose_1.Types.ObjectId(subjectId),
            subjectName: subject.name,
            labFaculty: null,
            registeredAt: new Date()
        });
        await group.save();
    }
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Subject registered for course project", formatGroup(populated.toObject())));
});
// ─── Student owner: select lab faculty for a registered subject ────────────
exports.assignCourseProjectLabFaculty = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const { subjectId, facultyId } = req.body;
    if (!subjectId?.trim()) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Subject is required", null));
        return;
    }
    if (!mongoose_1.Types.ObjectId.isValid(subjectId)) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Invalid subject ID", null));
        return;
    }
    const group = await projectGroup_model_1.ProjectGroupModel.findOne({ _id: id, owner: ownerId });
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found or unauthorized", null));
        return;
    }
    group.courseProjectRegistrations = group.courseProjectRegistrations ?? [];
    const registration = group.courseProjectRegistrations.find((entry) => String(entry.subjectId) === subjectId);
    if (!registration) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Register the subject before choosing a lab faculty", null));
        return;
    }
    if (facultyId) {
        if (!mongoose_1.Types.ObjectId.isValid(facultyId)) {
            res.status(400).json(new ApiResponse_1.ApiResponse(false, "Invalid faculty ID", null));
            return;
        }
        const faculty = await user_model_1.UserModel.findOne({ _id: facultyId, role: "guide" });
        if (!faculty) {
            res.status(404).json(new ApiResponse_1.ApiResponse(false, "Lab faculty not found", null));
            return;
        }
        registration.labFaculty = new mongoose_1.Types.ObjectId(facultyId);
    }
    else {
        registration.labFaculty = null;
    }
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Lab faculty updated", formatGroup(populated.toObject())));
});
// ─── Student owner: register group for EDI guide assignment ─────────────────
exports.registerEdiGroup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const group = await projectGroup_model_1.ProjectGroupModel.findOne({ _id: id, owner: ownerId });
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found or unauthorized", null));
        return;
    }
    if (group.isEdiRegistered) {
        const populatedGroup = await group.populate(POPULATE);
        res.status(200).json(new ApiResponse_1.ApiResponse(true, "Group already registered for EDI", formatGroup(populatedGroup.toObject())));
        return;
    }
    group.isEdiRegistered = true;
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Group registered for EDI successfully", formatGroup(populated.toObject())));
});
// ─── Student owner: delete group ─────────────────────────────────────────────
exports.deleteGroup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const group = await projectGroup_model_1.ProjectGroupModel.findOneAndDelete({ _id: id, owner: ownerId });
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found or unauthorized", null));
        return;
    }
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Group deleted", null));
});
// ─── Guide: view groups assigned to them ─────────────────────────────────────
exports.getGuideGroups = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const guideId = req.user.userId;
    const groups = await projectGroup_model_1.ProjectGroupModel.find({
        $or: [
            { ediGuide: guideId },
            { cpGuide: guideId },
            { "courseProjectRegistrations.labFaculty": guideId }
        ]
    }).populate(POPULATE).sort({ createdAt: -1 }).lean();
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Guide groups fetched", groups.map((g) => formatGroup(g))));
});
// ─── Admin: assign or unassign a guide to a group ────────────────────────────
exports.assignGuide = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { guideId } = req.body;
    const EDI_MAJOR_PROJECT_SUBJECT = "Engineering Design Innovation";
    const group = await projectGroup_model_1.ProjectGroupModel.findById(id);
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found", null));
        return;
    }
    if (!group.isEdiRegistered || group.subject !== EDI_MAJOR_PROJECT_SUBJECT) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Only EDI major project groups can receive EDI guides", null));
        return;
    }
    if (guideId) {
        if (!mongoose_1.Types.ObjectId.isValid(guideId)) {
            res.status(400).json(new ApiResponse_1.ApiResponse(false, "Invalid guide ID", null));
            return;
        }
        const guide = await user_model_1.UserModel.findOne({ _id: guideId, role: "guide" });
        if (!guide) {
            res.status(404).json(new ApiResponse_1.ApiResponse(false, "Guide not found", null));
            return;
        }
        if (group.cpGuide && String(group.cpGuide) === guideId) {
            res.status(400).json(new ApiResponse_1.ApiResponse(false, "EDI and Course Project guides must be different", null));
            return;
        }
        group.ediGuide = new mongoose_1.Types.ObjectId(guideId);
    }
    else {
        group.ediGuide = undefined;
    }
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "EDI guide assignment updated", formatGroup(populated.toObject())));
});
// ─── Admin: randomly assign EDI guide with capacity limit ───────────────────
exports.assignGuideRandomly = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const EDI_MAJOR_PROJECT_SUBJECT = "Engineering Design Innovation";
    const group = await projectGroup_model_1.ProjectGroupModel.findById(id);
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found", null));
        return;
    }
    if (!group.isEdiRegistered || group.subject !== EDI_MAJOR_PROJECT_SUBJECT) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Only EDI major project groups can receive EDI guides", null));
        return;
    }
    const guides = await user_model_1.UserModel.find({ role: "guide" }).select("name email").lean();
    if (guides.length === 0) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "No guides available for assignment", null));
        return;
    }
    const globalLimit = await getEdiGlobalLimit();
    if (globalLimit <= 0) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Global EDI guide limit is set to 0. Increase it to allow assignment.", null));
        return;
    }
    const guideIds = guides.map((guide) => guide._id);
    const assignmentStats = await projectGroup_model_1.ProjectGroupModel.aggregate([
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
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "No guide has remaining EDI assignment capacity", null));
        return;
    }
    const randomIndex = Math.floor(Math.random() * eligibleGuides.length);
    const selectedGuide = eligibleGuides[randomIndex];
    group.ediGuide = new mongoose_1.Types.ObjectId(String(selectedGuide._id));
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, `Random EDI guide assigned successfully (global limit ${globalLimit})`, formatGroup(populated.toObject())));
});
// ─── Admin: get global EDI guide assignment limit ──────────────────────────
exports.getEdiGuideLimit = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const limit = await getEdiGlobalLimit();
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Global EDI guide limit fetched", { limit }));
});
// ─── Admin: set global EDI guide assignment limit ──────────────────────────
exports.updateEdiGuideLimit = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit } = req.body;
    if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 0) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Limit must be a non-negative integer", null));
        return;
    }
    await systemSetting_model_1.SystemSettingModel.findOneAndUpdate({ key: EDI_GLOBAL_LIMIT_KEY }, { $set: { valueNumber: limit } }, { upsert: true, new: true });
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Global EDI assignment limit updated", { limit }));
});
// ─── Admin: assign or unassign a course project guide ───────────────────────
exports.assignCpGuide = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { guideId } = req.body;
    const group = await projectGroup_model_1.ProjectGroupModel.findById(id);
    if (!group) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Group not found", null));
        return;
    }
    if (guideId) {
        if (!mongoose_1.Types.ObjectId.isValid(guideId)) {
            res.status(400).json(new ApiResponse_1.ApiResponse(false, "Invalid guide ID", null));
            return;
        }
        const guide = await user_model_1.UserModel.findOne({ _id: guideId, role: "guide" });
        if (!guide) {
            res.status(404).json(new ApiResponse_1.ApiResponse(false, "Guide not found", null));
            return;
        }
        if (group.ediGuide && String(group.ediGuide) === guideId) {
            res.status(400).json(new ApiResponse_1.ApiResponse(false, "EDI and Course Project guides must be different", null));
            return;
        }
        group.cpGuide = new mongoose_1.Types.ObjectId(guideId);
    }
    else {
        group.cpGuide = undefined;
    }
    await group.save();
    const populated = await group.populate(POPULATE);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Course project guide assignment updated", formatGroup(populated.toObject())));
});
// ─── Admin: view all groups ───────────────────────────────────────────────────
exports.getAllGroups = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const groups = await projectGroup_model_1.ProjectGroupModel.find({}).populate(POPULATE).sort({ createdAt: -1 }).lean();
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Groups fetched", groups.map((g) => formatGroup(g))));
});
// ─── Admin: student division summary (in groups vs not in groups) ───────────
exports.getStudentDivisionSummary = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const [students, groups] = await Promise.all([
        user_model_1.UserModel.find({ role: "student" }).select("name email branch division rollNo").lean(),
        projectGroup_model_1.ProjectGroupModel.find({}).select("name members").lean()
    ]);
    const groupedStudentIds = new Set();
    for (const group of groups) {
        for (const memberId of group.members ?? []) {
            groupedStudentIds.add(String(memberId));
        }
    }
    const divisionMap = new Map();
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
        const bucket = divisionMap.get(key);
        bucket.totalStudents += 1;
        if (groupedStudentIds.has(String(student._id))) {
            bucket.studentsInGroups += 1;
        }
        else {
            bucket.studentsNotInGroups += 1;
        }
    }
    const result = [...divisionMap.values()].sort((left, right) => `${left.branch}-${left.division}`.localeCompare(`${right.branch}-${right.division}`));
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Student division summary fetched", result));
});
// ─── Admin: student details for one branch+division ─────────────────────────
exports.getStudentDivisionDetails = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const branch = String(req.query.branch ?? "").trim();
    const division = String(req.query.division ?? "").trim();
    if (!branch || !division) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "branch and division query params are required", null));
        return;
    }
    const [students, groups] = await Promise.all([
        user_model_1.UserModel.find({ role: "student", branch, division }).select("name email branch division rollNo").lean(),
        projectGroup_model_1.ProjectGroupModel.find({}).select("name members").lean()
    ]);
    const studentToGroupMap = new Map();
    for (const group of groups) {
        for (const memberId of group.members ?? []) {
            const key = String(memberId);
            if (!studentToGroupMap.has(key)) {
                studentToGroupMap.set(key, { groupId: String(group._id), groupName: group.name });
            }
        }
    }
    const studentsInGroups = [];
    const studentsNotInGroups = [];
    for (const student of students) {
        const mappedGroup = studentToGroupMap.get(String(student._id));
        const mapped = {
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
        }
        else {
            studentsNotInGroups.push(mapped);
        }
    }
    const sortStudents = (left, right) => {
        if (left.rollNo && right.rollNo)
            return left.rollNo.localeCompare(right.rollNo);
        if (left.rollNo && !right.rollNo)
            return -1;
        if (!left.rollNo && right.rollNo)
            return 1;
        return left.name.localeCompare(right.name);
    };
    studentsInGroups.sort(sortStudents);
    studentsNotInGroups.sort(sortStudents);
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Student division details fetched", {
        branch,
        division,
        totalStudents: students.length,
        studentsInGroupsCount: studentsInGroups.length,
        studentsNotInGroupsCount: studentsNotInGroups.length,
        studentsInGroups,
        studentsNotInGroups
    }));
});
// ─── Admin: division-wise ungrouped student summary for EDI ─────────────────
exports.getEdiUngroupedStudentsByDivision = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const [students, ediGroups] = await Promise.all([
        user_model_1.UserModel.find({ role: "student" }).select("name email branch division rollNo").lean(),
        projectGroup_model_1.ProjectGroupModel.find({ isEdiRegistered: true }).select("members").lean()
    ]);
    const groupedStudentIds = new Set();
    for (const group of ediGroups) {
        for (const memberId of group.members ?? []) {
            groupedStudentIds.add(String(memberId));
        }
    }
    const divisionMap = new Map();
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
        const bucket = divisionMap.get(key);
        bucket.totalStudents += 1;
        const isGroupedForEdi = groupedStudentIds.has(String(student._id));
        if (isGroupedForEdi) {
            bucket.groupedStudents += 1;
        }
        else {
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
            if (left.rollNo && right.rollNo)
                return left.rollNo.localeCompare(right.rollNo);
            if (left.rollNo && !right.rollNo)
                return -1;
            if (!left.rollNo && right.rollNo)
                return 1;
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
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "EDI ungrouped students by division fetched", result));
});
// ─── Admin: list all guide users ─────────────────────────────────────────────
exports.getAllGuides = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const guides = await user_model_1.UserModel.find({ role: "guide" })
        .select("name email teachingSubjects")
        .populate("teachingSubjects", "name description")
        .lean();
    const guideIds = guides.map((guide) => guide._id);
    const assignmentStats = await projectGroup_model_1.ProjectGroupModel.aggregate([
        { $match: { isEdiRegistered: true, ediGuide: { $in: guideIds } } },
        { $group: { _id: "$ediGuide", count: { $sum: 1 } } }
    ]);
    const countMap = new Map(assignmentStats.map((entry) => [String(entry._id), entry.count]));
    const result = guides.map((guide) => ({
        ...fu(guide),
        ediAssignedCount: countMap.get(String(guide._id)) ?? 0
    }));
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Guides fetched", result));
});
// ─── Student / Guide / Admin: list guides for a subject ─────────────────────
exports.getGuidesBySubject = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { subjectId } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(subjectId)) {
        res.status(400).json(new ApiResponse_1.ApiResponse(false, "Invalid subject ID", null));
        return;
    }
    const subject = await subject_model_1.SubjectModel.findById(subjectId).select("_id").lean();
    if (!subject) {
        res.status(404).json(new ApiResponse_1.ApiResponse(false, "Subject not found", null));
        return;
    }
    const guides = await user_model_1.UserModel.find({ role: "guide", teachingSubjects: subjectId })
        .select("name email teachingSubjects")
        .populate("teachingSubjects", "name description")
        .lean();
    res.status(200).json(new ApiResponse_1.ApiResponse(true, "Guides fetched", guides.map((g) => fu(g))));
});

import type { Response } from "express";
import { Types } from "mongoose";
import { ProjectGroupModel } from "../models/projectGroup.model";
import { ProgressUpdateModel } from "../models/progressUpdate.model";
import { TaskModel } from "../models/task.model";
import type { AuthenticatedRequest } from "../types/auth.types";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const isValidCommitUrl = (value: string) => /^https?:\/\/(www\.)?github\.com\/.+\/commit\/[a-f0-9]{7,40}$/i.test(value.trim());

const formatTask = (
	task: {
		_id: unknown;
		title: string;
		description?: string;
		dueDate: Date;
		status: "todo" | "in-progress" | "done";
		priority: "low" | "medium" | "high";
		completionNote?: string;
		completionCommitUrls?: string[];
		completedAt?: Date | null;
		assignee?: unknown;
		group?: unknown;
		project?: { id: unknown; title: string; subjectName: string };
		createdBy?: unknown;
	},
	includeRelations = false
) => {
	const formatted = {
		id: String(task._id),
		title: task.title,
		description: task.description ?? "",
		dueDate: task.dueDate,
		status: task.status,
		priority: task.priority,
		completionNote: task.completionNote ?? "",
		completionCommitUrls: task.completionCommitUrls ?? [],
		completedAt: task.completedAt ?? null,
		project: task.project
			? {
				id: String(task.project.id),
				title: task.project.title,
				subjectName: task.project.subjectName
			}
			: undefined
	};

	if (!includeRelations) return formatted;

	return {
		...formatted,
		assignee: task.assignee as { name: string; email: string },
		group: task.group as { name: string },
		createdBy: task.createdBy as { name: string; email: string }
	};
};

export const getMyTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const userId = req.user?.userId;

	const tasks = await TaskModel.find({ assignee: userId }).populate("group", "name").sort({ dueDate: 1 }).lean();

	const formatted = tasks.map((task) => ({
		...formatTask(task),
		group: task.group as unknown as { name: string }
	}));

	res.status(200).json(new ApiResponse(true, "Tasks fetched", formatted));
});

export const getGuideTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const userId = req.user?.userId;

	const groups = await ProjectGroupModel.find({ ediGuide: userId }).select("_id").lean();
	const groupIds = groups.map((group) => group._id);

	const tasks = await TaskModel.find({ group: { $in: groupIds } })
		.populate("assignee", "name email")
		.populate("group", "name")
		.populate("createdBy", "name email")
		.sort({ createdAt: -1 })
		.lean();

	const formatted = tasks.map((task) => formatTask(task, true));

	res.status(200).json(new ApiResponse(true, "Guide tasks fetched", formatted));
});

export const createGuideTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const guideId = req.user?.userId;
	if (!guideId) {
		res.status(401).json(new ApiResponse(false, "Unauthorized", null));
		return;
	}

	const { groupId, projectId, assigneeId, title, description, dueDate, priority } = req.body as {
		groupId?: string;
		projectId?: string;
		assigneeId?: string;
		title?: string;
		description?: string;
		dueDate?: string;
		priority?: "low" | "medium" | "high";
	};

	if (!groupId || !Types.ObjectId.isValid(groupId)) {
		res.status(400).json(new ApiResponse(false, "Valid groupId is required", null));
		return;
	}

	if (!assigneeId || !Types.ObjectId.isValid(assigneeId)) {
		res.status(400).json(new ApiResponse(false, "Valid assigneeId is required", null));
		return;
	}

	if (!title?.trim()) {
		res.status(400).json(new ApiResponse(false, "Task title is required", null));
		return;
	}

	if (!dueDate) {
		res.status(400).json(new ApiResponse(false, "Task dueDate is required", null));
		return;
	}

	const parsedDueDate = new Date(dueDate);
	if (Number.isNaN(parsedDueDate.getTime())) {
		res.status(400).json(new ApiResponse(false, "Valid dueDate is required", null));
		return;
	}

	const group = await ProjectGroupModel.findOne({ _id: groupId, ediGuide: guideId }).select("name members projects").lean();
	if (!group) {
		res.status(404).json(new ApiResponse(false, "Group not found for this guide", null));
		return;
	}

	const isAssigneeInGroup = group.members.some((memberId) => String(memberId) === assigneeId);
	if (!isAssigneeInGroup) {
		res.status(400).json(new ApiResponse(false, "Assignee must be a member of the selected group", null));
		return;
	}

	let projectData: { id: Types.ObjectId; title: string; subjectName: string } | undefined;
	if (projectId) {
		if (!Types.ObjectId.isValid(projectId)) {
			res.status(400).json(new ApiResponse(false, "Valid projectId is required when selecting a project", null));
			return;
		}

		const projectEntry = group.projects.find((project) => String(project._id) === projectId);
		if (!projectEntry) {
			res.status(400).json(new ApiResponse(false, "Selected project does not belong to this group", null));
			return;
		}

		projectData = {
			id: projectEntry._id,
			title: projectEntry.title,
			subjectName: projectEntry.subjectName
		};
	}

	const task = await TaskModel.create({
		title: title.trim(),
		description: description?.trim() ?? "",
		assignee: new Types.ObjectId(assigneeId),
		group: new Types.ObjectId(groupId),
		project: projectData,
		createdBy: new Types.ObjectId(guideId),
		dueDate: parsedDueDate,
		status: "todo",
		priority: priority ?? "medium",
		completionNote: "",
		completionCommitUrls: [],
		completedAt: null
	});

	const populated = await task.populate([
		{ path: "assignee", select: "name email" },
		{ path: "group", select: "name" },
		{ path: "createdBy", select: "name email" }
	]);

	res.status(201).json(new ApiResponse(true, "Task created", formatTask(populated.toObject(), true)));
});

export const updateMyTaskStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
	const studentId = req.user?.userId;
	if (!studentId) {
		res.status(401).json(new ApiResponse(false, "Unauthorized", null));
		return;
	}

	const { id } = req.params as { id: string };
	const { status, completionNote, completionCommitUrls } = req.body as {
		status?: "todo" | "in-progress" | "done";
		completionNote?: string;
		completionCommitUrls?: string[];
	};

	if (!status || !["todo", "in-progress", "done"].includes(status)) {
		res.status(400).json(new ApiResponse(false, "Valid status is required", null));
		return;
	}

	if (!Types.ObjectId.isValid(id)) {
		res.status(400).json(new ApiResponse(false, "Invalid task id", null));
		return;
	}

	const task = await TaskModel.findOne({ _id: id, assignee: studentId });
	if (!task) {
		res.status(404).json(new ApiResponse(false, "Task not found", null));
		return;
	}

	const commitUrls = Array.isArray(completionCommitUrls)
		? completionCommitUrls.map((url) => url.trim()).filter(Boolean)
		: [];

	if (commitUrls.some((url) => !isValidCommitUrl(url))) {
		res.status(400).json(new ApiResponse(false, "completionCommitUrls must contain valid GitHub commit URLs", null));
		return;
	}

	const previousStatus = task.status;
	task.status = status;

	if (status === "done") {
		task.completionNote = completionNote?.trim() ?? "";
		task.completionCommitUrls = commitUrls;
		task.completedAt = new Date();
	} else {
		task.completedAt = null;
		if (status === "todo") {
			task.completionNote = "";
			task.completionCommitUrls = [];
		}
	}

	await task.save();

	if (status === "done" && previousStatus !== "done") {
		await ProgressUpdateModel.create({
			student: new Types.ObjectId(studentId),
			task: task._id,
			summary: task.completionNote || `Completed task: ${task.title}`,
			completionPercent: 100,
			documentationUrl: task.completionCommitUrls[0]
		});
	}

	const populated = await task.populate("group", "name");
	res.status(200).json(
		new ApiResponse(true, "Task status updated", {
			...formatTask(populated.toObject()),
			group: populated.group as unknown as { name: string }
		})
	);
});

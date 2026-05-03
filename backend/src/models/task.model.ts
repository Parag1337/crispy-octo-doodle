import { Schema, Types, model } from "mongoose";

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface ITask {
	_id: Types.ObjectId;
	title: string;
	description: string;
	assignee: Types.ObjectId;
	group?: Types.ObjectId;
	project?: {
		id: Types.ObjectId;
		title: string;
		subjectName: string;
	};
	createdBy?: Types.ObjectId;
	dueDate: Date;
	status: TaskStatus;
	priority: TaskPriority;
	completionNote?: string;
	completionCommitUrls: string[];
	completedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
	{
		title: { type: String, required: true, trim: true },
		description: { type: String, default: "", trim: true },
		assignee: { type: Schema.Types.ObjectId, ref: "User", required: true },
		group: { type: Schema.Types.ObjectId, ref: "ProjectGroup" },
		project: {
			id: { type: Schema.Types.ObjectId, required: true },
			title: { type: String, required: true, trim: true },
			subjectName: { type: String, required: true, trim: true }
		},
		createdBy: { type: Schema.Types.ObjectId, ref: "User" },
		dueDate: { type: Date, required: true },
		status: {
			type: String,
			enum: ["todo", "in-progress", "done"],
			default: "todo",
			required: true
		},
		priority: {
			type: String,
			enum: ["low", "medium", "high"],
			default: "medium",
			required: true
		},
		completionNote: { type: String, trim: true, default: "" },
		completionCommitUrls: [{ type: String, trim: true }],
		completedAt: { type: Date, default: null }
	},
	{ timestamps: true }
);

export const TaskModel = model<ITask>("Task", taskSchema);

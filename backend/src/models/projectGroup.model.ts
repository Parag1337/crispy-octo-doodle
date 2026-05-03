import { Schema, Types, model } from "mongoose";

export interface IProjectGroup {
	_id: Types.ObjectId;
	name: string;
	subject: string;
	repositoryUrl?: string | null;
	isEdiRegistered: boolean;
	owner: Types.ObjectId;
	ediGuide?: Types.ObjectId;
	cpGuide?: Types.ObjectId;
	projects: {
		_id: Types.ObjectId;
		title: string;
		subjectId: Types.ObjectId;
		subjectName: string;
		guideName: string;
		repositoryUrl?: string | null;
		documents: {
			_id: Types.ObjectId;
			filename: string;
			originalName: string;
			mimeType: string;
			size: number;
			uploadedBy: Types.ObjectId;
			uploadedAt: Date;
		}[];
		createdBy: Types.ObjectId;
		createdAt: Date;
	}[];
	courseProjectRegistrations: {
		subjectId: Types.ObjectId;
		subjectName: string;
		labFaculty?: Types.ObjectId | null;
		registeredAt: Date;
	}[];
	members: Types.ObjectId[];
	pendingInvites: Types.ObjectId[];
	createdAt: Date;
	updatedAt: Date;
}

const projectGroupSchema = new Schema<IProjectGroup>(
	{
		name: { type: String, required: true, trim: true },
		subject: { type: String, required: true, trim: true },
		repositoryUrl: { type: String, trim: true, default: null },
		isEdiRegistered: { type: Boolean, default: false },
		owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
		ediGuide: { type: Schema.Types.ObjectId, ref: "User", default: null },
		cpGuide: { type: Schema.Types.ObjectId, ref: "User", default: null },
		projects: [
			{
				title: { type: String, required: true, trim: true },
				subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
				subjectName: { type: String, required: true, trim: true },
				guideName: { type: String, required: true, trim: true },
				repositoryUrl: { type: String, trim: true, default: null },
				documents: [
					{
						filename: { type: String, required: true },
						originalName: { type: String, required: true },
						mimeType: { type: String, required: true },
						size: { type: Number, required: true },
						uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
						uploadedAt: { type: Date, default: Date.now }
					}
				],
				createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
				createdAt: { type: Date, default: Date.now }
			}
		],
		courseProjectRegistrations: [
			{
				subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
				subjectName: { type: String, required: true, trim: true },
				labFaculty: { type: Schema.Types.ObjectId, ref: "User", default: null },
				registeredAt: { type: Date, default: Date.now }
			}
		],
		members: [{ type: Schema.Types.ObjectId, ref: "User" }],
		pendingInvites: [{ type: Schema.Types.ObjectId, ref: "User" }]
	},
	{ timestamps: true }
);

export const ProjectGroupModel = model<IProjectGroup>("ProjectGroup", projectGroupSchema);

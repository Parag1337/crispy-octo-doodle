import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import { env } from "./src/config/env";
import "./src/models/user.model";
import "./src/models/subject.model";
import "./src/models/projectGroup.model";
import { UserModel } from "./src/models/user.model";
import { SubjectModel } from "./src/models/subject.model";
import { ProjectGroupModel } from "./src/models/projectGroup.model";

const students = [
	{ rollNo: "21BCS001", name: "Arjun Singh" },
	{ rollNo: "21BCS002", name: "Priya Verma" },
	{ rollNo: "21BCS003", name: "Vikram Singh" },
	{ rollNo: "21BCS004", name: "Sneha Kapoor" },
	{ rollNo: "21BCS005", name: "Harsh Mishra" },
	{ rollNo: "21BCS006", name: "Ananya Bhatt" },
	{ rollNo: "21BCS007", name: "Rahul Sharma" },
	{ rollNo: "21BCS008", name: "Divya Patel" },
	{ rollNo: "21BCS009", name: "Nikhil Verma" },
	{ rollNo: "21BCS010", name: "Pooja Singh" },
	{ rollNo: "21BCS011", name: "Sanjay Kumar" },
	{ rollNo: "21BCS012", name: "Anjali Gupta" },
	{ rollNo: "21BCS013", name: "Roshan Kumar" },
	{ rollNo: "21BCS014", name: "Sunita Verma" },
	{ rollNo: "21BCS015", name: "Manish Singh" },
	{ rollNo: "21BCS016", name: "Kavya Sharma" },
	{ rollNo: "21BCS017", name: "Arpit Patel" },
	{ rollNo: "21BCS018", name: "Isha Desai" },
	{ rollNo: "21BCS019", name: "Vikas Yadav" },
	{ rollNo: "21BCS020", name: "Riya Gupta" },
	{ rollNo: "21BCS021", name: "Arun Nair" },
	{ rollNo: "21BCS022", name: "Neha Singh" },
	{ rollNo: "21BCS023", name: "Rohit Pandey" },
	{ rollNo: "21BCS024", name: "Priya Singh" },
	{ rollNo: "21BCS025", name: "Siddharth Joshi" },
	{ rollNo: "21BCS026", name: "Aisha Khan" },
	{ rollNo: "21BCS027", name: "Karan Malhotra" },
	{ rollNo: "21BCS028", name: "Deepti Rawat" }
];

const subjects = ["Data Structures", "Operating System", "Software Engineering"];
const facultyBySubject = {
	"Data Structures": [
		{ name: "Dr. Deepak Rao", email: "deepak.rao@vit.edu" },
		{ name: "Dr. Meera Iyer", email: "meera.iyer@vit.edu" }
	],
	"Operating System": [
		{ name: "Dr. Ravi Kumar", email: "ravi.kumar@vit.edu" },
		{ name: "Dr. Sangeeta Menon", email: "sangeeta.menon@vit.edu" }
	],
	"Software Engineering": [
		{ name: "Dr. Anil Joshi", email: "anil.joshi@vit.edu" },
		{ name: "Dr. Priya Rao", email: "priya.rao@vit.edu" }
	]
};

const chunk = <T,>(items: T[], size: number) => {
	const out: T[][] = [];
	for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
	return out;
};

const run = async () => {
	await mongoose.connect(env.mongoUri as string);
	console.log("Connected to DB");

	await ProjectGroupModel.deleteMany({});
	await SubjectModel.deleteMany({});
	await UserModel.deleteMany({ role: { $in: ["student", "guide"] } });
	console.log("Cleared existing students, guides, subjects, and groups");

	const admin = await UserModel.findOne({ role: "admin" });
	if (!admin) {
		throw new Error("Admin user not found");
	}

	const subjectDocs = new Map<string, any>();
	for (const subjectName of subjects) {
		const doc = await SubjectModel.create({ name: subjectName, description: subjectName, adminId: admin._id });
		subjectDocs.set(subjectName, doc);
	}
	console.log("Created 3 subjects");

	const facultyDocs: any[] = [];
	for (const subjectName of subjects) {
		for (const faculty of facultyBySubject[subjectName as keyof typeof facultyBySubject]) {
			const guide = await UserModel.create({
				name: faculty.name,
				email: faculty.email,
				password: await bcrypt.hash("teacher123", 10),
				role: "guide",
				teachingSubjects: [subjectDocs.get(subjectName)._id]
			});
			facultyDocs.push(guide);
		}
	}
	console.log("Created 6 faculty");

	const studentDocs: any[] = [];
	for (const student of students) {
		const created = await UserModel.create({
			name: student.name,
			email: `${student.name.toLowerCase().replace(/\s+/g, ".")}@vit.edu`,
			password: await bcrypt.hash("student123", 10),
			role: "student",
			branch: "CSE",
			division: "A",
			rollNo: student.rollNo
		});
		studentDocs.push(created);
	}
	console.log("Created 28 students");

	const ediChunks = chunk(studentDocs, 4);
	for (let i = 0; i < ediChunks.length; i++) {
		const groupStudents = ediChunks[i];
		await ProjectGroupModel.create({
			name: `EDI Group ${i + 1}`,
			subject: "Engineering Design Innovation",
			isEdiRegistered: true,
			owner: groupStudents[0]._id,
			members: groupStudents.map((student) => student._id),
			ediGuide: null,
			cpGuide: null
		});
	}
	console.log("Created 7 EDI groups across one major project");

	const cpPlan = [
		{ subject: "Data Structures", groups: 3 },
		{ subject: "Operating System", groups: 2 },
		{ subject: "Software Engineering", groups: 2 }
	];

	let index = 0;
	for (const plan of cpPlan) {
		const subjectStudents = studentDocs.slice(index, index + plan.groups * 4);
		index += plan.groups * 4;
		const guideList = facultyBySubject[plan.subject as keyof typeof facultyBySubject];
		const subjectChunks = chunk(subjectStudents, 4);

		for (let i = 0; i < subjectChunks.length; i++) {
			const groupStudents = subjectChunks[i];
			await ProjectGroupModel.create({
				name: `CP - ${plan.subject} - Group ${i + 1}`,
				subject: plan.subject,
				isEdiRegistered: false,
				owner: groupStudents[0]._id,
				members: groupStudents.map((student) => student._id),
				ediGuide: null,
				cpGuide: facultyDocs.find((guide) => guide.email === guideList[i % guideList.length].email)?._id ?? null
			});
		}
	}
	console.log("Created 7 CP groups across 3 subjects");

	const allStudents = await UserModel.find({ role: "student" }).sort({ rollNo: 1 }).lean();
	const allGroups = await ProjectGroupModel.find().lean();
	const ediGroups = allGroups.filter((group) => group.isEdiRegistered);
	const cpGroups = allGroups.filter((group) => !group.isEdiRegistered);

	const md: string[] = [];
	md.push("# Student Logins & Groups - CSE Division A");
	md.push("");
	md.push(`**Generated**: ${new Date().toLocaleString()}`);
	md.push("");
	md.push("## Overview");
	md.push("");
	md.push(`- **Total Students**: ${allStudents.length}`);
	md.push(`- **Subjects**: ${subjects.join(", ")}`);
	md.push(`- **EDI Groups**: ${ediGroups.length}`);
	md.push(`- **CP Groups**: ${cpGroups.length}`);
	md.push(`- **Default Passwords**: students -> \`student123\`, guides -> \`teacher123\``);
	md.push("");
	md.push("---");
	md.push("");
	md.push("## All Students");
	md.push("");
	md.push("| Roll No | Name | Email | Password | EDI Group | CP Group |\n|---|---|---|---|---|---|");
	for (const student of allStudents) {
		const ediGroup = ediGroups.find((group) => (group.members || []).some((member: any) => String(member) === String(student._id)));
		const cpGroup = cpGroups.find((group) => (group.members || []).some((member: any) => String(member) === String(student._id)));
		md.push(`| ${student.rollNo} | ${student.name} | ${student.email} | \`student123\` | ${ediGroup?.name ?? "—"} | ${cpGroup?.name ?? "—"} |`);
	}
	md.push("");
	md.push("---");
	md.push("");
	md.push("## EDI Groups");
	md.push("");
	for (let i = 0; i < ediGroups.length; i++) {
		const group = ediGroups[i];
		md.push(`### EDI Group ${i + 1}`);
		md.push("");
		md.push("| Student Name | Email | Roll No |\n|---|---|---|");
		for (const member of group.members || []) {
			const student = allStudents.find((entry) => String(entry._id) === String(member));
			md.push(`| ${student?.name ?? "(unknown)"} | ${student?.email ?? ""} | ${student?.rollNo ?? ""} |`);
		}
		md.push("");
	}
	md.push("");
	md.push("---");
	md.push("");
	md.push("## CP Groups");
	md.push("");
	for (const group of cpGroups) {
		const guide = facultyDocs.find((faculty) => String(faculty._id) === String(group.cpGuide));
		md.push(`### ${group.name}`);
		md.push("");
		md.push(`- CP Guide: ${guide?.name ?? "(none)"}`);
		md.push("| Student Name | Email | Roll No |\n|---|---|---|");
		for (const member of group.members || []) {
			const student = allStudents.find((entry) => String(entry._id) === String(member));
			md.push(`| ${student?.name ?? "(unknown)"} | ${student?.email ?? ""} | ${student?.rollNo ?? ""} |`);
		}
		md.push("");
	}

	await fs.writeFile("../STUDENT_LOGINS_AND_GROUPS.md", md.join("\n"), "utf8");
	console.log("Updated STUDENT_LOGINS_AND_GROUPS.md");

	await mongoose.disconnect();
	console.log("Disconnected");
};

run().catch((error) => {
	console.error(error);
	process.exit(1);
});

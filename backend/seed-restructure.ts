import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "./src/config/env";
import "./src/models/user.model";
import "./src/models/subject.model";
import "./src/models/projectGroup.model";
import { UserModel } from "./src/models/user.model";
import { SubjectModel } from "./src/models/subject.model";
import { ProjectGroupModel } from "./src/models/projectGroup.model";
import fs from "fs/promises";

const run = async () => {
	try {
		await mongoose.connect(env.mongoUri as string);
		console.log("Connected to DB");

		// Keep admin, remove guides and students
		await ProjectGroupModel.deleteMany({});
		await SubjectModel.deleteMany({});
		await UserModel.deleteMany({ role: { $in: ["student", "guide"] } });
		console.log("Cleared old subjects, groups, students, and guides");

		// Ensure admin exists
		let admin = await UserModel.findOne({ role: "admin" });
		if (!admin) {
			const hash = await bcrypt.hash("admin123", 10);
			admin = await UserModel.create({ name: "Admin User", email: "admin@vit.edu", password: hash, role: "admin" });
			console.log("Created admin user");
		}

		// Create three subjects
		const subjects = ["Data Structures", "Operating System", "Software Engineering"];
		const subjectDocs = [] as any[];
		for (const s of subjects) {
			const doc = await SubjectModel.create({ name: s, description: s, adminId: admin._id });
			subjectDocs.push(doc);
		}
		console.log("Created subjects:", subjects.join(", "));

		// Create 6 faculty (2 per subject)
		const facultySpecs = [
			{ name: "Dr. Deepak Rao", email: "deepak.rao@vit.edu", subject: "Data Structures" },
			{ name: "Dr. Meera Iyer", email: "meera.iyer@vit.edu", subject: "Data Structures" },
			{ name: "Dr. Ravi Kumar", email: "ravi.kumar@vit.edu", subject: "Operating System" },
			{ name: "Dr. Sangeeta Menon", email: "sangeeta.menon@vit.edu", subject: "Operating System" },
			{ name: "Dr. Anil Joshi", email: "anil.joshi@vit.edu", subject: "Software Engineering" },
			{ name: "Dr. Priya Rao", email: "priya.rao@vit.edu", subject: "Software Engineering" }
		];

		const facultyDocs: any[] = [];
		for (const f of facultySpecs) {
			const hash = await bcrypt.hash("teacher123", 10);
			const subj = subjectDocs.find((x) => x.name === f.subject);
			const user = await UserModel.create({
				name: f.name,
				email: f.email,
				password: hash,
				role: "guide",
				teachingSubjects: [subj._id]
			});
			facultyDocs.push(user);
		}
		console.log("Created 6 faculty (2 per subject)");

		// Create 28 students
		const totalStudents = 28;
		const students: any[] = [];
		for (let i = 1; i <= totalStudents; i++) {
			const roll = `21BCS${String(i).padStart(3, "0")}`;
			const name = `Student ${String(i).padStart(2, "0")}`;
			const email = `${name.toLowerCase().replace(/\s+/g, ".")}@vit.edu`;
			const hash = await bcrypt.hash("student123", 10);
			const u = await UserModel.create({
				name,
				email,
				password: hash,
				role: "student",
				branch: "CSE",
				division: "A",
				rollNo: roll
			});
			students.push(u);
		}
		console.log(`Created ${totalStudents} students`);

		// Partition students into groups of 4 across subjects: DS 3 groups (12), OS 2 groups (8), SE 2 groups (8)
		const dsStudents = students.slice(0, 12);
		const osStudents = students.slice(12, 20);
		const seStudents = students.slice(20, 28);

		const createGroupsFor = async (subjectName: string, studentChunks: any[][], isEdi: boolean, assignCpGuides: boolean) => {
			const subj = subjectDocs.find((s) => s.name === subjectName);
			const guidesForSubject = facultyDocs.filter((f) => (f.teachingSubjects || []).some((id: any) => String(id) === String(subj._id)));
			let gi = 0;
			for (let idx = 0; idx < studentChunks.length; idx++) {
				const chunk = studentChunks[idx];
				const owner = chunk[0];
				const groupName = `${isEdi ? "EDI" : "CP"} - ${subjectName} - Group ${idx + 1}`;
				const groupData: any = {
					name: groupName,
					subject: subjectName,
					isEdiRegistered: isEdi,
					owner: owner._id,
					members: chunk.map((s) => s._id),
					ediGuide: null,
					cpGuide: null
				};
				if (assignCpGuides) {
					// assign cpGuide round-robin among guidesForSubject
					const guide = guidesForSubject[gi % guidesForSubject.length];
					groupData.cpGuide = guide._id;
					gi++;
				}
				await ProjectGroupModel.create(groupData);
			}
		};

		// Helper to chunk arrays
		const chunk = (arr: any[], size: number) => {
			const out: any[][] = [];
			for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
			return out;
		};

		// Create EDI groups (no guides assigned now)
		await createGroupsFor("Data Structures", chunk(dsStudents, 4), true, false);
		await createGroupsFor("Operating System", chunk(osStudents, 4), true, false);
		await createGroupsFor("Software Engineering", chunk(seStudents, 4), true, false);
		console.log("Created EDI groups (no guides assigned)");

		// Create CP groups (assign cpGuide per group)
		await createGroupsFor("Data Structures", chunk(dsStudents, 4), false, true);
		await createGroupsFor("Operating System", chunk(osStudents, 4), false, true);
		await createGroupsFor("Software Engineering", chunk(seStudents, 4), false, true);
		console.log("Created CP groups with assigned CP guides");

		// Update markdown file
		const mdLines: string[] = [];
		mdLines.push("# Student Logins & Groups - CSE Division A\n");
		mdLines.push(`**Generated**: ${new Date().toLocaleString()}\n`);
		mdLines.push("## Overview\n");
		mdLines.push(`- **Total Students**: ${totalStudents}`);
		mdLines.push(`- **Subjects**: ${subjects.join(", ")}`);
		mdLines.push(`- **EDI Groups**: ${ (12/4) + (8/4) + (8/4) }`);
		mdLines.push(`- **CP Groups**: ${ (12/4) + (8/4) + (8/4) }`);
		mdLines.push(`- **Default Passwords**: students -> \`student123\`, guides -> \`teacher123\`\n`);

		mdLines.push("---\n\n");
		mdLines.push("## All Student Logins\n");
		mdLines.push("| # | Roll No | Name | Email | Password | EDI Group | CP Group |\n|---|---------|------|-------|----------|-----------|----------|\n");
		let counter = 1;
		const allGroups = await ProjectGroupModel.find().lean();
		const ediGroups = allGroups.filter(g => g.isEdiRegistered);
		const cpGroups = allGroups.filter(g => !g.isEdiRegistered);
		for (const s of students) {
			// find edi group containing student
			const eg = ediGroups.find(g => (g.members || []).some((m: any) => String(m) === String(s._id)));
			const cg = cpGroups.find(g => (g.members || []).some((m: any) => String(m) === String(s._id)));
			mdLines.push(`| ${counter} | ${s.rollNo} | ${s.name} | ${s.email} | \`student123\` | ${eg?.name ?? "—"} | ${cg?.name ?? "—"} |`);
			counter++;
		}

		mdLines.push("\n---\n\n");
		mdLines.push("## Faculty\n\n");
		for (const f of facultyDocs) {
			mdLines.push(`- ${f.name} — ${f.email} — password: \`teacher123\` — subjects: ${(await SubjectModel.find({ _id: { $in: f.teachingSubjects } })).map((x:any)=>x.name).join(", ")}`);
		}

		await fs.writeFile("../STUDENT_LOGINS_AND_GROUPS.md", mdLines.join("\n"), "utf8");
		console.log("Updated STUDENT_LOGINS_AND_GROUPS.md");

		await mongoose.disconnect();
		console.log("Disconnected from DB");
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
};

run();

import mongoose from "mongoose";
import { env } from "./src/config/env";
import "./src/models/user.model";
import "./src/models/projectGroup.model";
import { UserModel } from "./src/models/user.model";
import { ProjectGroupModel } from "./src/models/projectGroup.model";
import fs from "fs/promises";

const names = [
	"Arjun Singh",
	"Priya Verma",
	"Vikram Singh",
	"Sneha Kapoor",
	"Harsh Mishra",
	"Ananya Bhatt",
	"Rahul Sharma",
	"Divya Patel",
	"Nikhil Verma",
	"Pooja Singh",
	"Sanjay Kumar",
	"Anjali Gupta",
	"Roshan Kumar",
	"Sunita Verma",
	"Manish Singh",
	"Kavya Sharma",
	"Arpit Patel",
	"Isha Desai",
	"Vikas Yadav",
	"Riya Gupta",
	"Arun Nair",
	"Neha Singh",
	"Rohit Pandey",
	"Priya Singh",
	"Siddharth Joshi",
	"Aisha Khan",
	"Karan Malhotra",
	"Deepti Rawat"
];

const nameToEmail = (n: string) => n.toLowerCase().replace(/\s+/g, ".") + "@vit.edu";

const run = async () => {
	await mongoose.connect(env.mongoUri as string);
	console.log("Connected to DB");

	const students = await UserModel.find({ role: "student" }).sort({ rollNo: 1 }).lean();
	if (students.length < names.length) {
		console.warn("Found fewer students than expected. Aborting name update.");
		await mongoose.disconnect();
		return;
	}

	for (let i = 0; i < names.length; i++) {
		const s = students[i];
		const newName = names[i];
		const newEmail = nameToEmail(newName);
		await UserModel.updateOne({ _id: s._id }, { $set: { name: newName, email: newEmail } });
		console.log(`Updated ${s.rollNo} -> ${newName} <${newEmail}>`);
	}

	// regenerate markdown grouped by EDI and CP
	const allStudents = await UserModel.find({ role: "student" }).sort({ rollNo: 1 }).lean();
	const groups = await ProjectGroupModel.find().lean();
	const ediGroups = groups.filter(g => g.isEdiRegistered);
	const cpGroups = groups.filter(g => !g.isEdiRegistered);

	const md: string[] = [];
	md.push("# Student Logins & Groups - CSE Division A\n");
	md.push(`**Generated**: ${new Date().toLocaleString()}\n`);
	md.push("## Overview\n");
	md.push(`- **Total Students**: ${allStudents.length}`);
	md.push(`- **Subjects**: Data Structures, Operating System, Software Engineering`);
	md.push(`- **EDI Groups**: ${ediGroups.length}`);
	md.push(`- **CP Groups**: ${cpGroups.length}`);
	md.push(`- **Default Passwords**: students -> \`student123\`, guides -> \`teacher123\`\n`);
	md.push("---\n");

	md.push("## All Student Logins\n");
	md.push("| # | Roll No | Name | Email | Password | EDI Group | CP Group |\n|---|---------|------|-------|----------|-----------|----------|\n");

	for (let i = 0; i < allStudents.length; i++) {
		const s = allStudents[i];
		const eg = ediGroups.find(g => (g.members||[]).some((m:any)=>String(m)===String(s._id)));
		const cg = cpGroups.find(g => (g.members||[]).some((m:any)=>String(m)===String(s._id)));
		md.push(`| ${i+1} | ${s.rollNo} | ${s.name} | ${s.email} | \`student123\` | ${eg?.name ?? "—"} | ${cg?.name ?? "—"} |`);
	}

	md.push("\n---\n");
	md.push("## EDI Groups\n");
	for (const g of ediGroups) {
		md.push(`### ${g.name}`);
		md.push("| Student Name | Email | Roll No |\n|---|---|---|\n");
		for (const m of g.members || []) {
			const student = allStudents.find(s => String(s._id) === String(m));
			md.push(`| ${student?.name ?? "(unknown)"} | ${student?.email ?? ""} | ${student?.rollNo ?? ""} |`);
		}
		md.push("\n");
	}

	md.push("---\n");
	md.push("## CP Groups\n");
	for (const g of cpGroups) {
		md.push(`### ${g.name}`);
		md.push(`- CP Guide: ${ (g.cpGuide && String(g.cpGuide)) ? (await UserModel.findById(g.cpGuide).then(u=>u?.name)) : "(none)" }`);
		md.push("| Student Name | Email | Roll No |\n|---|---|---|\n");
		for (const m of g.members || []) {
			const student = allStudents.find(s => String(s._id) === String(m));
			md.push(`| ${student?.name ?? "(unknown)"} | ${student?.email ?? ""} | ${student?.rollNo ?? ""} |`);
		}
		md.push("\n");
	}

	await fs.writeFile("../STUDENT_LOGINS_AND_GROUPS.md", md.join("\n"), "utf8");
	console.log("Rewrote STUDENT_LOGINS_AND_GROUPS.md with real names and grouped sections");

	await mongoose.disconnect();
	console.log("Disconnected");
};

run().catch(err=>{console.error(err); process.exit(1)});

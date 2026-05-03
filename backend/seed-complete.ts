import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "./src/models/user.model";
import { ProjectGroupModel } from "./src/models/projectGroup.model";
import { env } from "./src/config/env";

interface StudentData {
	name: string;
	email: string;
	password: string;
	rollNo: string;
}

// 25 new students to create
const newStudents: StudentData[] = [
	{ name: "Roshan Kumar", email: "roshan.kumar@vit.edu", password: "student123", rollNo: "21BCS014" },
	{ name: "Sunita Verma", email: "sunita.verma@vit.edu", password: "student123", rollNo: "21BCS015" },
	{ name: "Manish Singh", email: "manish.singh@vit.edu", password: "student123", rollNo: "21BCS016" },
	{ name: "Kavya Sharma", email: "kavya.sharma@vit.edu", password: "student123", rollNo: "21BCS017" },
	{ name: "Arpit Patel", email: "arpit.patel@vit.edu", password: "student123", rollNo: "21BCS018" },
	{ name: "Isha Desai", email: "isha.desai@vit.edu", password: "student123", rollNo: "21BCS019" },
	{ name: "Vikas Yadav", email: "vikas.yadav@vit.edu", password: "student123", rollNo: "21BCS020" },
	{ name: "Riya Gupta", email: "riya.gupta@vit.edu", password: "student123", rollNo: "21BCS021" },
	{ name: "Arun Nair", email: "arun.nair@vit.edu", password: "student123", rollNo: "21BCS022" },
	{ name: "Neha Singh", email: "neha.singh@vit.edu", password: "student123", rollNo: "21BCS023" },
	{ name: "Rohit Pandey", email: "rohit.pandey@vit.edu", password: "student123", rollNo: "21BCS024" },
	{ name: "Priya Singh", email: "priya.singh@vit.edu", password: "student123", rollNo: "21BCS025" },
	{ name: "Siddharth Joshi", email: "siddharth.joshi@vit.edu", password: "student123", rollNo: "21BCS026" },
	{ name: "Aisha Khan", email: "aisha.khan@vit.edu", password: "student123", rollNo: "21BCS027" },
	{ name: "Karan Malhotra", email: "karan.malhotra@vit.edu", password: "student123", rollNo: "21BCS028" },
	{ name: "Deepti Rawat", email: "deepti.rawat@vit.edu", password: "student123", rollNo: "21BCS029" },
	{ name: "Varun Mehta", email: "varun.mehta@vit.edu", password: "student123", rollNo: "21BCS030" },
	{ name: "Sakshi Sharma", email: "sakshi.sharma@vit.edu", password: "student123", rollNo: "21BCS031" },
	{ name: "Abhishek Rao", email: "abhishek.rao@vit.edu", password: "student123", rollNo: "21BCS032" },
	{ name: "Meera Kapoor", email: "meera.kapoor@vit.edu", password: "student123", rollNo: "21BCS033" },
	{ name: "Nitin Verma", email: "nitin.verma@vit.edu", password: "student123", rollNo: "21BCS034" },
	{ name: "Pallavi Singh", email: "pallavi.singh@vit.edu", password: "student123", rollNo: "21BCS035" },
	{ name: "Ashok Patel", email: "ashok.patel@vit.edu", password: "student123", rollNo: "21BCS036" },
	{ name: "Divya Sharma", email: "divya.sharma@vit.edu", password: "student123", rollNo: "21BCS037" },
	{ name: "Rahul Mishra", email: "rahul.mishra@vit.edu", password: "student123", rollNo: "21BCS038" }
];

const seedCompleteGroups = async () => {
	try {
		const mongoUri = env.mongoUri;
		await mongoose.connect(mongoUri);
		console.log("📦 Connected to MongoDB");

		// Create 25 new students
		console.log("\n📝 Creating 25 new CSE students...");
		const createdStudents: any[] = [];
		
		for (const studentData of newStudents) {
			const existingStudent = await UserModel.findOne({ email: studentData.email.toLowerCase() });
			if (existingStudent) {
				console.log(`⚠️  ${studentData.name} already exists`);
				createdStudents.push(existingStudent);
				continue;
			}

			const hashedPassword = await bcrypt.hash(studentData.password, 10);
			const student = await UserModel.create({
				name: studentData.name,
				email: studentData.email.toLowerCase(),
				password: hashedPassword,
				role: "student",
				branch: "CSE",
				division: "A",
				rollNo: studentData.rollNo,
				hasCreatedGroup: false,
				teachingSubjects: []
			});
			createdStudents.push(student);
			console.log(`✅ ${studentData.name} (${studentData.rollNo})`);
		}

		// Get all CSE Division A students
		console.log("\n👥 Fetching all CSE Division A students...");
		const allStudents = await UserModel.find({ 
			branch: "CSE", 
			division: "A", 
			role: "student" 
		}).sort({ rollNo: 1 });
		
		console.log(`Total CSE Division A students: ${allStudents.length}`);

		// Create EDI groups - 20 students in 5 groups of 4
		console.log("\n🎓 Creating EDI Groups (20 students in 5 groups)...");
		const ediSubjects = [
			{ name: "EDI - Data Structures", subject: "Data Structures" },
			{ name: "EDI - Database Management", subject: "Database Management" },
			{ name: "EDI - Web Development", subject: "Web Development" },
			{ name: "EDI - Mobile Apps", subject: "Mobile Applications" },
			{ name: "EDI - Cloud Computing", subject: "Cloud Computing" }
		];

		const ediGroups = [];
		for (let i = 0; i < 5; i++) {
			const groupStudents = allStudents.slice(i * 4, (i + 1) * 4);
			if (groupStudents.length === 4) {
				const ediGroup = await ProjectGroupModel.create({
					name: ediSubjects[i].name,
					subject: ediSubjects[i].subject,
					repositoryUrl: null,
					isEdiRegistered: true,
					owner: groupStudents[0]._id,
					ediGuide: null,
					cpGuide: null,
					courseProjectRegistrations: [],
					members: groupStudents.map(s => s._id),
					pendingInvites: []
				});
				ediGroups.push({
					id: ediGroup._id,
					name: ediGroup.name,
					members: groupStudents
				});
				console.log(`✅ ${ediSubjects[i].name} - ${groupStudents.map(s => s.name).join(", ")}`);
			}
		}

		// Create CP groups by subject - all 25 students
		console.log("\n📚 Creating CP Groups (25 students by subject)...");
		const cpSubjects = [
			{ name: "CP - Data Structures", subject: "Data Structures" },
			{ name: "CP - Database Systems", subject: "Database Systems" },
			{ name: "CP - Operating Systems", subject: "Operating Systems" },
			{ name: "CP - Web Technologies", subject: "Web Technologies" },
			{ name: "CP - AI & ML", subject: "AI & Machine Learning" },
			{ name: "CP - Networking", subject: "Networking" },
			{ name: "CP - Software Engineering", subject: "Software Engineering" },
			// Last group with remaining 3 students
		];

		const cpGroups = [];
		let studentIndex = 0;

		for (let i = 0; i < cpSubjects.length - 1; i++) {
			const groupSize = i < 5 ? 4 : 3; // First 5 groups of 4, last one of 3
			if (studentIndex + groupSize <= allStudents.length) {
				const groupStudents = allStudents.slice(studentIndex, studentIndex + groupSize);
				const cpGroup = await ProjectGroupModel.create({
					name: cpSubjects[i].name,
					subject: cpSubjects[i].subject,
					repositoryUrl: null,
					isEdiRegistered: false,
					owner: groupStudents[0]._id,
					ediGuide: null,
					cpGuide: null,
					courseProjectRegistrations: [],
					members: groupStudents.map(s => s._id),
					pendingInvites: []
				});
				cpGroups.push({
					id: cpGroup._id,
					name: cpGroup.name,
					members: groupStudents
				});
				console.log(`✅ ${cpSubjects[i].name} - ${groupStudents.map(s => `${s.name} (${s.rollNo})`).join(", ")}`);
				studentIndex += groupSize;
			}
		}

		// Last CP group with remaining students
		const remainingStudents = allStudents.slice(studentIndex);
		if (remainingStudents.length > 0) {
			const cpGroup = await ProjectGroupModel.create({
				name: "CP - Cloud & DevOps",
				subject: "Cloud & DevOps",
				repositoryUrl: null,
				isEdiRegistered: false,
				owner: remainingStudents[0]._id,
				ediGuide: null,
				cpGuide: null,
				courseProjectRegistrations: [],
				members: remainingStudents.map(s => s._id),
				pendingInvites: []
			});
			cpGroups.push({
				id: cpGroup._id,
				name: cpGroup.name,
				members: remainingStudents
			});
			console.log(`✅ CP - Cloud & DevOps - ${remainingStudents.map(s => `${s.name} (${s.rollNo})`).join(", ")}`);
		}

		// Generate markdown content
		const markdownContent = generateMarkdown(allStudents, ediGroups, cpGroups);

		// Save markdown file
		const fs = await import("fs");
		const fs_promises = fs.promises;
		await fs_promises.writeFile(
			"/home/parag/Study And Stuff/SE cp/project-management/STUDENT_LOGINS_AND_GROUPS.md",
			markdownContent
		);

		console.log("\n✨ Markdown file created successfully!");
		console.log("\n" + "=".repeat(70));
		console.log("✨ OPERATION COMPLETED\n");
		console.log(`Total Students Created: ${createdStudents.length}`);
		console.log(`Total Students in System: ${allStudents.length}`);
		console.log(`EDI Groups Created: ${ediGroups.length}`);
		console.log(`CP Groups Created: ${cpGroups.length}`);
		console.log(`Ungrouped Students: ${allStudents.length - (ediGroups.length * 4) - Math.ceil(allStudents.length / cpGroups.length) * cpGroups.length}`);
		console.log("=".repeat(70) + "\n");

		await mongoose.disconnect();
		console.log("✨ Disconnected from MongoDB");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
};

function generateMarkdown(allStudents: any[], ediGroups: any[], cpGroups: any[]) {
	let md = `# Student Logins & Groups - CSE Division A

**Generated**: ${new Date().toLocaleString()}

## 📋 Overview
- **Total Students**: ${allStudents.length}
- **EDI Groups**: ${ediGroups.length}
- **CP Groups**: ${cpGroups.length}
- **Ungrouped Students**: ${5}
- **Default Password**: \`student123\`

---

## 🔐 All Student Logins

| # | Roll No | Name | Email | Password | EDI Group | CP Group |
|---|---------|------|-------|----------|-----------|----------|
`;

	// Create lookup maps for quick reference
	const ediGroupMap: any = {};
	const cpGroupMap: any = {};

	ediGroups.forEach(group => {
		group.members.forEach((member: any) => {
			ediGroupMap[member._id.toString()] = group.name;
		});
	});

	cpGroups.forEach(group => {
		group.members.forEach((member: any) => {
			cpGroupMap[member._id.toString()] = group.name;
		});
	});

	allStudents.forEach((student, index) => {
		const ediGroup = ediGroupMap[student._id.toString()] || "—";
		const cpGroup = cpGroupMap[student._id.toString()] || "—";
		md += `| ${index + 1} | ${student.rollNo} | ${student.name} | ${student.email} | \`student123\` | ${ediGroup} | ${cpGroup} |\n`;
	});

	md += `\n---\n\n`;

	// EDI Groups Section
	md += `## 🎓 EDI (Engineering Design Innovation) Groups\n\n`;
	ediGroups.forEach((group, groupIndex) => {
		md += `### EDI Group ${groupIndex + 1}: ${group.name}\n\n`;
		md += `| Student Name | Email | Roll No |\n`;
		md += `|---|---|---|\n`;
		group.members.forEach((member: any) => {
			md += `| ${member.name} | ${member.email} | ${member.rollNo} |\n`;
		});
		md += `\n`;
	});

	md += `---\n\n`;

	// CP Groups Section
	md += `## 📚 CP (Course Project) Groups\n\n`;
	cpGroups.forEach((group, groupIndex) => {
		md += `### CP Group ${groupIndex + 1}: ${group.name}\n\n`;
		md += `| Student Name | Email | Roll No |\n`;
		md += `|---|---|---|\n`;
		group.members.forEach((member: any) => {
			md += `| ${member.name} | ${member.email} | ${member.rollNo} |\n`;
		});
		md += `\n`;
	});

	// Ungrouped students
	const allGroupedIds = new Set([
		...Object.keys(ediGroupMap),
		...Object.keys(cpGroupMap)
	]);
	const ungroupedStudents = allStudents.filter(s => !allGroupedIds.has(s._id.toString()));

	if (ungroupedStudents.length > 0) {
		md += `---\n\n`;
		md += `## ❌ Ungrouped Students (${ungroupedStudents.length})\n\n`;
		md += `These students are not assigned to any group and can be manually assigned.\n\n`;
		md += `| # | Student Name | Email | Roll No | Password |\n`;
		md += `|---|---|---|---|---|\n`;
		ungroupedStudents.forEach((student, index) => {
			md += `| ${index + 1} | ${student.name} | ${student.email} | ${student.rollNo} | \`student123\` |\n`;
		});
		md += `\n`;
	}

	md += `---\n\n`;
	md += `## 📊 Statistics\n\n`;
	md += `- **Total Students**: ${allStudents.length}\n`;
	md += `- **EDI Groups**: ${ediGroups.length}\n`;
	md += `- **CP Groups**: ${cpGroups.length}\n`;
	md += `- **Students in EDI Groups**: ${ediGroups.reduce((sum: number, g: any) => sum + g.members.length, 0)}\n`;
	md += `- **Students in CP Groups**: ${cpGroups.reduce((sum: number, g: any) => sum + g.members.length, 0)}\n`;
	md += `- **Ungrouped Students**: ${ungroupedStudents.length}\n`;
	md += `\n---\n\n`;
	md += `## 🔗 Quick Links\n\n`;
	md += `- Login URL: \`http://localhost:5173\`\n`;
	md += `- Default Password for all students: \`student123\`\n`;
	md += `- All students belong to: CSE Branch, Division A\n`;

	return md;
}

seedCompleteGroups();

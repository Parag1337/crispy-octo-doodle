import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "./src/models/user.model";
import { ProjectGroupModel } from "./src/models/projectGroup.model";
import { Types } from "mongoose";
import { env } from "./src/config/env";

interface StudentData {
	name: string;
	email: string;
	password: string;
	role: "student";
	branch: string;
	division: string;
	rollNo: string;
}

// New CSE students to create
const newStudents: StudentData[] = [
	{
		name: "Rahul Sharma",
		email: "rahul.sharma@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS008"
	},
	{
		name: "Divya Patel",
		email: "divya.patel@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS009"
	},
	{
		name: "Nikhil Verma",
		email: "nikhil.verma@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS010"
	},
	{
		name: "Pooja Singh",
		email: "pooja.singh@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS011"
	},
	{
		name: "Sanjay Kumar",
		email: "sanjay.kumar@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS012"
	},
	{
		name: "Anjali Gupta",
		email: "anjali.gupta@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS013"
	}
];

// Group 1 students
const group1StudentEmails = [
	"arjun.singh@vit.edu",
	"priya.verma@vit.edu",
	"vikram.singh@vit.edu",
	"sneha.kapoor@vit.edu"
];

// Group 2 students
const group2StudentEmails = [
	"harsh.mishra@vit.edu",
	"ananya.bhatt@vit.edu"
];

const seedGroupsAndStudents = async () => {
	try {
		const mongoUri = env.mongoUri;
		await mongoose.connect(mongoUri);
		console.log("📦 Connected to MongoDB");

		// Create new CSE students
		console.log("\n📝 Creating new CSE students...");
		const createdNewStudents = [];
		for (const studentData of newStudents) {
			const existingStudent = await UserModel.findOne({ email: studentData.email.toLowerCase() });
			if (existingStudent) {
				console.log(`⚠️  ${studentData.name} already exists, skipping...`);
				continue;
			}

			const hashedPassword = await bcrypt.hash(studentData.password, 10);
			const student = await UserModel.create({
				name: studentData.name,
				email: studentData.email.toLowerCase(),
				password: hashedPassword,
				role: studentData.role,
				branch: studentData.branch,
				division: studentData.division,
				rollNo: studentData.rollNo,
				hasCreatedGroup: false,
				teachingSubjects: []
			});
			createdNewStudents.push({
				name: studentData.name,
				email: studentData.email,
				rollNo: studentData.rollNo
			});
			console.log(`✅ Created: ${studentData.name}`);
		}

		// Get students for groups
		console.log("\n👥 Fetching students for groups...");
		const group1Students = await UserModel.find({ email: { $in: group1StudentEmails.map(e => e.toLowerCase()) } });
		const group2Students = await UserModel.find({ email: { $in: group2StudentEmails.map(e => e.toLowerCase()) } });

		console.log(`Found ${group1Students.length} students for Group 1`);
		console.log(`Found ${group2Students.length} students for Group 2`);

		if (group1Students.length === 0 || group2Students.length === 0) {
			throw new Error("Not enough students found for creating groups");
		}

		// Create Group 1
		console.log("\n🔨 Creating Group 1...");
		const group1Owner = group1Students[0];
		const group1 = await ProjectGroupModel.create({
			name: "Data Structures Project - Group 1",
			subject: "Data Structures",
			repositoryUrl: null,
			isEdiRegistered: false,
			owner: group1Owner._id,
			ediGuide: null,
			cpGuide: null,
			courseProjectRegistrations: [],
			members: group1Students.map(s => s._id),
			pendingInvites: []
		});

		// Update owner flag for all Group 1 members
		await UserModel.updateMany(
			{ _id: { $in: group1Students.map(s => s._id) } },
			{ $set: { hasCreatedGroup: true } }
		);

		console.log(`✅ Created Group 1: "${group1.name}"`);
		console.log(`   Members: ${group1Students.map(s => s.name).join(", ")}`);

		// Create Group 2
		console.log("\n🔨 Creating Group 2...");
		const group2Owner = group2Students[0];
		const group2 = await ProjectGroupModel.create({
			name: "Database Management - Group 2",
			subject: "Database Design",
			repositoryUrl: null,
			isEdiRegistered: false,
			owner: group2Owner._id,
			ediGuide: null,
			cpGuide: null,
			courseProjectRegistrations: [],
			members: group2Students.map(s => s._id),
			pendingInvites: []
		});

		// Update owner flag for all Group 2 members
		await UserModel.updateMany(
			{ _id: { $in: group2Students.map(s => s._id) } },
			{ $set: { hasCreatedGroup: true } }
		);

		console.log(`✅ Created Group 2: "${group2.name}"`);
		console.log(`   Members: ${group2Students.map(s => s.name).join(", ")}`);

		// Summary
		console.log("\n" + "=".repeat(60));
		console.log("✨ OPERATION COMPLETED SUCCESSFULLY!\n");

		console.log("📊 NEW STUDENTS CREATED:");
		createdNewStudents.forEach(s => {
			console.log(`   • ${s.name} (${s.email}) - Roll No: ${s.rollNo}`);
		});

		console.log("\n👥 GROUP 1 - Data Structures Project:");
		group1Students.forEach(s => {
			console.log(`   • ${s.name} (${s.email})`);
		});

		console.log("\n👥 GROUP 2 - Database Management:");
		group2Students.forEach(s => {
			console.log(`   • ${s.name} (${s.email})`);
		});

		console.log("\n" + "=".repeat(60));
		console.log(`Total new students created: ${createdNewStudents.length}`);
		console.log(`Total groups created: 2`);
		console.log("=".repeat(60) + "\n");

		await mongoose.disconnect();
		console.log("✨ Disconnected from MongoDB");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
};

seedGroupsAndStudents();

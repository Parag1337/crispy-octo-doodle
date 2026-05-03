import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "./src/models/user.model";
import { SubjectModel } from "./src/models/subject.model";
import { env } from "./src/config/env";

interface UserData {
	name: string;
	email: string;
	password: string;
	role: "student" | "guide" | "admin";
	branch?: string;
	division?: string;
	rollNo?: string;
}

const users: UserData[] = [
	// Admin
	{
		name: "System Administrator",
		email: "admin@vit.edu",
		password: "admin123",
		role: "admin"
	},
	// Teachers/Guides
	{
		name: "Dr. Rajesh Kumar",
		email: "rajesh.kumar@vit.edu",
		password: "teacher123",
		role: "guide"
	},
	{
		name: "Prof. Priya Sharma",
		email: "priya.sharma@vit.edu",
		password: "teacher123",
		role: "guide"
	},
	{
		name: "Dr. Amit Patel",
		email: "amit.patel@vit.edu",
		password: "teacher123",
		role: "guide"
	},
	// Students
	{
		name: "Arjun Singh",
		email: "arjun.singh@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS001"
	},
	{
		name: "Priya Verma",
		email: "priya.verma@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS002"
	},
	{
		name: "Aman Gupta",
		email: "aman.gupta@vit.edu",
		password: "student123",
		role: "student",
		branch: "ECE",
		division: "B",
		rollNo: "21BCE001"
	},
	{
		name: "Neha Yadav",
		email: "neha.yadav@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "B",
		rollNo: "21BCS003"
	},
	{
		name: "Rohan Desai",
		email: "rohan.desai@vit.edu",
		password: "student123",
		role: "student",
		branch: "IT",
		division: "A",
		rollNo: "21BIT001"
	},
	{
		name: "Vikram Singh",
		email: "vikram.singh@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS004"
	},
	{
		name: "Sneha Kapoor",
		email: "sneha.kapoor@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS005"
	},
	{
		name: "Harsh Mishra",
		email: "harsh.mishra@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS006"
	},
	{
		name: "Ananya Bhatt",
		email: "ananya.bhatt@vit.edu",
		password: "student123",
		role: "student",
		branch: "CSE",
		division: "A",
		rollNo: "21BCS007"
	}
];

const seedDatabase = async () => {
	try {
		const mongoUri = env.mongoUri;
		await mongoose.connect(mongoUri);
		console.log("📦 Connected to MongoDB");

		// Clear existing users with these emails
		const emailsToDelete = users.map(u => u.email);
		await UserModel.deleteMany({ email: { $in: emailsToDelete } });
		console.log("🗑️  Cleared existing users");

		// Clear existing subjects
		await SubjectModel.deleteMany({ name: { $in: ["Data Structures", "Operating System", "Software Engineering"] } });
		console.log("🗑️  Cleared existing subjects");

		// Hash passwords and create users
		const createdUsers = [];
		const userEmailToIdMap: { [key: string]: string } = {};
		
		for (const userData of users) {
			const hashedPassword = await bcrypt.hash(userData.password, 10);
			const user = await UserModel.create({
				name: userData.name,
				email: userData.email.toLowerCase(),
				password: hashedPassword,
				role: userData.role,
				branch: userData.branch,
				division: userData.division,
				rollNo: userData.rollNo,
				hasCreatedGroup: false,
				teachingSubjects: []
			});
			userEmailToIdMap[userData.email.toLowerCase()] = String(user._id);
			createdUsers.push({
				name: userData.name,
				email: userData.email,
				password: userData.password,
				role: userData.role
			});
		}

		// Get admin user
		const adminUser = await UserModel.findOne({ role: "admin" });
		if (!adminUser) {
			throw new Error("Admin user not found");
		}

		// Create subjects and assign to guides
		const subjectMappings = [
			{ guideName: "Dr. Rajesh Kumar", guideEmail: "rajesh.kumar@vit.edu", subjectName: "Data Structures" },
			{ guideName: "Prof. Priya Sharma", guideEmail: "priya.sharma@vit.edu", subjectName: "Operating System" },
			{ guideName: "Dr. Amit Patel", guideEmail: "amit.patel@vit.edu", subjectName: "Software Engineering" }
		];

		for (const mapping of subjectMappings) {
			const subject = await SubjectModel.create({
				name: mapping.subjectName,
				description: `${mapping.subjectName} course`,
				adminId: adminUser._id
			});

			const guide = await UserModel.findOne({ email: mapping.guideEmail.toLowerCase() });
			if (guide) {
				guide.teachingSubjects.push(subject._id);
				await guide.save();
			}
		}

		console.log("\n✅ Database seeded successfully!\n");
		console.log("📝 LOGIN CREDENTIALS:\n");
		console.log("=" .repeat(60));
		console.log("\n🧑‍🏫 TEACHERS (GUIDES):\n");
		
		for (const guide of subjectMappings) {
			const guideUser = await UserModel.findOne({ email: guide.guideEmail.toLowerCase() }).populate("teachingSubjects");
			const password = createdUsers.find(u => u.email === guide.guideEmail)?.password;
			console.log(`Name: ${guide.guideName}`);
			console.log(`Email: ${guide.guideEmail}`);
			console.log(`Password: ${password}`);
			if (guideUser?.teachingSubjects.length) {
				console.log(`Subjects: ${(guideUser.teachingSubjects as any).map((s: any) => s.name).join(", ")}`);
			}
			console.log("---");
		}

		console.log("\n👨‍🎓 STUDENTS:\n");
		createdUsers
			.filter(u => u.role === "student")
			.forEach(u => {
				console.log(`Name: ${u.name}`);
				console.log(`Email: ${u.email}`);
				console.log(`Password: ${u.password}`);
				console.log("---");
			});

		console.log("\n" + "=".repeat(60));
		console.log("Total users created:", createdUsers.length);
		console.log("Total subjects created:", subjectMappings.length);

		await mongoose.disconnect();
		console.log("\n✨ Disconnected from MongoDB");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error seeding database:", error);
		process.exit(1);
	}
};

seedDatabase();

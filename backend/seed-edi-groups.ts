import mongoose from "mongoose";
import { UserModel } from "./src/models/user.model";
import { ProjectGroupModel } from "./src/models/projectGroup.model";
import { env } from "./src/config/env";

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

const createEdiGroups = async () => {
	try {
		const mongoUri = env.mongoUri;
		await mongoose.connect(mongoUri);
		console.log("📦 Connected to MongoDB");

		// Get students for EDI groups
		console.log("\n👥 Fetching students for EDI groups...");
		const group1Students = await UserModel.find({ email: { $in: group1StudentEmails.map(e => e.toLowerCase()) } });
		const group2Students = await UserModel.find({ email: { $in: group2StudentEmails.map(e => e.toLowerCase()) } });

		console.log(`Found ${group1Students.length} students for EDI Group 1`);
		console.log(`Found ${group2Students.length} students for EDI Group 2`);

		if (group1Students.length === 0 || group2Students.length === 0) {
			throw new Error("Not enough students found for creating EDI groups");
		}

		// Create EDI Group 1
		console.log("\n🔨 Creating EDI Group 1...");
		const ediGroup1Owner = group1Students[0];
		const ediGroup1 = await ProjectGroupModel.create({
			name: "EDI Project - Data Structures",
			subject: "Data Structures",
			repositoryUrl: null,
			isEdiRegistered: true,
			owner: ediGroup1Owner._id,
			ediGuide: null,
			cpGuide: null,
			courseProjectRegistrations: [],
			members: group1Students.map(s => s._id),
			pendingInvites: []
		});

		console.log(`✅ Created EDI Group 1: "${ediGroup1.name}"`);
		console.log(`   Members: ${group1Students.map(s => s.name).join(", ")}`);

		// Create EDI Group 2
		console.log("\n🔨 Creating EDI Group 2...");
		const ediGroup2Owner = group2Students[0];
		const ediGroup2 = await ProjectGroupModel.create({
			name: "EDI Project - Database Systems",
			subject: "Database Systems",
			repositoryUrl: null,
			isEdiRegistered: true,
			owner: ediGroup2Owner._id,
			ediGuide: null,
			cpGuide: null,
			courseProjectRegistrations: [],
			members: group2Students.map(s => s._id),
			pendingInvites: []
		});

		console.log(`✅ Created EDI Group 2: "${ediGroup2.name}"`);
		console.log(`   Members: ${group2Students.map(s => s.name).join(", ")}`);

		// Fetch all groups for summary
		console.log("\n📋 Fetching all groups...");
		const allGroups = await ProjectGroupModel.find()
			.populate("owner", "name email rollNo")
			.populate("members", "name email rollNo")
			.lean();

		// Separate CP and EDI groups
		const cpGroups = allGroups.filter(g => !g.isEdiRegistered);
		const ediGroups = allGroups.filter(g => g.isEdiRegistered);

		// Summary
		console.log("\n" + "=".repeat(70));
		console.log("✨ COMPLETE GROUP SUMMARY\n");

		console.log("📚 CP (COURSE PROJECT) GROUPS:");
		cpGroups.forEach((group, index) => {
			console.log(`\n${index + 1}. ${group.name}`);
			console.log(`   Owner: ${(group.owner as any)?.name || "Unknown"}`);
			console.log(`   Members (${(group.members as any)?.length ?? 0}):`);
			((group.members as any) ?? []).forEach((member: any) => {
				console.log(`      • ${member.name} (${member.rollNo})`);
			});
		});

		console.log("\n\n🎓 EDI (ENGINEERING DESIGN INNOVATION) GROUPS:");
		ediGroups.forEach((group, index) => {
			console.log(`\n${index + 1}. ${group.name}`);
			console.log(`   Owner: ${(group.owner as any)?.name || "Unknown"}`);
			console.log(`   Members (${(group.members as any)?.length ?? 0}):`);
			((group.members as any) ?? []).forEach((member: any) => {
				console.log(`      • ${member.name} (${member.rollNo})`);
			});
		});

		console.log("\n" + "=".repeat(70));
		console.log(`\n📊 STATISTICS:`);
		console.log(`   Total Groups: ${allGroups.length}`);
		console.log(`   CP Groups: ${cpGroups.length}`);
		console.log(`   EDI Groups: ${ediGroups.length}`);
		console.log(`   Total Students in Groups: ${allGroups.reduce((sum, g) => sum + ((g.members as any)?.length ?? 0), 0)}`);
		console.log("=".repeat(70) + "\n");

		await mongoose.disconnect();
		console.log("✨ Disconnected from MongoDB");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
};

createEdiGroups();

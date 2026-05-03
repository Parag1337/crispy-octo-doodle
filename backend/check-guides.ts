import mongoose from "mongoose";
import "./src/models/user.model";
import "./src/models/subject.model";
import { ProjectGroupModel } from "./src/models/projectGroup.model";
import { env } from "./src/config/env";

const run = async () => {
	try {
		await mongoose.connect(env.mongoUri as string);
		console.log("Connected to DB");

		const groups = await ProjectGroupModel.find()
			.populate("owner", "name email")
			.populate("ediGuide", "name email")
			.populate("cpGuide", "name email")
			.lean();

		console.log("\nGroups and assigned faculty:\n");
		for (const g of groups) {
			console.log(`- Group: ${g.name} (subject: ${g.subject})`);
			console.log(`  EDI Registered: ${Boolean(g.isEdiRegistered)}`);
			console.log(`  Owner: ${(g.owner as any)?.name ?? "(none)"} <${(g.owner as any)?.email ?? ""}>`);
			console.log(`  EDI Guide: ${(g.ediGuide as any)?.name ?? "(none)"} <${(g.ediGuide as any)?.email ?? ""}>`);
			console.log(`  CP Guide: ${(g.cpGuide as any)?.name ?? "(none)"} <${(g.cpGuide as any)?.email ?? ""}>`);
			console.log("");
		}

		await mongoose.disconnect();
		console.log("Disconnected");
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
};

run();

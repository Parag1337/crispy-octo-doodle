import mongoose from "mongoose";
import { env } from "./src/config/env";
import "./src/models/user.model";
import "./src/models/projectGroup.model";
import { ProjectGroupModel } from "./src/models/projectGroup.model";

async function main() {
  await mongoose.connect(env.mongoUri);
  const g = await ProjectGroupModel.findOne({ name: "CP - Operating System - Group 1" })
    .populate("owner", "name email branch division rollNo role")
    .populate("members", "name email branch division rollNo role")
    .lean();
  console.log(JSON.stringify(g, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

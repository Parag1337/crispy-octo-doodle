import mongoose from "mongoose";
import { env } from "./src/config/env";
import "./src/models/user.model";
import "./src/models/projectGroup.model";
import { UserModel } from "./src/models/user.model";
import { ProjectGroupModel } from "./src/models/projectGroup.model";

async function main() {
  await mongoose.connect(env.mongoUri);
  const arjun = await UserModel.findOne({ email: "arjun.singh@vit.edu" }).lean();
  if (!arjun) {
    console.log("No Arjun user found");
    return;
  }
  const groups = await ProjectGroupModel.find({ $or: [{ owner: arjun._id }, { members: arjun._id }] })
    .populate("owner", "name email branch division rollNo role")
    .populate("members", "name email branch division rollNo role")
    .populate("courseProjectRegistrations.labFaculty", "name email")
    .lean();
  console.log(JSON.stringify({ email: arjun.email, id: String(arjun._id), groups: groups.map(g => ({
    id: String(g._id),
    name: g.name,
    owner: g.owner,
    memberCount: (g.members ?? []).length,
    members: (g.members ?? []).map((m: any) => ({ id: String(m._id), name: m.name, role: m.role })),
    courseProjectRegistrations: (g.courseProjectRegistrations ?? []).map((r: any) => ({ subjectId: String(r.subjectId), subjectName: r.subjectName, labFaculty: r.labFaculty })),
  }))}, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const progress_routes_1 = __importDefault(require("./routes/progress.routes"));
const group_routes_1 = __importDefault(require("./routes/group.routes"));
const subject_routes_1 = __importDefault(require("./routes/subject.routes"));
const notice_routes_1 = __importDefault(require("./routes/notice.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: env_1.env.clientUrl,
    credentials: true
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.get("/api/health", (_req, res) => {
    res.status(200).json({ success: true, message: "Server is healthy" });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/tasks", task_routes_1.default);
app.use("/api/progress", progress_routes_1.default);
app.use("/api/groups", group_routes_1.default);
app.use("/api/subjects", subject_routes_1.default);
app.use("/api/notices", notice_routes_1.default);
app.use(error_middleware_1.errorHandler);
exports.default = app;

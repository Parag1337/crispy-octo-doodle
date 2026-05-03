    # Academic Project Management — Research Document

    ## Executive Summary

    This document is a comprehensive research-oriented summary of the Academic Project Management repository in this workspace. It contains precise implementation details, data models, API contracts with request/response examples, algorithms used (guide assignment), deployment and reproducibility instructions, experimental design suggestions (for evaluation in a paper), security assessments, identified limitations, and recommended future work. Use this as the basis for the Methods and Implementation sections of a research paper.

    ---

    ## 1. Background & Problem Statement

    University capstone/project courses require students to form groups, register projects, and get assigned supervisors (guides). Manual assignment and administrative coordination are time-consuming and error-prone. This project automates group formation workflows, supports both student-initiated and admin-managed guide assignment, and provides tools for tracking progress and tasks.

    Research goals you can state:

    - Automate and evaluate guide assignment fairness and load balancing.
    - Measure student participation and task completion rates with the system.
    - Compare manual vs automated assignment in terms of time-to-assignment and guide load variance.

    Related systems (for literature review): course project management platforms, student information systems, and guidance allocation research (search terms: "automated advisor assignment", "project supervisor allocation", "student group formation algorithms").

    ---

    ## 2. System Overview (Architecture)

    - Backend: TypeScript + Express + Mongoose (MongoDB). The server validates environment variables with `zod`, uses JWT for auth, and role-based middleware for authorization.
    - Frontend: React + TypeScript + Vite. SPA with protected routes for `student`, `guide`, and `admin` experiences.
    - Database: MongoDB (production) and `mongodb-memory-server` for development/test fallback.
    - Communication: RESTful JSON API over HTTP(S).

    High-level component responsibilities:

    - `Auth`: registration, JWT login, Google OAuth, session handling.
    - `Group Management`: create groups, invite students, register for course/EDI, assign guides.
    - `Tasks & Progress`: guide-created tasks, student task updates, progress reporting.
    - `Admin Tools`: manage subjects, send notices, set global assignment limits, generate division-level reports.

    Key entry points:
    - Backend: [backend/src/server.ts](backend/src/server.ts#L1-L120)
    - Frontend: [frontend/src/main.tsx](frontend/src/main.tsx#L1-L40)

    ---

    ## 3. Data Models (detailed)

    All models are Mongoose schemas. Below are full field-level descriptions usable in a Methods section.

    1) `User` (`backend/src/models/user.model.ts`)
    - `_id`: ObjectId
    - `role`: "student" | "guide" | "admin"
    - `name`: string (required)
    - `email`: string (required, unique)
    - `password`: string (hashed, optional for OAuth accounts)
    - `hasCreatedGroup`: boolean (default false)
    - `branch`: string | null
    - `division`: string | null
    - `rollNo`: string | null
    - `teachingSubjects`: ObjectId[] (references `Subject`)
    - `createdAt`, `updatedAt`: timestamps

    2) `ProjectGroup` (`backend/src/models/projectGroup.model.ts`)
    - `_id`: ObjectId
    - `name`: string (required)
    - `subject`: string (required)
    - `repositoryUrl`: string | null
    - `isEdiRegistered`: boolean (default false)
    - `owner`: ObjectId (User)
    - `ediGuide`: ObjectId | null (User assigned for EDI)
    - `cpGuide`: ObjectId | null (Course project guide)
    - `projects`: array of {
    - `_id`, `title`, `subjectId`, `subjectName`, `guideName`, `repositoryUrl`, `createdBy`, `createdAt`
    }
    - `courseProjectRegistrations`: array of { `subjectId`, `subjectName`, `labFaculty`, `registeredAt` }
    - `members`: ObjectId[] (User)
    - `pendingInvites`: ObjectId[] (User)
    - `createdAt`, `updatedAt`

    3) `Task` (`backend/src/models/task.model.ts`)
    - `_id`, `title`, `description`, `assignee` (User), `group` (ProjectGroup), `createdBy` (User), `dueDate` (Date)
    - `status`: enum `todo` | `in-progress` | `done`
    - `priority`: enum `low` | `medium` | `high`
    - `completionNote`, `completionCommitUrls` (string[]), `completedAt`
    - timestamps

    4) `ProgressUpdate` (`backend/src/models/progressUpdate.model.ts`)
    - `_id`, `student` (User), optional `task` (Task)
    - `summary`: string
    - `completionPercent`: integer 0-100
    - `documentationUrl`: string | null
    - timestamps

    5) `Subject`, `SystemSetting`: simple admin-managed schemas for subjects and numeric configuration keys.

    ---

    ## 4. API Specification (examples)

    Below are example request/response pairs for critical endpoints — include these verbatim in Methods/Appendix.

    A) Register (student/guide/admin)

    Request:
    POST /api/auth/register
    Content-Type: application/json

    {
    "name": "Alice",
    "email": "alice@example.edu",
    "password": "securepass",
    "role": "student"
    }

    Success response (201):
    {
    "success": true,
    "message": "User created",
    "data": { "id": "<userId>", "name": "Alice", "email": "alice@example.edu" }
    }

    B) Login

    Request:
    POST /api/auth/login
    {
    "email": "alice@example.edu",
    "password": "securepass"
    }

    Success (200):
    {
    "success": true,
    "message": "Login successful",
    "data": { "token": "<jwt>", "user": { "name": "Alice", "role": "student" } }
    }

    C) Create Group (student)

    Request:
    POST /api/groups
    Authorization: Bearer <jwt>
    {
    "name": "AI Project",
    "subject": "Machine Learning",
    "repositoryUrl": "https://github.com/org/repo"
    }

    Success (201): returns full group object including `members` and `owner`.

    D) Random EDI Guide Assignment (admin)

    Request:
    POST /api/groups/:id/assign-guide-random
    Authorization: Bearer <admin-jwt>

    Response (200):
    {
    "success": true,
    "message": "Random EDI guide assigned successfully (global limit X)",
    "data": { /* formatted group object with `ediGuide` populated */ }
    }

    Implementation note: the assignment respects a global limit (`SystemSetting.edi_global_assignment_limit`) to cap how many EDI groups a guide can be assigned. When selecting, counts are aggregated and only guides with count < limit are eligible; then one is chosen uniformly at random.

    ---

    ## 5. Algorithms & Implementation Notes

    1) EDI Guide Random Assignment (formalized)

    - Input: group G (must be `isEdiRegistered`), global limit L (default 8)
    - Gather all `guide` users and compute assigned counts c_g = number of groups with `ediGuide = g`.
    - Filter eligible guides: those with c_g (after decrementing if the target group is already assigned to that guide) < L.
    - Choose uniformly at random from eligible guides and set `group.ediGuide = selectedGuide`.

    Pseudocode (matches `assignGuideRandomly` in [backend/src/controllers/group.controller.ts](backend/src/controllers/group.controller.ts#L1-L1000)):

    ```
    eligible = [g for g in guides if assignedCount[g] < L]
    if eligible empty: error
    selected = random.choice(eligible)
    group.ediGuide = selected
    save(group)
    ```

    2) Port auto-recovery for dev: `ensurePortIsFreeForDev` (in `portRecovery.ts`) calls `lsof`/`ps` and forcibly kills `node` processes on the target port when `AUTO_FREE_PORT=true` and not in production. This improves local dev reliability but should be disabled in shared/devops environments.

    3) Database fallback: when `MONGODB_URI` is absent, the server uses `mongodb-memory-server` to start an ephemeral in-memory MongoDB instance for local testing; note that data is transient.

    ---

    ## 6. Reproducibility & Deployment (exact steps)

    Use these commands and environment settings in the paper's Methods (Reproducibility subsection).

    Local development (Linux/macOS):

    1. Backend

    ```bash
    cd backend
    npm ci
    # create .env, required keys: MONGODB_URI or omit to use in-memory DB, JWT_SECRET
    # Example .env contents:
    # PORT=5000
    # NODE_ENV=development
    # MONGODB_URI=mongodb://localhost:27017/your-db
    # JWT_SECRET=replace_with_at_least_8_chars
    # CLIENT_URL=http://localhost:5173
    npm run dev
    ```

    2. Frontend

    ```bash
    cd frontend
    npm ci
    npm run dev
    # Open http://localhost:5173/
    ```

    Production (suggested): containerize

    - Provide a `Dockerfile` and `docker-compose.yml` (not included by default). Key points:
    - Use Node LTS base image
    - Build frontend (`npm run build`) and serve static files with a minimal server (or use Nginx)
    - Run backend with `npm start` and set `MONGODB_URI` to a persistent Mongo instance

    Reproducibility checklist (include with paper's supplementary material):
    - Node.js version used
    - `npm` / `package-lock.json` hashes
    - Full `.env.example` with descriptions
    - Seed scripts to create test users and subjects (not included — ask me to add)

    ---

    ## 7. Experimental Design (for research evaluation)

    Potential experiments you can run and report:

    1) Guide assignment fairness
    - Metric: standard deviation and max-min of number of groups per guide after assignment
    - Protocol: For N simulated groups, assign guides randomly via the built-in algorithm and compare to alternative strategies (round-robin, capacity-weighted, subject-matching).

    2) Assignment latency and admin effort
    - Measure time-to-assign for manual process vs automated approach in a pilot with real admins.

    3) Student outcomes
    - Track completion rate of tasks, time-to-completion, and progress update frequency across groups.

    4) Usability
    - Conduct SUS (System Usability Scale) survey with students/guides after onboarding.

    Data & metrics to report:
    - Assignment completion time, guide load variance, task completion ratio, average completion percent per progress update, user satisfaction scores.

    ---

    ## 8. Security, Privacy, and Ethics

    - Authentication: JWT tokens — ensure tokens use strong secrets and HTTPS in production.
    - Passwords: must be hashed (bcryptjs in deps). Do not store plaintext.
    - Emails: SMTP credentials should be stored securely (secrets manager) and not committed.
    - Privacy: student emails, roll numbers and branch/division are PII — comply with institutional policies.
    - Ethical use: do not expose assignment algorithms in ways that could bias or leak student choices.

    ---

    ## 9. Limitations & Threats to Validity

    - In-memory DB is non-persistent; experiments relying on persistent state must use a real MongoDB instance.
    - The current random assignment ignores subject-teaching matches — guides have `teachingSubjects` but random assignment does not prioritize them.
    - No rate-limiting or comprehensive audit logging implemented.

    ---

    ## 10. Appendix — Useful Code Excerpts

    A) Random EDI Guide Assignment (excerpt)

    See full implementation in [backend/src/controllers/group.controller.ts](backend/src/controllers/group.controller.ts#L1-L1200). The excerpt used in analysis:

    ```ts
    // compute assignmentStats via aggregation
    const assignmentStats = await ProjectGroupModel.aggregate([
    { $match: { isEdiRegistered: true, ediGuide: { $in: guideIds } } },
    { $group: { _id: "$ediGuide", count: { $sum: 1 } } }
    ]);
    // filter eligible guides where count < globalLimit
    ```

    B) Port recovery (excerpt)

    See [backend/src/utils/portRecovery.ts](backend/src/utils/portRecovery.ts#L1-L200). The method locates a PID from `lsof` and kills it when safe.

    C) Environment validation

    See [backend/src/config/env.ts](backend/src/config/env.ts#L1-L80). Important variables and validation rules are enforced with `zod`.

    ---

    ## 11. Supplementary Material (what I can add next)

    I can extend the repository with:

    - `README.research.md` with a one-click reproducibility script and `docker-compose.yml`.
    - Data seeding scripts to populate test users, guides, and sample groups.
    - Jupyter notebook or script to run simulated experiments comparing assignment algorithms and produce plots/tables for Results.
    - Unit / integration tests (Jest + Supertest) and example CI pipeline.

    Tell me which of these you want and I will add them; if you want, I can also produce LaTeX-ready Methods and Appendix text (formatted paragraphs) for your paper.

    ---

    *Document generated from repository files. Contact me for additional extracts or to include graphs/diagrams.*


    - Project files: `backend/` and `frontend/` directories in this workspace.

    ## How to cite (suggested)

    Author(s). (Year). Academic Project Management — Source code. GitHub repository. URL (if published).

    ---

    This document was autogenerated from the repository layout and source files. For any missing detail required by your paper (e.g., specific algorithms for guide assignment or exact statistical evaluation), tell me which sections to expand and I will add implementation excerpts, code references, and diagrams.

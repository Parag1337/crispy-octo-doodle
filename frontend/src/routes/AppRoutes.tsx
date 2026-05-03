import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import SignupPage from "../pages/SignupPage";
import StudentDashboard from "../pages/StudentDashboard";
import StudentProjectsPage from "../pages/StudentProjectsPage";
import StudentProjectDetailsPage from "../pages/StudentProjectDetailsPage";
import EdiMajorProjectPage from "../pages/EdiMajorProjectPage";
import CourseProjectPage from "../pages/CourseProjectPage";
import GuideDashboard from "../pages/GuideDashboard";
import GuideSubjectsPage from "../pages/GuideSubjectsPage";
import GuideMentoringProjectsPage from "../pages/GuideMentoringProjectsPage";
import GroupPage from "../pages/GroupPage";
import TasksPage from "../pages/TasksPage";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../hooks/useAuth";
import AdminDashboard from "../pages/AdminDashboard";
import AdminGuideAssignmentPage from "../pages/AdminGuideAssignmentPage";
import AdminGuidesPage from "../pages/AdminGuidesPage";
import AdminGuideDetailsPage from "../pages/AdminGuideDetailsPage";
import AdminCourseProjectGroupsPage from "../pages/AdminCourseProjectGroupsPage";
import AdminEdiGroupsPage from "../pages/AdminEdiGroupsPage";
import AdminStudentsDirectoryPage from "../pages/AdminStudentsDirectoryPage";
import AdminStudentsDivisionPage from "../pages/AdminStudentsDivisionPage";
import AdminSendNoticePage from "../pages/AdminSendNoticePage";
import NotificationsPage from "../pages/NotificationsPage";

const DashboardHome = () => {
  const { user } = useAuth();
  if (user?.role === "guide") return <GuideDashboard />;
  if (user?.role === "admin") return <AdminDashboard />;
  return <StudentDashboard />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/groups" element={<GroupPage />} />
          <Route path="/guide/subjects" element={<GuideSubjectsPage />} />
          <Route path="/guide/projects" element={<GuideMentoringProjectsPage />} />
          <Route path="/student/edi-major-project" element={<EdiMajorProjectPage />} />
          <Route path="/student/course-project" element={<CourseProjectPage />} />
          <Route path="/student/projects" element={<StudentProjectsPage />} />
          <Route path="/student/projects/:projectId" element={<StudentProjectDetailsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/admin/edi-guide-assignment" element={<AdminGuideAssignmentPage />} />
          <Route path="/admin/edi-groups" element={<AdminEdiGroupsPage />} />
          <Route path="/admin/course-project-groups" element={<AdminCourseProjectGroupsPage />} />
          <Route path="/admin/students-directory" element={<AdminStudentsDirectoryPage />} />
          <Route path="/admin/students-directory/:branch/:division" element={<AdminStudentsDivisionPage />} />
          <Route path="/admin/send-notice" element={<AdminSendNoticePage />} />
          <Route path="/admin/guides" element={<AdminGuidesPage />} />
          <Route path="/admin/guides/:guideId" element={<AdminGuideDetailsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;

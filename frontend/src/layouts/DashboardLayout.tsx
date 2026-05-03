import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import Button from "../components/Button";
import { Home, Users, LogOut, Shuffle, ContactRound, Megaphone, Sun, Moon, GraduationCap, LayoutDashboard, Bell } from "lucide-react";

const DashboardLayout = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition font-medium text-xs md:text-sm",
      isActive
        ? "text-[var(--primary)]"
        : "text-[var(--text-muted)] hover:text-[var(--primary)]"
    ].join(" ");

  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text-body)] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full bg-[var(--card-bg)] border-b border-[var(--border)] shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* Logo / Branding (Left) */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-sm">
                <LayoutDashboard size={20} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold leading-tight text-[var(--text-strong)] tracking-tight">Academic PM</h1>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
                  {user?.role === "admin" ? "Admin Portal" : user?.role === "guide" ? "Guide Portal" : "Student Portal"}
                </p>
              </div>
            </div>

            {/* Navigation (Center) - Simplified to App Shell */}
            <nav className="flex items-center justify-center gap-1 overflow-x-auto no-scrollbar mx-4">
              <NavLink className={navItemClass} to="/dashboard"><Home size={20} /><span className="hidden lg:block">Dashboard</span></NavLink>
              <NavLink className={navItemClass} to="/groups"><Users size={20} /><span className="hidden lg:block">Groups</span></NavLink>
              
              {user?.role === "admin" && (
                <>
                  <NavLink className={navItemClass} to="/admin/edi-guide-assignment"><Shuffle size={20} /><span className="hidden lg:block">Assignment</span></NavLink>
                  <NavLink className={navItemClass} to="/admin/guides"><GraduationCap size={20} /><span className="hidden lg:block">Guides</span></NavLink>
                  <NavLink className={navItemClass} to="/admin/students-directory"><ContactRound size={20} /><span className="hidden lg:block">Students</span></NavLink>
                  <NavLink className={navItemClass} to="/admin/send-notice"><Megaphone size={20} /><span className="hidden lg:block">Notice</span></NavLink>
                </>
              )}
            </nav>

            {/* User Actions (Right) */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden md:block text-right mr-2">
                <p className="text-sm font-semibold text-[var(--text-strong)]">{user?.name ?? "Student"}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{user?.email ?? ""}</p>
              </div>

              {/* Notifications Button */}
              <Link
                to="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-muted)] transition hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                title="Notifications"
              >
                <Bell size={16} />
                <span className="absolute top-0 right-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-[var(--bg-1)]"></span>
              </Link>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-muted)] transition hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>

              <Button className="h-9 px-3 flex items-center gap-2" variant="secondary" onClick={signOut}>
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full p-4 md:p-8">
        <div className="mx-auto max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

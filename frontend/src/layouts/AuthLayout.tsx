import type { ReactNode } from "react";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text-body)] px-4 py-6 md:px-6 relative">
      {/* Theme Toggle Button at top right */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-10">
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-muted)] shadow-sm transition hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr] pt-10 md:pt-0">
        <section className="reveal-up delay-1 glass-panel rounded-[28px] border border-[var(--border)] p-8 shadow-card md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">Academic Project Portal</p>
          <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight text-[var(--text-strong)] md:text-5xl">Manage groups, guides, and project work from one workspace.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-muted)] md:text-base">
            A cleaner workflow for students, guides, and admins to coordinate subject registration, progress, and delivery without switching tools.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["Subject-linked", "Teacher selection follows the project subject."],
              ["Role aware", "Separate views for students, guides, and admins."],
              ["Fast actions", "Register, review, and update without friction."]
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/70 p-4 shadow-soft">
                <p className="text-sm font-semibold text-[var(--text-strong)]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="reveal-up delay-2 mx-auto w-full max-w-[30rem] rounded-[26px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-card md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

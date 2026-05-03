import { useState } from "react";
import axios from "axios";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { BadgeCheck, GraduationCap, ShieldCheck, Users2 } from "lucide-react";
import AuthLayout from "../layouts/AuthLayout";
import Input from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { loginRequest, googleLoginRequest } from "../services/auth.api";
import type { UserRole } from "../types/user.types";

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTabChange = (role: UserRole) => {
    setActiveTab(role);
    setError("");
    setEmail("");
    setPassword("");
  };

  const onGoogleSuccess = async (response: CredentialResponse) => {
    try {
      if (!response.credential) return;
      setIsLoading(true);
      setError("");
      
      const res = await googleLoginRequest({
        credential: response.credential,
        role: activeTab
      });
      
      const { user } = res.data.data;
      signIn(user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { message?: string } | undefined)?.message;
        setError(message ?? "Google Login failed.");
      } else {
        setError("Google Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await loginRequest({ email, password });
      const { user } = response.data.data;
      
      if (user.role !== activeTab) {
        throw new Error(`Invalid credentials for ${activeTab} role`);
      }
      
      signIn(user);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { message?: string } | undefined)?.message;
        setError(message ?? "Login failed. Please verify your credentials.");
      } else {
        setError(err.message ?? "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-1)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          <BadgeCheck size={14} /> Secure access
        </span>
        <h2 className="mt-3 text-[2rem] font-bold leading-tight text-[var(--text-strong)]">Sign in to your workspace</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Choose your role, authenticate, and jump into the right dashboard.</p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/70 p-2 shadow-soft">
        {(["admin", "guide", "student"] as UserRole[]).map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => handleTabChange(role)}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              activeTab === role
                ? "bg-[var(--primary)] text-white shadow-card"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-2)] hover:text-[var(--text-strong)]"
            }`}
          >
            {role === "admin" ? <ShieldCheck size={14} /> : role === "guide" ? <GraduationCap size={14} /> : <Users2 size={14} />}
            {role === "guide" ? "Project Guide" : role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        ))}
      </div>

      <div className="my-4 flex items-center">
        <div className="flex-grow border-t border-[var(--border)]"></div>
        <span className="mx-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]"> sign in with email</span>
        <div className="flex-grow border-t border-[var(--border)]"></div>
      </div>

      <form className="space-y-3.5" onSubmit={onSubmit}>
        <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error ? <p className="rounded-2xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}

        <Button className="w-full text-base" type="submit" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>

        <p className="text-center text-sm text-[var(--text-muted)]">
          New here? <Link className="font-semibold text-[var(--primary)] hover:underline" to="/signup">Create an account</Link>
        </p>
      </form>

      <div className="my-4 flex items-center">
        <div className="flex-grow border-t border-[var(--border)]"></div>
        <span className="mx-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Or continue with Google</span>
        <div className="flex-grow border-t border-[var(--border)]"></div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]/60 p-3.5 shadow-soft">
        <GoogleLogin
          onSuccess={onGoogleSuccess}
          onError={() => setError("Google login failed")}
          useOneTap={false}
          theme={theme === "dark" ? "filled_black" : "outline"}
          shape="rectangular"
          text="signin_with"
        />
        <p className="text-xs text-[var(--text-muted)]">Use Google if your account is already approved.</p>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;

import { FormEvent, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const location = useLocation();
  const registered = (location.state as any)?.registered;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Email and password are required"); return; }
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {registered && <p className="success-text" style={{ marginBottom: 12 }}>Account created — please log in.</p>}

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" disabled={isLoading} autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" disabled={isLoading} autoComplete="current-password" />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="primary-button" style={{ width: "100%", marginTop: 4 }} disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <div className="auth-link-row">
            Don't have an account?{" "}
            <button className="link-button" onClick={() => navigate("/register")}>Sign up</button>
          </div>
          <div className="auth-link-row" style={{ marginTop: 8 }}>
            <button className="link-button" onClick={() => navigate("/")}>← Back to home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

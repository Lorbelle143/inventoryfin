import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) { setError("All fields are required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    try {
      await register(email, password, name);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Create account</h1>
        <p className="auth-subtitle">Start tracking your inventory and finances</p>

        <form onSubmit={handleSubmit}>
          <label>
            Full Name
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name" disabled={isLoading} autoComplete="name" />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" disabled={isLoading} autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters" disabled={isLoading} autoComplete="new-password" />
          </label>
          <label>
            Confirm Password
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" disabled={isLoading} autoComplete="new-password" />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="primary-button" style={{ width: "100%", marginTop: 4 }} disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          <div className="auth-link-row">
            Already have an account?{" "}
            <button className="link-button" onClick={() => navigate("/login")}>Sign in</button>
          </div>
          <div className="auth-link-row" style={{ marginTop: 8 }}>
            <button className="link-button" onClick={() => navigate("/")}>← Back to home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

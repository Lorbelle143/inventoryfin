import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (!token) { setError("Invalid or missing reset token"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Reset failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Reset Password</h1>
        <p className="auth-subtitle">
          {done ? "Password updated successfully." : "Enter your new password below."}
        </p>

        {done ? (
          <div style={{ marginTop: 24 }}>
            <div style={{
              background: "rgba(74,222,128,0.15)", color: "#4ade80",
              border: "1px solid rgba(74,222,128,0.3)",
              borderRadius: 12, padding: "14px 18px", fontSize: 14, marginBottom: 20,
            }}>
              ✅ Password changed! You can now sign in.
            </div>
            <button className="primary-button" style={{ width: "100%" }} onClick={() => navigate("/login")}>
              Go to Sign In
            </button>
          </div>
        ) : !token ? (
          <div style={{ marginTop: 24 }}>
            <p className="error-text">Invalid or expired reset link. Please request a new one.</p>
            <button className="primary-button" style={{ width: "100%", marginTop: 16 }}
              onClick={() => navigate("/forgot-password")}>
              Request New Link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <label>
              New Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                disabled={loading}
                autoComplete="new-password"
                autoFocus
              />
            </label>
            <label>
              Confirm Password
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                disabled={loading}
                autoComplete="new-password"
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button
              type="submit"
              className="primary-button"
              style={{ width: "100%", marginTop: 4 }}
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <div className="auth-link-row" style={{ marginTop: 12 }}>
            <button className="link-button" onClick={() => navigate("/login")}>← Back to Sign In</button>
          </div>
        </div>
      </div>
    </div>
  );
}

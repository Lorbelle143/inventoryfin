import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Always show success even if email not found (security best practice)
      if (res.ok || res.status === 404) {
        setSubmitted(true);
      } else {
        const d = await res.json();
        setError(d.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Forgot Password</h1>
        <p className="auth-subtitle">
          {submitted
            ? "Check your email for the reset link."
            : "Enter your email and we'll send a reset link."}
        </p>

        {submitted ? (
          <div style={{ marginTop: 24 }}>
            <div style={{
              background: "rgba(74,222,128,0.15)", color: "#4ade80",
              border: "1px solid rgba(74,222,128,0.3)",
              borderRadius: 12, padding: "14px 18px", fontSize: 14, marginBottom: 20,
            }}>
              ✅ If <strong>{email}</strong> is registered, a reset link has been sent.
            </div>
            <button className="primary-button" style={{ width: "100%" }} onClick={() => navigate("/login")}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button
              type="submit"
              className="primary-button"
              style={{ width: "100%", marginTop: 4 }}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
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

import { useNavigate } from "react-router-dom";

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: 560, width: "100%" }}>
        <h1>Privacy Policy</h1>
        <p className="auth-subtitle">Last updated: June 2026</p>

        <div className="legal-body">
          <h2>1. What We Collect</h2>
          <p>We collect only the information you provide: your name, email address, password (hashed), and the financial/inventory data you enter.</p>

          <h2>2. How We Use It</h2>
          <p>Your data is used solely to provide the InventoryFin service — displaying your balance, inventory, and transaction history to you.</p>

          <h2>3. Data Storage</h2>
          <p>All data is stored in a local SQLite database on the server. Passwords are hashed using bcrypt and are never stored in plain text.</p>

          <h2>4. Data Sharing</h2>
          <p>We do not sell, rent, or share your personal data with any third parties.</p>

          <h2>5. Security</h2>
          <p>We use JWT-based authentication with short-lived access tokens (15 minutes) and long-lived refresh tokens (30 days). Tokens are stored in your browser's localStorage.</p>

          <h2>6. Your Rights</h2>
          <p>You can delete your transactions and inventory items at any time. To fully delete your account, contact the administrator.</p>

          <h2>7. Cookies</h2>
          <p>We do not use cookies. Authentication tokens are stored in localStorage only.</p>

          <h2>8. Contact</h2>
          <p>For any privacy concerns, contact the system administrator directly.</p>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => navigate("/")} className="link-button">← Back to home</button>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          <button onClick={() => navigate("/terms")} className="link-button">Terms of Use</button>
        </div>
      </div>
    </div>
  );
}

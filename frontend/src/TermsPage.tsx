import { useNavigate } from "react-router-dom";

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: 560, width: "100%" }}>
        <h1>Terms of Use</h1>
        <p className="auth-subtitle">Last updated: June 2026</p>

        <div className="legal-body">
          <h2>1. Acceptance</h2>
          <p>By creating an account and using InventoryFin, you agree to these terms. If you do not agree, do not use the service.</p>

          <h2>2. Description of Service</h2>
          <p>InventoryFin is a personal financial and inventory tracking tool. It allows you to record transactions, manage stock levels, and monitor your balance.</p>

          <h2>3. Your Account</h2>
          <p>You are responsible for keeping your login credentials secure. All data you enter is associated with your account and is only accessible by you.</p>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to misuse the service, attempt to gain unauthorized access, or use it for any unlawful purpose.</p>

          <h2>5. Data</h2>
          <p>Your data is stored locally on the server running this application. We do not sell or share your data with third parties.</p>

          <h2>6. Disclaimer</h2>
          <p>This service is provided "as is" without warranties of any kind. Financial figures shown are based solely on data you enter — always verify with your actual records.</p>

          <h2>7. Changes</h2>
          <p>We may update these terms at any time. Continued use of the service after changes constitutes acceptance.</p>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => navigate("/")} className="link-button">← Back to home</button>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          <button onClick={() => navigate("/privacy")} className="link-button">Privacy Policy</button>
        </div>
      </div>
    </div>
  );
}

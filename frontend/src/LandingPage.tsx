import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-content">
          <h1>Inventory Financial<br />System</h1>
          <p className="tagline">Track your money. Manage your stock.</p>
          <p className="subtitle">
            A complete tool to monitor your balance, record transactions,
            and keep your inventory in check — all in one place.
          </p>

          <div className="landing-actions">
            <button className="primary-button" onClick={() => navigate("/login")}>
              Get Started
            </button>
            <button className="secondary-button" onClick={() => navigate("/register")}>
              Create Account
            </button>
          </div>

          <div className="features">
            <div className="feature-card">
              <h3>💰 Balance Tracking</h3>
              <p>Set your starting balance and watch it update automatically with every transaction.</p>
            </div>
            <div className="feature-card">
              <h3>📦 Inventory Management</h3>
              <p>Add, edit, and track stock levels. Quantities update automatically when you buy or sell.</p>
            </div>
            <div className="feature-card">
              <h3>📊 Charts & Reports</h3>
              <p>Visual breakdowns of income, expenses, and inventory value over time.</p>
            </div>
          </div>

          <div className="landing-footer-links">
            <button onClick={() => navigate("/terms")} className="link-button">Terms of Use</button>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
            <button onClick={() => navigate("/privacy")} className="link-button">Privacy Policy</button>
          </div>
        </div>
      </div>
    </div>
  );
}

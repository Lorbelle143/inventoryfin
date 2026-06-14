import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

type NavItem = { label: string; icon: string; path: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Charts",    icon: "📊", path: "/charts"    },
  { label: "Stats",     icon: "📈", path: "/statistics"},
  { label: "Earnings",  icon: "💰", path: "/earnings"  },
  { label: "Settings",  icon: "⚙️",  path: "/settings"  },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();

  const active = (path: string) => location.pathname === path;

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">InventoryFin</div>
          <div className="sidebar-brand-sub">Financial Management</div>
        </div>

        <div className="sidebar-profile">
          <div className="avatar">{user?.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{user?.name || "User"}</div>
            <div className="sidebar-profile-email">{user?.email || ""}</div>
          </div>
        </div>

        <div className="sidebar-section-label">Menu</div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`nav-item${active(item.path) ? " active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label === "Stats" ? "Statistics" : item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => { logout(); navigate("/"); }}>
            <span className="nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom navigation ─────────────────── */}
      <nav className="mobile-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.path}
            className={`mobile-nav-item${active(item.path) ? " active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
        <button
          className="mobile-nav-item"
          onClick={() => { logout(); navigate("/"); }}
        >
          <span className="mobile-nav-icon">🚪</span>
          <span className="mobile-nav-label">Logout</span>
        </button>
      </nav>
    </>
  );
}

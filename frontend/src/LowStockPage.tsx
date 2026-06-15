import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Sidebar from "./Sidebar";
import type { InventoryItem } from "./types";

const fmt = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type RestockState = { itemId: number; value: string; loading: boolean; error: string };

const SEVERITY_CONFIG = {
  out: {
    label: "Out of Stock", icon: "🚫",
    borderColor: "rgba(239,68,68,0.5)", bg: "rgba(239,68,68,0.08)",
    badgeBg: "rgba(239,68,68,0.25)", badgeColor: "#fca5a5",
    tagBg: "rgba(239,68,68,0.2)", tagColor: "#fca5a5",
  },
  critical: {
    label: "Critical (1–3)", icon: "🔴",
    borderColor: "rgba(249,115,22,0.5)", bg: "rgba(249,115,22,0.08)",
    badgeBg: "rgba(249,115,22,0.25)", badgeColor: "#fdba74",
    tagBg: "rgba(249,115,22,0.2)", tagColor: "#fdba74",
  },
  low: {
    label: "Low Stock (4–10)", icon: "🟡",
    borderColor: "rgba(234,179,8,0.5)", bg: "rgba(234,179,8,0.06)",
    badgeBg: "rgba(234,179,8,0.2)", badgeColor: "#fde68a",
    tagBg: "rgba(234,179,8,0.18)", tagColor: "#fde68a",
  },
};

export default function LowStockPage() {
  const navigate = useNavigate();
  const { token, authFetch } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restock, setRestock] = useState<RestockState | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [severityFilter, setSeverityFilter] = useState<"all" | "out" | "critical" | "low">("all");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchLowStock();
  }, [token]);

  function fetchLowStock() {
    setLoading(true);
    authFetch("/api/items")
      .then(r => r.json())
      .then(d => {
        const all: InventoryItem[] = Array.isArray(d) ? d : d.data ?? [];
        setItems(all.filter(item => item.quantity <= 10));
      })
      .finally(() => setLoading(false));
  }

  async function submitRestock(item: InventoryItem) {
    if (!restock) return;
    const qty = parseInt(restock.value, 10);
    if (isNaN(qty) || qty <= 0) {
      setRestock(r => r ? { ...r, error: "Enter a valid quantity greater than 0." } : r);
      return;
    }
    setRestock(r => r ? { ...r, loading: true, error: "" } : r);
    try {
      const res = await authFetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: item.quantity + qty }),
      });
      if (!res.ok) throw new Error("Failed to update.");
      setSuccessMsg(`Restocked "${item.name}" (+${qty})`);
      setRestock(null);
      fetchLowStock();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed.";
      setRestock(r => r ? { ...r, loading: false, error: msg } : r);
    }
  }

  function getSeverity(qty: number): "out" | "critical" | "low" {
    if (qty === 0) return "out";
    if (qty <= 3) return "critical";
    return "low";
  }

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === "all" || getSeverity(item.quantity) === severityFilter;
    return matchSearch && matchSeverity;
  });

  const grouped = {
    out:      filteredItems.filter(i => i.quantity === 0),
    critical: filteredItems.filter(i => i.quantity >= 1 && i.quantity <= 3),
    low:      filteredItems.filter(i => i.quantity >= 4 && i.quantity <= 10),
  };

  const totalOut      = items.filter(i => i.quantity === 0).length;
  const totalCritical = items.filter(i => i.quantity >= 1 && i.quantity <= 3).length;
  const totalLow      = items.filter(i => i.quantity >= 4 && i.quantity <= 10).length;

  function renderItem(item: InventoryItem) {
    const cfg = SEVERITY_CONFIG[getSeverity(item.quantity)];
    const isRestocking = restock?.itemId === item.id;
    const isList = viewMode === "list";

    return (
      <div
        key={item.id}
        className="item-card"
        style={{
          borderColor: cfg.borderColor,
          background: cfg.bg,
          ...(isList ? { display: "flex", alignItems: "center", gap: 16 } : {}),
        }}
      >
        <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div className="item-card-name">{item.name}</div>
            <div className="item-card-meta">
              <span>Qty: <strong style={{ color: cfg.badgeColor }}>{item.quantity}</strong></span>
              <span>Unit: <strong>₱{fmt(item.unitPrice)}</strong></span>
              {!isList && <span>Value: <strong>₱{fmt(item.totalValue)}</strong></span>}
            </div>
          </div>
          <span className="stock-badge" style={{ background: cfg.tagBg, color: cfg.tagColor, border: "none", flexShrink: 0 }}>
            {item.quantity === 0 ? "Out" : item.quantity <= 3 ? "Critical" : "Low"}
          </span>
        </div>

        {isRestocking ? (
          <div style={{ marginTop: isList ? 0 : 12, display: "flex", flexDirection: "column", gap: 8, ...(isList ? { marginLeft: 8 } : {}) }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="number" min={1} placeholder="Add qty..."
                value={restock.value}
                onChange={e => setRestock(r => r ? { ...r, value: e.target.value } : r)}
                style={{ maxWidth: 120 }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={() => submitRestock(item)} disabled={restock.loading}>
                {restock.loading ? "..." : "Confirm"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRestock(null)}
                style={{ color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.2)" }}>
                Cancel
              </button>
            </div>
            {restock.error && <div className="error-text">{restock.error}</div>}
          </div>
        ) : (
          <div className={isList ? "" : "item-card-actions"} style={isList ? { marginLeft: 8, flexShrink: 0 } : {}}>
            <button className="btn btn-primary btn-sm"
              onClick={() => setRestock({ itemId: item.id, value: "", loading: false, error: "" })}>
              📦 Restock
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <div className="page-header">
            <div className="page-header-row">
              <div>
                <div className="page-eyebrow">Inventory</div>
                <h1 className="page-title">Low Stock Alerts</h1>
                <p className="page-subtitle">Items with quantity at or below 10 — restock before running out.</p>
              </div>
              <div className="page-header-actions">
                <button className="btn btn-secondary btn-sm" onClick={fetchLowStock} disabled={loading}>
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Summary badges */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {[
              { key: "all",      label: `All (${items.length})`,        color: "rgba(255,255,255,0.6)",  bg: "rgba(255,255,255,0.08)" },
              { key: "out",      label: `🚫 Out (${totalOut})`,          color: "#fca5a5", bg: "rgba(239,68,68,0.15)" },
              { key: "critical", label: `🔴 Critical (${totalCritical})`, color: "#fdba74", bg: "rgba(249,115,22,0.15)" },
              { key: "low",      label: `🟡 Low (${totalLow})`,           color: "#fde68a", bg: "rgba(234,179,8,0.12)" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setSeverityFilter(f.key as typeof severityFilter)}
                style={{
                  background: severityFilter === f.key ? f.bg : "rgba(255,255,255,0.05)",
                  border: `1px solid ${severityFilter === f.key ? f.color : "rgba(255,255,255,0.12)"}`,
                  color: severityFilter === f.key ? f.color : "rgba(255,255,255,0.5)",
                  borderRadius: 9999, padding: "5px 14px", fontSize: 12,
                  fontWeight: 700, cursor: "pointer", transition: "all .15s",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search + view toggle */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
              <span className="search-icon">🔍</span>
              <input
                placeholder="Search items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setViewMode("grid")}
                style={{
                  background: viewMode === "grid" ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${viewMode === "grid" ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.12)"}`,
                  color: viewMode === "grid" ? "white" : "rgba(255,255,255,0.5)",
                  borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16,
                }}
                title="Grid view"
              >⊞</button>
              <button
                onClick={() => setViewMode("list")}
                style={{
                  background: viewMode === "list" ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${viewMode === "list" ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.12)"}`,
                  color: viewMode === "list" ? "white" : "rgba(255,255,255,0.5)",
                  borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16,
                }}
                title="List view"
              >☰</button>
            </div>
          </div>

          {successMsg && (
            <div style={{
              background: "rgba(74,222,128,0.15)", color: "#4ade80",
              border: "1px solid rgba(74,222,128,0.3)",
              borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 14,
            }}>✅ {successMsg}</div>
          )}

          {loading ? (
            <div className="loading-row"><div className="spinner" /> Loading low stock items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{search ? "🔍" : "✅"}</div>
              <div className="empty-state-title">
                {search ? "No items match your search" : "All items are well stocked!"}
              </div>
              <div className="empty-state-desc">
                {search ? "Try a different keyword." : "No items have quantity 10 or below."}
              </div>
            </div>
          ) : severityFilter !== "all" ? (
            // Single severity view
            <div className={viewMode === "grid" ? "item-grid" : "grid gap-2"}>
              {filteredItems.map(renderItem)}
            </div>
          ) : (
            // Grouped by severity
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {(["out", "critical", "low"] as const).map(severity => {
                const group = grouped[severity];
                if (group.length === 0) return null;
                const cfg = SEVERITY_CONFIG[severity];
                return (
                  <div key={severity}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                      <span style={{ fontWeight: 700, color: cfg.badgeColor, fontSize: 15 }}>{cfg.label}</span>
                      <span style={{
                        background: cfg.badgeBg, color: cfg.badgeColor,
                        borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: "2px 9px",
                      }}>
                        {group.length} item{group.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className={viewMode === "grid" ? "item-grid" : "grid gap-2"}>
                      {group.map(renderItem)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Sidebar from "./Sidebar";
import type { Transaction, TransactionItem } from "./types";

const fmt = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function EarningsPage() {
  const navigate = useNavigate();
  const { token, authFetch } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    authFetch("/api/transactions?limit=200")
      .then(r => r.json())
      .then(d => setTransactions(Array.isArray(d) ? d : d.data ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = transactions.filter(tx => {
    const matchType = filter === "all" || tx.type === filter;
    const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const incomeTotal = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = incomeTotal - expenseTotal;

  return (
    <div className="page-shell">
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <div className="page-header">
            <div className="page-eyebrow">Finance</div>
            <h1 className="page-title">Earnings</h1>
            <p className="page-subtitle">Full transaction history with income and expense breakdown.</p>
          </div>

          {/* Summary cards */}
          <div className="earnings-header-cards">
            <div className="stat-card income">
              <div className="stat-card-label">📈 Total Income</div>
              <div className="stat-card-value">₱{fmt(incomeTotal)}</div>
              <div className="stat-card-sub">{transactions.filter(t => t.type === "income").length} transactions</div>
            </div>
            <div className="stat-card expense">
              <div className="stat-card-label">📉 Total Expenses</div>
              <div className="stat-card-value">₱{fmt(expenseTotal)}</div>
              <div className="stat-card-sub">{transactions.filter(t => t.type === "expense").length} transactions</div>
            </div>
            <div className={`stat-card ${net >= 0 ? "income" : "expense"}`}>
              <div className="stat-card-label">💹 Net</div>
              <div className="stat-card-value">{net >= 0 ? "+" : ""}₱{fmt(net)}</div>
              <div className="stat-card-sub">{transactions.length} total transactions</div>
            </div>
          </div>

          {/* Transaction list */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Transaction History</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div className="search-bar" style={{ minWidth: 200 }}>
                  <span className="search-icon">🔍</span>
                  <input placeholder="Search description..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="filter-tabs">
                  {(["all", "income", "expense"] as const).map(f => (
                    <button key={f} className={`filter-tab${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
                      {f === "all" ? "All" : f === "income" ? "📈 Income" : "📉 Expense"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading-row"><div className="spinner" /> Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <div className="empty-state-title">No transactions found</div>
                <div className="empty-state-desc">Try adjusting your search or filter.</div>
              </div>
            ) : (
              <div className="transaction-list">
                {filtered.map((tx: Transaction) => (
                  <div key={tx.id} className={`transaction-card tx-${tx.type}`}>
                    <div className="transaction-header">
                      <div>
                        <div className="transaction-desc">{tx.description}</div>
                        <div className="transaction-date">
                          {new Date(tx.createdAt).toLocaleString("en-PH", {
                            year: "numeric", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </div>
                      </div>
                      <div className="transaction-right">
                        <span className={`transaction-amount ${tx.type}`}>
                          {tx.type === "income" ? "+" : "-"}₱{fmt(tx.amount)}
                        </span>
                        <span className={`pill ${tx.type}`}>
                          {tx.type === "income" ? "📈 Income" : "📉 Expense"}
                        </span>
                      </div>
                    </div>
                    {tx.items.length > 0 && (
                      <div className="transaction-items-list">
                        {tx.items.map((ti: TransactionItem) => (
                          <span key={ti.id} className="transaction-item-chip">
                            {ti.item.name} ×{ti.quantity} @ ₱{fmt(ti.unitPrice)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

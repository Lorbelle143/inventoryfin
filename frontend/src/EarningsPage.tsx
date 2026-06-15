import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Sidebar from "./Sidebar";
import type { Transaction, TransactionItem } from "./types";

const fmt = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PAGE_SIZE = 20;

export default function EarningsPage() {
  const navigate = useNavigate();
  const { token, authFetch } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    setTransactions([]);
    setPage(1);
    loadPage(1, false);
  }, [token]);

  function loadPage(pageNum: number, append: boolean) {
    const offset = (pageNum - 1) * PAGE_SIZE;
    const setter = append ? setLoadingMore : setLoading;
    setter(true);
    authFetch(`/api/transactions?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(r => r.json())
      .then(d => {
        const data: Transaction[] = Array.isArray(d) ? d : d.data ?? [];
        const totalCount: number = d.pagination?.total ?? data.length;
        setTotal(totalCount);
        setTransactions(prev => append ? [...prev, ...data] : data);
      })
      .finally(() => setter(false));
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage, true);
  }

  const allLoaded = transactions.length >= total && total > 0;

  const filtered = transactions.filter(tx => {
    const matchType = filter === "all" || tx.type === filter;
    const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase());
    let matchDate = true;
    if (dateFrom || dateTo) {
      const txDate = new Date(tx.createdAt);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (txDate < from) matchDate = false;
      }
      if (matchDate && dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (txDate > to) matchDate = false;
      }
    }
    return matchType && matchSearch && matchDate;
  });

  const incomeTotal = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = incomeTotal - expenseTotal;

  function exportCSV() {
    const header = ["Date", "Description", "Type", "Amount", "Items"].join(",");
    const rows = filtered.map(tx => {
      const date = new Date(tx.createdAt).toLocaleString("en-PH", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
      const desc = `"${tx.description.replace(/"/g, '""')}"`;
      const items = `"${tx.items.map((ti: TransactionItem) => `${ti.item.name} x${ti.quantity}`).join("; ")}"`;
      return [date, desc, tx.type, tx.amount.toFixed(2), items].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

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
              <div className="stat-card-sub">{transactions.filter(t => t.type === "income").length} transactions loaded</div>
            </div>
            <div className="stat-card expense">
              <div className="stat-card-label">📉 Total Expenses</div>
              <div className="stat-card-value">₱{fmt(expenseTotal)}</div>
              <div className="stat-card-sub">{transactions.filter(t => t.type === "expense").length} transactions loaded</div>
            </div>
            <div className={`stat-card ${net >= 0 ? "income" : "expense"}`}>
              <div className="stat-card-label">💹 Net</div>
              <div className="stat-card-value">{net >= 0 ? "+" : ""}₱{fmt(net)}</div>
              <div className="stat-card-sub">{transactions.length} of {total} total</div>
            </div>
          </div>

          <div className="panel">
            {/* Row 1: search + type filter + export */}
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
                <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
                  ⬇️ Export CSV
                </button>
              </div>
            </div>

            {/* Row 2: date range */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600 }}>Date range:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 150 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 150 }} />
              </div>
              {(dateFrom || dateTo) && (
                <button className="btn btn-ghost btn-sm"
                  style={{ color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.2)" }}
                  onClick={() => { setDateFrom(""); setDateTo(""); }}>
                  ✕ Clear
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading-row"><div className="spinner" /> Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <div className="empty-state-title">No transactions found</div>
                <div className="empty-state-desc">Try adjusting your search, filter, or date range.</div>
              </div>
            ) : (
              <>
                <div className="transaction-list">
                  {filtered.map((tx: Transaction) => (
                    <div key={tx.id} className={`transaction-card tx-${tx.type}`}>
                      <div className="transaction-header">
                        <div>
                          <div className="transaction-desc">{tx.description}</div>
                          <div className="transaction-date">
                            {new Date(tx.createdAt).toLocaleString("en-PH", {
                              year: "numeric", month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
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

                {!allLoaded && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                    <button className="btn btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
                      {loadingMore
                        ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />Loading...</>
                        : `Load More (${transactions.length} / ${total})`}
                    </button>
                  </div>
                )}
                {allLoaded && total > PAGE_SIZE && (
                  <div style={{ textAlign: "center", marginTop: 16, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                    All {total} transactions loaded
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

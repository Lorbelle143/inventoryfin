import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Sidebar from "./Sidebar";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";

const PIE_COLORS = ["#4f46e5", "#7c3aed", "#a855f7", "#c084fc", "#e879f9", "#f0abfc"];
const fmt = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type StatsData = {
  balance: number;
  totalInventoryValue: number;
  incomeTotal: number;
  expenseTotal: number;
  transactionCount: number;
  itemCount: number;
  dailyCashFlow: { date: string; income: number; expense: number }[];
  topItems: { name: string; value: number }[];
};

export default function ChartsPage() {
  const navigate = useNavigate();
  const { token, authFetch } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!token) { navigate("/login"); return; }
    setLoading(true);
    authFetch("/api/stats")
      .then(r => r.json())
      .then(d => setStats(d))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [token]);

  return (
    <div className="page-shell">
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">

          <div className="page-header">
            <div className="page-header-row">
              <div>
                <div className="page-eyebrow">Analytics</div>
                <h1 className="page-title">Charts</h1>
                <p className="page-subtitle">Visual breakdown of your inventory and cash flow.</p>
              </div>
              <div className="page-header-actions">
                <button className="btn btn-secondary" onClick={load} disabled={loading}>
                  {loading ? "Loading..." : "🔄 Refresh"}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-row"><div className="spinner" /> Loading charts...</div>
          ) : !stats ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">Failed to load data</div>
              <div className="empty-state-desc">
                <button className="btn btn-secondary btn-sm" onClick={load}>Try again</button>
              </div>
            </div>
          ) : (
            <>
              {/* KPI summary */}
              <div className="stats-grid mb-6">
                <div className="stat-card">
                  <div className="stat-card-label">💳 Balance</div>
                  <div className="stat-card-value">₱{fmt(stats.balance)}</div>
                </div>
                <div className="stat-card accent">
                  <div className="stat-card-label">📦 Inventory Value</div>
                  <div className="stat-card-value">₱{fmt(stats.totalInventoryValue)}</div>
                  <div className="stat-card-sub">{stats.itemCount} items</div>
                </div>
                <div className="stat-card income">
                  <div className="stat-card-label">📈 Total Income</div>
                  <div className="stat-card-value">₱{fmt(stats.incomeTotal)}</div>
                </div>
                <div className="stat-card expense">
                  <div className="stat-card-label">📉 Total Expenses</div>
                  <div className="stat-card-value">₱{fmt(stats.expenseTotal)}</div>
                  <div className="stat-card-sub">{stats.transactionCount} transactions</div>
                </div>
              </div>

              {/* Charts */}
              <div className="charts-grid">
                {/* Inventory distribution pie */}
                <div className="chart-panel">
                  <h3>Inventory Value Distribution</h3>
                  {stats.topItems.length === 0 ? (
                    <div className="chart-empty">No inventory data yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={stats.topItems}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {stats.topItems.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `₱${fmt(Number(v))}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Income vs Expense bar */}
                <div className="chart-panel">
                  <h3>Income vs Expenses by Day</h3>
                  {stats.dailyCashFlow.length === 0 ? (
                    <div className="chart-empty">No transaction data yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={stats.dailyCashFlow} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${Number(v).toLocaleString()}`} />
                        <Tooltip formatter={(v) => `₱${fmt(Number(v))}`} />
                        <Legend />
                        <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
                        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Net cash flow line — full width */}
                <div className="chart-panel" style={{ gridColumn: "1 / -1" }}>
                  <h3>Net Cash Flow Over Time</h3>
                  {stats.dailyCashFlow.length === 0 ? (
                    <div className="chart-empty">No transaction data yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart
                        data={stats.dailyCashFlow.map(d => ({ ...d, net: d.income - d.expense }))}
                        margin={{ left: 0, right: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${Number(v).toLocaleString()}`} />
                        <Tooltip formatter={(v) => `₱${fmt(Number(v))}`} />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Income" />
                        <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Expense" />
                        <Line type="monotone" dataKey="net" stroke="#4f46e5" strokeWidth={2.5} dot={false} name="Net" strokeDasharray="5 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

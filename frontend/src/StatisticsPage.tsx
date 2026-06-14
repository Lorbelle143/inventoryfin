import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Sidebar from "./Sidebar";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

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

export default function StatisticsPage() {
  const navigate = useNavigate();
  const { token, authFetch } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    authFetch("/api/stats")
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [token]);

  const netProfit = stats ? stats.incomeTotal - stats.expenseTotal : 0;
  const profitMargin = stats && stats.incomeTotal > 0
    ? ((netProfit / stats.incomeTotal) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="page-shell">
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <div className="page-header">
            <div className="page-eyebrow">Insights</div>
            <h1 className="page-title">Statistics</h1>
            <p className="page-subtitle">Key financial metrics and performance overview.</p>
          </div>

          {loading ? (
            <div className="loading-row"><div className="spinner" /> Loading statistics...</div>
          ) : !stats ? (
            <div className="empty-state"><div className="empty-state-title">Failed to load data.</div></div>
          ) : (
            <>
              <div className="stats-summary-grid">
                <div className="stat-card income">
                  <div className="stat-card-label">📈 Total Income</div>
                  <div className="stat-card-value">₱{fmt(stats.incomeTotal)}</div>
                  <div className="stat-card-sub">All time earnings</div>
                </div>
                <div className="stat-card expense">
                  <div className="stat-card-label">📉 Total Expenses</div>
                  <div className="stat-card-value">₱{fmt(stats.expenseTotal)}</div>
                  <div className="stat-card-sub">All time spending</div>
                </div>
                <div className={`stat-card ${netProfit >= 0 ? "income" : "expense"}`}>
                  <div className="stat-card-label">💹 Net Profit</div>
                  <div className="stat-card-value">{netProfit >= 0 ? "+" : ""}₱{fmt(netProfit)}</div>
                  <div className="stat-card-sub">Margin: {profitMargin}%</div>
                </div>
              </div>

              <div className="stats-grid mb-6">
                <div className="stat-card">
                  <div className="stat-card-label">💳 Current Balance</div>
                  <div className="stat-card-value">₱{fmt(stats.balance)}</div>
                </div>
                <div className="stat-card accent">
                  <div className="stat-card-label">📦 Inventory Value</div>
                  <div className="stat-card-value">₱{fmt(stats.totalInventoryValue)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">🧾 Transactions</div>
                  <div className="stat-card-value">{stats.transactionCount}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">📋 Inventory Items</div>
                  <div className="stat-card-value">{stats.itemCount}</div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">Cash Flow Trend</div>
                {stats.dailyCashFlow.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📈</div>
                    <div className="empty-state-title">No data yet</div>
                    <div className="empty-state-desc">Add transactions to see your cash flow trend.</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={stats.dailyCashFlow} margin={{ left: 0, right: 8 }}>
                      <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => `₱${Number(v).toLocaleString()}`} />
                      <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                      <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} name="Expense" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {stats.topItems.length > 0 && (
                <div className="panel mt-5">
                  <div className="panel-title">Top Inventory Items by Value</div>
                  <div className="flex flex-col gap-3">
                    {stats.topItems.map((item, i) => {
                      const maxVal = stats.topItems[0].value;
                      const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                      return (
                        <div key={i} className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-900">{item.name}</span>
                            <span className="text-gray-500">₱{fmt(item.value)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

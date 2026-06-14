import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { InventoryItem, Transaction } from "../types";

const COLORS = ["#FF6A00", "#FFA94D", "#FFD8A8", "#FFDAB9", "#FFEFD5"];

export default function Charts({ items, transactions }: { items: InventoryItem[]; transactions: Transaction[] }) {
  // Pie data: top items by value
  const pieData = items
    .map((it) => ({ name: it.name, value: it.quantity * it.unitPrice }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Line data: aggregate transactions by date
  const map = new Map<string, number>();
  transactions.forEach((t) => {
    const date = new Date(t.createdAt).toLocaleDateString();
    map.set(date, (map.get(date) || 0) + (t.type === "income" ? t.amount : -t.amount));
  });
  const lineData = Array.from(map.entries())
    .map(([date, val]) => ({ date, val }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="dashboard-grid">
      <div className="panel card">
        <h3>Inventory Value Distribution</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel card">
        <h3>Transactions Over Time</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={lineData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="val" stroke="#FF6A00" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel card">
        <h3>Summary</h3>
        <div style={{ paddingTop: 12 }}>
          <p className="muted">Items: {items.length}</p>
          <p className="muted">Transactions: {transactions.length}</p>
        </div>
      </div>
    </div>
  );
}

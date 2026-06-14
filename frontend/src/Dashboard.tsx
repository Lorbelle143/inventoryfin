import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Sidebar from "./Sidebar";
import ConfirmModal from "./components/ConfirmModal";
import InventoryItemCard from "./components/InventoryItemCard";
import CreateItemForm from "./components/CreateItemForm";
import Toast, { type ToastMsg } from "./components/Toast";
import type { InventoryItem, Transaction, TransactionItem } from "./types";

type FormItem = { name: string; quantity: number; unitPrice: number };
const blank: FormItem = { name: "", quantity: 1, unitPrice: 0 };

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token, authFetch } = useAuth();

  const [balance, setBalance] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);

  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [formItems, setFormItems] = useState<FormItem[]>([{ ...blank }]);
  const [statusMsg, setStatusMsg] = useState<ToastMsg>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [editBalanceVal, setEditBalanceVal] = useState<number | "">("");

  const [confirm, setConfirm] = useState<{
    open: boolean; title: string; message: string;
    confirmLabel: string; cancelLabel: string; action: () => void;
  }>({ open: false, title: "", message: "", confirmLabel: "Confirm", cancelLabel: "Cancel", action: () => {} });

  const [itemSearch, setItemSearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [txFilter, setTxFilter] = useState<"all" | "income" | "expense">("all");

  const txAmount = useMemo(() => formItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [formItems]);
  const incomeTotal = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const lowStockItems = items.filter(i => i.quantity > 0 && i.quantity <= 5);
  const outOfStockItems = items.filter(i => i.quantity === 0);

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
  const filteredTx = transactions.filter(tx => {
    const matchType = txFilter === "all" || tx.type === txFilter;
    const matchSearch = tx.description.toLowerCase().includes(txSearch.toLowerCase());
    return matchType && matchSearch;
  });

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchStatus();
    fetchTransactions();
  }, [token]);

  async function fetchStatus() {
    setLoadingStatus(true);
    try {
      const res = await authFetch("/api/status");
      if (res.ok) {
        const d = await res.json();
        setBalance(d.balance);
        setTotalInventoryValue(d.totalInventoryValue);
        setItems(d.items);
      }
    } finally { setLoadingStatus(false); }
  }

  async function fetchTransactions() {
    setLoadingTx(true);
    try {
      const res = await authFetch("/api/transactions?limit=100");
      if (res.ok) {
        const d = await res.json();
        setTransactions(Array.isArray(d) ? d : d.data ?? []);
      }
    } finally { setLoadingTx(false); }
  }

  function openConfirm(opts: { title: string; message: string; confirmLabel?: string; action: () => void }) {
    setConfirm({ open: true, title: opts.title, message: opts.message,
      confirmLabel: opts.confirmLabel ?? "Confirm", cancelLabel: "Cancel", action: opts.action });
  }
  function closeConfirm() { setConfirm(c => ({ ...c, open: false })); }

  async function createItem(name: string, quantity: number, unitPrice: number) {
    const res = await authFetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity, unitPrice }),
    });
    if (res.ok) await fetchStatus();
  }

  async function updateItem(id: number, payload: Partial<{ name: string; quantity: number; unitPrice: number }>) {
    const res = await authFetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) await fetchStatus();
  }

  async function deleteItem(id: number) {
    const res = await authFetch(`/api/items/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json();
      setStatusMsg({ text: e.error ?? "Cannot delete item.", kind: "error" });
    } else {
      await fetchStatus();
    }
  }

  async function deleteTransaction(id: number) {
    const res = await authFetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) { await fetchStatus(); await fetchTransactions(); }
  }

  async function saveBalance() {
    const val = Number(editBalanceVal);
    if (Number.isNaN(val) || val < 0) return;
    const res = await authFetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance: val }),
    });
    if (res.ok) {
      const d = await res.json();
      setBalance(d.balance);
      setShowBalanceModal(false);
    }
  }

  function updateFormItem(idx: number, key: keyof FormItem, val: string | number) {
    setFormItems(cur => cur.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  }

  async function handleSubmitTx(e: FormEvent) {
    e.preventDefault();
    const validItems = formItems.filter(i => i.name.trim());
    if (!description.trim() || txAmount <= 0 || validItems.length === 0) {
      setStatusMsg({ text: "Add a description and at least one valid item.", kind: "error" });
      return;
    }
    openConfirm({
      title: "Save transaction",
      message: `Save ₱${txAmount.toLocaleString()} ${txType}?`,
      confirmLabel: "Save",
      action: async () => {
        closeConfirm();
        setSubmitting(true);
        try {
          const res = await authFetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: txType, description, amount: txAmount,
              items: validItems.map(i => ({ name: i.name.trim(), quantity: i.quantity, unitPrice: i.unitPrice })),
            }),
          });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
          setDescription(""); setFormItems([{ ...blank }]);
          setStatusMsg({ text: "Transaction saved successfully.", kind: "success" });
          await fetchStatus(); await fetchTransactions();
        } catch (err) {
          setStatusMsg({ text: err instanceof Error ? err.message : "Failed.", kind: "error" });
        } finally { setSubmitting(false); }
      },
    });
  }

  return (
    <div className="page-shell">
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">

          {/* ── Hero summary bar ─────────────────────────────────────── */}
          <div className="hero-bar">
            <div className="hero-greeting">
              <div className="hero-greeting-text">
                Kumusta, <strong>{user?.name?.split(" ")[0] ?? "ka"}!</strong>
              </div>
              <div className="hero-greeting-sub">Here's your financial snapshot</div>
            </div>

            {/* Balance — the most important number */}
            <div className="hero-balance-card">
              <div className="hero-balance-label">💳 Current Balance</div>
              <div className="hero-balance-value">
                {loadingStatus ? <span className="hero-balance-loading">—</span> : `₱${balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
              </div>
              <button className="hero-balance-edit" onClick={() => { setEditBalanceVal(balance); setShowBalanceModal(true); }}>
                Edit balance
              </button>
            </div>

            {/* Quick inventory summary */}
            <div className="hero-inv-summary">
              <div className="hero-inv-row">
                <span className="hero-inv-label">📦 Inventory value</span>
                <span className="hero-inv-val">₱{totalInventoryValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="hero-inv-row">
                <span className="hero-inv-label">🗂 Total stock units</span>
                <span className="hero-inv-val">{totalItems.toLocaleString()}</span>
              </div>
              <div className="hero-inv-row">
                <span className="hero-inv-label">📋 Unique items</span>
                <span className="hero-inv-val">{items.length}</span>
              </div>
              {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
                <div className="hero-inv-alerts">
                  {outOfStockItems.length > 0 && (
                    <span className="hero-alert out">⚠ {outOfStockItems.length} out of stock</span>
                  )}
                  {lowStockItems.length > 0 && (
                    <span className="hero-alert low">⚡ {lowStockItems.length} low stock</span>
                  )}
                </div>
              )}
            </div>

            {/* Cash flow quick view */}
            <div className="hero-cashflow">
              <div className="hero-cf-row income">
                <span>📈 Income</span>
                <strong>+₱{incomeTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="hero-cf-divider" />
              <div className="hero-cf-row expense">
                <span>📉 Expenses</span>
                <strong>-₱{expenseTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="hero-cf-divider" />
              <div className={`hero-cf-row ${incomeTotal - expenseTotal >= 0 ? "income" : "expense"}`}>
                <span>💹 Net</span>
                <strong>{incomeTotal - expenseTotal >= 0 ? "+" : ""}₱{(incomeTotal - expenseTotal).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>

          {/* ── Inventory + Transaction form ─────────────────────────── */}
          <div className="grid-two mb-5">

            {/* Inventory panel */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">📦 My Inventory</div>
                <span className="pill neutral">{items.length} items · {totalItems} units</span>
              </div>
              <CreateItemForm onCreate={createItem} />
              <div className="my-3">
                <div className="search-bar">
                  <span className="search-icon">🔍</span>
                  <input placeholder="Search items..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                </div>
              </div>
              <div className="item-grid" style={{ maxHeight: 460, overflowY: "auto" }}>
                {loadingStatus ? (
                  <div className="loading-row"><div className="spinner" /> Loading...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <div className="empty-state-title">{itemSearch ? "No items found" : "Wala pang inventory"}</div>
                    <div className="empty-state-desc">Add items using the form above.</div>
                  </div>
                ) : filteredItems.map(item => (
                  <InventoryItemCard
                    key={item.id}
                    item={item}
                    onDelete={() => openConfirm({
                      title: "Delete item",
                      message: `Remove "${item.name}" from inventory?`,
                      confirmLabel: "Delete",
                      action: () => { closeConfirm(); deleteItem(item.id); },
                    })}
                    onUpdate={payload => updateItem(item.id, payload)}
                  />
                ))}
              </div>
            </div>

            {/* Transaction form */}
            <div className="panel">
              <div className="panel-title">➕ Record Transaction</div>
              <form className="tx-form" onSubmit={handleSubmitTx}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <div className="tx-type-toggle">
                    <button type="button"
                      className={`tx-type-btn${txType === "expense" ? " active expense" : ""}`}
                      onClick={() => setTxType("expense")}>
                      📉 Expense
                    </button>
                    <button type="button"
                      className={`tx-type-btn${txType === "income" ? " active income" : ""}`}
                      onClick={() => setTxType("income")}>
                      📈 Income
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input value={description} onChange={e => setDescription(e.target.value)}
                    placeholder={txType === "expense" ? "e.g. Bought rice and biscuits" : "e.g. Sold 10 pcs biscuits"} />
                </div>
                <div>
                  <div className="item-list-header">
                    <span>Item name</span><span>Qty</span><span>Unit price</span><span />
                  </div>
                  <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                    {formItems.map((item, idx) => (
                      <div className="item-row" key={idx}>
                        <input value={item.name} onChange={e => updateFormItem(idx, "name", e.target.value)} placeholder="Item name" />
                        <input type="number" min={1} value={item.quantity} onChange={e => updateFormItem(idx, "quantity", Number(e.target.value))} />
                        <input type="number" min={0} step="0.01" value={item.unitPrice} onChange={e => updateFormItem(idx, "unitPrice", Number(e.target.value))} />
                        {formItems.length > 1 && (
                          <button type="button" className="remove-btn" onClick={() => setFormItems(cur => cur.filter((_, i) => i !== idx))}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
                    onClick={() => setFormItems(cur => [...cur, { ...blank }])}>
                    + Add row
                  </button>
                </div>
                <div className="form-total">
                  <span className="form-total-label">Total amount</span>
                  <span className={`form-total-value ${txType}`}>
                    {txType === "expense" ? "-" : "+"}₱{txAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button type="submit" className={`btn btn-primary tx-submit-btn ${txType}`} disabled={submitting}>
                  {submitting ? "Saving..." : txType === "expense" ? "💸 Record Expense" : "💰 Record Income"}
                </button>
              </form>
            </div>
          </div>

          {/* ── Transactions list ─────────────────────────────────────── */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">🧾 Transaction History</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div className="search-bar">
                  <span className="search-icon">🔍</span>
                  <input placeholder="Search..." value={txSearch} onChange={e => setTxSearch(e.target.value)} />
                </div>
                <div className="filter-tabs">
                  {(["all", "income", "expense"] as const).map(f => (
                    <button key={f} className={`filter-tab${txFilter === f ? " active" : ""}`} onClick={() => setTxFilter(f)}>
                      {f === "all" ? "All" : f === "income" ? "📈 Income" : "📉 Expense"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {loadingTx ? (
              <div className="loading-row"><div className="spinner" /> Loading...</div>
            ) : filteredTx.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <div className="empty-state-title">{txSearch || txFilter !== "all" ? "No results" : "Wala pang transactions"}</div>
                <div className="empty-state-desc">Record a transaction using the form above.</div>
              </div>
            ) : (
              <div className="transaction-list">
                {filteredTx.map((tx: Transaction) => (
                  <div key={tx.id} className={`transaction-card tx-${tx.type}`}>
                    <div className="transaction-header">
                      <div>
                        <div className="transaction-desc">{tx.description}</div>
                        <div className="transaction-date">{new Date(tx.createdAt).toLocaleString("en-PH")}</div>
                      </div>
                      <div className="transaction-right">
                        <span className={`transaction-amount ${tx.type}`}>
                          {tx.type === "income" ? "+" : "-"}₱{tx.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`pill ${tx.type}`}>{tx.type === "income" ? "📈 Income" : "📉 Expense"}</span>
                        <button className="btn btn-danger btn-sm" title="Delete transaction" onClick={() => openConfirm({
                          title: "Delete transaction",
                          message: "This reverses inventory and balance changes. Continue?",
                          confirmLabel: "Delete",
                          action: () => { closeConfirm(); deleteTransaction(tx.id); },
                        })}>🗑</button>
                      </div>
                    </div>
                    {tx.items.length > 0 && (
                      <div className="transaction-items-list">
                        {tx.items.map((ti: TransactionItem) => (
                          <span key={ti.id} className="transaction-item-chip">
                            {ti.item.name} ×{ti.quantity} @ ₱{ti.unitPrice.toLocaleString("en-PH")}
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

      {/* Balance modal */}
      {showBalanceModal && (
        <div className="modal-backdrop" onClick={() => setShowBalanceModal(false)}>
          <div className="modal balance-modal" onClick={e => e.stopPropagation()}>
            <h3>💳 Update Balance</h3>
            <p>Set your current cash balance manually. This won't create a transaction record.</p>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">New Balance (₱)</label>
              <input type="number" min={0} step="0.01" value={editBalanceVal}
                onChange={e => setEditBalanceVal(e.target.value === "" ? "" : Number(e.target.value))}
                autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowBalanceModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveBalance}>Save Balance</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        cancelLabel={confirm.cancelLabel}
        onConfirm={confirm.action}
        onClose={closeConfirm}
      />

      <Toast msg={statusMsg} onDismiss={() => setStatusMsg(null)} />
    </div>
  );
}

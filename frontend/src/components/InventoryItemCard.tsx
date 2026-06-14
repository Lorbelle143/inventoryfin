import { useEffect, useState } from "react";
import type { InventoryItem } from "../types";

type Props = {
  item: InventoryItem;
  onDelete: () => void;
  onUpdate: (payload: Partial<{ name: string; quantity: number; unitPrice: number }>) => void;
};

const LOW = 5;
const fmt = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InventoryItemCard({ item, onDelete, onUpdate }: Props) {
  const [editing,   setEditing]   = useState(false);
  const [name,      setName]      = useState(item.name);
  const [quantity,  setQuantity]  = useState(item.quantity);
  const [unitPrice, setUnitPrice] = useState(item.unitPrice);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (!editing) { setName(item.name); setQuantity(item.quantity); setUnitPrice(item.unitPrice); }
  }, [item, editing]);

  function save() {
    setError("");
    if (!name.trim()) return setError("Name is required");
    if (!Number.isFinite(quantity) || quantity < 0) return setError("Invalid quantity");
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return setError("Invalid unit price");
    onUpdate({ name: name.trim(), quantity, unitPrice });
    setEditing(false);
  }

  function cancel() {
    setName(item.name); setQuantity(item.quantity); setUnitPrice(item.unitPrice);
    setError(""); setEditing(false);
  }

  const isLow = item.quantity <= LOW && item.quantity > 0;
  const isOut = item.quantity === 0;

  if (editing) {
    return (
      <div className="item-card">
        <div className="grid gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name" />
          <div className="grid grid-cols-2 gap-2">
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input type="number" min={0} value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit price</label>
              <input type="number" min={0} step="0.01" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`item-card${isOut ? " item-card-out" : isLow ? " item-card-low" : ""}`}>
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <span className="item-card-name">{item.name}</span>
        <div className="flex gap-1.5 flex-shrink-0">
          {isOut && <span className="stock-badge out">Out of stock</span>}
          {isLow && <span className="stock-badge low">Low stock</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 mb-1.5">
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-gray-400 mb-0.5">Qty</div>
          <div className="font-bold text-sm text-slate-900">{item.quantity.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-gray-400 mb-0.5">Unit</div>
          <div className="font-bold text-sm text-slate-900">₱{fmt(item.unitPrice)}</div>
        </div>
        <div className="bg-indigo-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-indigo-400 mb-0.5">Total</div>
          <div className="font-bold text-sm text-indigo-700">₱{fmt(item.totalValue)}</div>
        </div>
      </div>

      <div className="text-xs text-gray-400 mb-3">
        Added {new Date(item.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
      </div>

      <div className="flex gap-2">
        <button className="btn btn-secondary btn-sm flex-1" onClick={() => setEditing(true)}>✏️ Edit</button>
        <button className="btn btn-danger btn-sm flex-1" onClick={onDelete}>🗑 Delete</button>
      </div>
    </div>
  );
}

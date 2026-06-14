import { useState } from "react";

type Props = {
  onCreate: (name: string, quantity: number, unitPrice: number) => void;
};

export default function CreateItemForm({ onCreate }: Props) {
  const [name, setName]         = useState("");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [unitPrice, setUnitPrice] = useState<number | "">(0);
  const [error, setError]       = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Name is required");
    const q = Number(quantity);
    const p = Number(unitPrice);
    if (!q || q <= 0) return setError("Quantity must be > 0");
    if (Number.isNaN(p) || p < 0) return setError("Invalid unit price");
    onCreate(name.trim(), q, p);
    setName(""); setQuantity(1); setUnitPrice(0);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {/* Desktop: 4-col row | Mobile: stacked */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 72px 96px auto" }}>
        <div className="form-group" style={{ minWidth: 0 }}>
          <label className="form-label">Item name</label>
          <input placeholder="e.g. Rice" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Qty</label>
          <input type="number" min={1} value={quantity}
            onChange={e => setQuantity(e.target.value === "" ? "" : Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label className="form-label">Unit price</label>
          <input type="number" min={0} step="0.01" value={unitPrice}
            onChange={e => setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label className="form-label opacity-0 select-none">_</label>
          <button type="submit" className="btn btn-primary w-full h-[42px]">Add</button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

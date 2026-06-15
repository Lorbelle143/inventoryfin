import { Router } from "express";
import bcryptjs from "bcryptjs";
import { sql } from "./db";
import { TransactionPayload } from "./types";
import { AuthRequest } from "./auth";

const router = Router();

// ─── Status ───────────────────────────────────────────────────────────────────

router.get("/status", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [accountRows, items] = await Promise.all([
    sql`SELECT balance FROM accounts WHERE user_id = ${userId}`,
    sql`SELECT * FROM inventory_items WHERE user_id = ${userId} ORDER BY updated_at DESC`,
  ]);
  const totalInventoryValue = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
  res.json({
    balance: accountRows[0]?.balance ?? 0,
    totalInventoryValue,
    items: items.map((i: any) => ({
      id: i.id, name: i.name, quantity: i.quantity,
      unitPrice: i.unit_price, totalValue: i.quantity * i.unit_price,
      createdAt: i.created_at, updatedAt: i.updated_at,
    })),
  });
});

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get("/stats", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [accountRows, items, transactions] = await Promise.all([
    sql`SELECT balance FROM accounts WHERE user_id = ${userId}`,
    sql`SELECT * FROM inventory_items WHERE user_id = ${userId}`,
    sql`SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at ASC`,
  ]);

  const totalInventoryValue = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
  const incomeTotal  = transactions.filter((t: any) => t.type === "income" ).reduce((s: number, t: any) => s + t.amount, 0);
  const expenseTotal = transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);

  const dailyMap = new Map<string, { income: number; expense: number }>();
  for (const t of transactions as any[]) {
    const day = new Date(t.created_at).toISOString().slice(0, 10);
    const entry = dailyMap.get(day) ?? { income: 0, expense: 0 };
    if (t.type === "income") entry.income += t.amount;
    else entry.expense += t.amount;
    dailyMap.set(day, entry);
  }
  const dailyCashFlow = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  const topItems = (items as any[])
    .map(i => ({ name: i.name, value: i.quantity * i.unit_price }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  res.json({
    balance: accountRows[0]?.balance ?? 0,
    totalInventoryValue,
    incomeTotal,
    expenseTotal,
    transactionCount: transactions.length,
    itemCount: items.length,
    dailyCashFlow,
    topItems,
  });
});

// ─── Me ───────────────────────────────────────────────────────────────────────

router.get("/me", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const rows = await sql`SELECT id, email, name FROM users WHERE id = ${userId}`;
  if (rows.length === 0) return res.status(404).json({ error: "User not found" });
  res.json({ user: rows[0] });
});

// ─── Inventory Items ──────────────────────────────────────────────────────────

router.get("/items", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const search = (req.query.search as string) || "";
  const items = search
    ? await sql`SELECT * FROM inventory_items WHERE user_id = ${userId} AND name ILIKE ${"%" + search + "%"} ORDER BY updated_at DESC`
    : await sql`SELECT * FROM inventory_items WHERE user_id = ${userId} ORDER BY updated_at DESC`;

  res.json(items.map((i: any) => ({
    id: i.id, name: i.name, quantity: i.quantity,
    unitPrice: i.unit_price, totalValue: i.quantity * i.unit_price,
    createdAt: i.created_at, updatedAt: i.updated_at,
  })));
});

router.post("/items", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name, quantity, unitPrice } = req.body as { name: string; quantity: number; unitPrice: number };
  if (!name || typeof quantity !== "number" || typeof unitPrice !== "number") {
    return res.status(400).json({ error: "Invalid item payload" });
  }
  const rows = await sql`
    INSERT INTO inventory_items (user_id, name, quantity, unit_price, total_value)
    VALUES (${userId}, ${name}, ${quantity}, ${unitPrice}, ${quantity * unitPrice})
    RETURNING *
  `;
  const i = rows[0];
  res.status(201).json({
    id: i.id, name: i.name, quantity: i.quantity,
    unitPrice: i.unit_price, totalValue: i.quantity * i.unit_price,
    createdAt: i.created_at, updatedAt: i.updated_at,
  });
});

router.patch("/items/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const existing = await sql`SELECT * FROM inventory_items WHERE id = ${id} AND user_id = ${userId}`;
  if (existing.length === 0) return res.status(404).json({ error: "Item not found" });

  const cur = existing[0];
  const { name, quantity, unitPrice } = req.body as Partial<{ name: string; quantity: number; unitPrice: number }>;
  const newName      = name      !== undefined ? name      : cur.name;
  const newQty       = typeof quantity  === "number" ? quantity  : cur.quantity;
  const newUnitPrice = typeof unitPrice === "number" ? unitPrice : cur.unit_price;
  const newTotal     = newQty * newUnitPrice;

  const rows = await sql`
    UPDATE inventory_items
    SET name = ${newName}, quantity = ${newQty}, unit_price = ${newUnitPrice},
        total_value = ${newTotal}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  const i = rows[0];
  res.json({
    id: i.id, name: i.name, quantity: i.quantity,
    unitPrice: i.unit_price, totalValue: i.quantity * i.unit_price,
    createdAt: i.created_at, updatedAt: i.updated_at,
  });
});

router.delete("/items/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const item = await sql`SELECT id FROM inventory_items WHERE id = ${id} AND user_id = ${userId}`;
  if (item.length === 0) return res.status(404).json({ error: "Item not found" });

  const txCount = await sql`SELECT COUNT(*) as c FROM item_transactions WHERE item_id = ${id}`;
  if (Number(txCount[0].c) > 0) {
    return res.status(409).json({ error: "Cannot delete item — it has transaction history." });
  }

  await sql`DELETE FROM inventory_items WHERE id = ${id}`;
  res.status(204).end();
});

// ─── Transactions ─────────────────────────────────────────────────────────────

router.get("/transactions", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const limit  = Math.min(Number(req.query.limit  ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);
  const search = (req.query.search as string) || "";
  const typeFilter = req.query.type as string | undefined;

  let transactions: any[];
  let totalRows: any[];

  if (search && (typeFilter === "income" || typeFilter === "expense")) {
    transactions = await sql`
      SELECT * FROM transactions WHERE user_id = ${userId}
      AND description ILIKE ${"%" + search + "%"} AND type = ${typeFilter}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    totalRows = await sql`
      SELECT COUNT(*) as c FROM transactions WHERE user_id = ${userId}
      AND description ILIKE ${"%" + search + "%"} AND type = ${typeFilter}
    `;
  } else if (search) {
    transactions = await sql`
      SELECT * FROM transactions WHERE user_id = ${userId}
      AND description ILIKE ${"%" + search + "%"}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    totalRows = await sql`
      SELECT COUNT(*) as c FROM transactions WHERE user_id = ${userId}
      AND description ILIKE ${"%" + search + "%"}
    `;
  } else if (typeFilter === "income" || typeFilter === "expense") {
    transactions = await sql`
      SELECT * FROM transactions WHERE user_id = ${userId} AND type = ${typeFilter}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    totalRows = await sql`
      SELECT COUNT(*) as c FROM transactions WHERE user_id = ${userId} AND type = ${typeFilter}
    `;
  } else {
    transactions = await sql`
      SELECT * FROM transactions WHERE user_id = ${userId}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    totalRows = await sql`SELECT COUNT(*) as c FROM transactions WHERE user_id = ${userId}`;
  }

  // Attach items to each transaction
  const txIds = transactions.map((t: any) => t.id);
  let itemRows: any[] = [];
  if (txIds.length > 0) {
    itemRows = await sql`
      SELECT it.*, i.name, i.unit_price FROM item_transactions it
      JOIN inventory_items i ON i.id = it.item_id
      WHERE it.transaction_id = ANY(${txIds})
    `;
  }

  const result = transactions.map((t: any) => ({
    id: t.id, type: t.type, description: t.description,
    amount: t.amount, createdAt: t.created_at,
    items: itemRows
      .filter((r: any) => r.transaction_id === t.id)
      .map((r: any) => ({
        id: r.id, quantity: r.quantity, unitPrice: r.unit_price,
        item: { id: r.item_id, name: r.name },
      })),
  }));

  res.json({ data: result, pagination: { total: Number(totalRows[0].c), limit, offset } });
});

router.post("/transactions", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const payload = req.body as TransactionPayload;

  if (!payload?.type || !payload.description || !payload.amount || !Array.isArray(payload.items)) {
    return res.status(400).json({ error: "Invalid transaction payload" });
  }

  const accountRows = await sql`SELECT id, balance FROM accounts WHERE user_id = ${userId}`;
  if (accountRows.length === 0) return res.status(500).json({ error: "Account not initialized" });

  const account = accountRows[0];
  const newBalance = payload.type === "expense"
    ? account.balance - payload.amount
    : account.balance + payload.amount;

  if (newBalance < 0) return res.status(400).json({ error: "Insufficient balance" });

  // Create transaction
  const txRows = await sql`
    INSERT INTO transactions (user_id, type, description, amount)
    VALUES (${userId}, ${payload.type}, ${payload.description}, ${payload.amount})
    RETURNING id
  `;
  const transactionId = txRows[0].id;

  // Process items
  for (const item of payload.items) {
    const invRows = await sql`
      SELECT * FROM inventory_items WHERE user_id = ${userId} AND name = ${item.name}
    `;

    let invId: number;
    if (invRows.length === 0) {
      const newInv = await sql`
        INSERT INTO inventory_items (user_id, name, quantity, unit_price, total_value)
        VALUES (${userId}, ${item.name}, ${item.quantity}, ${item.unitPrice}, ${item.quantity * item.unitPrice})
        RETURNING id
      `;
      invId = newInv[0].id;
    } else {
      const inv = invRows[0];
      const newQty = payload.type === "expense"
        ? inv.quantity + item.quantity
        : Math.max(0, inv.quantity - item.quantity);
      await sql`
        UPDATE inventory_items
        SET quantity = ${newQty}, unit_price = ${item.unitPrice},
            total_value = ${newQty * item.unitPrice}, updated_at = NOW()
        WHERE id = ${inv.id}
      `;
      invId = inv.id;
    }

    await sql`
      INSERT INTO item_transactions (transaction_id, item_id, quantity, unit_price)
      VALUES (${transactionId}, ${invId}, ${item.quantity}, ${item.unitPrice})
    `;
  }

  await sql`UPDATE accounts SET balance = ${newBalance}, updated_at = NOW() WHERE id = ${account.id}`;

  res.status(201).json({ transaction: { id: transactionId }, balance: newBalance });
});

router.delete("/transactions/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const txRows = await sql`SELECT * FROM transactions WHERE id = ${id} AND user_id = ${userId}`;
  if (txRows.length === 0) return res.status(404).json({ error: "Transaction not found" });

  const tx = txRows[0];
  const itemTxRows = await sql`
    SELECT it.*, i.quantity as inv_qty, i.unit_price as inv_unit_price
    FROM item_transactions it
    JOIN inventory_items i ON i.id = it.item_id
    WHERE it.transaction_id = ${id}
  `;

  // Reverse inventory
  for (const row of itemTxRows as any[]) {
    const reversedQty = tx.type === "expense"
      ? Math.max(0, row.inv_qty - row.quantity)
      : row.inv_qty + row.quantity;
    await sql`
      UPDATE inventory_items
      SET quantity = ${reversedQty}, total_value = ${reversedQty * row.inv_unit_price}, updated_at = NOW()
      WHERE id = ${row.item_id}
    `;
  }

  // Reverse balance
  const accountRows = await sql`SELECT id, balance FROM accounts WHERE user_id = ${userId}`;
  if (accountRows.length > 0) {
    const acc = accountRows[0];
    const reversedBalance = tx.type === "expense"
      ? acc.balance + tx.amount
      : acc.balance - tx.amount;
    await sql`UPDATE accounts SET balance = ${reversedBalance}, updated_at = NOW() WHERE id = ${acc.id}`;
  }

  await sql`DELETE FROM item_transactions WHERE transaction_id = ${id}`;
  await sql`DELETE FROM transactions WHERE id = ${id}`;
  res.status(204).end();
});

// ─── Account ──────────────────────────────────────────────────────────────────

router.get("/account", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const rows = await sql`SELECT balance FROM accounts WHERE user_id = ${userId}`;
  res.json({ balance: rows[0]?.balance ?? 0 });
});

router.patch("/account", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { balance } = req.body;
  if (typeof balance !== "number" || Number.isNaN(balance) || balance < 0) {
    return res.status(400).json({ error: "Invalid balance value" });
  }
  const rows = await sql`
    UPDATE accounts SET balance = ${balance}, updated_at = NOW()
    WHERE user_id = ${userId} RETURNING balance
  `;
  if (rows.length === 0) return res.status(404).json({ error: "Account not found" });
  res.json({ balance: rows[0].balance });
});

// ─── Profile ──────────────────────────────────────────────────────────────────

router.patch("/profile", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  const rows = await sql`
    UPDATE users SET name = ${name.trim()}, updated_at = NOW()
    WHERE id = ${userId} RETURNING id, email, name
  `;
  res.json({ user: rows[0] });
});

router.patch("/profile/password", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }
  const rows = await sql`SELECT password FROM users WHERE id = ${userId}`;
  if (rows.length === 0) return res.status(404).json({ error: "User not found" });

  const valid = await bcryptjs.compare(currentPassword, rows[0].password);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  const hashed = await bcryptjs.hash(newPassword, 10);
  await sql`UPDATE users SET password = ${hashed}, updated_at = NOW() WHERE id = ${userId}`;
  res.json({ ok: true });
});

export default router;

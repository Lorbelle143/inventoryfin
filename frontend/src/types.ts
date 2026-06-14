export type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
};

export type TransactionItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  item: InventoryItem;
};

export type Transaction = {
  id: number;
  type: "income" | "expense";
  description: string;
  amount: number;
  createdAt: string;
  items: TransactionItem[];
};

export type InventoryItemPayload = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type TransactionPayload = {
  type: "income" | "expense";
  description: string;
  amount: number;
  items: InventoryItemPayload[];
};

import { PrismaClient } from "@prisma/client";

// Use a global singleton to avoid exhausting DB connections in serverless
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export async function initializeAccount(userId: number) {
  const existing = await prisma.account.findUnique({ where: { userId } });
  if (!existing) {
    return prisma.account.create({ data: { balance: 10000, userId } });
  }
  return existing;
}

export async function seedInitialInventory(userId: number) {
  const count = await prisma.inventoryItem.count({ where: { userId } });
  if (count === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        { name: "Rice",           quantity: 50, unitPrice: 40, totalValue: 2000, userId },
        { name: "Biscuits",       quantity: 30, unitPrice: 25, totalValue:  750, userId },
        { name: "Instant Noodles",quantity: 40, unitPrice: 20, totalValue:  800, userId },
      ],
    });
  }
}

export default prisma;

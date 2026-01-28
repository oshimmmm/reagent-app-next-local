import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/libs/prisma";

function buildNonExpiredLotWhere(
  reagentIds?: number[]
): Prisma.LotWhereInput {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where: Prisma.LotWhereInput = {
    OR: [
      { expiryDate: null },
      { expiryDate: { gte: today } },
    ],
  };

  if (reagentIds && reagentIds.length > 0) {
    where.reagentId = { in: reagentIds };
  }

  return where;
}

export async function getValidStockMap(
  reagentIds?: number[]
): Promise<Map<number, number>> {
  const where = buildNonExpiredLotWhere(reagentIds);

  const grouped = await prisma.lot.groupBy({
    by: ["reagentId"],
    where,
    _sum: { stock: true },
  });

  const map = new Map<number, number>();
  grouped.forEach((entry) => {
    map.set(entry.reagentId, entry._sum.stock ?? 0);
  });

  return map;
}

export async function getValidStockForReagent(
  reagentId: number
): Promise<number> {
  const map = await getValidStockMap([reagentId]);
  return map.get(reagentId) ?? 0;
}

/**
 * Lot テーブルを基準に Reagent.stock を再計算して更新する。
 * 有効期限切れを除いた stock 合計で Reagent.stock を上書きする。
 */
export async function syncReagentStockFromLots(
  reagentId: number
): Promise<number> {
  const validStock = await getValidStockForReagent(reagentId);
  await prisma.reagent.update({
    where: { id: reagentId },
    data: { stock: validStock },
  });
  return validStock;
}

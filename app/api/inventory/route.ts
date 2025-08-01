// app/api/inventory/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

export async function GET() {
  // 履歴テーブルから最新の「update」アクションを取得
  const latest = await prisma.history.findFirst({
    where: { actionType: "inventory" },
    orderBy: { date: "desc" },
  });
  if (!latest) {
    return NextResponse.json({
      lastInventoryDate: null,
      nextInventoryDate: null,
    });
  }

  const last = latest.date;
  // 次回棚卸日を「最後の棚卸日 + 1か月」として計算
  const next = new Date(last);
  next.setMonth(next.getMonth() + 3);

  const toYMD = (d: Date) => d.toISOString().split("T")[0];
  return NextResponse.json({
    lastInventoryDate: toYMD(last),
    nextInventoryDate: toYMD(next),
  });
}

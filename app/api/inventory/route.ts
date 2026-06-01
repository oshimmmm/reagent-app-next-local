// app/api/inventory/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

const INVENTORY_DATE_ACTION = "inventory_date";

export async function GET() {
  // ユーザーが手動で設定した最終棚卸日を取得
  const latest = await prisma.history.findFirst({
    where: { actionType: INVENTORY_DATE_ACTION },
    orderBy: { date: "desc" },
  });
  if (!latest) {
    return NextResponse.json({
      lastInventoryDate: null,
      nextInventoryDate: null,
    });
  }

  const last = latest.date;
  // 次回棚卸日を「最後の棚卸日 + 3か月」として計算
  const next = new Date(last);
  next.setMonth(next.getMonth() + 3);

  const toYMD = (d: Date) => d.toISOString().split("T")[0];
  return NextResponse.json({
    lastInventoryDate: toYMD(last),
    nextInventoryDate: toYMD(next),
  });
}

export async function POST(request: Request) {
  try {
    const { date } = await request.json();
    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { error: "日付が指定されていません" },
        { status: 400 }
      );
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "日付の形式が不正です" },
        { status: 400 }
      );
    }

    await prisma.history.create({
      data: {
        actionType: INVENTORY_DATE_ACTION,
        date: parsed,
        productNumber: "",
        lotNumber: "",
      },
    });

    const next = new Date(parsed);
    next.setMonth(next.getMonth() + 3);
    const toYMD = (d: Date) => d.toISOString().split("T")[0];
    return NextResponse.json({
      lastInventoryDate: toYMD(parsed),
      nextInventoryDate: toYMD(next),
    });
  } catch (error) {
    console.error("POST /api/inventory error:", error);
    return NextResponse.json(
      { error: "最終棚卸日の保存に失敗しました" },
      { status: 500 }
    );
  }
}

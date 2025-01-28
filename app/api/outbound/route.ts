// app/api/outbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

export async function POST(request: NextRequest) {
  try {
    const { productNumber, lotNumber } = await request.json();
    if (!productNumber || !lotNumber) {
      return NextResponse.json({ error: "Missing productNumber or lotNumber" }, { status: 400 });
    }

    // 1) Reagent取得
    const reagent = await prisma.reagent.findUnique({
      where: { productNumber },
    });
    if (!reagent) {
      return NextResponse.json({ error: "該当する試薬が存在しません" }, { status: 404 });
    }

    // 2) 在庫チェック
    if (reagent.stock <= 0) {
      return NextResponse.json({ error: "在庫がありません" }, { status: 400 });
    }

    // 3) 出庫 (stock - 1, currentLot更新)
    const newStock = reagent.stock - 1;
    await prisma.reagent.update({
      where: { productNumber },
      data: {
        stock: newStock,
        currentLot: lotNumber,
      },
    });

    // 4) historyに保存
    await prisma.history.create({
      data: {
        productNumber,
        lotNumber,
        actionType: "outbound",
        date: new Date(),
        // reagentId: reagent.id, // 紐づける場合など
      },
    });

    // 5) 成功
    return NextResponse.json({ message: "出庫が完了しました" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

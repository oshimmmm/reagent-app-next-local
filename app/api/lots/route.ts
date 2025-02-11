// app/api/lots/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

/**
 * GET /api/lots
 * 在庫が0より大きいLot情報を取得し、Reagent情報も含める
 * 並べ替えは、Reagent.name（昇順）→lotNumber（昇順）
 */
export async function GET() {
  try {
    const lots = await prisma.lot.findMany({
      where: {
        stock: { gt: 0 }  // 在庫が0より大きいもののみ
      },
      include: {
        reagent: true, // Reagent の情報も取得
      },
      orderBy: [
        { reagent: { name: 'asc' } },
        { lotNumber: 'asc' }
      ],
    });
    return NextResponse.json(lots, { status: 200 });
  } catch (error) {
    console.error("GET /api/lots error:", error);
    return NextResponse.json({ error: "Failed to fetch lots" }, { status: 500 });
  }
}

/**
 * POST /api/lots
 * body: { reagentId, lotNumber, expiryDate, stock }
 * 新規Lotを追加
 */
export async function POST(request: Request) {
  try {
    const { reagentId, lotNumber, expiryDate, stock } = await request.json();

    if (!reagentId || !lotNumber) {
      return NextResponse.json({ error: "reagentId と lotNumber は必須です。" }, { status: 400 });
    }

    const newLot = await prisma.lot.create({
      data: {
        reagentId,
        lotNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        stock: stock ?? 0,
      },
    });
    return NextResponse.json(newLot, { status: 201 });
  } catch (error) {
    console.error("POST /api/lots error:", error);
    return NextResponse.json({ error: "Lotの作成に失敗しました" }, { status: 500 });
  }
}

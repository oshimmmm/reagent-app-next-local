// app/api/lots/outbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

/**
 * POST /api/lots/outbound
 *
 * Body: {
 *   productNumber: string;
 *   lotNumber: string;
 *   outboundQuantity?: number; // 出庫数 (デフォルト1)
 * }
 *
 * 処理内容:
 *  1) Reagent を productNumber で取得
 *  2) 対象の Lot を (reagentId, lotNumber) で取得し、在庫が十分か確認
 *  3) Lot の stock を outboundQuantity 分減算する
 *  4) Reagent の stock も outboundQuantity 分減算する
 *  5) History に actionType:"outbound" として記録する
 */
export async function POST(request: NextRequest) {
  try {
    const { productNumber, lotNumber, outboundQuantity = 1 } = await request.json();

    if (!productNumber || !lotNumber) {
      return NextResponse.json(
        { error: "productNumber と lotNumber は必須です。" },
        { status: 400 }
      );
    }

    // 1) Reagent を取得
    const reagent = await prisma.reagent.findUnique({
      where: { productNumber },
    });
    if (!reagent) {
      return NextResponse.json(
        { error: "該当する試薬が存在しません。" },
        { status: 404 }
      );
    }

    // 2) Lot を取得 (複合ユニークキー reagentId と lotNumber)
    const existingLot = await prisma.lot.findUnique({
      where: {
        reagentId_lotNumber: {
          reagentId: reagent.id,
          lotNumber,
        },
      },
    });
    if (!existingLot) {
      return NextResponse.json(
        { error: "該当するロットが存在しません。" },
        { status: 404 }
      );
    }

    // 3) 在庫チェック: Lot の在庫が十分であるか確認
    if (existingLot.stock < outboundQuantity) {
      return NextResponse.json(
        { error: "指定のロットに十分な在庫がありません。" },
        { status: 400 }
      );
    }

    // 4) Lot の在庫を減算
    const updatedLot = await prisma.lot.update({
      where: {
        reagentId_lotNumber: {
          reagentId: reagent.id,
          lotNumber,
        },
      },
      data: {
        stock: { decrement: outboundQuantity },
      },
    });

    // 5) Reagent の在庫も減算（複数ロットの合計在庫として管理している場合）
    await prisma.reagent.update({
      where: { id: reagent.id },
      data: {
        stock: { decrement: outboundQuantity },
      },
    });

    // 6) History に出庫ログを登録
    await prisma.history.create({
      data: {
        productNumber,
        lotNumber,
        actionType: "outbound",
        date: new Date(),
      },
    });

    return NextResponse.json(
      { message: "出庫が完了しました", lot: updatedLot },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/lots/outbound error:", error);
    return NextResponse.json(
      { error: "Error in outbound" },
      { status: 500 }
    );
  }
}

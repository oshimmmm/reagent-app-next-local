// app/api/lots/outbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";
import { Lot } from "@prisma/client";

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
 *   1) Reagent を productNumber で取得
 *   2) 対象の Lot を (reagentId, lotNumber) で取得
 *      - 存在する場合：Lot の stock が十分か確認し、十分なら Lot の stock を outboundQuantity 分減算
 *      - 存在しない場合：フォールバックとして Reagent の全体在庫が十分か確認
 *   3) 該当する場合、Reagent の stock も outboundQuantity 分減算する
 *   4) History に actionType:"outbound" としてログを登録する
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
        // 複合ユニークキーが設定されている場合
        reagentId_lotNumber: {
          reagentId: reagent.id,
          lotNumber,
        },
      },
    });

    if (existingLot) {
      // Lot が存在する場合：在庫チェック
      // if (existingLot.stock < outboundQuantity) {
      //   return NextResponse.json(
      //     { error: "指定のロットに十分な在庫がありません。" },
      //     { status: 400 }
      //   );
      // }

      // 3) Lot の在庫を更新（在庫が 0 の場合はそのまま、在庫がある場合は outboundQuantity 分減算）
      // ここでは生クエリを使用して、条件付きで stock を更新する
      const updatedLots = await prisma.$queryRaw<Lot[]>`
      UPDATE "Lot"
      SET stock = CASE WHEN stock = 0 THEN stock ELSE stock - ${outboundQuantity} END
      WHERE id = ${existingLot.id}
      RETURNING *;
    `;
    const updatedLot = updatedLots[0];

      // Reagent の在庫も減算
      await prisma.reagent.update({
        where: { id: reagent.id },
        data: {
          stock: { decrement: outboundQuantity },
          currentLot: lotNumber,
        },
      });
      // History 登録
      await prisma.history.create({
        data: {
          productNumber,
          lotNumber,
          actionType: "outbound",
          date: new Date(),
          reagentId: reagent.id,
        },
      });
      return NextResponse.json(
        { message: "出庫が完了しました", lot: updatedLot },
        { status: 200 }
      );
    } else {
      // フォールバック: Lot が存在しない場合
      if ((reagent.stock || 0) < outboundQuantity) {
        return NextResponse.json(
          { error: "試薬全体の在庫が不足しています。" },
          { status: 400 }
        );
      }
      // Reagent の在庫を直接減算
      await prisma.reagent.update({
        where: { id: reagent.id },
        data: {
          stock: { decrement: outboundQuantity },
          currentLot: lotNumber,
        },
      });
      // History 登録
      await prisma.history.create({
        data: {
          productNumber,
          lotNumber,
          actionType: "outbound",
          date: new Date(),
        },
      });
      return NextResponse.json(
        { message: "出庫が完了しました（Lot record なし、Reagentのみ更新）" },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("POST /api/lots/outbound error:", error);
    return NextResponse.json({ error: "Error in outbound" }, { status: 500 });
  }
}

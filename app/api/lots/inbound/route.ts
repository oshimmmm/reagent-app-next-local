// app/api/lots/inbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

/**
 * POST /api/lots/inbound
 *
 * Body: {
 *   productNumber: string;
 *   lotNumber: string;
 *   expiryDate: string;      // ISO8601
 *   inboundQuantity?: number; // 入庫数 (デフォルト1)
 *   inputValueStock?: number; // popup で入力された規格など (任意)
 * }
 *
 * 処理内容:
 *   1) Reagent(productNumber) を取得
 *   2) Lot を upsert (reagentId, lotNumber) をユニークキーにし、stock += inboundQuantity
 *      かつ expiryDate は「既存より未来なら更新」
 *   3) Reagent の maxExpiry を「全Lot の中で最も遅い日付」に更新
 *   4) Reagent.valueStock を inputValueStock があれば更新 (既存互換)
 *   5) History に actionType="inbound" で登録
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productNumber,
      lotNumber,
      expiryDate,
      inboundQuantity = 1,
      inputValueStock,
    } = body;

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
        { error: "該当する試薬が存在しません。先に登録してください。" },
        { status: 404 }
      );
    }

    // 2) Lot のアップサート
    //    schema.prisma の Lot モデルに以下を設定:
    //    @@unique([reagentId, lotNumber])
    const parsedExpiry = expiryDate ? new Date(expiryDate) : null;
    const existingLot = await prisma.lot.findUnique({
      where: {
        reagentId_lotNumber: {
          reagentId: reagent.id,
          lotNumber,
        },
      },
    });

    let finalExpiry = parsedExpiry;
    if (existingLot?.expiryDate && parsedExpiry) {
      // 「既存expiryより未来なら更新」ロジック
      finalExpiry =
        parsedExpiry > existingLot.expiryDate ? parsedExpiry : existingLot.expiryDate;
    }

    let updatedLot;
    if (existingLot) {
      // 既存Lotがある → 在庫を加算し、必要なら expiryDate を更新
      updatedLot = await prisma.lot.update({
        where: {
          reagentId_lotNumber: {
            reagentId: reagent.id,
            lotNumber,
          },
        },
        data: {
          stock: { increment: inboundQuantity },
          expiryDate: finalExpiry ?? existingLot.expiryDate,
        },
      });
    } else {
      // 新規Lot
      updatedLot = await prisma.lot.create({
        data: {
          reagentId: reagent.id,
          lotNumber,
          expiryDate: parsedExpiry,
          stock: inboundQuantity,
        },
      });
    }

    // 3) Reagent の maxExpiry を「全Lot の中で最も遅い日付」に更新
    const allLots = await prisma.lot.findMany({
      where: { reagentId: reagent.id },
      select: { expiryDate: true },
    });
    let newMaxExpiry = new Date("1900-01-01");
    for (const l of allLots) {
      if (l.expiryDate && l.expiryDate > newMaxExpiry) {
        newMaxExpiry = l.expiryDate;
      }
    }
    const finalMax = newMaxExpiry > new Date("1900-01-01") ? newMaxExpiry : null;

    // valueStock (既存ロジック互換) の更新もここで行う
    await prisma.reagent.update({
      where: { id: reagent.id },
      data: {
        maxExpiry: finalMax,
        // ここで Reagent.stock を inboundQuantity 分加算する
        stock: { increment: inboundQuantity },
        ...(typeof inputValueStock === "number" && { valueStock: inputValueStock }),
      },
    });

    // 4) History に actionType="inbound" で登録
    //    oldStock, newStock など使いたければ updatedLot.stock などを参照
    await prisma.history.create({
      data: {
        productNumber,
        lotNumber,
        actionType: "inbound",
        date: new Date(),
        // user: session.user?.email など
      },
    });

    return NextResponse.json(
      { message: "入庫が完了しました", lot: updatedLot },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/lots/inbound error:", error);
    return NextResponse.json(
      { error: "Error in /api/lots/inbound" },
      { status: 500 }
    );
  }
}

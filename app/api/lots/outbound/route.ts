// app/api/lots/outbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

export async function POST(request: NextRequest) {
  try {
    const { productNumber, lotNumber, outboundQuantity = 1, force = false } = await request.json();

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

    // 2) Lot を取得（複合ユニークキー reagentId と lotNumber）
    const existingLot = await prisma.lot.findUnique({
      where: {
        reagentId_lotNumber: {
          reagentId: reagent.id,
          lotNumber,
        },
      },
    });

    if (!existingLot) {
      // Lot が存在しない場合はエラーを返す
      return NextResponse.json(
        { error: "このロットは入庫されていません。" },
        { status: 400 }
      );
    }

    // 在庫が十分か確認
    if (existingLot.stock < outboundQuantity) {
      return NextResponse.json(
        { error: "指定のロットに十分な在庫がありません。" },
        { status: 400 }
      );
    }

    // このロットが全Lotの中で最も有効期限が近いか確認
    const allLots = await prisma.lot.findMany({
      where: {
        reagentId: reagent.id,
        stock: { gt: 0 },
        expiryDate: { not: null },
      },
      select: { expiryDate: true },
    });
    let nearestExpiry: Date | null = null;
    for (const lot of allLots) {
      if (lot.expiryDate) {
        if (!nearestExpiry || lot.expiryDate < nearestExpiry) {
          nearestExpiry = lot.expiryDate;
        }
      }
    }
    // もし存在するロットの中で、選択したロットのexpiryDateが最も近くなく、forceが指定されていなければエラーを返す
    if (nearestExpiry && existingLot.expiryDate?.getTime() !== nearestExpiry.getTime() && !force) {
      return NextResponse.json(
        { error: "有効期限が近いロットが別にあります。本当に出庫しますか？" },
        { status: 409 }
      );
    }

    // 3) Lot の在庫を減算
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

    // 4) Reagent の在庫も減算
    await prisma.reagent.update({
      where: { id: reagent.id },
      data: {
        stock: { decrement: outboundQuantity },
        currentLot: lotNumber,
      },
    });

    // 5) History に出庫ログを登録
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
  } catch (error) {
    console.error("POST /api/lots/outbound error:", error);
    return NextResponse.json({ error: "Error in outbound" }, { status: 500 });
  }
}

// app/api/reagents/route.ts
// 全試薬一覧の取得（GET）と、新規試薬の登録（POST）を実装
import { NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

// GET: 全試薬情報を取得する
export async function GET() {
  try {
    const reagents = await prisma.reagent.findMany();
    return NextResponse.json(reagents, { status: 200 });
  } catch (error) {
    console.error("GET /api/reagents error:", error);
    return NextResponse.json(
      { error: "試薬情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: 新規試薬を登録する
export async function POST(request: Request) {
  try {
    const {
      productNumber,
      name,
      stock,
      orderTriggerStock,
      orderTriggerExpiry,
      noOrderOnZeroStock,
      orderTriggerValueStock,
      valueStock,
      orderValue,
      location,
      orderQuantity,
    } = await request.json();

    // 必須項目のチェック
    if (!productNumber || !name) {
      return NextResponse.json(
        { error: "productNumber と name は必須です。" },
        { status: 400 }
      );
    }

    // 既に登録されているかチェック
    const existing = await prisma.reagent.findUnique({
      where: { productNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: "既に登録済みの試薬です。" },
        { status: 400 }
      );
    }

    const newReagent = await prisma.reagent.create({
      data: {
        productNumber,
        name,
        stock: stock ?? 0,
        orderTriggerStock: orderTriggerStock ?? 0,
        orderTriggerExpiry: orderTriggerExpiry ?? false,
        noOrderOnZeroStock: noOrderOnZeroStock ?? false,
        // noOrderOnZeroStock が true の場合のみ orderTriggerValueStock を設定
        orderTriggerValueStock: noOrderOnZeroStock ? orderTriggerValueStock : null,
        valueStock: valueStock ?? 0,
        orderValue: orderValue || "",
        location: location || "",
        orderQuantity: orderQuantity ?? 1,
      },
    });

    return NextResponse.json(newReagent, { status: 201 });
  } catch (error) {
    console.error("POST /api/reagents error:", error);
    return NextResponse.json(
      { error: "試薬の登録に失敗しました" },
      { status: 500 }
    );
  }
}

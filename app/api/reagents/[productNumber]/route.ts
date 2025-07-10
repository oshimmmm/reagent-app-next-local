// app/api/reagents/[productNumber]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

// GET: 指定の productNumber の試薬情報を取得する
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productNumber: string }> }
) {
  const resolvedParams = await context.params; // Promise を解決
  try {
    const productNumber = resolvedParams.productNumber;
    const reagent = await prisma.reagent.findUnique({
      where: { productNumber },
    });
    if (!reagent) {
      return NextResponse.json(
        { error: "試薬が見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json(reagent, { status: 200 });
  } catch (error) {
    console.error("GET /api/reagents/[productNumber] error:", error);
    return NextResponse.json(
      { error: "試薬情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productNumber: string }> }
) {
  const { productNumber } = await context.params;
  const payload = await request.json();

  try {
    const updated = await prisma.reagent.update({
      where: { productNumber },
      data: {
        name: payload.name,
        location: payload.location,
        orderTriggerStock: payload.orderTriggerStock,
        orderTriggerExpiry: payload.orderTriggerExpiry,
        noOrderOnZeroStock: payload.noOrderOnZeroStock,
        orderTriggerValueStock: payload.noOrderOnZeroStock
          ? payload.orderTriggerValueStock
          : null,
        valueStock: payload.valueStock,
        orderValue: payload.orderValue,
        orderQuantity: payload.orderQuantity,
        hide: payload.hide,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "試薬情報の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: 指定の試薬を削除する
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ productNumber: string }> }
) {
  const resolvedParams = await context.params;
  try {
    const deletedReagent = await prisma.reagent.delete({
      where: { productNumber: resolvedParams.productNumber },
    });
    return NextResponse.json(deletedReagent, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/reagents/[productNumber] error:", error);
    return NextResponse.json(
      { error: "試薬の削除に失敗しました" },
      { status: 500 }
    );
  }
}

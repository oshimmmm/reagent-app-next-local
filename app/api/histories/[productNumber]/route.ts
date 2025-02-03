// app/api/histories/[productNumber]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

/**
 * GET /api/histories/[productNumber]?order=desc|asc
 *  productNumber = "05055331304728" etc.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productNumber: string }> }
) {
  // context.params を await してから利用する
  const { params } = context;
  const resolvedParams = await params; // Promise<{ productNumber: string }> を解決
  try {
    const productNumber = resolvedParams.productNumber;
    const url = new URL(request.url);
    const order = url.searchParams.get("order") || "desc";

    const histories = await prisma.history.findMany({
      where: { productNumber },
      orderBy: {
        date: order === "asc" ? "asc" : "desc",
      },
    });

    const data = histories.map((h) => ({
      id: h.id,
      productNumber: h.productNumber,
      lotNumber: h.lotNumber,
      actionType: h.actionType as "inbound" | "outbound" | "update",
      date: h.date.toISOString(),
      user: h.user || null,
      oldStock: h.oldStock ?? null,
      newStock: h.newStock ?? null,
      oldValueStock: h.oldValueStock ?? null,
      newValueStock: h.newValueStock ?? null,
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

/**
 * DELETE /api/histories/[productNumber]
 *
 * 指定の productNumber に紐づく履歴レコードをすべて削除します。
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ productNumber: string }> }
) {
  const { params } = context;
  const resolvedParams = await params;
  try {
    const productNumber = resolvedParams.productNumber;
    // 指定の productNumber の履歴をすべて削除
    const deleted = await prisma.history.deleteMany({
      where: { productNumber },
    });
    return NextResponse.json(
      { message: "Histories deleted", count: deleted.count },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete histories" },
      { status: 500 }
    );
  }
}

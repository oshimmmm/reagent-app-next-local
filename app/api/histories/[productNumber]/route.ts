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
  // context は Promise ではないので、直接分割して params を取得し、
  // params（Promise）を await して解決します
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

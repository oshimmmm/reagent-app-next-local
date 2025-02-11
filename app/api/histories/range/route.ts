// app/api/histories/range/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get("start"); // "2025-01-01"
    const end = url.searchParams.get("end");     // "2025-01-31"
    const productNumber = url.searchParams.get("productNumber"); // 追加

    if (!start || !end) {
      return NextResponse.json({ error: "start/end is required" }, { status: 400 });
    }

    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T23:59:59`);

    if (startDate > endDate) {
      return NextResponse.json({ error: "start > end" }, { status: 400 });
    }

    // where句に日付条件に加えて、productNumber が指定されていればその条件も追加する
    const whereClause: {
      date: { gte: Date; lte: Date };
      productNumber?: string;
    } = {
      date: { gte: startDate, lte: endDate },
    };
    if (productNumber) {
      whereClause.productNumber = productNumber;
    }

    const histories = await prisma.history.findMany({
      where: whereClause,
      orderBy: {
        date: "desc",
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

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/histories/range
 *
 * リクエストボディで以下のフィルタ条件を受け取ります:
 *   - start: string (例："2025-01-01")
 *   - end: string   (例："2025-01-31")
 *   - productNumber?: string （任意）
 *
 * 指定された日付範囲（およびオプションで productNumber）に合致する履歴レコードを
 * deleteMany で一括削除します。
 */
export async function DELETE(request: NextRequest) {
  try {
    const { start, end, productNumber } = await request.json();

    if (!start || !end) {
      return NextResponse.json({ error: "start and end are required" }, { status: 400 });
    }

    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T23:59:59`);

    if (startDate > endDate) {
      return NextResponse.json({ error: "start must be before end" }, { status: 400 });
    }

    // where 句の作成
    const whereClause: {
      date: { gte: Date; lte: Date };
      productNumber?: string;
    } = {
      date: { gte: startDate, lte: endDate },
    };
    if (productNumber) {
      whereClause.productNumber = productNumber;
    }

    const deleted = await prisma.history.deleteMany({
      where: whereClause,
    });

    return NextResponse.json(
      { message: "Histories deleted", count: deleted.count },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/histories/range error:", error);
    return NextResponse.json({ error: "Failed to delete histories" }, { status: 500 });
  }
}
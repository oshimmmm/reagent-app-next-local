// app/api/histories/range/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get("start"); // "2025-01-01"
    const end = url.searchParams.get("end");     // "2025-01-31"

    if (!start || !end) {
      return NextResponse.json({ error: "start/end is required" }, { status: 400 });
    }

    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T23:59:59`);

    if (startDate > endDate) {
      return NextResponse.json({ error: "start > end" }, { status: 400 });
    }

    const histories = await prisma.history.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
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

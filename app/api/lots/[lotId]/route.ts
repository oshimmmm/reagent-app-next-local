// app/api/lots/[lotId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

// ========================
// 1) GET /api/lots/[lotId]
// ========================
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ lotId: string }> } // <-- params: Promise<{ lotId: string }>
) {
  // 1) Promise の解決
  const resolvedParams = await context.params; // { lotId: string }
  try {
    // 2) lotId を parse
    const lotId = parseInt(resolvedParams.lotId, 10);
    if (isNaN(lotId)) {
      return NextResponse.json({ error: "Invalid lotId" }, { status: 400 });
    }

    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: { reagent: true },
    });
    if (!lot) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }
    return NextResponse.json(lot, { status: 200 });
  } catch (error) {
    console.error("GET /api/lots/[lotId] error:", error);
    return NextResponse.json({ error: "Failed to fetch lot" }, { status: 500 });
  }
}

// ========================
// 2) PATCH /api/lots/[lotId]
// ========================
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ lotId: string }> } // <-- こちらも同様
) {
  const resolvedParams = await context.params;
  try {
    const lotId = parseInt(resolvedParams.lotId, 10);
    if (isNaN(lotId)) {
      return NextResponse.json({ error: "Invalid lotId" }, { status: 400 });
    }

    const { lotNumber, expiryDate, stock } = await request.json();
    const updated = await prisma.lot.update({
      where: { id: lotId },
      data: {
        lotNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        stock: stock ?? 0,
      },
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/lots/[lotId] error:", error);
    return NextResponse.json({ error: "Failed to update lot" }, { status: 500 });
  }
}

// ========================
// 3) DELETE /api/lots/[lotId]
// ========================
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ lotId: string }> } // <-- 同様に
) {
  const resolvedParams = await context.params;
  try {
    const lotId = parseInt(resolvedParams.lotId, 10);
    if (isNaN(lotId)) {
      return NextResponse.json({ error: "Invalid lotId" }, { status: 400 });
    }
    const deleted = await prisma.lot.delete({
      where: { id: lotId },
    });
    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/lots/[lotId] error:", error);
    return NextResponse.json({ error: "Failed to delete lot" }, { status: 500 });
  }
}

// app/api/history/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
  const resolvedParams = await params;
  const historyId = parseInt(resolvedParams.id, 10);
  if (isNaN(historyId)) {
    return NextResponse.json({ error: "Invalid history id" }, { status: 400 });
  }
  try {
    const deletedHistory = await prisma.history.delete({
      where: { id: historyId },
    });
    return NextResponse.json(deletedHistory, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/history/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete history" }, { status: 500 });
  }
}

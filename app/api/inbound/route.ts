// app/api/inbound/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/app/libs/prisma"

export async function POST(request: Request) {
  try {
    const { productNumber, lotNumber, newMaxExpiry, newStock, inputValueStock } =
      await request.json();

    // Reagent 更新
    await prisma.reagent.update({
      where: { productNumber },
      data: {
        maxExpiry: new Date(newMaxExpiry),
        stock: newStock,
        orderDate: null,
        ...(typeof inputValueStock === "number" && { valueStock: inputValueStock }),
      },
    });

    // History 追加
    await prisma.history.create({
      data: {
        productNumber,
        lotNumber,
        actionType: "inbound",
        date: new Date(),
        // reagentId: updated.id, など紐づけたいなら
      },
    });

    return NextResponse.json({ message: "inbound completed" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error in inbound" }, { status: 500 });
  }
}

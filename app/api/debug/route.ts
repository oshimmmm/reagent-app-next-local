import { prisma } from "@/app/libs/prisma";
import { getValidStockMap } from "@/app/libs/stock";
import { NextResponse } from "next/server";

export async function GET() {
  const reagents = await prisma.reagent.findMany();
  const validStockMap = await getValidStockMap(reagents.map((r) => r.id));
  const response = reagents.map((reagent) => ({
    ...reagent,
    stock: validStockMap.get(reagent.id) ?? 0,
  }));
  console.log("Reagents from DB:", response);

  return NextResponse.json(response); 
}

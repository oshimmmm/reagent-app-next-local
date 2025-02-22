// app/api/backups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    // クエリパラメータの取得（History のフィルタ用）
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start"); // 例: "2025-01-01"
    const end = searchParams.get("end");     // 例: "2025-01-31"

    if (!start || !end) {
      return NextResponse.json(
        { error: "start と end の両方の日付を指定してください。" },
        { status: 400 }
      );
    }

    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T23:59:59`);
    if (startDate > endDate) {
      return NextResponse.json(
        { error: "開始日は終了日より後にはできません。" },
        { status: 400 }
      );
    }

    // Reagent と Lot は全件取得（全データを出力）
    const reagents = await prisma.reagent.findMany();
    const lots = await prisma.lot.findMany({
      include: { reagent: true },
    });
    // History は作成日時(createdAt)でフィルタ
    const histories = await prisma.history.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { reagent: true },
      orderBy: { createdAt: "desc" },
    });

    // ExcelJS ワークブックの生成
    const workbook = new ExcelJS.Workbook();

    // --- Reagents シート ---
    const reagentSheet = workbook.addWorksheet("Reagents");
    reagentSheet.columns = [
      { header: "ID", key: "id", width: 6 },
      { header: "Product Number", key: "productNumber", width: 20 },
      { header: "Name", key: "name", width: 25 },
      { header: "Current Lot", key: "currentLot", width: 15 },
      { header: "Max Expiry", key: "maxExpiry", width: 15 },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Value Stock", key: "valueStock", width: 12 },
      { header: "Order Date", key: "orderDate", width: 15 },
      { header: "Order Quantity", key: "orderQuantity", width: 15 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Updated At", key: "updatedAt", width: 20 },
    ];
    reagents.forEach((r) => {
      reagentSheet.addRow({
        id: r.id,
        productNumber: r.productNumber,
        name: r.name || "",
        currentLot: r.currentLot || "",
        maxExpiry: r.maxExpiry ? new Date(r.maxExpiry).toLocaleDateString() : "",
        stock: r.stock,
        valueStock: r.valueStock,
        orderDate: r.orderDate ? new Date(r.orderDate).toLocaleDateString() : "",
        orderQuantity: r.orderQuantity,
        createdAt: new Date(r.createdAt).toLocaleString(),
        updatedAt: new Date(r.updatedAt).toLocaleString(),
      });
    });

    // --- Lots シート ---
    const lotSheet = workbook.addWorksheet("Lots");
    lotSheet.columns = [
      { header: "ID", key: "id", width: 6 },
      { header: "Reagent ID", key: "reagentId", width: 10 },
      { header: "Product Number", key: "productNumber", width: 20 },
      { header: "Reagent Name", key: "reagentName", width: 25 },
      { header: "Lot Number", key: "lotNumber", width: 15 },
      { header: "Expiry Date", key: "expiryDate", width: 15 },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Updated At", key: "updatedAt", width: 20 },
    ];
    lots.forEach((l) => {
      lotSheet.addRow({
        id: l.id,
        reagentId: l.reagentId,
        productNumber: l.reagent ? l.reagent.productNumber : "",
        reagentName: l.reagent ? (l.reagent.name || "") : "",
        lotNumber: l.lotNumber,
        expiryDate: l.expiryDate ? new Date(l.expiryDate).toLocaleDateString() : "",
        stock: l.stock,
        createdAt: new Date(l.createdAt).toLocaleString(),
        updatedAt: new Date(l.updatedAt).toLocaleString(),
      });
    });

    // --- Histories シート ---
    // まず、Reagentテーブル全体を取得し、productNumber→name のマッピングを作成
    const reagentList = await prisma.reagent.findMany({
      select: { productNumber: true, name: true },
    });
    const reagentMap = new Map<string, string>();
    reagentList.forEach((r) => {
      reagentMap.set(r.productNumber, r.name || "");
    });

    const historySheet = workbook.addWorksheet("Histories");
    historySheet.columns = [
      { header: "ID", key: "id", width: 6 },
      { header: "Product Number", key: "productNumber", width: 20 },
      { header: "Reagent Name", key: "reagentName", width: 25 },
      { header: "Lot Number", key: "lotNumber", width: 15 },
      { header: "Action Type", key: "actionType", width: 12 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "User", key: "user", width: 20 },
      { header: "Old Stock", key: "oldStock", width: 10 },
      { header: "New Stock", key: "newStock", width: 10 },
      { header: "Old Value Stock", key: "oldValueStock", width: 15 },
      { header: "New Value Stock", key: "newValueStock", width: 15 },
    ];
    histories.forEach((h) => {
      historySheet.addRow({
        id: h.id,
        productNumber: h.productNumber,
        // Reagent Name は、HistoryのproductNumberに一致するReagentから取得
        reagentName: reagentMap.get(h.productNumber) || "",
        lotNumber: h.lotNumber,
        actionType: h.actionType,
        createdAt: new Date(h.createdAt).toLocaleString(),
        user: h.user || "",
        oldStock: h.oldStock ?? "",
        newStock: h.newStock ?? "",
        oldValueStock: h.oldValueStock ?? "",
        newValueStock: h.newValueStock ?? "",
      });
    });

    // ワークブックをバッファに書き出し
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `backup_${start.replace(/-/g, "")}_${end.replace(/-/g, "")}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("バックアップ取得エラー:", error);
    return NextResponse.json(
      { error: "バックアップの作成に失敗しました" },
      { status: 500 }
    );
  }
}

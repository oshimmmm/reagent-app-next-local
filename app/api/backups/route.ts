// app/api/backups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

export async function GET(request: NextRequest) {
  // クエリパラメータから start と end を取得
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start と end の両方の日付を指定してください。" },
      { status: 400 }
    );
  }

  // 日付範囲を Date オブジェクトに変換
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);

  try {
    // 対象期間の履歴を取得（降順に並べ替え）
    const histories = await prisma.history.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "desc" },
    });

    // CSV のヘッダー行
    const headers = [
      "id",
      "productNumber",
      "lotNumber",
      "actionType",
      "date",
      "user",
      "oldStock",
      "newStock",
      "oldValueStock",
      "newValueStock",
    ];
    let csv = headers.join(",") + "\n";

    // 各レコードを CSV の1行に変換
    histories.forEach((h) => {
      const row = [
        h.id,
        h.productNumber,
        h.lotNumber,
        h.actionType,
        h.date ? h.date.toISOString() : "",
        h.user || "",
        h.oldStock ?? "",
        h.newStock ?? "",
        h.oldValueStock ?? "",
        h.newValueStock ?? "",
      ];
      csv += row.join(",") + "\n";
    });

    // ダウンロードファイル名例: history_20250101_20250131.csv
    const filename = `history_${start.replace(/-/g, "")}_${end.replace(/-/g, "")}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
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

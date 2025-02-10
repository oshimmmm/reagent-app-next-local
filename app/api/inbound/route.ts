// app/api/inbound/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

/**
 * POST /api/inbound
 * Body: {
 *   productNumber: string;  // Reagent特定用
 *   lotNumber: string;
 *   expiryDate: string;     // ISO8601
 *   inboundQuantity: number; // 入庫数
 *   inputValueStock?: number; // ポップアップで入力された規格
 * }
 *
 * 複数ロット管理:
 *   1) 既存のLotがあれば stock を + inboundQuantity
 *      かつ expiryDate が既存より未来なら更新
 *   2) なければ新規作成
 *   3) Reagent の maxExpiry = 全Lotの中で最も遅い日付
 *   4) History(actionType="inbound") を登録
 */
export async function POST(request: Request) {
  try {
    const {
      productNumber,
      lotNumber,
      expiryDate,
      inboundQuantity = 1,
      inputValueStock,
    } = await request.json();

    if (!productNumber || !lotNumber) {
      return NextResponse.json(
        { error: "productNumber と lotNumber は必須です。" },
        { status: 400 }
      );
    }

    // 1) Reagent を取得
    const reagent = await prisma.reagent.findUnique({
      where: { productNumber },
    });
    if (!reagent) {
      return NextResponse.json(
        { error: "該当する試薬が存在しません。先に登録してください。" },
        { status: 404 }
      );
    }

    // 2) Lot を検索
    const existingLot = await prisma.lot.findUnique({
      where: {
        // 事前に schema.prisma の Lot モデルに以下のようなユニーク制約を設定
        //  @@unique([reagentId, lotNumber])
        //  ここでは composite unique "reagentId_lotNumber" を使う
        reagentId_lotNumber: {
          reagentId: reagent.id,
          lotNumber,
        },
      },
    });

    const parsedExpiry = expiryDate ? new Date(expiryDate) : null;
    let finalExpiry = parsedExpiry;

    // 「より未来の日付なら更新する」ロジック
    if (existingLot?.expiryDate && parsedExpiry) {
      // 既存のLot.expiryDate と parsedExpiry を比較し、大きい方を finalExpiry に
      if (parsedExpiry > existingLot.expiryDate) {
        finalExpiry = parsedExpiry;
      } else {
        finalExpiry = existingLot.expiryDate; // 既存が未来ならそのまま
      }
    }

    let updatedLot;
    if (existingLot) {
      // 3-a) 既存Lotがある → stock加算 & expiryDate更新(必要なら)
      updatedLot = await prisma.lot.update({
        where: {
          reagentId_lotNumber: {
            reagentId: reagent.id,
            lotNumber,
          },
        },
        data: {
          stock: { increment: inboundQuantity },
          expiryDate: finalExpiry ?? existingLot.expiryDate,
        },
      });
    } else {
      // 3-b) 新規Lotを作成
      updatedLot = await prisma.lot.create({
        data: {
          reagentId: reagent.id,
          lotNumber,
          expiryDate: parsedExpiry,
          stock: inboundQuantity,
        },
      });
    }

    // 4) Reagent の maxExpiry を「最も遅い expiry を持つロットの expiry」に更新
    //    全Lotを見て、一番遅い期限を取得する
    const allLots = await prisma.lot.findMany({
      where: { reagentId: reagent.id },
      select: { expiryDate: true },
    });
    let newMaxExpiry = new Date("1900-01-01");
    for (const l of allLots) {
      if (l.expiryDate && l.expiryDate > newMaxExpiry) {
        newMaxExpiry = l.expiryDate;
      }
    }

    // 既存の valueStock を更新したいなら inputValueStock を使う
    // あるいは複数ロット管理で valueStock 自体廃止するなら削除
    await prisma.reagent.update({
      where: { id: reagent.id },
      data: {
        maxExpiry: newMaxExpiry > new Date("1900-01-01") ? newMaxExpiry : null,
        ...(typeof inputValueStock === "number" && {
          valueStock: inputValueStock,
        }),
      },
    });

    // 5) History に actionType="inbound" を登録
    await prisma.history.create({
      data: {
        productNumber,
        lotNumber,
        actionType: "inbound",
        date: new Date(),
        // ユーザーIDなど session.user から取れるなら
        // user: session.user?.email || "unknown"
        // oldStock, newStock を入れたい場合は updatedLot.stock 前後で計算
      },
    });

    return NextResponse.json({ message: "Lot入庫完了", lot: updatedLot }, { status: 200 });
  } catch (error) {
    console.error("POST /api/inbound error:", error);
    return NextResponse.json(
      { error: "Error in inbound" },
      { status: 500 }
    );
  }
}




// // app/api/inbound/route.ts
// import { NextResponse } from "next/server"
// import { prisma } from "@/app/libs/prisma"

// export async function POST(request: Request) {
//   try {
//     const { productNumber, lotNumber, newMaxExpiry, newStock, inputValueStock } =
//       await request.json();

//     // Reagent 更新
//     await prisma.reagent.update({
//       where: { productNumber },
//       data: {
//         maxExpiry: new Date(newMaxExpiry),
//         stock: newStock,
//         orderDate: null,
//         ...(typeof inputValueStock === "number" && { valueStock: inputValueStock }),
//       },
//     });

//     // History 追加
//     await prisma.history.create({
//       data: {
//         productNumber,
//         lotNumber,
//         actionType: "inbound",
//         date: new Date(),
//         // reagentId: updated.id, など紐づけたいなら
//       },
//     });

//     return NextResponse.json({ message: "inbound completed" });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json({ error: "Error in inbound" }, { status: 500 });
//   }
// }

"use client";

import React, { useState } from "react";
// import { useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";

/**
 * API から取得する Lot 情報（Reagent 情報を含む）
 */
interface LotWithReagent {
  id: number;
  lotNumber: string;
  stock: number;
  expiryDate: string | null;
  reagent: {
    productNumber: string;
    name: string | null;
  };
}

/**
 * 台帳表示用の型
 */
interface LedgerItem {
  id: number;
  productNumber: string;
  name: string;
  lot: string;
  stock: number;
  expiry: string;
}

export default function LedgerPage() {
  // const { data: session, status } = useSession();
  // const router = useRouter();

  // // 管理者チェック: 管理者でなければ /home へリダイレクト
  // useEffect(() => {
  //   if (status !== "loading") {
  //     if (!session) {
  //       router.push("/login");
  //     } else if (!session.user?.isAdmin) {
  //       router.push("/home");
  //     }
  //   }
  // }, [session, status, router]);

  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [showTable, setShowTable] = useState(false);

  // 台帳作成ボタン押下時に /api/lots から全ロット情報を取得し、台帳用のデータに変換
  const handleCreateLedger = async () => {
    try {
      const res = await fetch("/api/lots");
      if (!res.ok) {
        throw new Error("在庫管理台帳のデータ取得に失敗しました");
      }
      const data: LotWithReagent[] = await res.json();

      // 取得した各 Lot 情報から、LedgerItem を生成する
      const items: LedgerItem[] = data.map((lot) => ({
        id: lot.id,
        productNumber: lot.reagent.productNumber,
        name: lot.reagent.name ?? "",
        lot: lot.lotNumber,
        stock: lot.stock,
        expiry: lot.expiryDate
          ? new Date(lot.expiryDate).toLocaleDateString()
          : "",
      }));

      setLedgerItems(items);
      setShowTable(true);
    } catch (error: unknown) {
      console.error(error);
      alert("在庫管理台帳の作成に失敗しました");
    }
  };

  // 印刷ボタン押下時、ブラウザの印刷ダイアログを呼び出す
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center hide-on-print">試薬在庫管理台帳</h1>

      {/* 台帳作成ボタン（印刷画面では非表示にするためのクラスを付与） */}
      <div className="max-w-md mx-auto mb-6 hide-on-print">
        <button
          onClick={handleCreateLedger}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors w-full"
        >
          台帳作成
        </button>
      </div>

      {/* 台帳テーブル */}
      {showTable && (
        <div className="bg-white p-6 rounded shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              試薬在庫管理台帳 (2025-02-12~)<br />
              ＊2025-02-12以前に入出庫された試薬の記録は、試薬消耗品の在庫・使用開始日管理表を参照してください
            </h2>
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors hide-on-print"
            >
              印刷
            </button>
          </div>
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2 text-center">No.</th>
                <th className="border p-2 text-center">試薬名</th>
                <th className="border p-2 text-center">ロット番号</th>
                <th className="border p-2 text-center">在庫数</th>
                <th className="border p-2 text-center">有効期限</th>
              </tr>
            </thead>
            <tbody>
              {ledgerItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2 text-center">{item.lot}</td>
                  <td className="border p-2 text-center">{item.stock}</td>
                  <td className="border p-2 text-center">{item.expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/** データベースから取得する Reagent の型 */
interface ReagentFromDB {
  id: number;
  productNumber: string;
  name: string | null;
  currentLot: string | null;
  maxExpiry: string | null;
}

/** 台帳表示用に整形した型 */
interface LedgerItem {
  id: number;
  productNumber: string;
  name: string;
  lot: string;
  expiry: string;
}

export default function LedgerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 管理者チェック： 管理者以外は /home へ飛ばす
  useEffect(() => {
    if (status !== "loading") {
      if (!session) {
        router.push("/login");
      } else if (!session.user?.isAdmin) {
        router.push("/home");
      }
    }
  }, [session, status, router]);

  // 日付範囲
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 作成した台帳リスト
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);
  const [showTable, setShowTable] = useState(false);

  // 在庫管理台帳作成ボタンを押したとき
  const handleCreateLedger = async () => {
    try {
      // （例）日付範囲で何か絞り込みをしたい場合は、APIパラメータを工夫する
      // ここではシンプルに /api/reagents から全データを取得
      const res = await fetch("/api/reagents");
      if (!res.ok) {
        throw new Error("在庫管理台帳のデータ取得に失敗しました");
      }

      const data: ReagentFromDB[] = await res.json();

      // 取得した Reagent リストを台帳表示用に整形
      // currentLot → lot, maxExpiry → expiry
      const items: LedgerItem[] = data.map((r) => ({
        id: r.id,
        productNumber: r.productNumber,
        name: r.name ?? "",
        lot: r.currentLot ?? "",
        expiry: r.maxExpiry
          ? new Date(r.maxExpiry).toLocaleDateString()
          : "",
      }));

      setLedgers(items);
      setShowTable(true);

      // 日付範囲など実際に活用する場合はここでフィルタする
      // 例: 
      // const filtered = items.filter(...)
      // setLedgers(filtered);
    } catch (error) {
      console.error(error);
      alert("在庫管理台帳の作成に失敗しました");
    }
  };

  // 印刷ボタン押下
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">在庫管理台帳</h1>

      {/* 日付範囲フォーム */}
      <div className="max-w-md mx-auto mb-6 hide-on-print">
        <label className="block font-semibold mb-1">開始日</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />

        <label className="block font-semibold mb-1">終了日</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />

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
          <h2 className="text-xl font-bold mb-4">
            在庫管理台帳 （{startDate} ~ {endDate}）
          </h2>

          {/* 印刷ボタン */}
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors mb-4 hide-on-print"
          >
            印刷
          </button>

          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2 text-center">No.</th>
                <th className="border p-2 text-center">試薬名</th>
                <th className="border p-2 text-center">ロット番号</th>
                <th className="border p-2 text-center">有効期限</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2">{item.lot}</td>
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

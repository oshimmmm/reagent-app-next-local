"use client";

import React, { useEffect, useRef, useState } from "react";
import { parseISO, format } from "date-fns"; 
// 例: 日付フォーマットにdate-fnsを使う。もちろんtoLocaleString()でもOK

/** DBで管理する試薬 */
interface Reagent {
  productNumber: string;
  name: string;
}

/** 履歴レコード (Prisma側) */
interface HistoryRecord {
  id: number;              // Prismaでautoincrement()の場合
  productNumber: string;
  lotNumber: string;
  actionType: "inbound" | "outbound" | "update";
  date: string;            // ISO文字列として受け取る
  user?: string;
  oldStock?: number;
  newStock?: number;
  oldValueStock?: number;
  newValueStock?: number;
}

/** グループ用 */
interface GroupedHistory {
  productNumber: string;
  reagentName: string; 
  records: HistoryRecord[];
}

// 表示モード
type ViewMode = "none" | "individual" | "range";

export default function HistoryPage() {
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [selectedProductNumber, setSelectedProductNumber] = useState("");
  const [selectedReagentName, setSelectedReagentName] = useState("");
  const [histories, setHistories] = useState<HistoryRecord[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rangeHistories, setRangeHistories] = useState<GroupedHistory[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>("none");

  const historyContainerRef = useRef<HTMLDivElement>(null);
  const rangeContainerRef = useRef<HTMLDivElement>(null);

  // ------------------
  // 1) 試薬一覧取得 (productNumber, name)
  // ------------------
  useEffect(() => {
    const fetchReagents = async () => {
      try {
        // 例: /api/reagents (GET) で全レコード取得 → ID, name
        const res = await fetch("/api/reagents");
        if (!res.ok) throw new Error("Failed to fetch reagents");
        const data: any[] = await res.json();

        // data から Reagent[] を組み立て
        // Prismaの Reagentモデルを想定
        // { id: number, productNumber: string, name: string | null, ... } とか
        const list: Reagent[] = data.map((r) => ({
          productNumber: r.productNumber,
          name: r.name ?? "",
        }));
        setReagents(list);
      } catch (error) {
        console.error(error);
        alert("試薬一覧の取得に失敗しました。");
      }
    };
    fetchReagents();
  }, []);

  // ------------------
  // 2) rangeHistoriesがセットされたらスクロール
  // ------------------
  useEffect(() => {
    if (viewMode === "range" && rangeHistories.length > 0) {
      setTimeout(() => {
        rangeContainerRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    }
  }, [viewMode, rangeHistories]);

  // ------------------
  // 個別履歴表示
  // ------------------
  const handleShowHistory = async (productNumber: string) => {
    setViewMode("individual");
    setRangeHistories([]);

    const reagent = reagents.find((r) => r.productNumber === productNumber);
    setSelectedReagentName(reagent?.name || "");
    setSelectedProductNumber(productNumber);

    try {
      // /api/histories/[productNumber]?order=desc などで履歴を取得
      const res = await fetch(`/api/histories/${encodeURIComponent(productNumber)}?order=desc`);
      if (!res.ok) throw new Error("履歴取得に失敗しました");
      const list: HistoryRecord[] = await res.json();
      setHistories(list);

      // スクロール
      setTimeout(() => {
        historyContainerRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);

    } catch (error) {
      console.error(error);
      alert("個別履歴の取得に失敗しました。");
    }
  };

  // ------------------
  // 日付範囲指定の全履歴表示
  // ------------------
  const handleShowAllHistoriesInRange = async () => {
    setViewMode("range");
    setSelectedProductNumber("");
    setSelectedReagentName("");
    setHistories([]);

    if (!startDate || !endDate) {
      alert("開始日と終了日を指定してください。");
      return;
    }
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    if (start > end) {
      alert("開始日は終了日より後にはできません。");
      return;
    }

    try {
      // /api/histories?start=YYYY-MM-DD&end=YYYY-MM-DD
      const query = new URLSearchParams({ start: startDate, end: endDate });
      const res = await fetch(`/api/histories/range?${query.toString()}`);
      if (!res.ok) throw new Error("範囲検索に失敗しました");

      const list: HistoryRecord[] = await res.json();

      // グループ化
      const map = new Map<string, HistoryRecord[]>();
      list.forEach((h) => {
        const arr = map.get(h.productNumber) || [];
        arr.push(h);
        map.set(h.productNumber, arr);
      });

      const grouped: GroupedHistory[] = [];
      map.forEach((records, productNumber) => {
        const reagent = reagents.find((r) => r.productNumber === productNumber);
        grouped.push({
          productNumber,
          reagentName: reagent?.name || "不明な試薬",
          records,
        });
      });

      setRangeHistories(grouped);

    } catch (error) {
      console.error(error);
      alert("範囲検索中にエラーが発生しました。");
    }
  };

  function formatDateStr(iso: string): string {
    if (!iso) return "";
    // parseISO(iso) → date-fnsでformat
    const d = parseISO(iso);
    return format(d, "yyyy/MM/dd HH:mm:ss");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8 hide-on-print">履歴管理 (Prisma版)</h1>

      {/* 日付範囲 フォーム */}
      <div className="hide-on-print max-w-xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-end space-y-4 md:space-y-0 md:space-x-4">
          <div>
            <label className="block mb-1 font-medium">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          <button
            onClick={handleShowAllHistoriesInRange}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            指定範囲の全履歴を表示
          </button>
        </div>
      </div>

      {/* 試薬一覧テーブル */}
      <div className="hide-on-print">
        <table className="border-collapse w-full sm:w-3/4 lg:w-1/2 mx-auto mb-8 shadow-md">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-4 text-left text-sm font-semibold">
                試薬名
              </th>
              <th className="border p-4 text-center text-sm font-semibold">
                履歴表示
              </th>
            </tr>
          </thead>
          <tbody>
            {reagents.map((r) => (
              <tr
                key={r.productNumber}
                className="odd:bg-white even:bg-gray-50"
              >
                <td className="border p-4 text-sm">{r.name}</td>
                <td className="border p-4 text-center">
                  <button
                    onClick={() => handleShowHistory(r.productNumber)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    履歴表示
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 個別履歴 */}
      {viewMode === "individual" && selectedProductNumber && (
        <div ref={historyContainerRef} className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">
            {selectedReagentName} の履歴情報
          </h2>
          {histories.length === 0 ? (
            <p>履歴がありません。</p>
          ) : (
            <div className="space-y-4">
              {histories.map((h) => (
                <div key={h.id} className="border-b py-4">
                  <p className="text-sm">
                    日付: {formatDateStr(h.date)}
                  </p>
                  {h.actionType === "inbound" && (
                    <>
                      <p className="text-sm">ロット番号: {h.lotNumber}</p>
                      <p className="text-sm">入庫</p>
                    </>
                  )}
                  {h.actionType === "outbound" && (
                    <>
                      <p className="text-sm">ロット番号: {h.lotNumber}</p>
                      <p className="text-sm">出庫</p>
                    </>
                  )}
                  {h.actionType === "update" && (
                    <>
                      <p className="text-sm">編集者: {h.user || "不明"}</p>
                      <p className="text-sm">
                        在庫: {h.oldStock} → {h.newStock}
                      </p>
                      <p className="text-sm">
                        月末残量: {h.oldValueStock ?? 0} → {h.newValueStock ?? 0}
                      </p>
                      <p className="text-sm">試薬情報の編集</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 hide-on-print">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              印刷
            </button>
          </div>
        </div>
      )}

      {/* 範囲検索結果 */}
      {viewMode === "range" && rangeHistories.length > 0 && (
        <div ref={rangeContainerRef} className="max-w-4xl mx-auto mt-12">
          <h2 className="text-2xl font-bold mb-4">
            {startDate} ~ {endDate} の全履歴一覧
          </h2>
          {rangeHistories.map((group) => (
            <div key={group.productNumber} className="mb-8">
              <h3 className="text-xl font-semibold mb-2">
                {group.reagentName}
              </h3>
              {group.records.map((h) => (
                <div key={h.id} className="border-b py-4">
                  <p className="text-sm">日付: {formatDateStr(h.date)}</p>
                  {h.actionType === "inbound" && (
                    <>
                      <p className="text-sm">ロット番号: {h.lotNumber}</p>
                      <p className="text-sm">入庫</p>
                    </>
                  )}
                  {h.actionType === "outbound" && (
                    <>
                      <p className="text-sm">ロット番号: {h.lotNumber}</p>
                      <p className="text-sm">出庫</p>
                    </>
                  )}
                  {h.actionType === "update" && (
                    <>
                      <p className="text-sm">編集者: {h.user || "不明"}</p>
                      <p className="text-sm">
                        在庫: {h.oldStock} → {h.newStock}
                      </p>
                      <p className="text-sm">
                        月末残量: {h.oldValueStock ?? 0} → {h.newValueStock ?? 0}
                      </p>
                      <p className="text-sm">試薬情報の編集</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div className="mt-4 hide-on-print">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              印刷
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

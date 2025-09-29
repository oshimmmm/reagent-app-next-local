"use client";

import React, { useEffect, useRef, useState } from "react";

// Firebase 版では Firestore の Timestamp を利用していましたが、Prisma 版では日付は ISO 8601 文字列となります。
// 型定義の例です。
interface Reagent {
  productNumber: string;
  name: string;
}

interface HistoryRecord {
  id: number; // Prisma の History モデルでは id は Int 型
  productNumber: string;
  lotNumber: string;
  actionType: "inbound" | "outbound" | "update" | "inventory";
  date?: string; // ISO 8601 文字列
  user?: string;
  oldStock?: number;
  newStock?: number;
  oldValueStock?: number;
  newValueStock?: number;
}

/** 履歴を「productNumber ごと」にまとめるための型 */
interface GroupedHistory {
  productNumber: string;
  reagentName: string; // 試薬名も含める
  records: HistoryRecord[]; // その製品番号に属する履歴の配列
}

// viewMode で表示モードを制御 ("none" | "individual" | "range")
type ViewMode = "none" | "individual" | "range";

export default function HistoryPage() {
  // 試薬一覧
  const [reagents, setReagents] = useState<Reagent[]>([]);
  // 個別表示用の状態
  const [selectedProductNumber, setSelectedProductNumber] = useState("");
  const [selectedReagentName, setSelectedReagentName] = useState("");
  const [histories, setHistories] = useState<HistoryRecord[]>([]);
  // 範囲検索用の状態
  const [startDate, setStartDate] = useState(""); // 例: "2025-01-01"
  const [endDate, setEndDate] = useState("");     // 例: "2025-01-31"
  const [rangeHistories, setRangeHistories] = useState<GroupedHistory[]>([]);
  // 表示モード
  const [viewMode, setViewMode] = useState<ViewMode>("none");

  // 個別履歴表示領域の ref
  const historyContainerRef = useRef<HTMLDivElement>(null);
  // 範囲検索結果表示領域の ref
  const rangeContainerRef = useRef<HTMLDivElement>(null);

  // ------------------
  // 初回に試薬一覧を取得する
  // ------------------
  useEffect(() => {
    const fetchReagents = async () => {
      try {
        const res = await fetch("/api/reagents");
        if (!res.ok) {
          throw new Error("試薬情報の取得に失敗しました");
        }
        const data = (await res.json()) as Reagent[];
        setReagents(data);
      } catch (error) {
        console.error("試薬一覧の取得エラー:", error);
      }
    };
    fetchReagents();
  }, []);

  // ------------------
  // rangeHistories がセットされたら自動スクロール
  // ------------------
  useEffect(() => {
    if (viewMode === "range" && rangeHistories.length > 0) {
      setTimeout(() => {
        rangeContainerRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    }
  }, [viewMode, rangeHistories]);

  // ------------------
  // 1) 個別試薬の履歴表示
  // ------------------
  const handleShowHistory = async (productNumber: string) => {
    // ビューを「個別表示」に切り替え
    setViewMode("individual");
    // 範囲検索結果はクリア
    setRangeHistories([]);
    // 試薬名をセット
    const reagent = reagents.find((r) => r.productNumber === productNumber);
    setSelectedReagentName(reagent?.name || "");
    setSelectedProductNumber(productNumber);

    try {
      const res = await fetch(
        `/api/histories/range?start=2025-01-01&end=2075-12-31&productNumber=${encodeURIComponent(
          productNumber
        )}&order=desc`
      );
      if (!res.ok) {
        throw new Error("履歴情報の取得に失敗しました");
      }
      const list: HistoryRecord[] = await res.json();
      setHistories(list);
      // 表示部分へスクロール
      setTimeout(() => {
        historyContainerRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    } catch (error) {
      console.error("個別履歴取得エラー:", error);
      alert("履歴の取得に失敗しました。");
    }
  };

  // ------------------
  // 2) 日付範囲で全履歴を取得
  // ------------------
  const handleShowAllHistoriesInRange = async () => {
    // ビューを「範囲検索」に切り替え
    setViewMode("range");
    // 個別表示の結果はクリア
    setSelectedProductNumber("");
    setSelectedReagentName("");
    setHistories([]);

    // 日付の入力チェック
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
      const res = await fetch(`/api/histories/range?start=${startDate}&end=${endDate}`);
      if (!res.ok) {
        throw new Error("範囲指定履歴の取得に失敗しました");
      }
      const list: HistoryRecord[] = await res.json();

      // クライアント側で productNumber ごとにグループ化する
      const map = new Map<string, HistoryRecord[]>();
      list.forEach((h) => {
        const arr = map.get(h.productNumber) || [];
        arr.push(h);
        map.set(h.productNumber, arr);
      });
      const grouped: GroupedHistory[] = [];
      map.forEach((records, productNumber) => {
        const reagent = reagents.find((r) => r.productNumber === productNumber);
        const reagentName = reagent?.name || "不明な試薬";
        grouped.push({
          productNumber,
          reagentName,
          records,
        });
      });
      setRangeHistories(grouped);
    } catch (error) {
      console.error("範囲検索エラー:", error);
      alert("範囲検索中にエラーが発生しました。");
    }
  };

  // 日付文字列（YYYY-MM-DD）を「YYYY年MM月DD日」に変換する例
  function formatDateString(ymd: string): string {
    if (!ymd) return "";
    const [yyyy, mm, dd] = ymd.split("-");
    if (!yyyy || !mm || !dd) return "";
    return `${yyyy}年${mm}月${dd}日`;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 見出し（印刷時に非表示） */}
      <h1 className="text-3xl font-bold text-center mb-8 hide-on-print">
        履歴管理
      </h1>

      {/* 日付範囲指定フォーム + ボタン */}
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

      {/* 試薬一覧テーブル（印刷時に非表示） */}
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
            {[...reagents]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((r) => (
                <tr key={r.productNumber} className="odd:bg-white even:bg-gray-50">
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

      {/* ▼ 個別試薬の履歴表示 */}
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
                    日付: {h.date ? new Date(h.date).toLocaleString() : ""}
                  </p>
                  {h.actionType === "inventory" && (
                    <>
                      <p className="text-sm">棚卸作業</p>
                      <p className="text-sm">
                        編集者: {h.user || "不明"}
                      </p>
                      <p className="text-sm">
                        月末残量: {h.oldValueStock ?? 0} → {h.newValueStock ?? 0}
                      </p>
                    </>
                  )}


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

          {/* 印刷ボタン（個別履歴） */}
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

      {/* ▼ 範囲検索結果の表示 */}
      {viewMode === "range" && rangeHistories.length > 0 && (
        <div ref={rangeContainerRef} className="max-w-4xl mx-auto mt-12">
          <h2 className="text-2xl font-bold mb-4">
            {formatDateString(startDate)} 〜 {formatDateString(endDate)} <br />
            試薬入出庫管理台帳
          </h2>

          {/* 印刷ボタン（範囲検索結果） */}
          <div className="mt-4 hide-on-print">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              印刷
            </button>
          </div>

          {rangeHistories.map((group) => (
            <div key={group.productNumber} className="mb-8">
              <h3 className="text-xl font-semibold mb-2">
                {group.reagentName}
              </h3>
              {group.records.map((h) => (
                <div key={h.id} className="border-b py-4">
                  <p className="text-sm">
                    日付: {h.date ? new Date(h.date).toLocaleString() : ""}
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
                  {h.actionType === "inventory" && (
                    <>
                      <p className="text-sm">棚卸作業</p>
                      <p className="text-sm">編集者: {h.user || "不明"}</p>
                      <p className="text-sm">
                        月末残量: {h.oldValueStock ?? 0} → {h.newValueStock ?? 0}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* 印刷ボタン（範囲検索結果） */}
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

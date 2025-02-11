"use client";

import React, { useEffect, useState } from "react";

// --- 型定義 ---
interface ArchiveReagent {
  productNumber: string;
  name: string;
}

interface ArchiveHistory {
  id: number; // Prisma の History モデルの主キー（数値型の場合）
  productNumber: string;
  lotNumber: string;
  actionType: string;
  date: string; // ISO8601 文字列（例："2025-01-15T12:34:56.789Z"）
}

export default function ArchivePage() {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [histories, setHistories] = useState<ArchiveHistory[]>([]);
  const [reagents, setReagents] = useState<ArchiveReagent[]>([]);
  const [selectedReagent, setSelectedReagent] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // 初回ロード：試薬一覧の取得（GET /api/reagents）
  useEffect(() => {
    const fetchReagents = async () => {
      try {
        const res = await fetch("/api/reagents");
        if (!res.ok) throw new Error("試薬情報の取得に失敗しました");
        const data = (await res.json()) as ArchiveReagent[];
        setReagents(data);
      } catch (error) {
        console.error("試薬取得エラー:", error);
      }
    };
    fetchReagents();
  }, []);

  // 「抽出」ボタン押下：指定期間の履歴取得（GET /api/histories/range?start=...&end=...）
  const handleSearch = async () => {
    try {
      const res = await fetch(
        `/api/histories/range?start=${encodeURIComponent(
          startDate
        )}&end=${encodeURIComponent(endDate)}`
      );
      if (!res.ok) throw new Error("履歴情報の取得に失敗しました");
      let data: ArchiveHistory[] = await res.json();
      // 試薬が選択されている場合、productNumberでフィルタリング
      if (selectedReagent) {
        data = data.filter((h) => h.productNumber === selectedReagent);
      }
      setHistories(data);
    } catch (error) {
      console.error("検索エラー:", error);
    }
  };

  // 個別削除
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/histories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("削除に失敗しました");
      setHistories((prev) => prev.filter((h) => h.id !== id));
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました");
    }
  };

  // 全件一括削除：新規一括削除用エンドポイント /api/histories/range を利用
  // リクエストボディで startDate, endDate, （任意で selectedReagent）を送信
  const handleDeleteAll = async () => {
    if (histories.length === 0) return;
    const confirmDelete = window.confirm("表示されている全ての履歴を削除してもよろしいですか？");
    if (!confirmDelete) return;

    setIsDeletingAll(true);
    try {
      const res = await fetch("/api/histories/range", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: startDate,
          end: endDate,
          productNumber: selectedReagent || undefined, // 選択されていればフィルタ条件として送信
        }),
      });
      if (!res.ok) throw new Error("全削除に失敗しました");
      const result = await res.json();
      alert(`削除完了: ${result.count} 件`);
      setHistories([]);
    } catch (error) {
      console.error("全削除エラー:", error);
      alert("全削除に失敗しました。");
    }
    setIsDeletingAll(false);
  };

  // actionType の表示変換
  const displayAction = (action: string) => {
    if (action === "inbound") return "入庫";
    if (action === "outbound") return "出庫";
    if (action === "update") return "更新";
    return action;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">アーカイブ</h1>
      <div className="flex flex-wrap gap-4 items-end mb-6">
        <div>
          <label className="block mb-1 font-medium">開始日</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">終了日</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">試薬名</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedReagent}
            onChange={(e) => setSelectedReagent(e.target.value)}
          >
            <option value="">すべて</option>
            {reagents.map((r) => (
              <option key={r.productNumber} value={r.productNumber}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          抽出
        </button>
      </div>

      {/* 一括削除ボタン：履歴が1件以上ある場合に表示 */}
      {histories.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleDeleteAll}
            disabled={isDeletingAll}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            {isDeletingAll ? "削除中..." : "表示されている全て削除"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2 text-center">日付</th>
              <th className="border p-2 text-center">試薬名</th>
              <th className="border p-2 text-center">ロットナンバー</th>
              <th className="border p-2 text-center">アクション</th>
              <th className="border p-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {histories.map((h) => {
              const dateStr = new Date(h.date).toLocaleString();
              const reagent = reagents.find((r) => r.productNumber === h.productNumber);
              return (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="border p-2 text-center">{dateStr}</td>
                  <td className="border p-2 text-center">
                    {reagent ? reagent.name : h.productNumber}
                  </td>
                  <td className="border p-2 text-center">{h.lotNumber}</td>
                  <td className="border p-2 text-center">{displayAction(h.actionType)}</td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

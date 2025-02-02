"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext"; // NextAuth 等で管理しているユーザー情報
// ※ Firebase 固有の firestore 関連の import は削除し、fetch() を利用

interface Reagent {
  productNumber: string;
  name: string;
  stock: number;
  valueStock?: number;
}

export default function ManagePage() {
  const { user } = useAuth();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [selectedReagent, setSelectedReagent] = useState<Reagent | null>(null);
  const [newStock, setNewStock] = useState(0);
  const [newValueStock, setNewValueStock] = useState<number | undefined>(undefined);

  // 編集フォームの位置をスクロールさせるための ref
  const editFormRef = useRef<HTMLDivElement>(null);

  // 初回：API から全試薬情報を取得（GET /api/reagents）
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
        console.error(error);
      }
    };
    fetchReagents();
  }, [user]);

  // 試薬一覧から選択時：編集用のフォームに値をセットし、フォーム位置までスクロール
  const handleSelect = (r: Reagent) => {
    setSelectedReagent(r);
    setNewStock(r.stock);
    setNewValueStock(r.valueStock);

    setTimeout(() => {
      if (editFormRef.current) {
        const rect = editFormRef.current.getBoundingClientRect();
        const elementTop = rect.top + window.scrollY;
        const offset = 100; // ヘッダー等の高さ分オフセット（例）
        const scrollTarget = elementTop - offset;
        window.scrollTo({ top: scrollTarget, behavior: "smooth" });
      }
    }, 0);
  };

  // 更新処理：対象の試薬を PATCH で更新し、更新履歴を POST で登録
  const handleUpdate = async () => {
    if (!selectedReagent) return;
    try {
      // ① PATCH リクエストで試薬情報（stock, valueStock）を更新
      const patchRes = await fetch(`/api/reagents/${selectedReagent.productNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: newStock,
          valueStock: newValueStock || null,
        }),
      });
      if (!patchRes.ok) {
        const errData = await patchRes.json();
        throw new Error(errData.error || "試薬情報の更新に失敗しました");
      }

      // ② POST リクエストで更新履歴を登録（POST /api/histories）
      const historyRes = await fetch("/api/histories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productNumber: selectedReagent.productNumber,
          actionType: "update",
          // 日時はサーバー側で現在日時を設定してもよいが、ここではクライアント側で送信
          date: new Date().toISOString(),
          user: user?.email || user?.uid || "unknown",
          oldStock: selectedReagent.stock,
          newStock: newStock,
          oldValueStock: selectedReagent.valueStock ?? null,
          newValueStock: newValueStock ?? null,
          lotNumber: "", // 試薬更新時は空文字列（必要に応じて変更）
        }),
      });
      if (!historyRes.ok) {
        const errData = await historyRes.json();
        throw new Error(errData.error || "更新履歴の登録に失敗しました");
      }

      alert("更新しました");
      // 更新後、必要に応じて reagents 配列の該当要素も更新する
      setReagents((prev) =>
        prev.map((r) =>
          r.productNumber === selectedReagent.productNumber
            ? { ...r, stock: newStock, valueStock: newValueStock }
            : r
        )
      );
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("予期せぬエラーが発生しました");
      }
    }
  };

  // 削除処理：対象の試薬を DELETE で削除
  const handleDelete = async () => {
    if (!selectedReagent) return;
    try {
      const res = await fetch(`/api/reagents/${selectedReagent.productNumber}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "試薬の削除に失敗しました");
      }
      alert("削除しました");
      setReagents((prev) =>
        prev.filter((r) => r.productNumber !== selectedReagent.productNumber)
      );
      setSelectedReagent(null);
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("予期せぬエラーが発生しました");
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ページタイトル */}
      <h1 className="text-3xl font-bold text-center mb-8">試薬情報編集</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 試薬一覧 */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">試薬一覧</h2>
          {reagents.length === 0 ? (
            <p className="text-gray-500">試薬がありません。</p>
          ) : (
            <ul className="space-y-2">
              {reagents.map((r) => (
                <li key={r.productNumber}>
                  <button
                    onClick={() => handleSelect(r)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors underline"
                  >
                    {r.name}{" "}
                    <span className="text-sm text-gray-600">(在庫: {r.stock})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 編集フォーム */}
        <div ref={editFormRef} className="bg-white shadow-md rounded-lg p-6">
          {selectedReagent ? (
            <>
              <h2 className="text-xl font-semibold mb-4">{selectedReagent.name} の編集</h2>

              {/* 在庫数 */}
              <div className="mb-4">
                <label className="block mb-1 font-medium">在庫数</label>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* 月末残量 */}
              <div className="mb-6">
                <label className="block mb-1 font-medium">月末残量</label>
                <input
                  type="number"
                  value={newValueStock !== undefined ? newValueStock : ""}
                  onChange={(e) => setNewValueStock(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* ボタン */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleUpdate}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  更新
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                >
                  試薬情報削除
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">左の一覧から編集する試薬を選択してください。</p>
          )}
        </div>
      </div>
    </div>
  );
}

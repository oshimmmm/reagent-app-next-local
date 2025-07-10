// app/edit-reagent/page.tsx
"use client";

import React, { useState, useEffect } from "react";

interface APIReagent {
  productNumber: string;
  name: string | null;
  location: string | null;
  orderTriggerStock: number;
  orderTriggerExpiry: boolean;
  noOrderOnZeroStock: boolean;
  orderTriggerValueStock: number | null;
  valueStock: number;
  orderValue: string | null;
  orderQuantity: number;
  hide: boolean;
}

export default function EditReagentPage() {
  const [reagents, setReagents] = useState<APIReagent[]>([]);
  const [selectedPN, setSelectedPN] = useState<string>("");

  const [name, setName] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [orderTriggerStock, setOrderTriggerStock] = useState<number>(0);
  const [orderTriggerExpiry, setOrderTriggerExpiry] = useState<boolean>(false);
  const [noOrderOnZeroStock, setNoOrderOnZeroStock] = useState<boolean>(false);
  const [orderTriggerValueStock, setOrderTriggerValueStock] = useState<number>(0);
  const [valueStock, setValueStock] = useState<number>(0);
  const [orderValue, setOrderValue] = useState<string>("");
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [hide, setHide] = useState<boolean>(false);

  // 全試薬一覧を取得
  useEffect(() => {
    fetch("/api/reagents")
      .then((res) => res.json())
      .then((data: APIReagent[]) => setReagents(data))
      .catch((error: unknown) => {
        console.error("Failed to fetch reagents:", error);
      });
  }, []);

  // 選択された試薬の詳細を取得してフォームに反映
  useEffect(() => {
    if (!selectedPN) return;
    fetch(`/api/reagents/${selectedPN}`)
      .then((res) => res.json())
      .then((r: APIReagent) => {
        setName(r.name ?? "");
        setLocation(r.location ?? "");
        setOrderTriggerStock(r.orderTriggerStock);
        setOrderTriggerExpiry(r.orderTriggerExpiry);
        setNoOrderOnZeroStock(r.noOrderOnZeroStock);
        setOrderTriggerValueStock(r.orderTriggerValueStock ?? 0);
        setValueStock(r.valueStock);
        setOrderValue(r.orderValue ?? "");
        setOrderQuantity(r.orderQuantity);
        setHide(r.hide);
      })
      .catch((error: unknown) => {
        console.error("Failed to fetch reagent details:", error);
      });
  }, [selectedPN]);

  // 更新処理
  const handleUpdate = async () => {
    if (!selectedPN) {
      alert("編集する試薬を選択してください。");
      return;
    }
    try {
      const response = await fetch(`/api/reagents/${selectedPN}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location,
          orderTriggerStock,
          orderTriggerExpiry,
          noOrderOnZeroStock,
          orderTriggerValueStock: noOrderOnZeroStock ? orderTriggerValueStock : null,
          valueStock,
          orderValue,
          orderQuantity,
          hide,
        }),
      });

      if (!response.ok) {
        // エラーメッセージが { error: string } の形で返ってくる想定
        const errData = (await response.json()) as { error?: string };
        throw new Error(errData.error ?? "更新に失敗しました");
      }

      alert("試薬情報を更新しました。");
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("予期せぬエラーが発生しました");
      }
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">試薬情報編集</h1>

      {/* 試薬選択 */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">編集する試薬:</label>
        <select
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={selectedPN}
          onChange={(e) => setSelectedPN(e.target.value)}
        >
          <option value="">── 選択してください ──</option>
          {[...reagents]
            .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
            .map((r) => (
              <option key={r.productNumber} value={r.productNumber}>
                {r.name}
              </option>
            ))}
        </select>
      </div>

      {/* 試薬名 */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">試薬名</label>
        <input
          type="text"
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* 物流コード */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">物流コード</label>
        <input
          type="text"
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={orderValue}
          onChange={(e) => setOrderValue(e.target.value)}
        />
      </div>

      {/* 保管場所 */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">保管場所</label>
        <input
          type="text"
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      {/* 発注数 */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">発注数</label>
        <input
          type="number"
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={orderQuantity}
          onChange={(e) => setOrderQuantity(Number(e.target.value))}
        />
      </div>

      {/* 発注トリガー：在庫数 */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">
          在庫数がいくつ以下で発注するか
        </label>
        <input
          type="number"
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={orderTriggerStock}
          onChange={(e) => setOrderTriggerStock(Number(e.target.value))}
        />
      </div>

      {/* 在庫0でも発注しない */}
      <div className="mb-6">
        <label className="inline-flex items-center space-x-3">
          <input
            type="checkbox"
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={noOrderOnZeroStock}
            onChange={(e) => setNoOrderOnZeroStock(e.target.checked)}
          />
          <span className="text-lg font-semibold">在庫が0でも発注しない</span>
        </label>
      </div>

      {/* 月末残量トリガー & 規格 */}
      {noOrderOnZeroStock && (
        <div className="space-y-6 mb-6">
          <div>
            <label className="block text-lg font-semibold mb-2">
              月末残量がいくつ以下で発注するか
            </label>
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={orderTriggerValueStock}
              onChange={(e) => setOrderTriggerValueStock(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-lg font-semibold mb-2">規格（μL）</label>
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={valueStock}
              onChange={(e) => setValueStock(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* 発注トリガー：有効期限 */}
      <div className="mb-6">
        <label className="inline-flex items-center space-x-3">
          <input
            type="checkbox"
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={orderTriggerExpiry}
            onChange={(e) => setOrderTriggerExpiry(e.target.checked)}
          />
          <span className="text-lg font-semibold">有効期限が1ヶ月未満で発注</span>
        </label>
      </div>

      {/* 非表示フラグ */}
      <div className="mb-6">
        <label className="inline-flex items-center space-x-3">
          <input
            type="checkbox"
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={hide}
            onChange={(e) => setHide(e.target.checked)}
          />
          <span className="text-lg font-semibold">この試薬をホームから非表示にする</span>
        </label>
      </div>

      {/* 更新ボタン */}
      <div className="text-center">
        <button
          onClick={handleUpdate}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-700 transition-colors"
        >
          登録
        </button>
      </div>
    </div>
  );
}
